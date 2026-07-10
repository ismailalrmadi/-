const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

// replace types import
code = code.replace(/import \{ Client, Project, Technician, Visit, Route, LogEntry \} from '\.\.\/types';/, "import { Client, Project, Technician, Visit, Route, LogEntry, AppUser } from '../types';");

if (!code.includes('export async function dbGetUsers()')) {
  code += `\n// --- USERS ---
export async function dbGetUsers(): Promise<AppUser[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const list: AppUser[] = [];
    snap.forEach(d => list.push(d.data() as AppUser));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

export async function dbSaveUser(user: AppUser): Promise<void> {
  const path = \`users/\${user.id}\`;
  try {
    await setDoc(doc(db, 'users', user.id), cleanUndefined(user));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteUser(id: string): Promise<void> {
  const path = \`users/\${id}\`;
  try {
    await deleteDoc(doc(db, 'users', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}\n`;
  fs.writeFileSync('src/lib/firebase.ts', code);
}
