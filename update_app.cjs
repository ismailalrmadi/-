const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. imports
code = code.replace(/import \{ Client, Project, Technician, Visit, Route, LogEntry, UserRole, RolePermissions \} from '\.\/types';/, 
"import { Client, Project, Technician, Visit, Route, LogEntry, UserRole, RolePermissions, AppUser } from './types';");

code = code.replace(/dbGetLogs,\n  dbSaveLog,\n  dbDeleteLog\n} from '\.\/lib\/firebase';/, 
`dbGetLogs,
  dbSaveLog,
  dbDeleteLog,
  dbGetUsers,
  dbSaveUser,
  dbDeleteUser
} from './lib/firebase';`);

// 2. state
const usersStateStr = `  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('ars_users');
    return saved ? JSON.parse(saved) : [];
  });`;

if (!code.includes('const [users, setUsers] = useState<AppUser[]>')) {
  code = code.replace(/const \[logs, setLogs\] = useState<LogEntry\[\]>\(\(\) => \{[\s\S]*?\}\);/, 
    `$&
${usersStateStr}`
  );
}

// 3. sync logic
const syncDbRegex = /const remoteLogs = await dbGetLogs\(\);/;
if (!code.includes('const remoteUsers = await dbGetUsers();')) {
  code = code.replace(syncDbRegex, 
    `const remoteLogs = await dbGetLogs();\n        const remoteUsers = await dbGetUsers();`
  );
}

const syncStateRegex = /const uniqueLogsMap = new Map<string, LogEntry>\(\);/;
if (!code.includes('setUsers(remoteUsers);')) {
  code = code.replace(syncStateRegex, 
    `setUsers(remoteUsers);\n        const uniqueLogsMap = new Map<string, LogEntry>();`
  );
}

// 4. local storage effect
const lsLogsEffectRegex = /useEffect\(\(\) => \{\n    localStorage\.setItem\('ars_logs', JSON\.stringify\(logs\)\);\n  \}, \[logs\]\);/;
if (!code.includes(`localStorage.setItem('ars_users'`)) {
  code = code.replace(lsLogsEffectRegex, 
    `$&\n\n  useEffect(() => {\n    localStorage.setItem('ars_users', JSON.stringify(users));\n  }, [users]);`
  );
}

// 5. handleResetDatabase
const resetLocalStorageRegex = /localStorage\.removeItem\('ars_logs'\);/;
if (!code.includes(`localStorage.removeItem('ars_users');`)) {
  code = code.replace(resetLocalStorageRegex, 
    `$&\n    localStorage.removeItem('ars_users');`
  );
}

const resetCloudRegex = /for \(const l of logs\) \{\n      await dbDeleteLog\(l\.id\);\n    \}/;
if (!code.includes(`for (const u of users)`)) {
  code = code.replace(resetCloudRegex, 
    `$&\n    for (const u of users) {\n      await dbDeleteUser(u.id);\n    }`
  );
}

// 6. login logic
const loginSubmitRegex = /    \/\/ Mock authentication logic[\s\S]*?if \(user\) \{/m;
const newLoginLogic = `    // Authenticate against Users state from Firestore
    const user = users.find(u => u.phone === loginPhone && u.password === loginPassword);
    
    if (user && user.status !== 'suspended') {`;
code = code.replace(loginSubmitRegex, newLoginLogic);

// 7. Update PermissionsManager props
const permMgrRegex = /<PermissionsManager\s+currentRole=\{currentRole\}\s+permissions=\{permissions\}\s+onUpdatePermissions=\{setPermissions\}\s+appendLog=\{appendLog\}\s+onCleanupArchive=\{handleResetDatabase\}\s+\/>/m;
const newPermMgr = `<PermissionsManager 
                  currentRole={currentRole} 
                  permissions={permissions} 
                  onUpdatePermissions={setPermissions} 
                  appendLog={appendLog}
                  onCleanupArchive={handleResetDatabase}
                  users={users}
                  setUsers={setUsers}
                  dbSaveUser={dbSaveUser}
                  dbDeleteUser={dbDeleteUser}
                />`;
if (code.includes('<PermissionsManager')) {
  code = code.replace(permMgrRegex, newPermMgr);
}

fs.writeFileSync('src/App.tsx', code);
