const fs = require('fs');
let code = fs.readFileSync('src/components/SchedulerTimeline.tsx', 'utf8');

code = code.replace(/onDeleteVisit,\s*onUpdateVisits\(visit\.id\);/g, "onDeleteVisit(visit.id);");

fs.writeFileSync('src/components/SchedulerTimeline.tsx', code);
