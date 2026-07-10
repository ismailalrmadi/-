const fs = require('fs');
let code = fs.readFileSync('src/components/TechnicianView.tsx', 'utf8');

// Imports
code = code.replace(
  "import { Smartphone, MapPin, Navigation, Clock, Check, Upload, PenTool, Star, AlertTriangle, Play } from 'lucide-react';",
  "import { Smartphone, MapPin, Navigation, Clock, Check, Upload, PenTool, Star, AlertTriangle, Play, Phone, MessageCircle, Map as MapIcon } from 'lucide-react';"
);

// State
code = code.replace(
  "const [delayReason, setDelayReason] = useState<string>('');",
  "const [delayReason, setDelayReason] = useState<string>('');\n  const [activeMobileTab, setActiveMobileTab] = useState<'tasks' | 'map'>('tasks');"
);

// Add contact buttons to targetClient view
const clientViewTarget = `<p className="text-[10px] text-slate-500 leading-tight mt-0.5 flex items-center gap-1 justify-start">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        {targetClient?.address}
                      </p>
                    </div>`;

const clientViewReplacement = `<p className="text-[10px] text-slate-500 leading-tight mt-0.5 flex items-center gap-1 justify-start">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        {targetClient?.address}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <a href={\`tel:\${targetClient?.phone}\`} className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 py-1.5 rounded-lg border border-indigo-500/20 transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                          <span className="font-bold text-[10px]">اتصال</span>
                        </a>
                        <a href={\`https://wa.me/\${targetClient?.phone?.replace(/\\D/g, '')}\`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-1.5 rounded-lg border border-emerald-500/20 transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="font-bold text-[10px]">واتساب</span>
                        </a>
                      </div>
                    </div>`;
code = code.replace(clientViewTarget, clientViewReplacement);

// Add Top Tabs
const headerEnd = `</div>
            </div>

            {/* Scrollable Mobile Body */}`;

const headerReplacement = `</div>
            </div>
            
            {/* Mobile App Tabs */}
            <div className="flex items-center p-2 bg-slate-950 border-b border-slate-800 gap-2 shrink-0">
              <button
                onClick={() => setActiveMobileTab('tasks')}
                className={\`flex-1 py-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors \${activeMobileTab === 'tasks' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}\`}
              >
                <Check className="w-3.5 h-3.5" />
                المهام المباشرة
              </button>
              <button
                onClick={() => setActiveMobileTab('map')}
                className={\`flex-1 py-2 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors \${activeMobileTab === 'map' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}\`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                خريطة المسار
              </button>
            </div>

            {/* Scrollable Mobile Body */}`;

code = code.replace(headerEnd, headerReplacement);

// Handle Tab Switching in Body
const bodyStart = `{/* Technician Identity Header */}`;
const bodyReplacement = `
              {activeMobileTab === 'map' && activeTech && (
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
              )}

              {/* Technician Identity Header */}`;

code = code.replace(bodyStart, bodyReplacement);


fs.writeFileSync('src/components/TechnicianView.tsx', code);
