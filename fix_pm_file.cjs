const fs = require('fs');
let code = fs.readFileSync('src/components/PermissionsManager.tsx', 'utf8');

// replace MockUser interface with AppUser import
code = code.replace(/import \{ UserRole, RolePermissions \} from '\.\.\/types';/, "import { UserRole, RolePermissions, AppUser } from '../types';");

const interfaceRegex = /interface MockUser \{[\s\S]*?\}/;
code = code.replace(interfaceRegex, "");

// Add to props
code = code.replace(/onCleanupArchive: \(\) => void;/, 
`onCleanupArchive: () => void;
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
  dbSaveUser: (user: AppUser) => Promise<void>;
  dbDeleteUser: (id: string) => Promise<void>;`);

code = code.replace(/onCleanupArchive\n\}: PermissionsManagerProps\) \{/, 
`onCleanupArchive,
  users,
  setUsers,
  dbSaveUser,
  dbDeleteUser
}: PermissionsManagerProps) {`);

// Remove local users state
const localUsersRegex = /\s*\/\/ Mock system users to simulate role assignment\s*const \[users, setUsers\] = useState<MockUser\[\]>\(\[[\s\S]*?\]\);/;
code = code.replace(localUsersRegex, "");

// Change MockUser to AppUser
code = code.replace(/MockUser/g, "AppUser");

// Update handleAddUser to call dbSaveUser
code = code.replace(/setUsers\(prev => \[\.\.\.prev, newUser\]\);/, 
`setUsers(prev => [...prev, newUser]);
    dbSaveUser(newUser);`);

// Update handleUpdateUser to call dbSaveUser
const updateUserRegex = /setUsers\(prev => prev\.map\(u => \{[\s\S]*?return u;\n    \}\)\);/;
code = code.replace(updateUserRegex, 
`const updatedUsers = users.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          name: editUserName,
          phone: editUserPhone,
          role: editUserRole,
          password: editUserPassword || u.password,
        };
      }
      return u;
    });
    setUsers(updatedUsers);
    const edited = updatedUsers.find(u => u.id === editingUserId);
    if (edited) dbSaveUser(edited);`);

// Update handleToggleUserStatus to call dbSaveUser
const toggleUserRegex = /setUsers\(prev => prev\.map\(u => \{[\s\S]*?return u;\n    \}\)\);/;
code = code.replace(toggleUserRegex, 
`const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, status: u.status === 'active' ? 'suspended' : 'active' };
      }
      return u;
    });
    setUsers(updatedUsers);
    const toggled = updatedUsers.find(u => u.id === userId);
    if (toggled) dbSaveUser(toggled);`);

// Add handleDeleteUser
if (!code.includes('const handleDeleteUser = (userId: string) => {')) {
  const toggleStatusFnEnd = `    appendLog('t1', \`تم \${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} حساب المستخدم\`, 'warning');
  };`;
  code = code.replace(toggleStatusFnEnd, 
    toggleStatusFnEnd + `\n\n  const handleDeleteUser = (userId: string) => {
    if (currentRole !== 'admin') {
      alert('صلاحية الحذف مقصورة على مسؤول النظام.');
      return;
    }
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
    dbDeleteUser(userId);
    appendLog('t1', 'تم حذف المستخدم نهائياً', 'error');
  };`
  );
}

// Add delete button next to edit/toggle in table
const toggleBtnRegex = /<button\s+onClick=\{[^}]+\}\s+className="p-1\.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"\s+title="\[[^\]]+\]"\s*>\s*<[^>]+>\s*<\/button>/;
if (code.includes('handleDeleteUser(') === false) {
    // it's fine
} else {
    code = code.replace(toggleBtnRegex, 
        `$&\n                        <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف نهائي">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>`
    );
}

fs.writeFileSync('src/components/PermissionsManager.tsx', code);
