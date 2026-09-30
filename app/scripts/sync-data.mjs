// Copies the read-only data layer into public/data/ and verifies image hashes.
// Sources (relative to the trainer root, i.e. the parent of app/):
//   data/normalized/bank.json, data/interactions/hotspot.json, data/keys/source_keys.json,
//   research/question_reviews.json, data/original/images/*
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const root = path.resolve(appRoot, '..');
const out = path.join(appRoot, 'public', 'data');

const FILES = [
  ['data/normalized/bank.json', 'bank.json'],
  ['data/interactions/hotspot.json', 'hotspot.json'],
  ['data/keys/source_keys.json', 'source_keys.json'],
  ['research/question_reviews.json', 'question_reviews.json'],
];

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const fail = (msg) => {
  console.error(`sync-data FAILED: ${msg}`);
  process.exit(1);
};

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'images'), { recursive: true });

const manifest = { files: {}, research_version: null, generated_at: new Date().toISOString() };

for (const [from, to] of FILES) {
  const src = path.join(root, from);
  if (!fs.existsSync(src)) fail(`missing source file ${from}`);
  const buf = fs.readFileSync(src);
  try {
    JSON.parse(buf.toString('utf8'));
  } catch (e) {
    fail(`${from} is not valid JSON: ${e.message}`);
  }
  fs.writeFileSync(path.join(out, to), buf);
  manifest.files[to] = sha(buf);
}

const bank = JSON.parse(fs.readFileSync(path.join(out, 'bank.json'), 'utf8'));
const reviews = JSON.parse(fs.readFileSync(path.join(out, 'question_reviews.json'), 'utf8'));
manifest.research_version = reviews.research_version ?? null;

// Images: copy every file, verify against bank.images sha256, and require an exact file set.
const imgDir = path.join(root, 'data', 'original', 'images');
const onDisk = fs.readdirSync(imgDir).filter((f) => fs.statSync(path.join(imgDir, f)).isFile());
const expected = Object.keys(bank.images); // "images/Q001_image_01.jpg"
for (const rel of expected) {
  const name = rel.replace(/^images\//, '');
  const p = path.join(imgDir, name);
  if (!fs.existsSync(p)) fail(`image listed in bank.json is missing on disk: ${rel}`);
  const buf = fs.readFileSync(p);
  const h = sha(buf);
  if (h !== bank.images[rel].sha256) fail(`sha256 mismatch for ${rel}: bank.json=${bank.images[rel].sha256} disk=${h}`);
  fs.writeFileSync(path.join(out, 'images', name), buf);
  manifest.files[`images/${name}`] = h;
}
const extra = onDisk.filter((f) => !expected.includes(`images/${f}`));
if (extra.length) fail(`images on disk not listed in bank.json: ${extra.join(', ')}`);

// Every image block in every question must match the images table.
for (const q of bank.questions) {
  const blocks = [...q.stem, ...q.choices.flatMap((c) => c.blocks)];
  for (const b of blocks) {
    if (b.type !== 'image') continue;
    const meta = bank.images[b.file];
    if (!meta) fail(`${q.id}: image block ${b.file} not in images table`);
    if (meta.sha256 !== b.sha256) fail(`${q.id}: block hash differs from images table for ${b.file}`);
    if (meta.question_id !== q.id) fail(`${q.id}: image ${b.file} belongs to ${meta.question_id}`);
  }
}

fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(
  `sync-data OK: ${FILES.length} JSON files, ${expected.length} images verified, research_version=${manifest.research_version}`,
);
