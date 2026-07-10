const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect, useRef } from 'react';");
code = code.replace("Sparkles } from 'lucide-react';", "Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';");

const subTabStr = `<div className="flex overflow-x-auto bg-white border border-slate-200 p-1 rounded-2xl shadow-sm scrollbar-none">`;
const subTabReplacement = `
            <div className="relative group flex items-center">
              <button 
                onClick={() => {
                  if (navRef.current) navRef.current.scrollBy({ left: -200, behavior: 'smooth' });
                }}
                className="absolute left-0 z-10 p-2 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-full -ml-3 text-slate-500 hover:text-indigo-600 hover:scale-105 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div ref={navRef} className="flex overflow-x-auto bg-white border border-slate-200 p-1 rounded-2xl shadow-sm scrollbar-none w-full scroll-smooth">`;

code = code.replace(subTabStr, subTabReplacement);

const endSubTabStr = `                بوابة الحجز الذاتي للعملاء (Odoo)
              </button>
            </div>`;
const endSubTabReplacement = `                بوابة الحجز الذاتي للعملاء (Odoo)
              </button>
              </div>

              <button 
                onClick={() => {
                  if (navRef.current) navRef.current.scrollBy({ left: 200, behavior: 'smooth' });
                }}
                className="absolute right-0 z-10 p-2 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-full -mr-3 text-slate-500 hover:text-indigo-600 hover:scale-105 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>`;

code = code.replace(endSubTabStr, endSubTabReplacement);

code = code.replace("export default function App() {", "export default function App() {\n  const navRef = useRef<HTMLDivElement>(null);");

fs.writeFileSync('src/App.tsx', code);
