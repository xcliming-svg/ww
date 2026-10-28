import fs from 'node:fs/promises';
import ts from 'typescript';

/** Parse source only. Never import/evaluate the inspected module.
 * @param {string} file */
export async function parseSource(file) {
  return ts.createSourceFile(file, await fs.readFile(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
}

/** Only literal data is accepted; calls, getters, spreads and computed keys fail closed.
 * @param {import('typescript').Node} node @returns {any} */
export function literal(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) return -Number(node.operand.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
    if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) throw new Error('NON_LITERAL_PROPERTY');
    return [property.name.text, literal(property.initializer)];
  }));
  throw new Error(`NON_LITERAL_SOURCE:${ts.SyntaxKind[node.kind]}`);
}

/** @param {string} file @param {string} name @returns {Promise<any>} */
export async function readLiteral(file, name) {
  const ast = await parseSource(file);
  for (const statement of ast.statements) if (ts.isVariableStatement(statement)) {
    const declaration = statement.declarationList.declarations.find(item => ts.isIdentifier(item.name) && item.name.text === name);
    if (declaration?.initializer) return literal(declaration.initializer);
  }
  throw new Error(`MISSING_LITERAL:${file}:${name}`);
}

/** Read literal campaign overrides from the existing default factory call without executing it.
 * @param {string} file @param {string} name @returns {Promise<any>} */
export async function readDefaultProperty(file, name) {
  const ast = await parseSource(file);
  for (const statement of ast.statements) if (ts.isExportAssignment(statement) && ts.isCallExpression(statement.expression)) {
    const object = statement.expression.arguments[0];
    if (!ts.isObjectLiteralExpression(object)) break;
    const property = object.properties.find(item => ts.isPropertyAssignment(item) && item.name.getText(ast) === name);
    if (property && ts.isPropertyAssignment(property)) return literal(property.initializer);
  }
  throw new Error(`MISSING_DEFAULT_PROPERTY:${file}:${name}`);
}
