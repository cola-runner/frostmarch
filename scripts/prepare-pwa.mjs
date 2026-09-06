import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = new URL('../dist/client/', import.meta.url);
const rootPath = fileURLToPath(root);
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? walk(join(dir, entry.name))
          : join(dir, entry.name),
      ),
    )
  ).flat();
}
const files = (await walk(rootPath))
  .filter(
    (file) =>
      /\.(js|css|webp|png|svg|woff2|webmanifest|txt)$/.test(file) &&
      !file.endsWith('/sw.js'),
  )
  .sort();
const hash = createHash('sha256');
for (const file of [join(rootPath, 'index.html'), ...files])
  hash.update(await readFile(file));
const assets = ['/', ...files.map((file) => '/' + relative(rootPath, file))];
const source = await readFile(
  new URL('../public/sw.js', import.meta.url),
  'utf8',
);
const worker = source
  .replace(
    "'frostmarch-development'",
    JSON.stringify('frostmarch-' + hash.digest('hex').slice(0, 16)),
  )
  .replace(
    '/* BUILD_ASSETS */',
    assets.map((asset) => JSON.stringify(asset)).join(',\n  '),
  );
await writeFile(new URL('sw.js', root), worker);
console.log(`Offline campaign prepared: ${assets.length} resources.`);
