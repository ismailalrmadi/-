const fs = require('fs');

let content = fs.readFileSync('src/components/SchedulerTimeline.tsx', 'utf-8');

const replacement = `
          {viewMode === 'kanban' && (
             <DragDropContext onDragEnd={handleDragEnd}>
               <div className="flex gap-4 p-4 min-h-[500px] overflow-x-auto w-full bg-slate-50/50">
                 {weekDays.map(day => {
                   const dayVisits = visits.filter(v => v.date === day.date).sort((a, b) => a.plannedStartTime.localeCompare(b.plannedStartTime));
                   return (
                     <div key={day.date} className="bg-slate-100 rounded-xl p-3 flex flex-col gap-3 min-w-[300px] border border-slate-200/60 shadow-sm">
                       <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                         <div className="text-right">
                           <span className="font-bold text-slate-700 text-sm block">{day.name}</span>
                           <span className="text-[10px] text-slate-500 font-mono">{day.displayDate}</span>
                         </div>
                         <span className="bg-white text-slate-500 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm border border-slate-150">
                           {dayVisits.length}
                         </span>
                       </div>
                       
                       <Droppable droppableId={day.date}>
                         {(provided, snapshot) => (
                           <div 
                             {...provided.droppableProps}
                             ref={provided.innerRef}
                             className={\`flex flex-col gap-2 flex-1 overflow-y-auto min-h-[150px] p-1 rounded-lg transition-colors \${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}\`}
                           >
                             {dayVisits.map((visit, index) => {
                               const tech = technicians.find(t => t.id === visit.technicianId);
                               const hasConflict = conflicts.some(c => c.visitId === visit.id);
                               const typeColors = {
                                 Maintenance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                 Installation: 'bg-blue-50 text-blue-700 border-blue-200',
                                 Repair: 'bg-red-50 text-red-700 border-red-200',
                                 Inspection: 'bg-indigo-50 text-indigo-700 border-indigo-200'
                               };
                               const colors = typeColors[visit.type] || typeColors.Maintenance;
                               
                               return (
                                 <Draggable key={visit.id} draggableId={visit.id} index={index}>
                                   {(provided, snapshot) => (
                                     <div
                                       ref={provided.innerRef}
                                       {...provided.draggableProps}
                                       {...provided.dragHandleProps}
                                       className={\`p-3 rounded-lg shadow-sm border text-right transition-all \${snapshot.isDragging ? 'shadow-xl scale-105 z-50' : ''} \${hasConflict ? 'border-amber-400 bg-amber-50/80 shadow-amber-100' : 'bg-white border-slate-200 hover:border-indigo-300'}\`}
                                       style={{ ...provided.draggableProps.style }}
                                     >
                                       <div className="flex justify-between items-start mb-2">
                                         <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded border \${colors}\`}>
                                           {visit.type}
                                         </span>
                                         {hasConflict && (
                                           <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" title="يوجد تعارض في الوقت لهذا الموعد" />
                                         )}
                                       </div>
                                       <div className="font-bold text-xs text-slate-800 mb-1 leading-snug">{visit.title}</div>
                                       <div className="text-[10px] text-slate-500 mb-2 flex items-center gap-1 justify-end font-mono bg-slate-50 px-1.5 py-0.5 rounded-md inline-flex self-end">
                                         <span>{formatTimeTo12Hour(visit.plannedStartTime)}</span> - <span>{formatTimeTo12Hour(visit.plannedEndTime)}</span>
                                       </div>
                                       {tech && (
                                         <div className="flex items-center gap-1.5 justify-end mt-2 pt-2 border-t border-slate-100">
                                           <span className="text-[10px] font-bold text-slate-600">{tech.name}</span>
                                           <img src={tech.avatar} alt={tech.name} className="w-5 h-5 rounded-full ring-2 ring-white shadow-sm" />
                                         </div>
                                       )}
                                     </div>
                                   )}
                                 </Draggable>
                               );
                             })}
                             {provided.placeholder}
                           </div>
                         )}
                       </Droppable>
                     </div>
                   );
                 })}
               </div>
             </DragDropContext>
          )}
`;

// Extract existing block 
const startStr = "{viewMode === 'kanban' && (";
const endStr = "          )}\n\n          {viewMode === 'map' && (";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if(startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replacement.trim() + '\n\n' + content.substring(endIndex + 13);
  fs.writeFileSync('src/components/SchedulerTimeline.tsx', content);
  console.log("Success replacing");
} else {
  console.log("Could not find start/end", startIndex, endIndex);
}

