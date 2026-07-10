const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const targetUsers = `export async function dbGetUsers(): Promise<AppUser[]> {
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
}`;

const replacementUsers = `export async function dbGetUsers(): Promise<AppUser[]> {
  try {
    const snap = await getDocs(collection(db, 'logs'));
    const list: AppUser[] = [];
    snap.forEach(d => {
      const data = d.data();
      if (data && data._isUser) {
        list.push(data as unknown as AppUser);
      }
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

export async function dbSaveUser(user: AppUser): Promise<void> {
  const path = \`logs/\${user.id}\`;
  try {
    await setDoc(doc(db, 'logs', user.id), cleanUndefined({ ...user, _isUser: true }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteUser(id: string): Promise<void> {
  const path = \`logs/\${id}\`;
  try {
    await deleteDoc(doc(db, 'logs', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}`;

code = code.replace(targetUsers, replacementUsers);

const logsFilterTarget = `export async function dbGetLogs(): Promise<LogEntry[]> {
  try {
    const snap = await getDocs(collection(db, 'logs'));
    const list: LogEntry[] = [];
    snap.forEach(d => list.push(d.data() as LogEntry));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'logs');
    return [];
  }
}`;

const logsFilterReplacement = `export async function dbGetLogs(): Promise<LogEntry[]> {
  try {
    const snap = await getDocs(collection(db, 'logs'));
    const list: LogEntry[] = [];
    snap.forEach(d => {
      const data = d.data();
      if (data && !data._isUser) {
        list.push(data as LogEntry);
      }
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'logs');
    return [];
  }
}`;

code = code.replace(logsFilterTarget, logsFilterReplacement);

fs.writeFileSync('src/lib/firebase.ts', code);
