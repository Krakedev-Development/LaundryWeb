const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule
    ? ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText
    : require('esbuild').transformSync(source, {
        loader: 'ts',
        format: 'cjs',
        target: 'es2022',
      }).code;
  module._compile(code, filename);
};
