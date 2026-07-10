const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

if (!code.includes('export interface AppUser')) {
  code += `\nexport interface AppUser {
  id: string;
  name: string;
  phone: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'suspended';
  lastActive: string;
}\n`;
  fs.writeFileSync('src/types.ts', code);
}
