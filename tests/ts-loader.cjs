const fs = require('node:fs');
const ts = require('typescript');
const compile = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const isTsx = filename.endsWith('.tsx');
  const code = ts.transpileModule
    ? ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText
    : require('esbuild').transformSync(source, {
        loader: isTsx ? 'tsx' : 'ts',
        format: 'cjs',
        target: 'es2022',
      }).code;
  module._compile(code, filename);
};
require.extensions['.ts'] = compile;
require.extensions['.tsx'] = compile;
