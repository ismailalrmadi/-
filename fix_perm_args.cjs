const fs = require('fs');
let code = fs.readFileSync('src/components/PermissionsManager.tsx', 'utf8');

code = code.replace(/export default function PermissionsManager\(\{\n\s*currentRole,\n\s*permissions,\n\s*onUpdatePermissions,\n\s*appendLog\n\}: PermissionsManagerProps\) \{/g, `export default function PermissionsManager({
  currentRole,
  permissions,
  onUpdatePermissions,
  appendLog,
  onCleanupArchive
}: PermissionsManagerProps) {`);

fs.writeFileSync('src/components/PermissionsManager.tsx', code);
