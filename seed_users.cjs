const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('await dbSaveUser(u);')) {
  const target = `for (const l of initialLogs) await dbSaveLog(l);`;
  code = code.replace(target, target + `
      const initialUsers: AppUser[] = [
        { id: 'u1', name: 'إسماعيل الرمادي', phone: '0500000001', password: '123', role: 'admin', status: 'active', lastActive: 'الآن' },
        { id: 'u2', name: 'أحمد القحطاني', phone: '0500000002', password: '123', role: 'manager', status: 'active', lastActive: 'قبل ١٠ دقائق' },
        { id: 'u3', name: 'خالد الحربي', phone: '0500000003', password: '123', role: 'technician', status: 'active', lastActive: 'قبل ساعة' }
      ];
      for (const u of initialUsers) await dbSaveUser(u);`);
  fs.writeFileSync('src/App.tsx', code);
}
