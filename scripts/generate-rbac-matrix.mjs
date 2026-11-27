import { writeFileSync } from "node:fs";
import { ROLE_TEMPLATES, TEMPLATE_IDS, permissionsForTemplate, canAssignTemplate } from "../src/lib/roleTemplates.mjs";
import { ACCESS_SCOPE } from "../src/lib/rbacScope.mjs";
let md = `# AIDE-03 — Role templates & permission matrix

This matrix is generated from \`src/lib/roleTemplates.mjs\` and verified by
\`scripts/tests/rbac-templates.test.mjs\`. It is the authoritative answer to
"who can do what" — UI visibility is never an authorization decision.

## Storage model

\`BusinessMembership.role\` remains the coarse, persisted tier
(\`OWNER\` / \`MANAGER\` / \`STAFF\`) so existing clients and the sync engine
keep working. \`Employee.roleTemplate\` names one of the templates below and,
when present, is authoritative for granular permissions and data scope.
\`Employee.scopeType\` plus \`branchId\`/\`departmentId\`/\`warehouseId\`/
\`terminalId\`/\`ownRecordsOnly\` narrow the boundary further. A deactivated
employee is rejected by \`requireBusiness\` on every API route.

## Templates

| Template | Coarse role | Tier | Default scope | Permissions |
|---|---|---|---|---|
`;
for (const id of TEMPLATE_IDS) {
  const t = ROLE_TEMPLATES[id];
  const perms = permissionsForTemplate(id);
  md += `| ${t.label} (\`${id}\`) | ${t.base} | ${t.tier} | ${t.scope} | ${perms.length === 42 ? "all 42 permissions" : perms.map(p => `\`${p}\``).join(", ")} |\n`;
}
md += `
## Assignment rules

A caller can assign only templates strictly below their own tier; OWNER may
assign OWNER. The full matrix of allowed assignments:

| Caller \\ Target | ${TEMPLATE_IDS.join(" | ")} |
|---|---|${TEMPLATE_IDS.map(() => "---").join("|")}|
`;
for (const caller of TEMPLATE_IDS) {
  md += `| ${caller} | ${TEMPLATE_IDS.map(t => canAssignTemplate(caller, t) ? "yes" : "—").join(" | ")} |\n`;
}
md += `
## Scope semantics

- \`ORGANIZATION\` — all businesses in the caller's organizations.
- \`BRANCH\` — one business/branch; cross-branch resources are denied even if
  they carry a matching branch label.
- \`DEPARTMENT\` / \`WAREHOUSE\` / \`TERMINAL\` — only records within the
  assigned unit.
- \`OWN_RECORDS\` — only records whose \`ownerId\` is the caller. On sales this
  uses the indexed \`cashierUserId\` column.

Tenant isolation is always checked first: a resource in a business the caller
is not a member of is denied regardless of any other scope.

## Audit

Template assignment, role change, scope change, invitation, activation,
suspension and revocation all append an immutable \`AuditEvent\` via
\`recordAudit\`. The trail is read-only through \`GET /api/audit-events\`.
`;
writeFileSync(new URL("../docs/architecture/rbac-matrix.md", import.meta.url), md);
console.log("wrote docs/architecture/rbac-matrix.md", md.length, "bytes");
