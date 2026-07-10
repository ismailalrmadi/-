const fs = require('fs');
let code = fs.readFileSync('src/components/SchedulerTimeline.tsx', 'utf8');

code = code.replace(/\{\/\* @ts-ignore \*\/\}\n<Draggable /g, "<Draggable ");
code = code.replace(/\{\/\* @ts-ignore \*\/\}\n<Droppable /g, "<Droppable ");

fs.writeFileSync('src/components/SchedulerTimeline.tsx', code);
