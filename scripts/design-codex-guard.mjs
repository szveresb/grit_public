import { promises as fs, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');

const codeFileExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const classScanExtensions = new Set(['.tsx', '.jsx', '.css']);

const legacySurfaceClasses = [
  'reference-surface',
  'context-panel',
  'subject-card-self',
];

const rawColorTokenRegex =
  /\b(?:bg|text|border|ring|stroke|fill|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{1,3})?(?:\/\d{1,3})?\b/g;

const acceptedRawColorPatternRegex =
  /\b(?:print:(?:bg-white|text-black)|dark:(?:text-(?:amber|green)-\d{1,3}(?:\/\d{1,3})?|border-(?:amber|green)-\d{1,3}(?:\/\d{1,3})?|bg-(?:amber|green)-\d{1,3}(?:\/\d{1,3})?)|text-(?:amber|green)-\d{1,3}(?:\/\d{1,3})?|border-(?:amber|green)-\d{1,3}(?:\/\d{1,3})?|bg-(?:amber|green)-\d{1,3}(?:\/\d{1,3})?)\b/g;

const rawCssColorRegex = /#[0-9a-fA-F]{3,8}\b|rgba?\(/g;

function parseArgs(argv) {
  const args = { diffBase: null, reportPath: null, reportOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--diff-base') {
      args.diffBase = argv[i + 1] ?? null;
      i += 1;
    } else if (argv[i] === '--report-json') {
      args.reportPath = argv[i + 1] ?? null;
      i += 1;
    } else if (argv[i] === '--report-only') {
      args.reportOnly = true;
    }
  }
  return args;
}

function getAddedLinesByFile(diffBase) {
  const range = `${diffBase}...HEAD`;
  const output = execSync(`git diff --unified=0 --no-color ${range} -- src`, {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  const added = new Map();
  let currentFile = null;

  for (const line of output.split('\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice('+++ b/'.length).trim();
      continue;
    }
    if (!line.startsWith('@@') || !currentFile) continue;
    const match = line.match(/\+(\d+)(?:,(\d+))?/);
    if (!match) continue;

    const start = Number(match[1]);
    const count = Number(match[2] ?? '1');
    if (Number.isNaN(start) || Number.isNaN(count)) continue;

    if (!added.has(currentFile)) {
      added.set(currentFile, new Set());
    }
    const fileLines = added.get(currentFile);
    for (let n = 0; n < count; n += 1) {
      fileLines.add(start + n);
    }
  }

  return added;
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'dev-dist') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(fullPath)));
      continue;
    }
    results.push(fullPath);
  }
  return results;
}

function findLine(content, idx) {
  return content.slice(0, idx).split('\n').length;
}

function flattenKeys(value, prefix = '') {
  if (Array.isArray(value)) {
    return [`${prefix}[]`];
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, nested]) => {
      const full = prefix ? `${prefix}.${key}` : key;
      return flattenKeys(nested, full);
    });
  }
  return [prefix];
}

function readDictionaryFromTs(filePath, exportName) {
  const source = readFileSync(filePath, 'utf8');
  const patched = source
    .replace(/^import type .*$/m, '')
    .replace(
      new RegExp(`export const\\s+${exportName}\\s*:\\s*Dictionary\\s*=`, 'm'),
      `module.exports.${exportName} =`,
    );

  const sandbox = { module: { exports: {} }, exports: {} };
  vm.createContext(sandbox);
  new vm.Script(patched, { filename: filePath }).runInContext(sandbox);

  const value = sandbox.module.exports[exportName];
  if (!value || typeof value !== 'object') {
    throw new Error(`Could not resolve export "${exportName}" in ${filePath}`);
  }
  return value;
}

async function checkDesignCodex() {
  const { diffBase } = parseArgs(process.argv.slice(2));
  const addedLinesByFile = diffBase ? getAddedLinesByFile(diffBase) : null;
  const allFiles = await collectFiles(srcRoot);
  const violations = [];

  for (const fullPath of allFiles) {
    const ext = path.extname(fullPath).toLowerCase();
    if (!classScanExtensions.has(ext)) {
      continue;
    }

    const rel = path.relative(repoRoot, fullPath).replaceAll('\\', '/');
    const addedLines = addedLinesByFile ? addedLinesByFile.get(rel) : null;
    if (addedLinesByFile && !addedLines) {
      continue;
    }

    const content = await fs.readFile(fullPath, 'utf8');

    for (const cls of legacySurfaceClasses) {
      let start = 0;
      while (true) {
        const idx = content.indexOf(cls, start);
        if (idx === -1) break;
        violations.push({
          type: 'legacy-surface-class',
          file: rel,
          line: findLine(content, idx),
          detail: cls,
        });
        start = idx + cls.length;
      }
    }

    const acceptedIndices = new Set();
    for (const match of content.matchAll(acceptedRawColorPatternRegex)) {
      for (let i = 0; i < match[0].length; i += 1) {
        acceptedIndices.add(match.index + i);
      }
    }

    for (const match of content.matchAll(rawColorTokenRegex)) {
      const start = match.index;
      const token = match[0];
      let allowed = true;
      for (let i = 0; i < token.length; i += 1) {
        if (!acceptedIndices.has(start + i)) {
          allowed = false;
          break;
        }
      }
      if (allowed) continue;
      violations.push({
        type: 'raw-color-token',
        file: rel,
        line: findLine(content, start),
        detail: token,
      });
    }

    if (ext === '.css') {
      for (const match of content.matchAll(rawCssColorRegex)) {
        const start = match.index;
        const line = findLine(content, start);
        violations.push({
          type: 'raw-css-color',
          file: rel,
          line,
          detail: match[0],
        });
      }
    }
  }

  if (!addedLinesByFile) return violations;
  return violations.filter((v) => {
    const lines = addedLinesByFile.get(v.file);
    return lines?.has(v.line);
  });
}

function checkI18nParity() {
  const huPath = path.join(srcRoot, 'i18n', 'hu.ts');
  const enPath = path.join(srcRoot, 'i18n', 'en.ts');
  const hu = readDictionaryFromTs(huPath, 'hu');
  const en = readDictionaryFromTs(enPath, 'en');
  const huKeys = new Set(flattenKeys(hu));
  const enKeys = new Set(flattenKeys(en));

  const huOnly = [...huKeys].filter((k) => !enKeys.has(k)).sort();
  const enOnly = [...enKeys].filter((k) => !huKeys.has(k)).sort();
  return { huOnly, enOnly };
}

function printViolations(violations) {
  if (violations.length === 0) {
    console.log('Design codex class checks passed.');
    return;
  }
  console.error(`Design codex class checks failed with ${violations.length} violation(s):`);
  for (const v of violations) {
    console.error(`- ${v.type} ${v.file}:${v.line} (${v.detail})`);
  }
}

function printParity(parity) {
  if (parity.huOnly.length === 0 && parity.enOnly.length === 0) {
    console.log('HU/EN i18n parity passed.');
    return;
  }
  console.error('HU/EN i18n parity failed.');
  if (parity.huOnly.length > 0) {
    console.error(`- Missing in EN (${parity.huOnly.length}):`);
    for (const key of parity.huOnly) console.error(`  - ${key}`);
  }
  if (parity.enOnly.length > 0) {
    console.error(`- Missing in HU (${parity.enOnly.length}):`);
    for (const key of parity.enOnly) console.error(`  - ${key}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const violations = await checkDesignCodex();
  const parity = checkI18nParity();

  printViolations(violations);
  printParity(parity);

  if (args.reportPath) {
    const report = {
      generatedAt: new Date().toISOString(),
      mode: args.diffBase ? 'diff' : 'full',
      diffBase: args.diffBase,
      violationCount: violations.length,
      parity,
      violations,
    };
    await fs.writeFile(path.resolve(repoRoot, args.reportPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  const hasClassViolations = violations.length > 0;
  const hasParityViolations = parity.huOnly.length > 0 || parity.enOnly.length > 0;
  if (!args.reportOnly && (hasClassViolations || hasParityViolations)) {
    process.exitCode = 1;
  }
}

await main();
