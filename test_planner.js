const fs = require('fs');
const content = fs.readFileSync('src/components/RegionalPlanner.tsx', 'utf8');
console.log(content.includes('handleRunRegionalScheduler') ? 'Found' : 'Not found');
