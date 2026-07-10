const fs = require('fs');
let code = fs.readFileSync('src/components/TechnicianView.tsx', 'utf8');

const targetStr = `<div className="text-[9px] text-slate-500 mt-0.5 truncate">{cl?.name}</div>
                      </div>
                    </div>`;
                    
const replacementStr = `<div className="text-[9px] text-slate-500 mt-0.5 truncate flex justify-between items-center">
                          <span>{cl?.name}</span>
                          {cl && v.status !== 'completed' && (
                            <div className="flex gap-1.5 shrink-0 ml-2">
                              <a href={\`tel:\${cl.phone}\`} className="p-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors">
                                <Phone className="w-3 h-3" />
                              </a>
                              <a href={\`https://wa.me/\${cl.phone.replace(/\\D/g, '')}\`} target="_blank" rel="noreferrer" className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/TechnicianView.tsx', code);
