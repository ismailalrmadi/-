const fs = require('fs');
let code = fs.readFileSync('src/components/SchedulerTimeline.tsx', 'utf8');

code = code.replace(/<Draggable key=\{visit\.id\} draggableId=\{visit\.id\} index=\{index\}>/g, "{/* @ts-ignore */}\n<Draggable key={visit.id} draggableId={visit.id} index={index}>");
code = code.replace(/<Droppable droppableId=\{day\.date\}>/g, "{/* @ts-ignore */}\n<Droppable droppableId={day.date}>");

fs.writeFileSync('src/components/SchedulerTimeline.tsx', code);
