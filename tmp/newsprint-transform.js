const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');
const replacements = [
  // Color tokens
  [/bg-surface-dim/g, 'bg-ground'],
  [/bg-surface-bright/g, 'bg-ground'],
  [/bg-surface-container-lowest/g, 'bg-ground'],
  [/bg-surface-container-low/g, 'bg-ground'],
  [/bg-surface-container-high/g, 'bg-ground'],
  [/bg-surface-container-highest/g, 'bg-ground'],
  [/bg-surface-container/g, 'bg-ground'],
  [/bg-surface-plum/g, 'bg-ground'],
  [/bg-surface\/\d/g, 'bg-ground'],
  [/bg-surface/g, 'bg-ground'],
  [/text-on-surface-variant/g, 'text-secondary'],
  [/text-on-surface/g, 'text-ink'],
  [/border-outline-variant/g, 'border-rule'],
  [/border-outline/g, 'border-rule'],
  // Accent tokens
  [/bg-primary-light/g, 'bg-accent'],
  [/bg-primary\/10/g, 'bg-accent\/10'],
  [/bg-primary\/15/g, 'bg-accent\/10'],
  [/bg-primary\/20/g, 'bg-accent\/10'],
  [/bg-primary\/30/g, 'bg-accent\/10'],
  [/text-primary\/30/g, 'text-accent\/10'],
  [/text-primary\/15/g, 'text-accent\/10'],
  [/hover:bg-primary-light/g, 'hover:bg-accent'],
  [/text-primary/g, 'text-accent'],
  // Shadows
  [/shadow-lg/ g, ''],
  [/shadow-sm/ g, ''],
  [/shadow\/20/ g, ''],
  [/shadow-xl/ g, ''],
  [/shadow-2xl/ g, ''],
  [/shadow-inner/ g, ''],
  [/shadow-primary\/10/ g, ''],
  [/shadow-primary\/20/ g, ''],
  [/shadow-primary\/30/ g, ''],
  // Blur
  [/backdrop-blur-xl/ g, ''],
  [/backdrop-blur-2xl/ g, ''],
  [/backdrop-blur-sm/ g, ''],
  [/backdrop-filter/ g, ''],
  // Rounded corners
  [/rounded-xl/ g, 'rounded-none'],
  [/rounded-lg/ g, 'rounded-none'],
  [/rounded-full/ g, 'rounded-none'],
  [/rounded-2xl/ g, 'rounded-none'],
  [/font-headline/ g, 'font-display'],
  [/font-body/ g, 'font-reading'],
];

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walkDir(srcDir);
let changed = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
  }

  // Clean up leftover double-spaces and trailing spaces
  content = content.replace(/\s{2,}/g, ' ').replace(/\s+/g, ' ');

  if (content !== original) {
    fs.writeFileSync(file, content);
    changed++;
  }
}

console.log(`Processed ${files.length} files, modified ${changed}`);
