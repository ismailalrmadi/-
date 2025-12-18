
import { 
  AttendanceRecord, 
  AttendanceType, // Fixed: Added missing AttendanceType import
  WorkshopConfig, 
  Coordinates, 
  Employee, 
  Geofence, 
  LeaveRequest, 
  WorkSchedule, 
  AuditLog, 
  Notification,
  UserRole,
  RoleConfig,
  Permission,
  CalendarEvent
} from '../types';
import { db, isFirebaseEnabled } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

const STORAGE_KEY_RECORDS = 'attendance_records_v1';
const STORAGE_KEY_GEOFENCES = 'geofences_v1';
const STORAGE_KEY_CONFIG = 'workshop_config_v1';
const STORAGE_KEY_EMPLOYEES = 'employees_v1';
const STORAGE_KEY_SCHEDULES = 'schedules_v1';
const STORAGE_KEY_LEAVES = 'leaves_v1';
const STORAGE_KEY_LOGS = 'audit_logs_v1';
const STORAGE_KEY_NOTIFICATIONS = 'notifications_v1';
const STORAGE_KEY_SESSION = 'user_session_v1';
const STORAGE_KEY_ROLES = 'role_configs_v1';
const STORAGE_KEY_CALENDAR_EVENTS = 'calendar_events_v1';

const getFromStorage = async <T>(key: string, defaultData: T): Promise<T> => {
  if (isFirebaseEnabled() && db) {
    try {
      if (key === STORAGE_KEY_CONFIG) {
         const snapshot = await getDocs(collection(db, key));
         return snapshot.empty ? defaultData : (snapshot.docs[0].data() as T);
      }
      const snapshot = await getDocs(collection(db, key));
      return snapshot.empty ? defaultData : (snapshot.docs.map(d => d.data()) as unknown as T);
    } catch (e) {
      return defaultData;
    }
  }
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultData;
};

const saveDocument = async (collectionName: string, docId: string, data: any) => {
  if (isFirebaseEnabled() && db) {
    await setDoc(doc(db, collectionName, docId), data);
  } else {
    const list = await getFromStorage<any[]>(collectionName, []);
    const index = list.findIndex((i: any) => i.id === docId);
    if (index >= 0) list[index] = data; else list.push(data);
    localStorage.setItem(collectionName, JSON.stringify(list));
  }
};

const deleteDocument = async (collectionName: string, docId: string) => {
  if (isFirebaseEnabled() && db) {
    await deleteDoc(doc(db, collectionName, docId));
  } else {
     const list = await getFromStorage<any[]>(collectionName, []);
     localStorage.setItem(collectionName, JSON.stringify(list.filter((i: any) => i.id !== docId)));
  }
};

export const subscribeToRecords = (callback: (data: AttendanceRecord[]) => void, limitCount = 50) => {
  if (isFirebaseEnabled() && db) {
    const q = query(collection(db, STORAGE_KEY_RECORDS), orderBy('timestamp', 'desc'), limit(limitCount));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(d => d.data() as AttendanceRecord));
    }, () => getRecords(limitCount).then(callback));
  }
  getRecords(limitCount).then(callback);
  return () => {};
};

export const subscribeToEmployees = (callback: (data: Employee[]) => void) => {
  if (isFirebaseEnabled() && db) return onSnapshot(collection(db, STORAGE_KEY_EMPLOYEES), (snapshot) => callback(snapshot.docs.map(d => d.data() as Employee)));
  getEmployees().then(callback); return () => {};
};

export const subscribeToNotifications = (callback: (data: Notification[]) => void) => {
  if (isFirebaseEnabled() && db) return onSnapshot(query(collection(db, STORAGE_KEY_NOTIFICATIONS), limit(20)), (snapshot) => callback(snapshot.docs.map(d => d.data() as Notification)));
  getNotifications().then(callback); return () => {};
};

export const saveSession = (user: string, role: UserRole): void => {
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ user, role, timestamp: Date.now() }));
};

export const getSession = (): { user: string, role: UserRole } | null => {
  const session = localStorage.getItem(STORAGE_KEY_SESSION);
  if (!session) return null;
  try { return JSON.parse(session); } catch { return null; }
};

export const clearSession = (): void => localStorage.removeItem(STORAGE_KEY_SESSION);

export const loginUser = async (username: string): Promise<Employee | null> => {
  if (isFirebaseEnabled() && db) {
    const q = query(collection(db, STORAGE_KEY_EMPLOYEES), where("name", "==", username), limit(1));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : (snapshot.docs[0].data() as Employee);
  }
  return (await getEmployees()).find(e => e.name === username) || null;
};

export const getRoleConfigs = async (): Promise<RoleConfig[]> => {
  return await getFromStorage<RoleConfig[]>(STORAGE_KEY_ROLES, [
    { role: 'ADMIN', permissions: ['VIEW_OVERVIEW', 'MANAGE_EMPLOYEES', 'VIEW_ATTENDANCE', 'MANAGE_GEOFENCES', 'MANAGE_LEAVES', 'MANAGE_SCHEDULES', 'VIEW_REPORTS', 'VIEW_LOGS', 'MANAGE_ROLES'] },
    { role: 'SUPERVISOR', permissions: ['VIEW_OVERVIEW', 'VIEW_ATTENDANCE', 'VIEW_REPORTS', 'MANAGE_LEAVES', 'VIEW_LOGS'] },
    { role: 'USER', permissions: [] }
  ]);
};

export const saveRoleConfigs = async (configs: RoleConfig[]): Promise<void> => {
  for (const config of configs) await saveDocument(STORAGE_KEY_ROLES, config.role, config);
};

export const getWorkshopConfig = async (): Promise<WorkshopConfig> => {
  return await getFromStorage<WorkshopConfig>(STORAGE_KEY_CONFIG, {
    name: "ورشة العمل الرئيسية",
    center: { latitude: 24.7136, longitude: 46.6753 }, 
    radiusMeters: 500,
    qrCodeValue: "WORKSHOP-SECRET-1"
  });
};

export const saveWorkshopConfig = async (config: WorkshopConfig): Promise<void> => {
  if (isFirebaseEnabled() && db) await setDoc(doc(db, STORAGE_KEY_CONFIG, 'main_config'), config);
  else localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
};

export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371e3; 
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const getRecords = async (limitCount = 50): Promise<AttendanceRecord[]> => {
  if (isFirebaseEnabled() && db) {
    try {
      const q = query(collection(db, STORAGE_KEY_RECORDS), orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as AttendanceRecord);
    } catch (e) {
      const snapshot = await getDocs(query(collection(db, STORAGE_KEY_RECORDS), limit(limitCount)));
      return snapshot.docs.map(d => d.data() as AttendanceRecord).sort((a,b) => b.timestamp - a.timestamp);
    }
  }
  return (await getFromStorage<AttendanceRecord[]>(STORAGE_KEY_RECORDS, [])).sort((a, b) => b.timestamp - a.timestamp).slice(0, limitCount);
};

export const getUserRecords = async (username: string, limitCount = 50): Promise<AttendanceRecord[]> => {
  if (isFirebaseEnabled() && db) {
    const q = query(collection(db, STORAGE_KEY_RECORDS), where('workerName', '==', username), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as AttendanceRecord).sort((a,b) => b.timestamp - a.timestamp);
  }
  return (await getRecords(200)).filter(r => r.workerName === username).slice(0, limitCount);
};

export const saveRecord = async (record: AttendanceRecord): Promise<void> => saveDocument(STORAGE_KEY_RECORDS, record.id, record);

export const getEmployees = async (): Promise<Employee[]> => {
  const defaults: Employee[] = [{ id: '1', name: 'مدير النظام', role: 'ADMIN', phone: '0500000000', status: 'Active', password: 'admin' }];
  const emps = await getFromStorage<Employee[]>(STORAGE_KEY_EMPLOYEES, defaults);
  return emps;
};

export const saveEmployee = async (employee: Employee): Promise<void> => saveDocument(STORAGE_KEY_EMPLOYEES, employee.id, employee);
export const deleteEmployee = async (id: string): Promise<void> => deleteDocument(STORAGE_KEY_EMPLOYEES, id);

export const getGeofences = async (): Promise<Geofence[]> => getFromStorage<Geofence[]>(STORAGE_KEY_GEOFENCES, [{ id: '1', name: "الورشة الرئيسية", center: { latitude: 24.7136, longitude: 46.6753 }, radiusMeters: 500, active: true }]);
export const saveGeofence = async (geofence: Geofence): Promise<void> => saveDocument(STORAGE_KEY_GEOFENCES, geofence.id, geofence);
export const deleteGeofence = async (id: string): Promise<void> => deleteDocument(STORAGE_KEY_GEOFENCES, id);

export const getWorkSchedules = async (): Promise<WorkSchedule[]> => getFromStorage<WorkSchedule[]>(STORAGE_KEY_SCHEDULES, [{ id: '1', shiftName: 'الوردية القياسية', shifts: [{ name: "صباحي", start: '08:00', end: '12:00' }, { name: "مسائي", start: '13:00', end: '17:00' }], days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] }]);
export const saveWorkSchedule = async (schedule: WorkSchedule): Promise<void> => saveDocument(STORAGE_KEY_SCHEDULES, schedule.id, schedule);
export const deleteWorkSchedule = async (id: string): Promise<void> => deleteDocument(STORAGE_KEY_SCHEDULES, id);

export const getCalendarEvents = async (): Promise<CalendarEvent[]> => getFromStorage<CalendarEvent[]>(STORAGE_KEY_CALENDAR_EVENTS, []);
export const saveCalendarEvent = async (event: CalendarEvent): Promise<void> => saveDocument(STORAGE_KEY_CALENDAR_EVENTS, event.id, event);
export const deleteCalendarEvent = async (id: string): Promise<void> => deleteDocument(STORAGE_KEY_CALENDAR_EVENTS, id);

export const getLeaveRequests = async (): Promise<LeaveRequest[]> => getFromStorage<LeaveRequest[]>(STORAGE_KEY_LEAVES, []);
export const saveNewLeaveRequest = async (request: LeaveRequest): Promise<void> => {
  await saveDocument(STORAGE_KEY_LEAVES, request.id, request);
  await saveNotification({ id: Date.now().toString(), title: 'طلب إجازة', message: `طلب جديد من ${request.employeeName}`, date: new Date().toLocaleDateString('ar-EG'), read: false });
};
export const updateLeaveStatus = async (id: string, status: 'Approved' | 'Rejected'): Promise<void> => {
  const list = await getLeaveRequests();
  const item = list.find(l => l.id === id);
  if (item) {
    item.status = status;
    await saveDocument(STORAGE_KEY_LEAVES, id, item);
  }
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  const logs = await getFromStorage<AuditLog[]>(STORAGE_KEY_LOGS, []);
  return logs.sort((a,b) => b.timestamp - a.timestamp).slice(0, 50);
};

export const saveAuditLog = async (log: AuditLog): Promise<void> => saveDocument(STORAGE_KEY_LOGS, log.id, log);

export const getNotifications = async (): Promise<Notification[]> => {
  const notes = await getFromStorage<Notification[]>(STORAGE_KEY_NOTIFICATIONS, []);
  return notes.sort((a,b) => parseInt(b.id) - parseInt(a.id)).slice(0, 20);
};

export const saveNotification = async (note: Notification): Promise<void> => saveDocument(STORAGE_KEY_NOTIFICATIONS, note.id, note);

export const checkAndGenerateAbsenceAlerts = async (): Promise<number> => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dayName = new Date().toLocaleDateString('ar-EG', { weekday: 'long' });
  const calendarEvents = await getCalendarEvents();
  if (calendarEvents.find(e => e.date === todayStr && e.type === 'HOLIDAY')) return 0;
  
  const allEmployees = await getEmployees();
  const records = await getRecords(100); 
  const presentNames = new Set(records.filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString() && r.type === AttendanceType.CHECK_IN).map(r => r.workerName));
  
  let alerts = 0;
  for (const emp of allEmployees) {
    if (emp.status === 'Active' && !presentNames.has(emp.name)) {
      // Logic for alerts...
    }
  }
  return alerts;
};
