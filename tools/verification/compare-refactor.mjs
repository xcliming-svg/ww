import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// Historical refactoring audit, separate from ongoing acceptance of feature changes.
// All inputs are parsed as text/AST. No game module or generated validator is imported.
const manifestPath = process.argv[2];
if (!manifestPath) throw new Error('MANIFEST_PATH_REQUIRED');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
/** @param {string[]} args */
const git = args => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
const originals = git(['ls-tree', '-r', '--name-only', manifest.base]).toString().trim().split('\n');
/** @type {string[]} */
const errors = [];
/** @type {{file:string,sha256:string}[]} */
const evidence = [];
/** @param {string} file */
const original = file => git(['show', `${manifest.base}:${file}`]).toString('utf8');
/** @param {string} file @param {string} source */
const parse = (file, source) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
/** @param {string} file @param {string} specifier @param {string} [symbol] */
function canonicalImport(file, specifier, symbol = '') {
  if (!specifier.startsWith('.')) return specifier;
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
  return manifest.symbolMoves?.[`${resolved}:${symbol}`] ?? manifest.fileMoves[resolved] ?? resolved;
}

/** Semantic AST shape, excluding formatting/comments and redundant parentheses.
 * Operator nodes, declaration flags, modifiers, optional chains, order and literal values remain.
 * @param {import('typescript').Node} node @param {string} file @returns {any} */
function shape(node, file) {
  if (ts.isParenthesizedExpression(node)) return shape(node.expression, file);
  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
    const specifier = node.moduleSpecifier.text;
    const clause = node.importClause;
    const bindings = clause?.namedBindings;
    const named = bindings && ts.isNamedImports(bindings) ? bindings.elements.map(element => {
      const imported = element.propertyName?.text ?? element.name.text;
      return [canonicalImport(file, specifier, imported), imported, element.name.text];
    }) : [];
    return ['import', clause?.name?.text ?? '', bindings && ts.isNamespaceImport(bindings) ? bindings.name.text : '', named.length ? named : canonicalImport(file, specifier), node.attributes ? shape(node.attributes, file) : null];
  }
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) return ['identifier', node.text];
  if (ts.isStringLiteral(node)) {
    if (node.parent && ('name' in node.parent) && node.parent.name === node) return ['identifier', node.text];
    return ['string', node.text];
  }
  if (ts.isNumericLiteral(node)) return ['number', Number(node.text)];
  if (ts.isRegularExpressionLiteral(node)) return ['regexp', node.text];
  if (ts.isTemplateLiteralToken(node)) return [node.kind, node.text, node.rawText];
  /** @type {any[]} */
  const children = [];
  ts.forEachChild(node, child => { children.push(shape(child, file)); });
  return [node.kind, ts.isVariableDeclarationList(node) ? node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) : 0, children];
}

/** @param {string} file @param {string} source @param {boolean} before */
function normalized(file, source, before) {
  if (before) for (const replacement of manifest.replacements[file] ?? []) {
    if (!source.includes(replacement.from)) throw new Error(`MISSING_REVIEWED_CHANGE:${file}:${replacement.from}`);
    source = source.replace(replacement.from, replacement.to);
  }
  const ast = parse(file, source);
  const statements = ast.statements.filter(statement => {
    const name = 'name' in statement && statement.name && ts.isIdentifier(/** @type {import('typescript').Node} */ (statement.name)) ? /** @type {import('typescript').Identifier} */ (statement.name).text : '';
    return !(before && (manifest.removedDeclarations[file] ?? []).includes(name));
  });
  return statements.map(statement => {
    const name = 'name' in statement && statement.name && ts.isIdentifier(/** @type {import('typescript').Node} */ (statement.name)) ? /** @type {import('typescript').Identifier} */ (statement.name).text : '';
    if (before && (manifest.privateDeclarations[file] ?? []).includes(name) && ts.isFunctionDeclaration(statement)) {
      const modifiers = statement.modifiers?.filter(modifier => modifier.kind !== ts.SyntaxKind.ExportKeyword);
      return shape(ts.factory.updateFunctionDeclaration(statement, modifiers, statement.asteriskToken, statement.name, statement.typeParameters, statement.parameters, statement.type, statement.body), file);
    }
    return shape(statement, file);
  });
}

const runtime = originals.filter(file => /^(src\/.*\.js|desktop\/.*\.cjs|tools\/balance-[^/]+\.mjs|tools\/import-annual52\.mjs)$/.test(file));
const expected = new Set();
for (const file of runtime) {
  if (manifest.removedFiles.includes(file)) {
    try { await fs.access(file); errors.push(`Removed file still exists:${file}`); } catch { /* Absence is required. */ }
    continue;
  }
  const target = manifest.fileMoves[file] ?? file;
  expected.add(target);
  const before = original(file), after = await fs.readFile(target, 'utf8');
  const generated = file.endsWith('/schema-validators.js') || file.endsWith('/Annual52Content.js');
  const left = generated ? before.replaceAll('\r\n', '\n') : JSON.stringify(normalized(file, before, true));
  const right = generated ? after.replaceAll('\r\n', '\n') : JSON.stringify(normalized(target, after, false));
  if (left !== right) errors.push(`Unreviewed AST/content change:${file} -> ${target}`);
  else evidence.push({ file: target, sha256: createHash('sha256').update(right).digest('hex') });
}
for (const [key, target] of Object.entries(manifest.symbolMoves)) {
  const split = key.lastIndexOf(':'), file = key.slice(0, split), name = key.slice(split + 1);
  const ast = parse(file, original(file));
  const statement = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  if (!statement) throw new Error(`MISSING_MOVED_SYMBOL:${key}`);
  const after = normalized(String(target), await fs.readFile(String(target), 'utf8'), false);
  if (JSON.stringify([shape(statement, file)]) !== JSON.stringify(after)) errors.push(`Moved function changed:${key}`);
  expected.add(String(target));
}
for (const [oldFile, target] of Object.entries(manifest.fileMoves)) {
  if (oldFile === target) continue;
  try { await fs.access(oldFile); errors.push(`Old path still exists:${oldFile}`); } catch { /* No compatibility copy. */ }
}
/** @param {string} directory @returns {Promise<string[]>} */
async function walk(directory) {
  return (await Promise.all((await fs.readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory()
    ? walk(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]))).flat();
}
for (const file of await walk('src')) if (file.endsWith('.js') && !expected.has(file)) errors.push(`Unreviewed runtime file:${file}`);
const protectedFiles = originals.filter(file => /^(data\/|locales\/|public\/)/.test(file) || ['index.html', 'src/adapters/ui/styles.css', 'desktop/builder.json'].includes(file));
for (const file of protectedFiles) {
  const before = git(['show', `${manifest.base}:${file}`]), after = await fs.readFile(file);
  if (!before.equals(after) && (!/\.(json|css|html|txt)$/.test(file) || before.toString().replaceAll('\r\n', '\n') !== after.toString().replaceAll('\r\n', '\n'))) errors.push(`Protected content changed:${file}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(JSON.stringify({ status: 'PASS', baseline: manifest.base, sourceFiles: evidence.length,
  movedFunctions: Object.keys(manifest.symbolMoves).length, protectedFiles: protectedFiles.length,
  astDigest: createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),
  limits: 'Static AST/content comparison, not behavioral equivalence or runtime verification.' }, null, 2));
