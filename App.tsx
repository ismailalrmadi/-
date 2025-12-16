import React, { useState, useEffect } from 'react';
import { ViewState, AttendanceType, AttendanceRecord, WorkshopConfig, Coordinates, UserRole } from './types';
import { getRecords, saveRecord, getWorkshopConfig, calculateDistance, getSession, clearSession, checkAndGenerateAbsenceAlerts } from './services/storageService';
import CameraCapture from './components/CameraCapture';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import DashboardView from './components/DashboardView';
import LoginView from './components/LoginView';
import LeavesView from './components/LeavesView';
import UserDashboardView from './components/UserDashboardView';
import QRScanner from './components/QRScanner';
import { Home, LayoutDashboard, Settings, MapPin, UserCheck, LogOut, CheckCircle2, QrCode, X, Calendar } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('USER');
  const [view, setView] = useState<ViewState>('HOME');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<WorkshopConfig | null>(null);
  const [workerName, setWorkerName] = useState('عامل 1');
  
  // Modals State
  const [showCamera, setShowCamera] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  
  // Process State
  const [pendingType, setPendingType] = useState<AttendanceType | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'GPS' | 'QR'>('GPS');
  
  // Location State
  const [currentLoc, setCurrentLoc] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [distanceToWork, setDistanceToWork] = useState<number | null>(null);

  useEffect(() => {
    // Check for existing session (Remember Me)
    const session = getSession();
    if (session) {
      setWorkerName(session.user);
      setUserRole(session.role);
      setIsAuthenticated(true);
    }
    
    // Initial Load Config
    const loadConfig = async () => {
        const c = await getWorkshopConfig();
        setConfig(c);
    };
    loadConfig();
  }, []);

  // Automatic Absence Check for Admins
  useEffect(() => {
    let interval: any;
    const runChecks = async () => {
        if (isAuthenticated && userRole === 'ADMIN') {
            await checkAndGenerateAbsenceAlerts();
        }
    };

    if (isAuthenticated && userRole === 'ADMIN') {
      runChecks();
      interval = setInterval(runChecks, 5 * 60 * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, userRole]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadRecords = async () => {
        setRecords(await getRecords());
    };
    loadRecords();
    
    // Start watching location
    if (navigator.geolocation && config) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCurrentLoc(coords);
          setLocationError('');
          const dist = calculateDistance(coords, config.center);
          setDistanceToWork(dist);
        },
        (err) => {
          setLocationError('يرجى تفعيل خدمة الموقع (GPS) للمتابعة');
          console.error(err);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(id);
    } else {
        if (!navigator.geolocation) setLocationError('المتصفح لا يدعم تحديد الموقع');
    }
  }, [config, isAuthenticated]); 

  // --- Auth Flow ---
  const handleLogin = (user: string, role: UserRole) => {
    setWorkerName(user);
    setUserRole(role);
    setIsAuthenticated(true);
    setView('HOME');
  };

  const handleLogout = () => {
    clearSession();
    setIsAuthenticated(false);
    setView('HOME');
    setUserRole('USER');
    setWorkerName(''); 
  };

  // --- GPS Flow ---
  const startGPSAttendance = (type: AttendanceType) => {
    if (!currentLoc) {
      alert("جاري تحديد الموقع... يرجى الانتظار");
      return;
    }
    setVerificationMethod('GPS');
    setPendingType(type);
    setShowCamera(true);
  };

  // --- QR Flow ---
  const startQRAttendance = () => {
    setShowTypeSelector(true);
  };

  const handleTypeSelection = (type: AttendanceType) => {
    setPendingType(type);
    setShowTypeSelector(false);
    setShowQR(true);
  };

  const handleQRScanSuccess = (decodedText: string) => {
    if (config && decodedText === config.qrCodeValue) {
      setShowQR(false);
      setVerificationMethod('QR');
      setShowCamera(true);
    } else {
      alert("كود QR غير صحيح أو لا ينتمي لهذه الورشة!");
    }
  };

  // --- Finalize Attendance ---
  const handlePhotoCaptured = async (imageData: string) => {
    if (!pendingType || !config) return;

    let isVerified = false;
    let locationToSave = currentLoc || { latitude: 0, longitude: 0 };

    if (verificationMethod === 'GPS') {
      isVerified = distanceToWork !== null && distanceToWork <= config.radiusMeters;
    } else {
      isVerified = true; 
    }

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      workerName,
      timestamp: Date.now(),
      type: pendingType,
      location: locationToSave,
      photoUrl: imageData,
      locationVerified: isVerified,
      verificationMethod: verificationMethod
    };

    await saveRecord(newRecord);
    setRecords([newRecord, ...records]);
    setShowCamera(false);
    setPendingType(null);
    
    alert(isVerified 
      ? `تم ${pendingType === AttendanceType.CHECK_IN ? 'تسجيل الدخول' : 'تسجيل الخروج'} بنجاح عبر ${verificationMethod === 'QR' ? 'الباركود' : 'الموقع'}`
      : `تحذير: تم التسجيل ولكنك خارج النطاق المحدد.`
    );
  };

  const renderHome = () => (
    <div className="flex flex-col h-full p-6 pb-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 text-center">
        <h2 className="text-gray-500 mb-1 text-sm">مرحباً بك،</h2>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{workerName}</h1>
        
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
          locationError 
            ? 'bg-red-50 text-red-600' 
            : (distanceToWork !== null && config && distanceToWork <= config.radiusMeters) 
              ? 'bg-green-50 text-green-700' 
              : 'bg-orange-50 text-orange-700'
        }`}>
          <MapPin size={16} />
          {locationError ? 'خطأ في الموقع' : 
            distanceToWork !== null 
              ? `${Math.round(distanceToWork)}م عن الورشة` 
              : 'جاري تحديد الموقع...'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 content-start mb-4">
        {/* GPS Buttons */}
        <button
          onClick={() => startGPSAttendance(AttendanceType.CHECK_IN)}
          disabled={!!locationError}
          className="col-span-1 bg-white border-2 border-emerald-100 hover:border-emerald-300 p-6 rounded-2xl shadow-sm flex flex-col items-center gap-3 disabled:opacity-50"
        >
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg">
            <UserCheck size={24} />
          </div>
          <span className="font-bold text-gray-700 text-sm">حضور (GPS)</span>
        </button>

        <button
          onClick={() => startGPSAttendance(AttendanceType.CHECK_OUT)}
          disabled={!!locationError}
          className="col-span-1 bg-white border-2 border-rose-100 hover:border-rose-300 p-6 rounded-2xl shadow-sm flex flex-col items-center gap-3 disabled:opacity-50"
        >
          <div className="w-12 h-12 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg">
            <LogOut size={24} />
          </div>
          <span className="font-bold text-gray-700 text-sm">انصراف (GPS)</span>
        </button>

        {/* QR Button - Full Width */}
        <button
          onClick={startQRAttendance}
          className="col-span-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg flex items-center justify-center gap-4 hover:shadow-xl transition-all"
        >
          <div className="bg-white/20 p-2 rounded-lg">
            <QrCode size={32} />
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">مسح الباركود</div>
            <div className="text-white/80 text-xs">تسجيل الحضور عبر QR</div>
          </div>
        </button>
      </div>
      
      {/* Last Record Hint */}
      {records.length > 0 && (
        <div className="mt-auto text-center text-sm text-gray-400 flex items-center justify-center gap-2">
          <CheckCircle2 size={14} />
          آخر نشاط: {new Date(records[0].timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})} 
          <span className="text-xs bg-gray-100 px-1 rounded">
             {records[0].verificationMethod === 'QR' ? 'QR' : 'GPS'}
          </span>
        </div>
      )}
    </div>
  );

  // If not authenticated, show Login View
  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  // If in Dashboard View (Admin), render without the mobile container constraints
  if (view === 'DASHBOARD') {
    return <DashboardView onBack={() => setView('SETTINGS')} userRole={userRole} />;
  }

  return (
    <div className="bg-gray-50 h-screen font-sans text-gray-900 max-w-md mx-auto shadow-2xl flex flex-col overflow-hidden relative">
      {/* Header */}
      <header className="bg-primary text-white p-4 shadow-md z-10 shrink-0">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">نظام الحضور</h1>
          <div className="text-xs opacity-80 bg-white/20 px-2 py-1 rounded">
             {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-gray-50">
        {view === 'HOME' && renderHome()}
        {view === 'LEAVES' && <LeavesView workerName={workerName} />}
        {view === 'HISTORY' && <HistoryView records={records} workerName={workerName} />}
        {view === 'USER_DASHBOARD' && (
          <UserDashboardView 
            records={records} 
            workerName={workerName}
            onNavigateToHistory={() => setView('HISTORY')}
            onNavigateToLeaves={() => setView('LEAVES')}
          />
        )}
        {view === 'SETTINGS' && config && (
          <SettingsView 
            currentConfig={config} 
            onConfigUpdate={setConfig} 
            workerName={workerName}
            setWorkerName={setWorkerName}
            onOpenDashboard={() => setView('DASHBOARD')}
            onLogout={handleLogout}
            userRole={userRole}
          />
        )}
      </main>

      {/* Modals */}
      {showCamera && (
        <CameraCapture 
          onCapture={handlePhotoCaptured} 
          onClose={() => setShowCamera(false)} 
        />
      )}

      {showQR && (
        <QRScanner 
          onScanSuccess={handleQRScanSuccess}
          onClose={() => setShowQR(false)}
        />
      )}

      {showTypeSelector && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">اختر نوع التسجيل</h3>
              <button onClick={() => setShowTypeSelector(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleTypeSelection(AttendanceType.CHECK_IN)}
                className="flex flex-col items-center gap-3 p-6 bg-emerald-50 border-2 border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
                  <UserCheck size={28} />
                </div>
                <span className="font-bold text-emerald-800">تسجيل حضور</span>
              </button>

              <button 
                onClick={() => handleTypeSelection(AttendanceType.CHECK_OUT)}
                className="flex flex-col items-center gap-3 p-6 bg-rose-50 border-2 border-rose-100 rounded-xl hover:bg-rose-100 transition-colors"
              >
                <div className="w-14 h-14 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md">
                  <LogOut size={28} />
                </div>
                <span className="font-bold text-rose-800">تسجيل انصراف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bg-white border-t border-gray-200 px-2 py-3 flex justify-around items-center text-xs font-medium text-gray-500 shrink-0 z-10">
        <button 
          onClick={() => setView('SETTINGS')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[60px] ${view === 'SETTINGS' ? 'text-primary bg-primary/10' : 'hover:bg-gray-50'}`}
        >
          <Settings size={22} strokeWidth={view === 'SETTINGS' ? 2.5 : 2} />
          <span>الإعدادات</span>
        </button>

        <button 
          onClick={() => setView('LEAVES')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[60px] ${view === 'LEAVES' ? 'text-primary bg-primary/10' : 'hover:bg-gray-50'}`}
        >
          <Calendar size={22} strokeWidth={view === 'LEAVES' ? 2.5 : 2} />
          <span>الإجازات</span>
        </button>
        
        <button 
          onClick={() => setView('HOME')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors -mt-10 ${view === 'HOME' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-gray-50 ${view === 'HOME' ? 'bg-primary text-white' : 'bg-white text-gray-400'}`}>
            <Home size={28} strokeWidth={2.5} />
          </div>
          <span>الرئيسية</span>
        </button>

        <button 
          onClick={() => setView('USER_DASHBOARD')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[60px] ${view === 'USER_DASHBOARD' ? 'text-primary bg-primary/10' : 'hover:bg-gray-50'}`}
        >
          <LayoutDashboard size={22} strokeWidth={view === 'USER_DASHBOARD' ? 2.5 : 2} />
          <span>لوحتي</span>
        </button>
      </nav>
    </div>
  );
}