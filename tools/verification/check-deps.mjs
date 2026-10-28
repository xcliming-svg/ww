import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { files, check, finish } from './context.mjs';
/** @type {Map<string,string[]>} */ const edges = new Map();
for (const file of files) {
  const source = await fs.readFile(file, 'utf8'); const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  /** @type {string[]} */
  const imports = [];
  /** @param {import('typescript').Node} node */ function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    if (file.startsWith('src/domain/') && ts.isIdentifier(node) && ['window', 'document', 'Phaser', 'setTimeout', 'requestAnimationFrame'].includes(node.text)) check(false, `Domain platform reference:${file}:${node.text}`);
    if (file.startsWith('src/domain/') && ts.isPropertyAccessExpression(node) && ['Math.random', 'Date.now'].includes(node.getText(ast))) check(false, `Nondeterministic domain reference:${file}`);
    ts.forEachChild(node, visit);
  } visit(ast);
  const paths = imports.filter(p => p.startsWith('.')).map(p => path.posix.normalize(path.posix.join(path.posix.dirname(file), p)));
  for (const p of paths) try { await fs.access(p); } catch { check(false, `Missing import:${file} -> ${p}`); }
  edges.set(file, paths.filter(p => /\.(?:js|mjs|cjs)$/.test(p)));
  if (file.startsWith('src/domain/')) check(imports.every(p => p.startsWith('.') && !/(adapters|application|infrastructure)/.test(p)), `Domain layer violation:${file}`);
}
const seen = new Set(), active = new Set();
/** @param {string} file */ function visit(file) { if (active.has(file)) { check(false, `Dependency cycle:${file}`); return; } if (seen.has(file)) return; active.add(file); for (const child of edges.get(file) ?? []) visit(child); active.delete(file); seen.add(file); }
for (const file of files) visit(file);
finish('deps');
