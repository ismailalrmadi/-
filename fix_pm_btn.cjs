const fs = require('fs');
let code = fs.readFileSync('src/components/PermissionsManager.tsx', 'utf8');

if (!code.includes('handleDeleteUser(')) {
  const target = `const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, status: u.status === 'active' ? 'suspended' : 'active' };
      }
      return u;
    });
    setUsers(updatedUsers);
    const toggled = updatedUsers.find(u => u.id === userId);
    if (toggled) dbSaveUser(toggled);
    
    const newStatus = users.find(u => u.id === userId)?.status === 'active' ? 'suspended' : 'active';
    appendLog('t1', \`تم \${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} حساب المستخدم\`, 'warning');
  };`;

  code = code.replace(target, target + `\n\n  const handleDeleteUser = (userId: string) => {
    if (currentRole !== 'admin') {
      alert('صلاحية الحذف مقصورة على مسؤول النظام.');
      return;
    }
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
    dbDeleteUser(userId);
    appendLog('t1', 'تم حذف المستخدم نهائياً', 'error');
  };`);
}

const toggleBtnTarget = `<button 
                          onClick={() => handleToggleUserStatus(user.id)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title={user.status === 'active' ? "إيقاف الحساب" : "تفعيل الحساب"}
                        >
                          {user.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>`;

if (code.includes(toggleBtnTarget) && !code.includes('handleDeleteUser(user.id)')) {
  code = code.replace(toggleBtnTarget, toggleBtnTarget + `
                        <button 
                          onClick={() => handleDeleteUser(user.id)} 
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                          title="حذف نهائي"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>`);
}

fs.writeFileSync('src/components/PermissionsManager.tsx', code);
