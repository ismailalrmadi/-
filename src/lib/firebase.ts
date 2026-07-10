import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Client, Project, Technician, Visit, Route, LogEntry, AppUser } from '../types';

const app = initializeApp(firebaseConfig);
export const db = (firebaseConfig as any).firestoreDatabaseId 
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

// Guideline-compliant OperationType and Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check database connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Direct Helper Functions for Firestore Operations

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = (obj as any)[key];
        if (val !== undefined) {
          cleaned[key] = cleanUndefined(val);
        }
      }
    }
    return cleaned;
  }
  return obj;
}

// --- CLIENTS ---
export async function dbGetClients(): Promise<Client[]> {
  try {
    const snap = await getDocs(collection(db, 'clients'));
    const list: Client[] = [];
    snap.forEach(d => list.push(d.data() as Client));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'clients');
    return [];
  }
}

export async function dbSaveClient(client: Client): Promise<void> {
  const path = `clients/${client.id}`;
  try {
    await setDoc(doc(db, 'clients', client.id), cleanUndefined(client));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteClient(id: string): Promise<void> {
  const path = `clients/${id}`;
  try {
    await deleteDoc(doc(db, 'clients', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- PROJECTS ---
export async function dbGetProjects(): Promise<Project[]> {
  try {
    const snap = await getDocs(collection(db, 'projects'));
    const list: Project[] = [];
    snap.forEach(d => list.push(d.data() as Project));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'projects');
    return [];
  }
}

export async function dbSaveProject(project: Project): Promise<void> {
  const path = `projects/${project.id}`;
  try {
    await setDoc(doc(db, 'projects', project.id), cleanUndefined(project));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteProject(id: string): Promise<void> {
  const path = `projects/${id}`;
  try {
    await deleteDoc(doc(db, 'projects', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- TECHNICIANS ---
export async function dbGetTechnicians(): Promise<Technician[]> {
  try {
    const snap = await getDocs(collection(db, 'technicians'));
    const list: Technician[] = [];
    snap.forEach(d => list.push(d.data() as Technician));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'technicians');
    return [];
  }
}

export async function dbSaveTechnician(tech: Technician): Promise<void> {
  const path = `technicians/${tech.id}`;
  try {
    await setDoc(doc(db, 'technicians', tech.id), cleanUndefined(tech));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteTechnician(id: string): Promise<void> {
  const path = `technicians/${id}`;
  try {
    await deleteDoc(doc(db, 'technicians', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- VISITS ---
export async function dbGetVisits(): Promise<Visit[]> {
  try {
    const snap = await getDocs(collection(db, 'visits'));
    const list: Visit[] = [];
    snap.forEach(d => list.push(d.data() as Visit));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'visits');
    return [];
  }
}

export async function dbSaveVisit(visit: Visit): Promise<void> {
  const path = `visits/${visit.id}`;
  try {
    await setDoc(doc(db, 'visits', visit.id), cleanUndefined(visit));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteVisit(id: string): Promise<void> {
  const path = `visits/${id}`;
  try {
    await deleteDoc(doc(db, 'visits', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- ROUTES ---
export async function dbGetRoutes(): Promise<Route[]> {
  try {
    const snap = await getDocs(collection(db, 'routes'));
    const list: Route[] = [];
    snap.forEach(d => list.push(d.data() as Route));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'routes');
    return [];
  }
}

export async function dbSaveRoute(route: Route): Promise<void> {
  const path = `routes/${route.id}`;
  try {
    await setDoc(doc(db, 'routes', route.id), cleanUndefined(route));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteRoute(id: string): Promise<void> {
  const path = `routes/${id}`;
  try {
    await deleteDoc(doc(db, 'routes', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- LOGS ---
export async function dbGetLogs(): Promise<LogEntry[]> {
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
}

export async function dbSaveLog(log: LogEntry): Promise<void> {
  const path = `logs/${log.id}`;
  try {
    await setDoc(doc(db, 'logs', log.id), cleanUndefined(log));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteLog(id: string): Promise<void> {
  const path = `logs/${id}`;
  try {
    await deleteDoc(doc(db, 'logs', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- USERS ---
export async function dbGetUsers(): Promise<AppUser[]> {
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
  const path = `logs/${user.id}`;
  try {
    await setDoc(doc(db, 'logs', user.id), cleanUndefined({ ...user, _isUser: true }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function dbDeleteUser(id: string): Promise<void> {
  const path = `logs/${id}`;
  try {
    await deleteDoc(doc(db, 'logs', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
