import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, access } from 'node:fs/promises';
import path from 'node:path';

export const root = path.resolve(import.meta.dirname, '..');
export const readJson = async (file) => JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
export const digest = (value) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export async function exists(file) {
  try { await access(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temp, file);
}
export function inside(directory, relative) {
  const result = path.resolve(directory, relative);
  const rel = path.relative(path.resolve(directory), result);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`Invalid artifact path: ${relative}`);
  return result;
}
