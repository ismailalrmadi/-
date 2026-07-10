const fs = require('fs');
let code = fs.readFileSync('src/components/ManagementPanel.tsx', 'utf8');

code = code.replace(/<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">\s*<div>\s*<label[^>]*>هاتف الاتصال بالعميل<\/label>\s*<input[^>]*\/>\s*<\/div>\s*<\/div>/g, `<div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">هاتف الاتصال بالعميل</label>
                <input
                  type="text"
                  required
                  placeholder="+966 50 111 2222"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 text-right"
                />
              </div>`);

code = code.replace(/<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">\s*<div>\s*<label[^>]*>هاتف العميل<\/label>\s*<input[^>]*\/>\s*<\/div>\s*<\/div>/g, `<div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">هاتف العميل</label>
                  <input
                    type="text"
                    required
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800 text-right"
                  />
                </div>`);

fs.writeFileSync('src/components/ManagementPanel.tsx', code);
