const fs = require('fs');
let code = fs.readFileSync('src/components/SchedulerTimeline.tsx', 'utf8');

code = code.replace(/\/\/ @ts-ignore\nreturn \(\n<Draggable key=\{visit\.id\}/g, "return (\n<React.Fragment key={visit.id}><Draggable ");
code = code.replace(/<\/Draggable>\n\s*\);\n\s*\}\)/g, "</Draggable></React.Fragment>\n                               );\n                             })");

fs.writeFileSync('src/components/SchedulerTimeline.tsx', code);
