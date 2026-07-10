const fs = require('fs');
let code = fs.readFileSync('src/components/TechnicianView.tsx', 'utf8');

code = code.replace(
  "const [activeMobileTab, setActiveMobileTab] = useState<'tasks' | 'map'>('tasks');",
  "const [activeMobileTab, setActiveMobileTab] = useState<'tasks' | 'map'>('tasks');\n  const [mapViewMode, setMapViewMode] = useState<'daily' | 'weekly'>('daily');"
);

code = code.replace(
  "const techVisits = visits\n    .filter(v => v.technicianId === activeTechId && v.date === selectedDate)",
  "const allTechVisits = visits.filter(v => v.technicianId === activeTechId);\n  const techVisits = allTechVisits\n    .filter(v => v.date === selectedDate)"
);

const oldMapDiv = `              {activeMobileTab === 'map' && activeTech && (
                <div className="flex-1 flex flex-col h-full absolute inset-0 top-[110px] bg-slate-900 z-10 p-4 space-y-4">
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-300">مسار يوم {selectedDate}</span>
                     <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold">{techVisits.length} مهام</span>
                  </div>
                  <div className="flex-1 rounded-2xl overflow-hidden border border-slate-700 relative">
                    <MapContainer 
                      clients={clients.filter(c => techVisits.some(v => v.clientId === c.id))} 
                      technicians={[activeTech]} 
                      visits={techVisits}
                      selectedClientId={null}
                      onSelectClient={() => {}}
                      onSelectTechnician={() => {}}
                    />
                  </div>
                </div>
              )}`;

const newMapDiv = `              {activeMobileTab === 'map' && activeTech && (
                <div className="flex-1 flex flex-col h-full absolute inset-0 top-[110px] bg-slate-900 z-10 p-4 space-y-4">
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex flex-col gap-3">
                     <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-300">
                         {mapViewMode === 'daily' ? \`مسار يوم \${selectedDate}\` : 'المسار الأسبوعي الشامل'}
                       </span>
                       <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold">
                         {mapViewMode === 'daily' ? techVisits.length : allTechVisits.length} مهام
                       </span>
                     </div>
                     <div className="flex items-center border border-slate-700 p-1 rounded-lg bg-slate-900">
                       <button onClick={() => setMapViewMode('weekly')} className={\`flex-1 text-[10px] py-1.5 rounded transition-colors \${mapViewMode === 'weekly' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}\`}>مسار الأسبوع كامل</button>
                       <button onClick={() => setMapViewMode('daily')} className={\`flex-1 text-[10px] py-1.5 rounded transition-colors \${mapViewMode === 'daily' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}\`}>مسار اليوم فقط</button>
                     </div>
                  </div>
                  <div className="flex-1 rounded-2xl overflow-hidden border border-slate-700 relative">
                    <MapContainer 
                      clients={clients.filter(c => (mapViewMode === 'daily' ? techVisits : allTechVisits).some(v => v.clientId === c.id))} 
                      technicians={[activeTech]} 
                      visits={mapViewMode === 'daily' ? techVisits : allTechVisits}
                      selectedClientId={null}
                      onSelectClient={() => {}}
                      onSelectTechnician={() => {}}
                    />
                  </div>
                </div>
              )}`;

code = code.replace(oldMapDiv, newMapDiv);

fs.writeFileSync('src/components/TechnicianView.tsx', code);
