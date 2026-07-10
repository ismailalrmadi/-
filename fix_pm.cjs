const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<PermissionsManager
                    currentRole={currentRole}
                    permissions={permissions}
                    onUpdatePermissions={setPermissions}
                    appendLog={appendLog}
                    onCleanupArchive={handleCleanupArchive}
                  />`;

const replacement = `<PermissionsManager
                    currentRole={currentRole}
                    permissions={permissions}
                    onUpdatePermissions={setPermissions}
                    appendLog={appendLog}
                    onCleanupArchive={handleCleanupArchive}
                    users={users}
                    setUsers={setUsers}
                    dbSaveUser={dbSaveUser}
                    dbDeleteUser={dbDeleteUser}
                  />`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
