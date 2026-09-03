import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const rootManifest = readJson(join(projectRoot, 'package.json'));
const outputPath = join(projectRoot, 'public', 'THIRD_PARTY_LICENSES.txt');
const packages = new Map();

for (const name of Object.keys(rootManifest.dependencies ?? {})) {
  visitPackage(join(projectRoot, 'node_modules', name));
}

const records = [...packages.values()].sort((left, right) =>
  left.id.localeCompare(right.id),
);
const texts = new Map();

for (const record of records) {
  for (const file of findNoticeFiles(record.root)) {
    const content = normalizeNoticeText(
      readFileSync(join(record.root, file), 'utf8'),
    );
    if (!content) continue;
    const hash = createHash('sha256').update(content).digest('hex');
    const entry = texts.get(hash) ?? { content, packages: [], files: [] };
    entry.packages.push(record.id);
    entry.files.push(`${record.id}/${file}`);
    texts.set(hash, entry);
  }
}

const lines = [
  'THIRD-PARTY SOFTWARE NOTICES',
  '============================',
  '',
  'This inventory is generated from the installed production dependency tree.',
  'The original license and notice texts follow the package list. Package',
  'authors retain all rights granted by their respective licenses.',
  '',
  `Packages: ${records.length}`,
  '',
  ...records.map(
    ({ id, license, author, homepage }) =>
      `- ${id} | ${license}${author ? ` | ${author}` : ''}${homepage ? ` | ${homepage}` : ''}`,
  ),
  '',
  'LICENSE AND NOTICE TEXTS',
  '========================',
  '',
];

for (const entry of [...texts.values()].sort((left, right) =>
  left.packages[0].localeCompare(right.packages[0]),
)) {
  lines.push('-'.repeat(80));
  lines.push(
    `Packages: ${[...new Set(entry.packages)]
      .sort((left, right) => left.localeCompare(right))
      .join(', ')}`,
  );
  lines.push(
    `Files: ${entry.files.sort((left, right) => left.localeCompare(right)).join(', ')}`,
  );
  lines.push('-'.repeat(80));
  lines.push(entry.content);
  lines.push('');
}

const withoutText = records
  .filter((record) => findNoticeFiles(record.root).length === 0)
  .map((record) => record.id);
if (withoutText.length > 0) {
  lines.push('-'.repeat(80));
  lines.push('Packages without a top-level LICENSE/NOTICE file');
  lines.push('-'.repeat(80));
  lines.push(...withoutText);
  lines.push('');
}

writeFileSync(outputPath, `${lines.join('\n').replace(/\n+$/, '')}\n`, 'utf8');
console.log(`Wrote ${outputPath} for ${records.length} production packages.`);

function visitPackage(packagePath) {
  if (!existsSync(packagePath)) return;
  const root = realpathSync(packagePath);
  const manifestPath = join(root, 'package.json');
  if (!existsSync(manifestPath)) return;

  const manifest = readJson(manifestPath);
  const id = `${manifest.name}@${manifest.version}`;
  if (packages.has(id)) return;

  packages.set(id, {
    id,
    root,
    license: normalizeLicense(manifest.license ?? manifest.licenses),
    author: normalizeAuthor(manifest.author),
    homepage: normalizeHomepage(manifest),
  });

  const modulesRoot = manifest.name?.startsWith('@')
    ? dirname(dirname(root))
    : dirname(root);
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
  };
  for (const name of Object.keys(dependencies)) {
    visitPackage(join(modulesRoot, name));
  }
}

function findNoticeFiles(packageRoot) {
  return readdirSync(packageRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        /^(?:licen[cs]e|copying|notice|copyright)(?:\..*)?$/i.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort();
}

function normalizeLicense(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const licenses = value
      .map((entry) => (typeof entry === 'string' ? entry : entry?.type))
      .filter(Boolean);
    return licenses.join(' OR ') || 'UNSPECIFIED';
  }
  if (value && typeof value.type === 'string') return value.type;
  return 'UNSPECIFIED';
}

function normalizeHomepage(manifest) {
  if (typeof manifest.homepage === 'string') return manifest.homepage;
  if (typeof manifest.repository === 'string') return manifest.repository;
  if (typeof manifest.repository?.url === 'string') {
    return manifest.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
  }
  return '';
}

function normalizeAuthor(value) {
  if (typeof value === 'string') return value;
  if (typeof value?.name === 'string') return value.name;
  return '';
}

function normalizeNoticeText(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
