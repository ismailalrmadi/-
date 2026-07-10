const fs = require('fs');

// 1. App.tsx
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

const cleanupFn = `
  const handleCleanupArchive = async () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const visitsToDelete = visits.filter(v => {
      if (v.status !== 'completed') return false;
      const visitDate = new Date(v.date);
      return visitDate < twoWeeksAgo;
    });

    for (const v of visitsToDelete) {
      await dbDeleteVisit(v.id);
    }
    
    setVisits(prev => prev.filter(v => !visitsToDelete.some(del => del.id === v.id)));
    
    if (visitsToDelete.length > 0) {
      appendLog('t1', \`تم تنظيف \${visitsToDelete.length} من المواعيد المؤرشفة القديمة\`, 'success');
      alert(\`تم تنظيف \${visitsToDelete.length} من المواعيد المؤرشفة بنجاح.\`);
    } else {
      alert('لا توجد مواعيد قديمة تستدعي التنظيف.');
    }
  };

  // Clear or Reset State database
`;
appTsx = appTsx.replace(/\/\/ Clear or Reset State database/, cleanupFn);

appTsx = appTsx.replace(/<PermissionsManager\s*currentRole=\{currentRole\}\s*permissions=\{permissions\}\s*onUpdatePermissions=\{setPermissions\}\s*appendLog=\{appendLog\}\s*\/>/g, `<PermissionsManager
                    currentRole={currentRole}
                    permissions={permissions}
                    onUpdatePermissions={setPermissions}
                    appendLog={appendLog}
                    onCleanupArchive={handleCleanupArchive}
                  />`);
fs.writeFileSync('src/App.tsx', appTsx);

// 2. PermissionsManager.tsx
let permTsx = fs.readFileSync('src/components/PermissionsManager.tsx', 'utf8');
permTsx = permTsx.replace(/appendLog: \(techId: string, action: string, type: 'info' \| 'success' \| 'warning' \| 'error'\) => void;\n\}/g, `appendLog: (techId: string, action: string, type: 'info' | 'success' | 'warning' | 'error') => void;\n  onCleanupArchive: () => void;\n}`);

permTsx = permTsx.replace(/export default function PermissionsManager\(\{ currentRole, permissions, onUpdatePermissions, appendLog \}: PermissionsManagerProps\) \{/g, `export default function PermissionsManager({ currentRole, permissions, onUpdatePermissions, appendLog, onCleanupArchive }: PermissionsManagerProps) {`);

permTsx = permTsx.replace(/if \(window\.confirm\('هل أنت متأكد من رغبتك في حذف البيانات والأحداث المكتملة التي مر عليها أكثر من أسبوعين؟ هذا الإجراء لا يمكن التراجع عنه\.'\)\) \{\s*appendLog\('t1', 'تم تشغيل سكريبت تنظيف قاعدة البيانات بنجاح', 'success'\);\s*alert\('تم تنظيف قاعدة البيانات المؤرشفة بنجاح\.'\);\s*\}/g, `if (window.confirm('هل أنت متأكد من رغبتك في حذف البيانات والأحداث المكتملة التي مر عليها أكثر من أسبوعين؟ هذا الإجراء لا يمكن التراجع عنه.')) {
                      onCleanupArchive();
                    }`);

fs.writeFileSync('src/components/PermissionsManager.tsx', permTsx);
