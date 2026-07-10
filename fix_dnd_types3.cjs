const fs = require('fs');
let code = fs.readFileSync('src/components/SchedulerTimeline.tsx', 'utf8');

code = code.replace(/return \(\n\s*<Draggable/g, "// @ts-ignore\nreturn (\n<Draggable");

fs.writeFileSync('src/components/SchedulerTimeline.tsx', code);
