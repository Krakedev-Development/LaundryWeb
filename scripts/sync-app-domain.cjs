// Kept as a compatible command; validates policy without overwriting the Expo domain.
const path = require('node:path');
require('node:child_process').execFileSync(
  process.execPath,
  ['--test', path.resolve(__dirname, '../tests/app-persistence.test.cjs')],
  { stdio: 'inherit' },
);
