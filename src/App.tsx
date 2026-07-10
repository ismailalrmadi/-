import React, { useState, useEffect, useRef } from 'react';
import { Client, Project, Technician, Visit, Route, LogEntry, UserRole, RolePermissions, AppUser } from './types';
import { initialClients, initialProjects, initialTechnicians, initialVisits, initialRoutes, initialLogs } from './data/mockData';
import { getDistanceKm, optimizeTSP } from './lib/store';
import { parseWorksToDuration, DEFAULT_WORK_DURATIONS } from './utils';
import {
  dbGetClients,
  dbSaveClient,
  dbDeleteClient,
  dbGetProjects,
  dbSaveProject,
  dbDeleteProject,
  dbGetTechnicians,
  dbSaveTechnician,
  dbDeleteTechnician,
  dbGetVisits,
  dbSaveVisit,
  dbDeleteVisit,
  dbGetRoutes,
  dbSaveRoute,
  dbDeleteRoute,
  dbGetLogs,
  dbSaveLog,
  dbDeleteLog,
  dbGetUsers,
  dbSaveUser,
  dbDeleteUser
} from './lib/firebase';

import MapContainer from './components/MapContainer';
import RouteOptimizer from './components/RouteOptimizer';
import SchedulerTimeline from './components/SchedulerTimeline';
import TechnicianView from './components/TechnicianView';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ManagementPanel from './components/ManagementPanel';
import CRMImporter from './components/CRMImporter';
import RegionalPlanner from './components/RegionalPlanner';
import PermissionsManager from './components/PermissionsManager';
import OnlineBookingPortal from './components/OnlineBookingPortal';

import { Map as MapIcon, MapPin, Calendar, BarChart3, Navigation, ShieldCheck, UserCheck, Bell, Activity, Globe, RefreshCw, Users, FileSpreadsheet, Shield, Lock, Key, AlertTriangle, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

// Reusable elegant Permission Lock Screen for simulated roles testing
function PermissionLockScreen({ 
  requiredPermission, 
  currentRole, 
  onUpgrade 
}: { 
  requiredPermission: string; 
  currentRole: UserRole; 
  onUpgrade: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto my-12 shadow-sm animate-fade-in" dir="rtl">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
        <Lock className="w-8 h-8" />
      </div>
      <h3 className="font-black text-slate-800 text-sm">الوصول محظور • صلاحيات غير كافية</h3>
      <p className="text-slate-500 text-xs mt-2 leading-relaxed">
        أنت تحاول الوصول إلى قسم يتطلب صلاحية <strong className="text-slate-700">"{requiredPermission}"</strong>. 
        حسابك الحالي ذو رتبة <strong className="text-indigo-600">"{currentRole === 'admin' ? 'مدير نظام (Admin)' : currentRole === 'manager' ? 'منسق (Manager)' : 'فني ميداني (Technician)'}"</strong> لا يمتلك هذا الترخيص.
      </p>
      
      <div className="mt-6 p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-right">
        <span className="block text-[10px] text-slate-400 font-bold mb-1">تعليمات تجربة الصلاحيات:</span>
        <p className="text-[10px] text-slate-600 leading-relaxed">
          لتجربة النظام الميداني والوصول الفوري، يمكنك ترقية دورك إلى <strong className="text-slate-800">"أدمن النظام / المسؤول"</strong> من خلال شريط التنقل العلوي، وسيتم تفعيل هذا القسم تلقائياً.
        </p>
      </div>

      <button
        onClick={onUpgrade}
        className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
      >
        <Key className="w-4 h-4 text-amber-400 animate-pulse" />
        الترقية السريعة إلى رتبة أدمن النظام
      </button>
    </div>
  );
}

export default function App() {
  const navRef = useRef<HTMLDivElement>(null);
  // --- Persistent Core States ---
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('ars_clients');
    return saved ? JSON.parse(saved) : [];
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('ars_projects');
    return saved ? JSON.parse(saved) : [];
  });

  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    const saved = localStorage.getItem('ars_technicians');
    return saved ? JSON.parse(saved) : [];
  });

  const [visits, setVisits] = useState<Visit[]>(() => {
    const saved = localStorage.getItem('ars_visits');
    return saved ? JSON.parse(saved) : [];
  });

  const [routes, setRoutes] = useState<Route[]>(() => {
    const saved = localStorage.getItem('ars_routes');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('ars_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('ars_users');
    return saved ? JSON.parse(saved) : [];
  });

  // Database Connection / Sync state indicators
  const [dbSyncing, setDbSyncing] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // --- Dynamic Roles & Permissions State ---
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('ars_current_role');
    return (saved as UserRole) || 'admin';
  });

  const [permissions, setPermissions] = useState<Record<UserRole, RolePermissions>>(() => {
    const saved = localStorage.getItem('ars_permissions');
    if (saved) return JSON.parse(saved);
    return {
      admin: {
        manageUsers: true,
        scheduleVisits: true,
        optimizeRoutes: true,
        importCRM: true,
        viewAnalytics: true,
        managePermissions: true,
        completeVisits: true,
        resetDatabase: true
      },
      manager: {
        manageUsers: false,
        scheduleVisits: true,
        optimizeRoutes: true,
        importCRM: false,
        viewAnalytics: true,
        managePermissions: false,
        completeVisits: false,
        resetDatabase: false
      },
      technician: {
        manageUsers: false,
        scheduleVisits: false,
        optimizeRoutes: false,
        importCRM: false,
        viewAnalytics: false,
        managePermissions: false,
        completeVisits: true,
        resetDatabase: false
      }
    };
  });

  // Sync role and permissions with localStorage
  useEffect(() => {
    localStorage.setItem('ars_current_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('ars_permissions', JSON.stringify(permissions));
  }, [permissions]);

  // Helper check
  const hasPermission = (permissionKey: keyof RolePermissions) => {
    return permissions[currentRole]?.[permissionKey] ?? false;
  };

  // Check if URL query contains 'view=booking' or hash contains '#booking' to serve the public booking portal directly in standalone mode
  const [isPublicPortal, setIsPublicPortal] = useState(() => {
    return window.location.search.includes('view=booking') || 
           window.location.search.includes('booking=1') ||
           window.location.hash.includes('booking');
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('ars_logged_in') === 'true';
  });

  const handleLogin = (role: UserRole) => {
    setCurrentRole(role);
    setIsLoggedIn(true);
    localStorage.setItem('ars_logged_in', 'true');
    if (role === 'technician') {
      setActiveTab('technician');
    } else {
      setActiveTab('dispatcher');
      setDispatcherSubTab('map');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('ars_logged_in');
  };

  // Listen to hash/search changes or state triggers
  useEffect(() => {
    const handleHashChange = () => {
      setIsPublicPortal(
        window.location.search.includes('view=booking') || 
        window.location.search.includes('booking=1') ||
        window.location.hash.includes('booking')
      );
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // --- UI Navigation / Focus States ---
  const [activeTab, setActiveTab] = useState<'dispatcher' | 'technician'>('dispatcher');
  const [dispatcherSubTab, setDispatcherSubTab] = useState<'map' | 'scheduler' | 'optimizer' | 'regional-planner' | 'analytics' | 'management' | 'crm-import' | 'security' | 'booking-portal'>('map');

  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | undefined>(undefined);
  const [activeTechId, setActiveTechId] = useState<string>(technicians[0]?.id || 't1');


  // --- Sync state with Firestore on mount ---
  useEffect(() => {
    async function syncWithFirestore() {
      setDbSyncing(true);
      try {
        const remoteClients = await dbGetClients();
        const remoteProjects = await dbGetProjects();
        const remoteTechnicians = await dbGetTechnicians();
        const remoteVisits = await dbGetVisits();
        const remoteRoutes = await dbGetRoutes();
        const remoteLogs = await dbGetLogs();
        const remoteUsers = await dbGetUsers();

        // Update local state and localStorage cache with data fetched from cloud Firestore
        setClients(remoteClients);
        setProjects(remoteProjects);
        setTechnicians(remoteTechnicians);
        setVisits(remoteVisits);
        setRoutes(remoteRoutes);
        setUsers(remoteUsers);
        const uniqueLogsMap = new Map<string, LogEntry>();
        remoteLogs.forEach(l => {
          if (l && l.id) {
            uniqueLogsMap.set(l.id, l);
          }
        });
        const uniqueLogs = Array.from(uniqueLogsMap.values()) as LogEntry[];
        setLogs(uniqueLogs.sort((a: LogEntry, b: LogEntry) => b.id.localeCompare(a.id)));
      } catch (err) {
        console.error("Firestore loading error:", err);
        setDbError("تعذر الاتصال بقاعدة البيانات السحابية، يتم استخدام وضع العمل غير المتصل حالياً.");
      } finally {
        setDbSyncing(false);
      }
    }

    syncWithFirestore();
  }, []);

  // --- Sync with LocalStorage Cache ---
  useEffect(() => {
    localStorage.setItem('ars_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('ars_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('ars_technicians', JSON.stringify(technicians));
  }, [technicians]);

  useEffect(() => {
    localStorage.setItem('ars_visits', JSON.stringify(visits));
  }, [visits]);

  useEffect(() => {
    localStorage.setItem('ars_routes', JSON.stringify(routes));
  }, [routes]);

  useEffect(() => {
    localStorage.setItem('ars_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('ars_users', JSON.stringify(users));
  }, [users]);

  // --- Core Operation State Actions ---

  // Helper to append a dynamic log entry
  const appendLog = (techId: string, action: string, type: LogEntry['type'] = 'info', visitId?: string) => {
    const techName = technicians.find(t => t.id === techId)?.name || 'System';
    const clientName = visitId ? clients.find(c => c.id === visits.find(v => v.id === visitId)?.clientId)?.name : undefined;

    const newLog: LogEntry = {
      id: `l_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      technicianId: techId,
      technicianName: techName,
      visitId,
      clientName,
      action,
      type
    };

    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Limit to last 50 log events
    dbSaveLog(newLog); // Save to cloud Firestore
  };

  // Add Visit
  const handleAddVisit = (visitData: Omit<Visit, 'id'> & { id?: string }) => {
    const newVisit: Visit = {
      ...visitData,
      id: visitData.id || `v_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };

    setVisits(prev => [...prev, newVisit]);
    dbSaveVisit(newVisit); // Save to cloud Firestore
    appendLog(visitData.technicianId, `تمت جدولة زيارة جديدة: "${visitData.title}"`, 'info');
  };

  const handleAddVisits = (visitsData: (Omit<Visit, 'id'> & { id?: string })[]) => {
    const newVisits = visitsData.map((data, i) => ({
      ...data,
      id: data.id || `v_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`
    }));
    setVisits(prev => [...prev, ...newVisits]);
    newVisits.forEach(v => dbSaveVisit(v));
  };

  const handleAddClients = (clientsData: Omit<Client, 'id'>[]) => {
    const newClients = clientsData.map((data, i) => ({
      ...data,
      id: `c_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`
    }));
    setClients(prev => [...prev, ...newClients]);
    newClients.forEach(c => dbSaveClient(c));
    return newClients;
  };

  // Delete Visit
  const handleDeleteVisit = (id: string) => {
    const visitToDelete = visits.find(v => v.id === id);
    if (!visitToDelete) return;

    setVisits(prev => prev.filter(v => v.id !== id));
    dbDeleteVisit(id); // Delete from cloud Firestore
    appendLog(visitToDelete.technicianId, `تم إلغاء الزيارة: "${visitToDelete.title}"`, 'warning');
  };

  // Update Visit Status / Details (Driving en-route, checked-in, upload photo, signature, feedback, complete)
  const handleUpdateVisitStatus = (visitId: string, status: Visit['status'], details?: Partial<Visit>) => {
    setVisits(prev => prev.map(v => {
      if (v.id === visitId) {
        const updated = { ...v, status, ...details };

        // Append corresponding logs for state changes
        if (status === 'en_route') {
          appendLog(v.technicianId, `بدأ التحرك بالمركبة متوجهاً إلى موقع العميل`, 'info', visitId);
          // Set tech status to traveling
          setTechnicians(tPrev => tPrev.map(t => {
            if (t.id === v.technicianId) {
              const uTech: Technician = { ...t, status: 'traveling' };
              dbSaveTechnician(uTech);
              return uTech;
            }
            return t;
          }));
        } else if (status === 'checked_in') {
          appendLog(v.technicianId, `وصل وقام بتسجيل الدخول في موقع العمل`, 'success', visitId);
          // Set tech status to working
          setTechnicians(tPrev => tPrev.map(t => {
            if (t.id === v.technicianId) {
              const uTech: Technician = { ...t, status: 'working' };
              dbSaveTechnician(uTech);
              return uTech;
            }
            return t;
          }));
        } else if (status === 'completed') {
          appendLog(v.technicianId, `أنجز المهمة بنجاح ورفع التقارير الميدانية`, 'success', visitId);
          // Set tech status to idle
          setTechnicians(tPrev => tPrev.map(t => {
            if (t.id === v.technicianId) {
              const uTech: Technician = { ...t, status: 'idle' };
              dbSaveTechnician(uTech);
              return uTech;
            }
            return t;
          }));
        } else if (status === 'delayed') {
          appendLog(v.technicianId, `أبلغ عن تأخير بسبب حركة المرور: "${details?.delayReason}"`, 'error', visitId);
        }

        dbSaveVisit(updated); // Save update to cloud Firestore
        return updated;
      }
      return v;
    }));
  };

  // Simulate Technician Location movement along map polylines
  const handleSimulateMovement = (techId: string, targetLat: number, targetLng: number, onArrive: () => void) => {
    setTechnicians(prev => prev.map(t => {
      if (t.id === techId) {
        const uTech = {
          ...t,
          currentLat: targetLat,
          currentLng: targetLng
        };
        dbSaveTechnician(uTech); // Save update to cloud Firestore
        return uTech;
      }
      return t;
    }));
  };

  // Re-sequence routes manually or via TSP optimization
  const handleUpdateVisitSequence = (orderedVisitIds: string[], technicianId: string) => {
    setVisits(prev => {
      const visitsCopy = [...prev];
      orderedVisitIds.forEach((id, index) => {
        const idx = visitsCopy.findIndex(v => v.id === id);
        if (idx !== -1) {
          const updatedVisit = { ...visitsCopy[idx], routeSequence: index + 1 };
          visitsCopy[idx] = updatedVisit;
          dbSaveVisit(updatedVisit); // Save update to cloud Firestore
        }
      });
      return visitsCopy;
    });

    // Recalculate route stats
    const updatedVisits = visits.filter(v => v.technicianId === technicianId && v.status !== 'completed');
    const tech = technicians.find(t => t.id === technicianId);
    if (tech) {
      let totalD = 0;
      let currLat = tech.currentLat;
      let currLng = tech.currentLng;

      updatedVisits.forEach(v => {
        const cl = clients.find(c => c.id === v.clientId);
        if (cl) {
          totalD += getDistanceKm(currLat, currLng, cl.lat, cl.lng);
          currLat = cl.lat;
          currLng = cl.lng;
        }
      });

      setRoutes(prev => prev.map(r => {
        if (r.technicianId === technicianId) {
          const uRoute = {
            ...r,
            totalDistanceKm: parseFloat(totalD.toFixed(1)),
            totalDurationMin: Math.round(totalD * 15) // approximation
          };
          dbSaveRoute(uRoute); // Save update to cloud Firestore
          return uRoute;
        }
        return r;
      }));
    }

    appendLog(technicianId, `تم تحسين ترتيب محطات القيادة باستخدام خوارزمية المسار الأقصر`, 'info');
  };

  // Save Route as Favorite
  const handleSaveFavoriteRoute = (technicianId: string) => {
    setRoutes(prev => prev.map(r => {
      if (r.technicianId === technicianId) {
        const uRoute = { ...r, isFavorite: !r.isFavorite };
        dbSaveRoute(uRoute); // Save update to cloud Firestore
        return uRoute;
      }
      return r;
    }));
    const r = routes.find(route => route.technicianId === technicianId);
    appendLog(technicianId, `تم ${r?.isFavorite ? 'إزالة المسار من' : 'إضافة المسار إلى'} قائمة المسارات المفضلة`, 'info');
  };

  // Route Splitting & Reassigning
  const handleAssignVisit = (visitId: string, targetTechnicianId: string) => {
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;

    setVisits(prev => prev.map(v => {
      if (v.id === visitId) {
        const uVisit = {
          ...v,
          technicianId: targetTechnicianId,
          routeSequence: prev.filter(vt => vt.technicianId === targetTechnicianId).length + 1
        };
        dbSaveVisit(uVisit); // Save update to cloud Firestore
        return uVisit;
      }
      return v;
    }));

    appendLog(targetTechnicianId, `تم إعادة تعيين مهمة "${visit.title}" إلى هذا الفني`, 'info', visitId);
  };

  // Smart Auto-Scheduler Load Balancer
  const handleAutoSchedule = () => {
    // 1. Find all en-route or pending visits that are not completed
    const pendingVisits = visits.filter(v => v.status === 'pending');
    if (pendingVisits.length === 0) return;

    // 2. Distribute visits evenly among the 3 technicians
    const updatedVisits = [...visits];
    pendingVisits.forEach((visit, index) => {
      // Rotate assignment among t1, t2, t3
      const tech = technicians[index % technicians.length];
      const idx = updatedVisits.findIndex(v => v.id === visit.id);
      if (idx !== -1) {
        updatedVisits[idx] = {
          ...updatedVisits[idx],
          technicianId: tech.id,
          routeSequence: index + 1
        };
      }
    });

    // 3. For each technician, optimize the TSP path sequence geographically
    technicians.forEach(t => {
      const techVisits = updatedVisits.filter(v => v.technicianId === t.id && v.status !== 'completed');
      const ordered = optimizeTSP(techVisits.map(v => v.id), clients, t.currentLat, t.currentLng);
      // Update sequence order and dynamically allocate times based on job scope
      const [sh, sm] = (t.shiftStart || '09:00').split(':').map(Number);
      let currentMins = sh * 60 + sm;
      ordered.forEach((id, index) => {
        const idx = updatedVisits.findIndex(v => v.id === id);
        if (idx !== -1) {
          const visit = updatedVisits[idx];
          visit.routeSequence = index + 1;
          
          const savedDurations = localStorage.getItem('ars_work_durations');
          const workDurations = savedDurations ? JSON.parse(savedDurations) : DEFAULT_WORK_DURATIONS;
          let durationMins = parseWorksToDuration(visit.originalWorks || visit.title.replace("رفع مقاسات: ", ""), workDurations);

          visit.estimatedDuration = durationMins;

          const startHour = Math.floor(currentMins / 60) % 24;
          const startMinute = currentMins % 60;
          visit.plannedStartTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
          
          const endMins = currentMins + durationMins;
          const endHour = Math.floor(endMins / 60) % 24;
          const endMinute = endMins % 60;
          visit.plannedEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
          
          // Add 30 mins buffer for travel/breaks for the next visit
          currentMins = endMins + 30;
        }
      });
    });

    setVisits(prev => {
      const changedVisits = updatedVisits.filter(newVisit => {
        const oldVisit = prev.find(v => v.id === newVisit.id);
        return JSON.stringify(oldVisit) !== JSON.stringify(newVisit);
      });
      changedVisits.forEach(v => dbSaveVisit(v));
      return updatedVisits;
    });

    appendLog('t1', `قام نظام التوزيع الذكي بجدولة وموازنة حمولة ${pendingVisits.length} مهام جغرافياً`, 'success');
  };

  // --- Admin Management Actions ---

  const handleAddTechnician = (techData: Omit<Technician, 'id'>) => {
    const newId = `t_${Date.now()}`;
    const newTech: Technician = {
      ...techData,
      id: newId
    };
    setTechnicians(prev => [...prev, newTech]);
    dbSaveTechnician(newTech); // Save to cloud Firestore
    
    const newRoute: Route = {
      id: `r_${newId}`,
      technicianId: newId,
      date: '2026-07-09',
      visitIds: [],
      totalDistanceKm: 0,
      totalDurationMin: 0
    };
    setRoutes(prev => [...prev, newRoute]);
    dbSaveRoute(newRoute); // Save to cloud Firestore

    // Create a corresponding AppUser account with the 'technician' role
    const newUser: AppUser = {
      id: `u_${newId}`,
      name: techData.name,
      phone: techData.phone,
      password: '123',
      role: 'technician',
      status: 'active',
      lastActive: 'لم ينشط بعد'
    };
    setUsers(prev => [...prev, newUser]);
    dbSaveUser(newUser); // Save user to cloud Firestore

    appendLog(newId, `تم تسجيل فني ميداني جديد: "${techData.name}"`, 'success');
  };

  const handleDeleteTechnician = (id: string) => {
    setTechnicians(prev => prev.filter(t => t.id !== id));
    setVisits(prev => prev.filter(v => v.technicianId !== id));
    setRoutes(prev => prev.filter(r => r.technicianId !== id));

    dbDeleteTechnician(id); // Delete from cloud Firestore
    // Remove related records from Firestore
    visits.filter(v => v.technicianId === id).forEach(v => dbDeleteVisit(v.id));
    routes.filter(r => r.technicianId === id).forEach(r => dbDeleteRoute(r.id));
  };

  const handleAddClient = (clientData: Omit<Client, 'id'> & { id?: string }) => {
    const newId = clientData.id || `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newClient: Client = {
      ...clientData,
      id: newId
    };
    setClients(prev => {
      // Avoid adding duplicate IDs if called rapidly
      if (prev.some(c => c.id === newId)) return prev;
      return [...prev, newClient];
    });
    dbSaveClient(newClient); // Save to cloud Firestore
    appendLog('t1', `تمت إضافة عميل وموقع جديد: "${clientData.name}"`, 'success');
  };

  const handleDeleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setVisits(prev => prev.filter(v => v.clientId !== id));

    dbDeleteClient(id); // Delete from cloud Firestore
    // Remove related visits from Firestore
    visits.filter(v => v.clientId === id).forEach(v => dbDeleteVisit(v.id));
  };

  const handleUpdateTechnician = (tech: Technician) => {
    setTechnicians(prev => prev.map(t => t.id === tech.id ? tech : t));
    dbSaveTechnician(tech); // Save update to cloud Firestore
    appendLog(tech.id, `تم تحديث بيانات الفني الميداني: "${tech.name}"`, 'info');
  };

  const handleUpdateClient = (client: Client) => {
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
    dbSaveClient(client); // Save update to cloud Firestore
    appendLog('t1', `تم تحديث بيانات العميل والموقع: "${client.name}"`, 'info');
  };

  // Wrapper for updating geographical visits
  const handleUpdateVisits = (newVisits: Visit[]) => {
    setVisits(prev => {
      const changedVisits = newVisits.filter(newVisit => {
        const oldVisit = prev.find(v => v.id === newVisit.id);
        return JSON.stringify(oldVisit) !== JSON.stringify(newVisit);
      });
      changedVisits.forEach(v => dbSaveVisit(v));
      return newVisits;
    });
  };

  
  const handleCleanupArchive = async () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const visitsToDelete = visits.filter(v => {
      if (v.status !== 'completed') return false;
      const visitDate = new Date(v.date);
      return visitDate < twoWeeksAgo;
    });

    for (const v of visitsToDelete) {
      await dbDeleteVisit(v.id);
    }
    
    setVisits(prev => prev.filter(v => !visitsToDelete.some(del => del.id === v.id)));
    
    if (visitsToDelete.length > 0) {
      appendLog('t1', `تم تنظيف ${visitsToDelete.length} من المواعيد المؤرشفة القديمة`, 'success');
      alert(`تم تنظيف ${visitsToDelete.length} من المواعيد المؤرشفة بنجاح.`);
    } else {
      alert('لا توجد مواعيد قديمة تستدعي التنظيف.');
    }
  };

  // Clear or Reset State database

  const handleSeedMockData = async () => {
    if (!window.confirm("هل أنت متأكد من إضافة بيانات تجريبية جديدة لقاعدة البيانات؟")) return;
    try {
      for (const c of initialClients) await dbSaveClient(c);
      for (const p of initialProjects) await dbSaveProject(p);
      for (const t of initialTechnicians) await dbSaveTechnician(t);
      for (const v of initialVisits) await dbSaveVisit(v);
      for (const r of initialRoutes) await dbSaveRoute(r);
      for (const l of initialLogs) await dbSaveLog(l);
      const initialUsers: AppUser[] = [
        { id: 'u1', name: 'إسماعيل الرمادي', phone: '0500000001', password: '123', role: 'admin', status: 'active', lastActive: 'الآن' },
        { id: 'u2', name: 'أحمد القحطاني', phone: '0500000002', password: '123', role: 'manager', status: 'active', lastActive: 'قبل ١٠ دقائق' },
        { id: 'u3', name: 'خالد الحربي', phone: '0500000003', password: '123', role: 'technician', status: 'active', lastActive: 'قبل ساعة' }
      ];
      for (const u of initialUsers) await dbSaveUser(u);
      window.location.reload();
    } catch (e) {
      alert("حدث خطأ أثناء إضافة البيانات الافتراضية");
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("تحذير: سيتم مسح جميع البيانات من السحابة. هل أنت متأكد؟")) return;
    localStorage.removeItem('ars_clients');
    localStorage.removeItem('ars_projects');
    localStorage.removeItem('ars_technicians');
    localStorage.removeItem('ars_visits');
    localStorage.removeItem('ars_routes');
    localStorage.removeItem('ars_logs');
    localStorage.removeItem('ars_users');

    // Wipe remote cloud collections
    for (const c of clients) {
      await dbDeleteClient(c.id);
    }
    for (const p of projects) {
      await dbDeleteProject(p.id);
    }
    for (const t of technicians) {
      await dbDeleteTechnician(t.id);
    }
    for (const v of visits) {
      await dbDeleteVisit(v.id);
    }
    for (const r of routes) {
      await dbDeleteRoute(r.id);
    }
    for (const l of logs) {
      await dbDeleteLog(l.id);
    }
    for (const u of users) {
      await dbDeleteUser(u.id);
    }

    window.location.reload();
  };

  if (isPublicPortal) {
    return (
      <OnlineBookingPortal
        clients={clients}
        technicians={technicians}
        visits={visits}
        onAddClient={handleAddClient}
        onAddVisit={handleAddVisit}
        onBackToAdmin={() => {
          window.location.hash = '';
          setIsPublicPortal(false);
        }}
        standalone={false}
      />
    );
  }

  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Authenticate against Users state from Firestore
    const user = users.find(u => u.phone === loginPhone && u.password === loginPassword);
    
    if (user && user.status !== 'suspended') {
      handleLogin(user.role as UserRole);
    } else if (loginPhone === 'admin' && loginPassword === 'admin' || (loginPhone === '0500000001' && loginPassword === '123' && users.length === 0)) {
      handleLogin('admin');
    } else {
      setLoginError('بيانات الدخول غير صحيحة. جرب 0500000001 و 123');
    }
  };

  if (!isLoggedIn && !isPublicPortal) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-fade-in border border-slate-100">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-6 shadow-lg shadow-indigo-600/30">
            ARS
          </div>
          <h2 className="text-xl font-black text-slate-800 text-center mb-2">تسجيل الدخول للنظام</h2>
          <p className="text-xs text-slate-500 text-center mb-8">أدخل رقم الجوال وكلمة المرور للدخول</p>
          
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 text-center font-bold">
                {loginError}
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم المستخدم (رقم الجوال)</label>
              <input
                type="text"
                required
                value={loginPhone}
                onChange={e => setLoginPhone(e.target.value)}
                placeholder="05XXXXXXXX"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-right font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">كلمة المرور</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-right font-mono"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-4 py-3 text-sm transition-all shadow-md shadow-indigo-600/20"
            >
              تسجيل الدخول
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
             <button
              onClick={() => setIsPublicPortal(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
             >
               الانتقال إلى بوابة العميل (الحجز الذاتي) &larr;
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Upper Navigation Header bar */}
      <header className="bg-slate-900 text-slate-100 border-b border-slate-800 shrink-0 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand logo details */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-950/30">
              ARS
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-base tracking-tight leading-none">منصة ARS لرفع المقاسات وإدارة الميدان</h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">الإصدار الأول: رفع المقاسات</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">خدمات رفع المقاسات المتكاملة وإدارة مسارات الفنيين الذكية بالرياض (سيتم إطلاق خدمات الصيانة الميدانية كإصدار ثانٍ لاحقاً)</p>
            </div>
          </div>

          {/* Tab Navigation selectors */}
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setActiveTab('dispatcher');
                  if (currentRole === 'technician') {
                    setCurrentRole('admin'); // Fallback to admin if they select dispatcher view
                  }
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'dispatcher'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                لوحة تحكم المرسِل
              </button>
              <button
                onClick={() => {
                  setActiveTab('technician');
                  if (currentRole !== 'technician') {
                    setCurrentRole('technician');
                  }
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'technician'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                تطبيق الفني الميداني
              </button>
            </div>

            {/* Simulated Role Selection dropdown */}
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <span className="text-[10px] font-bold text-slate-500 mr-2 select-none">المحاكاة الأمنية:</span>
              <select
                value={currentRole}
                onChange={(e) => {
                  const targetRole = e.target.value as UserRole;
                  setCurrentRole(targetRole);
                  if (targetRole === 'technician') {
                    setActiveTab('technician');
                  } else {
                    setActiveTab('dispatcher');
                  }
                }}
                className="bg-slate-900 text-slate-100 border border-slate-800 rounded-lg px-2 py-0.5 text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-right"
                dir="rtl"
              >
                <option value="admin">👑 مسؤول النظام (Admin)</option>
                <option value="manager">📋 منسق الميدان (Manager)</option>
                <option value="technician">🚗 فني قياسات (Technician)</option>
              </select>
              <button
                onClick={handleLogout}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-2 py-1 text-xs font-bold transition-all ml-1"
                title="تسجيل الخروج"
              >
                خروج
              </button>
            </div>
          </div>

          {/* Quick Stats bar */}
          <div className="hidden lg:flex items-center gap-4 text-slate-400 text-[11px] border-l border-slate-800 pl-4">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${dbSyncing ? 'bg-amber-400 animate-pulse' : dbError ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'}`} />
              <span>{dbSyncing ? 'جاري مزامنة السحابة...' : dbError ? 'تم قطع الاتصال بالسحابة' : 'قاعدة البيانات السحابية متصلة'}</span>
            </div>
            <button
              onClick={handleResetDatabase}
              title="إفراغ قاعدة البيانات من جميع السجلات"
              className="text-slate-500 hover:text-red-400 text-[10px] uppercase font-mono transition-colors cursor-pointer"
            >
              إفراغ البيانات
            </button>
            <button
              onClick={handleSeedMockData}
              title="إضافة بيانات افتراضية للتجربة"
              className="text-slate-500 hover:text-emerald-400 text-[10px] uppercase font-mono transition-colors cursor-pointer"
            >
              بيانات تجريبية
            </button>
          </div>
        </div>
      </header>

      {/* Main Body content wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {activeTab === 'dispatcher' ? (
          /* Dispatcher View with Map and scheduling timelines */
          <div className="space-y-6">
            {/* Horizontal Sub tabs */}
            
            <div className="relative group flex items-center">
              <button 
                onClick={() => {
                  if (navRef.current) navRef.current.scrollBy({ left: -200, behavior: 'smooth' });
                }}
                className="absolute left-0 z-10 p-2 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-full -ml-3 text-slate-500 hover:text-indigo-600 hover:scale-105 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div ref={navRef} className="flex overflow-x-auto bg-white border border-slate-200 p-1 rounded-2xl shadow-sm scrollbar-none w-full scroll-smooth">
              <button
                onClick={() => setDispatcherSubTab('map')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  dispatcherSubTab === 'map'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                خريطة المتابعة المباشرة
              </button>
              <button
                onClick={() => setDispatcherSubTab('scheduler')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  dispatcherSubTab === 'scheduler'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                جدول المواعيد الزمني
              </button>
              <button
                onClick={() => setDispatcherSubTab('optimizer')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  dispatcherSubTab === 'optimizer'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Navigation className="w-4 h-4" />
                تحسين وتخطيط المسارات
              </button>
              <button
                onClick={() => setDispatcherSubTab('regional-planner')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  dispatcherSubTab === 'regional-planner'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Globe className="w-4 h-4 text-indigo-600" />
                التقسيم الجغرافي والجدولة بالأيام
              </button>
              <button
                onClick={() => setDispatcherSubTab('analytics')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  dispatcherSubTab === 'analytics'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                تحليلات ضغط العمل
              </button>
              <button
                onClick={() => setDispatcherSubTab('management')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  dispatcherSubTab === 'management'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4" />
                إدارة الفنيين والعملاء
              </button>
              <button
                onClick={() => setDispatcherSubTab('crm-import')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  dispatcherSubTab === 'crm-import'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                استيراد من CRM شيت
              </button>
              <button
                onClick={() => setDispatcherSubTab('security')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  dispatcherSubTab === 'security'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-4 h-4 text-indigo-600" />
                الصلاحيات والأمان
              </button>
              <button
                onClick={() => setDispatcherSubTab('booking-portal')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  dispatcherSubTab === 'booking-portal'
                    ? 'bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-200'
                    : 'text-indigo-600 hover:text-indigo-900 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                بوابة الحجز الذاتي للعملاء (Odoo)
              </button>
              </div>

              <button 
                onClick={() => {
                  if (navRef.current) navRef.current.scrollBy({ left: 200, behavior: 'smooth' });
                }}
                className="absolute right-0 z-10 p-2 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-full -mr-3 text-slate-500 hover:text-indigo-600 hover:scale-105 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic Rendering based on Selected SubTab */}
            <div className="grid grid-cols-1 gap-6">
              {dispatcherSubTab === 'map' && (
                <div className="space-y-6">
                  {/* Map container rendering */}
                  <MapContainer
                    clients={clients}
                    technicians={technicians}
                    visits={visits}
                    selectedClientId={selectedClientId}
                    selectedTechnicianId={selectedTechnicianId}
                    onSelectClient={(id) => setSelectedClientId(id)}
                    onSelectTechnician={(id) => setSelectedTechnicianId(id)}
                  />

                  {/* Lower splits: Dispatch log queues and active work schedules */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Live system logs */}
                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[340px]">
                      <div className="border-b border-slate-100 pb-3 shrink-0">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                          تغذية الإرسال المباشرة
                        </h4>
                        <p className="text-[10px] text-slate-400">تحديثات حالة فنيي الميدان في الرياض لحظة بلحظة.</p>
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-slate-50 mt-3 pr-1">
                        {logs.map((log, index) => (
                          <div key={`${log.id}_${index}`} className="py-2.5 text-xs flex items-start gap-2 animate-fade-in">
                            <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded shrink-0">
                              {log.timestamp}
                            </span>
                            <div className="min-w-0">
                              <p className="text-slate-700 font-medium leading-normal">
                                <strong className="text-slate-950">{log.technicianName}</strong>: {log.action}
                              </p>
                              {log.clientName && (
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  🏢 الموقع: {log.clientName}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick client directories */}
                    <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[340px]">
                      <div className="border-b border-slate-100 pb-3 shrink-0 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <Globe className="w-4 h-4 text-indigo-500" />
                            دليل خدمات العملاء
                          </h4>
                          <p className="text-[10px] text-slate-400">تحديد واستعراض مواقع العملاء على خريطة التتبع المباشر.</p>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 mt-3">
                        {clients.map((client) => {
                          const isSelected = selectedClientId === client.id;
                          return (
                            <div
                              key={client.id}
                              onClick={() => setSelectedClientId(client.id)}
                              className={`py-3 px-3 rounded-xl transition-all flex items-center justify-between gap-4 cursor-pointer border ${
                                isSelected
                                  ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                                  : 'border-transparent hover:bg-slate-50/50'
                              }`}
                            >
                              <div className="min-w-0">
                                <h5 className="font-semibold text-xs text-slate-900 truncate">{client.name}</h5>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{client.address}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${client.lat},${client.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-lg transition-all"
                                  title="فتح في خرائط جوجل"
                                >
                                  <MapPin className="w-3.5 h-3.5" />
                                </a>
                                <div className="text-right">
                                  <div className="text-[10px] font-bold text-indigo-600 uppercase">تركيز الـ GPS</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{client.contactPerson}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {dispatcherSubTab === 'scheduler' && (
                hasPermission('scheduleVisits') ? (
                  <SchedulerTimeline
                    clients={clients}
                    technicians={technicians}
                    visits={visits}
                    projects={projects}
                    onAddVisit={handleAddVisit}
                    onAutoSchedule={handleAutoSchedule}
                    onDeleteVisit={handleDeleteVisit}
                    onUpdateVisits={handleUpdateVisits}
                  />
                ) : (
                  <PermissionLockScreen 
                    requiredPermission="جدولة وتعديل مواعيد رفع المقاسات" 
                    currentRole={currentRole} 
                    onUpgrade={() => setCurrentRole('admin')} 
                  />
                )
              )}

              {dispatcherSubTab === 'optimizer' && (
                hasPermission('optimizeRoutes') ? (
                  <RouteOptimizer
                    clients={clients}
                    technicians={technicians}
                    visits={visits}
                    routes={routes}
                    onUpdateVisitSequence={handleUpdateVisitSequence}
                    onSaveFavoriteRoute={handleSaveFavoriteRoute}
                    onAssignVisit={handleAssignVisit}
                  />
                ) : (
                  <PermissionLockScreen 
                    requiredPermission="تحسين وتخطيط المسارات ذكياً" 
                    currentRole={currentRole} 
                    onUpgrade={() => setCurrentRole('admin')} 
                  />
                )
              )}

              {dispatcherSubTab === 'regional-planner' && (
                (hasPermission('optimizeRoutes') || hasPermission('scheduleVisits')) ? (
                  <RegionalPlanner
                    clients={clients}
                    technicians={technicians}
                    visits={visits}
                    onUpdateVisits={handleUpdateVisits}
                    appendLog={appendLog}
                  />
                ) : (
                  <PermissionLockScreen 
                    requiredPermission="تحسين وتخطيط المسارات ذكياً أو جدولة المواعيد" 
                    currentRole={currentRole} 
                    onUpgrade={() => setCurrentRole('admin')} 
                  />
                )
              )}

              {dispatcherSubTab === 'analytics' && (
                hasPermission('viewAnalytics') ? (
                  <AnalyticsDashboard
                    clients={clients}
                    technicians={technicians}
                    visits={visits}
                    routes={routes}
                  />
                ) : (
                  <PermissionLockScreen 
                    requiredPermission="عرض تقارير وتحليلات الميدان" 
                    currentRole={currentRole} 
                    onUpgrade={() => setCurrentRole('admin')} 
                  />
                )
              )}

              {dispatcherSubTab === 'management' && (
                hasPermission('manageUsers') ? (
                  <ManagementPanel
                    clients={clients}
                    technicians={technicians}
                    onAddTechnician={handleAddTechnician}
                    onDeleteTechnician={handleDeleteTechnician}
                    onUpdateTechnician={handleUpdateTechnician}
                    onAddClient={handleAddClient}
                    onDeleteClient={handleDeleteClient}
                    onUpdateClient={handleUpdateClient}
                  />
                ) : (
                  <PermissionLockScreen 
                    requiredPermission="إدارة الفنيين والعملاء والمشاريع" 
                    currentRole={currentRole} 
                    onUpgrade={() => setCurrentRole('admin')} 
                  />
                )
              )}

              {dispatcherSubTab === 'crm-import' && (
                hasPermission('importCRM') ? (
                  <CRMImporter
                    clients={clients}
                    technicians={technicians}
                    visits={visits}
                    onAddClient={handleAddClient}
                    onAddClients={handleAddClients}
                    onAddVisit={handleAddVisit}
                    onAddVisits={handleAddVisits}
                    appendLog={appendLog}
                  />
                ) : (
                  <PermissionLockScreen 
                    requiredPermission="استيراد السجلات من ملفات الـ CRM" 
                    currentRole={currentRole} 
                    onUpgrade={() => setCurrentRole('admin')} 
                  />
                )
              )}

              {dispatcherSubTab === 'security' && (
                hasPermission('managePermissions') ? (
                  <PermissionsManager
                    currentRole={currentRole}
                    permissions={permissions}
                    onUpdatePermissions={setPermissions}
                    appendLog={appendLog}
                    onCleanupArchive={handleCleanupArchive}
                    technicians={technicians}
                    onAddTechnician={handleAddTechnician}
                    users={users}
                    setUsers={setUsers}
                    dbSaveUser={dbSaveUser}
                    dbDeleteUser={dbDeleteUser}
                  />
                ) : (
                  <PermissionLockScreen 
                    requiredPermission="إدارة أدوار النظام وتغيير الصلاحيات" 
                    currentRole={currentRole} 
                    onUpgrade={() => setCurrentRole('admin')} 
                  />
                )
              )}

              {dispatcherSubTab === 'booking-portal' && (
                <OnlineBookingPortal
                  clients={clients}
                  technicians={technicians}
                  visits={visits}
                  onAddClient={handleAddClient}
                  onAddVisit={handleAddVisit}
                  onBackToAdmin={() => setDispatcherSubTab('map')}
                  standalone={false}
                />
              )}
            </div>
          </div>
        ) : (
          /* Mobile Technician Simulator view */
          <TechnicianView
            clients={clients}
            technicians={technicians}
            visits={visits}
            onUpdateVisitStatus={handleUpdateVisitStatus}
            onSimulateMovement={handleSimulateMovement}
            activeTechId={activeTechId}
            onChangeActiveTech={(id) => setActiveTechId(id)}
          />
        )}
      </main>

      {/* Footer copyright */}
      <footer className="bg-slate-100 border-t border-slate-200 py-4 text-center text-slate-400 text-xs shrink-0 mt-8">
        <p>© 2026 منصة ARS لرفع المقاسات وإدارة الميدان. نخدمكم في الرياض، المملكة العربية السعودية. جميع الحقوق محفوظة م/ اسماعيل الرمادي.</p>
      </footer>
    </div>
  );
}
