const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetButtons = `<button
              onClick={handleResetDatabase}
              className="text-slate-500 hover:text-red-400 text-[10px] uppercase font-mono transition-colors cursor-pointer"
            >
              إعادة تعيين البيانات
            </button>`;

const replacementButtons = `<button
              onClick={handleResetDatabase}
              title="إفراغ قاعدة البيانات من جميع السجلات"
              className="text-slate-500 hover:text-red-400 text-[10px] uppercase font-mono transition-colors cursor-pointer"
            >
              إفراغ البيانات
            </button>
            <button
              onClick={handleSeedMockData}
              title="إضافة بيانات افتراضية للتجربة"
              className="text-slate-500 hover:text-emerald-400 text-[10px] uppercase font-mono transition-colors cursor-pointer"
            >
              بيانات تجريبية
            </button>`;

code = code.replace(targetButtons, replacementButtons);

const handleResetTarget = `  const handleResetDatabase = async () => {`;
const handleResetReplacement = `  const handleSeedMockData = async () => {
    if (!window.confirm("هل أنت متأكد من إضافة بيانات تجريبية جديدة لقاعدة البيانات؟")) return;
    try {
      for (const c of initialClients) await dbSaveClient(c);
      for (const p of initialProjects) await dbSaveProject(p);
      for (const t of initialTechnicians) await dbSaveTechnician(t);
      for (const v of initialVisits) await dbSaveVisit(v);
      for (const r of initialRoutes) await dbSaveRoute(r);
      for (const l of initialLogs) await dbSaveLog(l);
      window.location.reload();
    } catch (e) {
      alert("حدث خطأ أثناء إضافة البيانات الافتراضية");
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("تحذير: سيتم مسح جميع البيانات من السحابة. هل أنت متأكد؟")) return;`;

code = code.replace(handleResetTarget, handleResetReplacement);

fs.writeFileSync('src/App.tsx', code);
