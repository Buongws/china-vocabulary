import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const source = join(process.cwd(), 'node_modules/hanzi-writer-data');
const target = join(process.cwd(), 'public/hanzi');
await mkdir(target, { recursive: true });
const names = (await readdir(source)).filter(name => name.endsWith('.json') && [...name.slice(0, -5)].length === 1);
for (let i = 0; i < names.length; i += 100) {
  await Promise.all(names.slice(i, i + 100).map(name => copyFile(join(source, name), join(target, name))));
}
console.log(`Prepared stroke data for ${names.length} characters.`);
