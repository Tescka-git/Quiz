import ts from 'typescript';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function checkSource(text, filename = 'engine.ts') {
  const file = ts.createSourceFile(filename, text, ts.ScriptTarget.ES2017, true);
  if (file.referencedFiles.length || file.typeReferenceDirectives.length || file.libReferenceDirectives.length)
    throw new Error('Références externes interdites');
  const forbidden = new Set(['Date', 'globalThis', 'process', 'Buffer', 'require', 'window', 'document',
    'fetch', 'WebSocket', 'localStorage', 'sessionStorage', 'navigator', 'setTimeout', 'setInterval',
    'performance', 'crypto', 'eval', 'Function', 'Promise', 'Reflect', 'Intl',
    'constructor', '__proto__', 'prototype', 'getPrototypeOf', 'setPrototypeOf']);
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node) || ts.isExportDeclaration(node)
      || ts.isImportTypeNode(node) || node.kind === ts.SyntaxKind.ImportKeyword)
      throw new Error('Imports et réexportations interdits dans ce premier moteur autonome');
    if (ts.isIdentifier(node) && forbidden.has(node.text)) throw new Error(`API interdite : ${node.text}`);
    // Math est entièrement exclu, y compris les alias de Math.random.
    if (ts.isIdentifier(node) && node.text === 'Math') throw new Error('Math interdit dans ce sous-ensemble');
    if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)
      && forbidden.has(node.argumentExpression.text)) throw new Error('Accès indirect à une API interdite');
    if (ts.isWithStatement(node)) throw new Error('with interdit');
    if (node.kind === ts.SyntaxKind.ThisKeyword || node.kind === ts.SyntaxKind.SuperKeyword)
      throw new Error('Accès au contexte implicite interdit');
    ts.forEachChild(node, visit);
  }
  visit(file);
}

export async function buildEngine() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const manifest = JSON.parse(await readFile(resolve(root, 'packages/engine/package.json'), 'utf8'));
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    if (Object.keys(manifest[field] || {}).length) throw new Error(`Dépendance moteur interdite : ${field}`);
  }
  const configPath = resolve(root, 'packages/engine/tsconfig.json');
  const raw = ts.readConfigFile(configPath, ts.sys.readFile);
  if (raw.error) throw new Error(ts.flattenDiagnosticMessageText(raw.error.messageText, '\n'));
  const config = ts.parseJsonConfigFileContent(raw.config, ts.sys, resolve(root, 'packages/engine'));
  if (config.errors.length) throw new Error(config.errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  if (config.options.types?.length || config.options.lib?.some(x => !/^lib\.es[\w.]*\.d\.ts$/.test(x))) throw new Error('Bibliothèque environnement interdite');
  const program = ts.createProgram(config.fileNames, config.options);
  const checker = program.getTypeChecker();
  const allowedGlobals = new Set(['Number', 'Error', 'JSON', 'Array', 'String', 'Boolean', 'undefined']);
  for (const source of program.getSourceFiles()) {
    if (!program.isSourceFileDefaultLibrary(source)) {
      if (source.isDeclarationFile || !config.fileNames.includes(source.fileName)) throw new Error('Dépendance transitive interdite');
      checkSource(source.text, source.fileName);
      function inspectGlobals(node) {
        if (ts.isIdentifier(node) && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)) {
          const symbol = checker.getSymbolAtLocation(node);
          if (symbol?.declarations?.some(d => program.isSourceFileDefaultLibrary(d.getSourceFile()))
            && !allowedGlobals.has(node.text)) throw new Error(`Global hors sous-ensemble : ${node.text}`);
        }
        ts.forEachChild(node, inspectGlobals);
      }
      inspectGlobals(source);
    }
  }
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) throw new Error(diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  await mkdir(resolve(root, 'artifacts/engine'), { recursive: true });
  const result = program.emit();
  if (result.emitSkipped) throw new Error('Compilation refusée');
  const output = resolve(root, 'artifacts/engine/engine.js');
  const bytes = await readFile(output);
  checkSource(bytes.toString(), 'engine.js');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  await writeFile(resolve(root, 'artifacts/engine/manifest.json'), JSON.stringify({ sha256, typescript: ts.version,
    target: 'ES2017', androidValidated: false }, null, 2));
  return { output, sha256 };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(await buildEngine());
}
