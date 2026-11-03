import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// Test the release gate itself, not a real installer. The real APK upgrade and
// process checks still run separately on API 24/35 emulators in GitHub Actions.
const script = resolve("scripts/smoke-test-android-upgrade.sh");
const fakeAdb = `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const file = process.env.ADB_STATE;
const state = JSON.parse(fs.readFileSync(file, 'utf8'));
state.commands.push(args);
const scenario = process.env.ADB_SCENARIO;
let output = '', status = 0;
if (args[0] === 'root') {
  state.rootAttempts = (state.rootAttempts || 0) + 1;
  if (scenario === 'root-denied' || (scenario === 'root-retry' && state.rootAttempts === 1)) status = 1;
} else if (args[0] === 'install') {
  state.phase = args.includes('-r') ? 'new' : 'old';
} else if (args[0] === 'logcat') {
  if (args.includes('-c')) state.crash = false;
  else if (state.crash) output = 'FATAL EXCEPTION: main\\nProcess: com.omix.aide, PID: 123\\n';
} else if (args[0] === 'shell') {
  if (args[1] === 'id') {
    output = scenario === 'root-denied' ? '2000\\n' : '0\\n';
    if (scenario === 'root-retry' && state.rootAttempts === 1) { output = ''; status = 1; }
  } else if (args[1] === 'am' && args[2] === 'start') {
    if (state.phase === 'old' || scenario === 'new-crash') state.crash = true;
    output = 'Status: ok\\n';
    if ((scenario === 'old-start-timeout' && state.phase === 'old') || (scenario === 'new-start-timeout' && state.phase === 'new')) status = 124;
  } else if (args[1] === 'uiautomator' && scenario === 'ui-idle-timeout') {
    status = 124;
  } else if (args[1] === 'dumpsys') {
    const uid = scenario === 'lost-uid' && state.phase === 'new' ? '10002' : '10001';
    const code = state.phase === 'old' ? '1012' : scenario === 'wrong-code' ? '1012' : '1013';
    output = (scenario === 'app-id' ? 'appId=' : 'userId=') + uid + '\\nversionCode=' + code + ' minSdk=24\\n';
  } else if (args[1] === 'cat') {
    output = scenario === 'lost-data' ? '' : 'aide-retain-local-data\\n';
  } else if (args[1] === 'pidof') {
    output = scenario === 'dead-process' ? '' : '123\\n';
    status = scenario === 'dead-process' ? 1 : 0;
  }
}
fs.writeFileSync(file, JSON.stringify(state));
process.stdout.write(output);
process.exitCode = status;
`;

function run(scenario = "success", previous = "previous.apk") {
  const directory = mkdtempSync(join(tmpdir(), "aide-upgrade-gate-"));
  try {
    writeFileSync(join(directory, "adb"), fakeAdb, { mode: 0o755 });
    const stateFile = join(directory, "state.json");
    writeFileSync(stateFile, JSON.stringify({ commands: [], phase: "", crash: false }));
    const result = spawnSync("bash", [script, previous, "new.apk", "1013"], {
      cwd: directory, encoding: "utf8",
      env: { ...process.env, PATH: directory + ":" + process.env.PATH, ADB_STATE: stateFile, ADB_SCENARIO: scenario }
    });
    return { ...result, state: JSON.parse(readFileSync(stateFile, "utf8")), runtime: readFileSync(join(directory, "android-runtime.txt"), "utf8") };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("upgrade gate allows repairing the known v12 crash without attributing its log to the new APK", () => {
  const result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.runtime, "");
  const commands = result.state.commands;
  const upgrade = commands.findIndex(c => c[0] === "install" && c.includes("-r"));
  const clearNew = commands.findIndex((c, i) => i > upgrade && c[0] === "logcat" && c.includes("-c"));
  const launchNew = commands.findIndex((c, i) => i > upgrade && c[0] === "shell" && c[1] === "am" && c[2] === "start");
  assert.ok(clearNew > upgrade && clearNew < launchNew);
  assert.equal(commands.filter(c => c[0] === "shell" && c[1] === "pidof").length, 2);
  assert.ok(!commands.some(c => c[0] === "uninstall" || (c[0] === "install" && c.includes("-d"))));
});
test("a transient adbd root restart is retried and verified before installing anything", () => {
  const result = run("root-retry");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.state.rootAttempts, 2);
  const commands = result.state.commands;
  assert.ok(commands.findIndex(c => c[0] === "install") > commands.findIndex(c => c[0] === "shell" && c[1] === "id"));
});
test("an unprivileged emulator cannot bypass the private-data preservation gate", () => {
  const result = run("root-denied");
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /A rooted test emulator is required/);
  assert.equal(result.state.rootAttempts, 3);
  assert.ok(!result.state.commands.some(c => c[0] === "install"));
});
test("a hung old crash dialog cannot block repair or be attributed to the replacement APK", () => {
  const result = run("old-start-timeout");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Previous production APK could not launch/);
});
test("upgrade UID comparison supports Android 15 appId as well as legacy userId", () => {
  const result = run("app-id");
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
test("fresh installation also has to survive two cold launches", () => {
  const result = run("success", "");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.state.commands.filter(c => c[0] === "shell" && c[1] === "pidof").length, 2);
});
for (const [scenario, message] of [
  ["new-crash", "Production app crashed"],
  ["lost-data", "Upgrade lost the app-private data marker"],
  ["lost-uid", "Upgrade did not retain the package UID"],
  ["wrong-code", "Unexpected installed code"],
  ["dead-process", ""],
  ["new-start-timeout", "Android compatibility test failed"],
  ["ui-idle-timeout", "Android compatibility test failed"]
]) {
  test(`upgrade gate fails closed for ${scenario}`, () => {
    const result = run(scenario);
    assert.notEqual(result.status, 0);
    assert.ok(result.stdout.includes(message), result.stdout + result.stderr);
    if (scenario === "new-crash") assert.match(result.runtime, /FATAL EXCEPTION/);
  });
}
