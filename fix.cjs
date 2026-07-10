const fs = require('fs');
let code = fs.readFileSync('src/components/SchedulerTimeline.tsx', 'utf8');
code = code.replace(/onDeleteVisit,\n  onUpdateVisits: \(id: string\) => void;\n  onUpdateVisits: \(visits: Visit\[\]\) => void;/, "onDeleteVisit: (id: string) => void;\n  onUpdateVisits: (visits: Visit[]) => void;");
fs.writeFileSync('src/components/SchedulerTimeline.tsx', code);
