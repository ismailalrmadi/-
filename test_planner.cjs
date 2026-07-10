const fs = require('fs');
const content = fs.readFileSync('src/components/RegionalPlanner.tsx', 'utf8');
try {
  // Let's verify parseWorksToDuration compilation
  require('typescript').transpileModule(content, { compilerOptions: { module: require('typescript').ModuleKind.CommonJS }});
  console.log('TS Compilation OK');
} catch(e) {
  console.error(e);
}
