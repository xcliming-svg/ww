import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { files, check, finish, readJson, registry } from './context.mjs';
import { parseSource, literal, readLiteral } from './source.mjs';

/** @type {Map<string,string>} */
const scenes = new Map();
/** @type {string[]} */
const transitions = [];
/** @type {string[]} */
const registeredScenes = [];
const handles = new Set(),
  invokes = new Set(),
  sends = new Set(),
  receives = new Set();
let workers = 0;
let desktopWindows = 0;
let desktopRulesImport = false;
let desktopSaveGuards = 0;
let rendererSaveVersion = false;
/** @type {string[]} */
const preloadTargets = [];
/** @type {Map<string,string[]>} */
const globs = new Map();
const loaderImports = new Set();
/** @param {import('typescript').Node|undefined} object @param {string} name */
function property(object, name) {
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined;
  const entry = object.properties.find(
    (item) =>
      ts.isPropertyAssignment(item) &&
      (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) &&
      item.name.text === name,
  );
  return entry && ts.isPropertyAssignment(entry) ? entry.initializer : undefined;
}
const entryNames = new Set(['main.js', 'combat-worker.js', 'contracts.js', 'elements.js']);
for (const file of files) {
  const ast = await parseSource(file);
  const source = ast.text;
  if (file.startsWith('src/'))
    check(
      entryNames.has(path.posix.basename(file)) ||
        /^[A-Z][A-Za-z0-9]*[.]js$/.test(path.posix.basename(file)),
      `Module naming:${file}`,
    );
  // JSDoc imports are also architectural dependencies even when erased by Vite.
  if (file.startsWith('src/domain/')) {
    for (const match of source.matchAll(/import\(['"]([^'"]+)['"]\)/g)) {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
      check(
        match[1].startsWith('.') && /^(src\/domain\/|data\/)/.test(resolved),
        `Domain type boundary:${file}:${match[1]}`,
      );
    }
  }
  // The only suppression is the explicitly generated Ajv output (not in files).
  /** @param {import('typescript').Node} node */
  function visit(node) {
    if (file === 'desktop/main.cjs') {
      if (
        ts.isVariableDeclaration(node) &&
        node.name.getText(ast) === 'rules' &&
        node.initializer &&
        ts.isCallExpression(node.initializer) &&
        node.initializer.expression.getText(ast) === 'require'
      ) {
        const target = node.initializer.arguments[0];
        desktopRulesImport =
          !!target && ts.isStringLiteral(target) && target.text === '../data/rules.json';
      }
      if (
        ts.isIfStatement(node) &&
        ts.isBinaryExpression(node.expression) &&
        node.expression.left.getText(ast) === 'parsed?.schemaVersion'
      ) {
        desktopSaveGuards++;
        check(
          node.expression.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken &&
            node.expression.right.getText(ast) === 'rules.schemaVersion',
          'Desktop save version must use current rules',
        );
      }
    }
    if (
      file === 'src/infrastructure/SaveRepository.js' &&
      ts.isPropertyAssignment(node) &&
      node.name.getText(ast) === 'schemaVersion'
    ) {
      rendererSaveVersion = node.initializer.getText(ast) === 'this.config.rules.schemaVersion';
    }
    if (
      file === 'src/infrastructure/ConfigLoader.js' &&
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      loaderImports.add(
        path.posix.normalize(path.posix.join(path.posix.dirname(file), node.moduleSpecifier.text)),
      );
    }
    if (
      file === 'desktop/main.cjs' &&
      ts.isNewExpression(node) &&
      node.expression.getText(ast) === 'BrowserWindow'
    ) {
      desktopWindows++;
      const preload = property(property(node.arguments?.[0], 'webPreferences'), 'preload');
      check(
        !!preload &&
          ts.isCallExpression(preload) &&
          preload.expression.getText(ast) === 'path.join',
        'BrowserWindow preload path expression',
      );
      if (preload && ts.isCallExpression(preload)) {
        const [base, target] = preload.arguments;
        check(
          preload.arguments.length === 2 &&
            base?.getText(ast) === '__dirname' &&
            !!target &&
            ts.isStringLiteral(target),
          'BrowserWindow preload arguments',
        );
        if (target && ts.isStringLiteral(target))
          preloadTargets.push(
            path.posix.normalize(path.posix.join(path.posix.dirname(file), target.text)),
          );
      }
    }
    if (file.startsWith('src/') && ts.isClassDeclaration(node) && node.name)
      check(/^[A-Z][A-Za-z0-9]*$/.test(node.name.text), `Class naming:${file}:${node.name.text}`);
    if (file.startsWith('src/') && ts.isFunctionDeclaration(node) && node.name)
      check(
        /^[a-z][A-Za-z0-9]*$/.test(node.name.text),
        `Function naming:${file}:${node.name.text}`,
      );
    for (const comment of [
      ...(ts.getLeadingCommentRanges(source, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(source, node.end) ?? []),
    ]) {
      check(
        !/@ts-(?:ignore|nocheck|expect-error)\b|eslint-disable|prettier-ignore/.test(
          source.slice(comment.pos, comment.end),
        ),
        `Suppressed inspection:${file}`,
      );
    }
    if (
      ts.isClassDeclaration(node) &&
      node.heritageClauses?.some((clause) =>
        clause.types.some((type) => type.expression.getText(ast) === 'Phaser.Scene'),
      )
    ) {
      const ctor = node.members.find(ts.isConstructorDeclaration);
      const call = ctor?.body?.statements.find(
        (statement) =>
          ts.isExpressionStatement(statement) &&
          ts.isCallExpression(statement.expression) &&
          statement.expression.expression.kind === ts.SyntaxKind.SuperKeyword,
      );
      const key =
        call && ts.isExpressionStatement(call) && ts.isCallExpression(call.expression)
          ? call.expression.arguments[0]
          : undefined;
      check(!!key && ts.isStringLiteral(key), `Non-literal Scene key:${file}`);
      if (key && ts.isStringLiteral(key)) {
        check(!scenes.has(key.text), `Duplicate Scene:${key.text}`);
        scenes.set(key.text, node.name?.text ?? '');
      }
    }
    if (
      file === 'src/bootstrap/main.js' &&
      ts.isPropertyAssignment(node) &&
      node.name.getText(ast) === 'scene'
    ) {
      check(ts.isArrayLiteralExpression(node.initializer), 'Scene registry must be explicit');
      if (ts.isArrayLiteralExpression(node.initializer))
        for (const item of node.initializer.elements) {
          check(
            ts.isNewExpression(item) && ts.isIdentifier(item.expression),
            'Scene registry constructor',
          );
          if (ts.isNewExpression(item)) registeredScenes.push(item.expression.getText(ast));
        }
    }
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Worker'
    ) {
      workers++;
      const url = node.arguments?.[0],
        options = node.arguments?.[1];
      check(
        !!url && ts.isNewExpression(url) && url.expression.getText(ast) === 'URL',
        `Worker URL:${file}`,
      );
      if (url && ts.isNewExpression(url)) {
        const target = url.arguments?.[0];
        check(!!target && ts.isStringLiteral(target), `Worker target must be literal:${file}`);
        if (target && ts.isStringLiteral(target))
          check(
            path.posix.normalize(path.posix.join(path.posix.dirname(file), target.text)) ===
              'src/application/combat-worker.js',
            'Worker entry contract',
          );
        check(url.arguments?.[1]?.getText(ast) === 'import.meta.url', 'Worker URL base');
      }
      check(!!options && literal(options).type === 'module', 'Worker module type');
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const receiver = node.expression.expression.getText(ast),
        method = node.expression.name.text;
      const first = node.arguments[0];
      if (receiver === 'import.meta' && method === 'glob') {
        check(!!first && ts.isStringLiteral(first), `Unresolved JSON glob:${file}`);
        const options = node.arguments[1];
        check(!!options && ts.isObjectLiteralExpression(options), `JSON glob options:${file}`);
        if (options && ts.isObjectLiteralExpression(options)) {
          const settings = literal(options);
          check(
            settings.eager === true &&
              settings.import === 'default' &&
              Object.keys(settings).sort().join(',') === 'eager,import',
            `JSON glob loading contract:${file}`,
          );
        }
        if (first && ts.isStringLiteral(first))
          globs.set(file, [...(globs.get(file) ?? []), first.text]);
      }
      if (receiver === 'this.scene' && ['start', 'launch', 'switch', 'run'].includes(method)) {
        check(!!first && ts.isStringLiteral(first), `Unresolved Scene transition:${file}`);
        if (first && ts.isStringLiteral(first)) transitions.push(first.text);
      }
      const channels =
        receiver === 'ipcMain' && method === 'handle'
          ? handles
          : receiver === 'ipcRenderer' && method === 'invoke'
            ? invokes
            : receiver === 'ipcRenderer' && ['on', 'removeListener'].includes(method)
              ? receives
              : receiver.endsWith('webContents') && method === 'send'
                ? sends
                : null;
      if (channels) {
        check(!!first && ts.isStringLiteral(first), `Unresolved IPC channel:${file}`);
        if (first && ts.isStringLiteral(first)) channels.add(first.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
check(
  JSON.stringify(registeredScenes) ===
    JSON.stringify(['BootScene', 'PreloadScene', 'TitleScene', 'BattlefieldScene', 'OutcomeScene']),
  'Scene registration order',
);
check(
  scenes.size === registeredScenes.length &&
    [...scenes.values()].every((name) => registeredScenes.includes(name)),
  'Unregistered Scene',
);
for (const target of transitions) check(scenes.has(target), `Missing Scene:${target}`);
check(workers === 1, 'Single combat Worker creation path');
await fs.access('src/application/combat-worker.js');
check(
  desktopWindows === 1 && JSON.stringify(preloadTargets) === '["desktop/preload.cjs"]',
  'BrowserWindow/preload connection',
);
for (const target of preloadTargets) await fs.access(target);
const expectedGlobs = new Map([
  ['src/infrastructure/ConfigLoader.js', ['/data/**/*.json', '/locales/*.json']],
  ['src/bootstrap/main.js', ['/locales/*.json']],
]);
check(globs.size === expectedGlobs.size, 'JSON glob call sites');
for (const [file, patterns] of expectedGlobs)
  check(
    JSON.stringify(globs.get(file)) === JSON.stringify(patterns),
    `JSON glob patterns/count:${file}`,
  );
/** The three accepted calls use only these two patterns; do not evaluate game modules.
 * @param {string} file @param {string} pattern */
function coveredByGlob(file, pattern) {
  return pattern === '/data/**/*.json'
    ? /^data\/.+[.]json$/.test(file)
    : pattern === '/locales/*.json' && /^locales\/[^/]+[.]json$/.test(file);
}
check(
  loaderImports.has('data/schemas/registry.json') && loaderImports.has('desktop/builder.json'),
  'ConfigLoader registry/desktop imports',
);
for (const file of registry)
  check(
    loaderImports.has(file) ||
      (globs.get('src/infrastructure/ConfigLoader.js') ?? []).some((pattern) =>
        coveredByGlob(file, pattern),
      ),
    `Registry file outside loader inputs:${file}`,
  );
const localeManifest = await readJson('locales/manifest.json');
for (const locale of new Set([
  ...localeManifest.supportedLocales,
  localeManifest.defaultLocale,
  localeManifest.fallbackLocale,
])) {
  const file = `locales/${locale}.json`;
  check(
    registry.includes(file) &&
      (globs.get('src/bootstrap/main.js') ?? []).some((pattern) => coveredByGlob(file, pattern)),
    `Locale outside bootstrap/registry:${file}`,
  );
  await fs.access(file);
}
for (const channel of invokes) check(handles.has(channel), `Unhandled IPC:${channel}`);
for (const channel of handles) check(invokes.has(channel), `Unused IPC handler:${channel}`);
for (const channel of receives) check(sends.has(channel), `Unsent IPC event:${channel}`);
for (const channel of sends) check(receives.has(channel), `Unreceived IPC event:${channel}`);

// Removing stripDoctrine preserves JSON acceptance: the original explicit guard
// remains, and the schema admits precisely the same values and no extra keys.
const saveSchema = await readJson('data/schemas/save.schema.json');
const rules = await readJson('data/rules.json');
check(
  desktopRulesImport && desktopSaveGuards === 1 && rendererSaveVersion,
  'Shared save version source',
);
check(
  saveSchema.properties.schemaVersion.const === rules.schemaVersion,
  'Save schema/rules version',
);
const choices = await readLiteral('src/domain/model/Doctrine.js', 'doctrineChoices');
for (const shape of [saveSchema.properties.state, saveSchema.definitions.checkpoint]) {
  const doctrine = shape.properties.doctrines;
  check(
    doctrine.type === 'object' && doctrine.additionalProperties === false,
    'Doctrine object contract',
  );
  check(
    JSON.stringify(doctrine.required) === '["primary","secondary"]',
    'Doctrine required fields',
  );
  for (const slot of ['primary', 'secondary'])
    check(
      JSON.stringify(doctrine.properties[slot].enum) ===
        JSON.stringify([...choices[slot].map((/** @type {any} */ choice) => choice.id), null]),
      `Doctrine schema/source enum:${slot}`,
    );
}
finish('source references (Scene/Worker/preload/globs/IPC/type boundaries/schema contracts)');
