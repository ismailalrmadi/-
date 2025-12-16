import React, { useState, useEffect } from 'react';
import { WorkshopConfig, UserRole, Employee, CalendarEvent } from '../types';
import { MapPin, Save, User, LayoutDashboard, QrCode, Printer, LogOut, Shield, Calendar, Plus, Trash2 } from 'lucide-react';
import { saveWorkshopConfig, getEmployees, saveEmployee, getCalendarEvents, saveCalendarEvent, deleteCalendarEvent } from '../services/storageService';

interface SettingsViewProps {
  currentConfig: WorkshopConfig;
  onConfigUpdate: (config: WorkshopConfig) => void;
  workerName: string;
  setWorkerName: (name: string) => void;
  onOpenDashboard: () => void;
  onLogout: () => void;
  userRole: UserRole;
}

const SettingsView: React.FC<SettingsViewProps> = ({ currentConfig, onConfigUpdate, workerName, setWorkerName, onOpenDashboard, onLogout, userRole }) => {
  const [name, setName] = useState(workerName);
  const [lat, setLat] = useState(currentConfig.center.latitude.toString());
  const [lng, setLng] = useState(currentConfig.center.longitude.toString());
  const [radius, setRadius] = useState(currentConfig.radiusMeters.toString());
  const [qrValue, setQrValue] = useState(currentConfig.qrCodeValue || 'WORKSHOP-SECRET-1');
  const [message, setMessage] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Calendar Events State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newEventType, setNewEventType] = useState<'HOLIDAY' | 'EXTRA_WORKDAY'>('HOLIDAY');

  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      const loadEvents = async () => {
         setCalendarEvents(await getCalendarEvents());
      };
      loadEvents();
    }
  }, [isAdmin]);

  // Check for unsaved changes (Main config)
  useEffect(() => {
    const hasChanges = 
      name !== workerName ||
      lat !== currentConfig.center.latitude.toString() ||
      lng !== currentConfig.center.longitude.toString() ||
      radius !== currentConfig.radiusMeters.toString() ||
      qrValue !== (currentConfig.qrCodeValue || 'WORKSHOP-SECRET-1');
    
    setIsDirty(hasChanges);
  }, [name, lat, lng, radius, qrValue, workerName, currentConfig]);

  const handleSave = async () => {
    if (isAdmin) {
      // 1. Save Config
      const newConfig: WorkshopConfig = {
        name: currentConfig.name,
        center: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        },
        radiusMeters: parseInt(radius),
        qrCodeValue: qrValue
      };
      await saveWorkshopConfig(newConfig);
      onConfigUpdate(newConfig);

      // 2. Save User Name (Persist to Employee DB)
      if (name !== workerName) {
        const employees = await getEmployees();
        const empIndex = employees.findIndex(e => e.name === workerName);
        
        if (empIndex >= 0) {
          const updatedEmployee: Employee = {
            ...employees[empIndex],
            name: name
          };
          await saveEmployee(updatedEmployee);
        }
        
        setWorkerName(name); 
      }

      setMessage('تم حفظ الإعدادات بنجاح');
    } else {
      setMessage('ليس لديك صلاحية تعديل الإعدادات');
    }
    
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddEvent = async () => {
    if (!newEventDate || !newEventName) {
      alert("يرجى إدخال التاريخ واسم المناسبة");
      return;
    }
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      date: newEventDate,
      name: newEventName,
      type: newEventType
    };
    await saveCalendarEvent(newEvent);
    setCalendarEvents([...calendarEvents, newEvent]);
    setNewEventName('');
    setNewEventDate('');
    setMessage('تم إضافة المناسبة بنجاح');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteEvent = async (id: string) => {
    if(window.confirm("هل أنت متأكد من الحذف؟")) {
      await deleteCalendarEvent(id);
      setCalendarEvents(calendarEvents.filter(e => e.id !== id));
    }
  };

  const handleLogoutClick = () => {
    if (isDirty && isAdmin) {
      if (window.confirm("هل تريد حفظ التعديلات قبل تسجيل الخروج؟")) {
        handleSave();
      }
    }
    onLogout();
  };

  const setCurrentLocationAsWorkshop = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toString());
      setLng(pos.coords.longitude.toString());
    }, (err) => {
      alert("تعذر تحديد الموقع: " + err.message);
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">الملف الشخصي والإعدادات</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>
          <Shield size={12} />
          {isAdmin ? 'مسئول النظام' : 'موظف'}
        </span>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
          <div className="relative">
            <User className="absolute right-3 top-3 text-gray-400" size={18} />
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
              className={`w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 ${!isAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            />
          </div>
          {!isAdmin && <p className="text-xs text-gray-400 mt-1">يرجى مراجعة الإدارة لتغيير الاسم.</p>}
        </div>
      </div>

      {/* Admin Only Section */}
      {isAdmin && (
        <>
          {/* Calendar & Holidays Section */}
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-4 border-2 border-purple-50">
            <h3 className="font-bold text-purple-700 border-b pb-2 flex items-center gap-2">
              <Calendar size={18} /> العطلات وأيام العمل الاستثنائية
            </h3>
            
            {/* Add New Event */}
            <div className="bg-gray-50 p-3 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="p-2 border rounded text-sm"
                />
                <select 
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as any)}
                  className="p-2 border rounded text-sm bg-white"
                >
                  <option value="HOLIDAY">عطلة رسمية (إجازة)</option>
                  <option value="EXTRA_WORKDAY">يوم عمل إضافي</option>
                </select>
              </div>
              <input 
                type="text" 
                placeholder="اسم المناسبة (مثال: عيد الفطر)"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
              <button 
                onClick={handleAddEvent}
                className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                <Plus size={16} /> إضافة للقويم
              </button>
            </div>

            {/* List Events */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {calendarEvents.length === 0 ? (
                <p className="text-gray-400 text-center text-sm">لا توجد مناسبات مضافة.</p>
              ) : (
                calendarEvents.sort((a,b) => a.date.localeCompare(b.date)).map(event => (
                  <div key={event.id} className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${event.type === 'HOLIDAY' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{event.name}</div>
                        <div className="text-xs text-gray-500 flex gap-2">
                          <span>{event.date}</span>
                          <span className={`${event.type === 'HOLIDAY' ? 'text-red-500' : 'text-green-600'}`}>
                            {event.type === 'HOLIDAY' ? 'عطلة' : 'عمل'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteEvent(event.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm space-y-4 border-2 border-purple-50">
            <h3 className="font-bold text-purple-700 border-b pb-2 flex items-center gap-2">
              <QrCode size={18} /> إعدادات الباركود (QR)
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">قيمة الكود (Secret Key)</label>
              <input 
                type="text" 
                value={qrValue}
                onChange={(e) => setQrValue(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-left ltr bg-white text-gray-900"
              />
            </div>
            
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrValue)}`} 
                alt="QR Code" 
                className="mb-2 rounded-lg"
              />
              <button 
                onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrValue)}`, '_blank')}
                className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
              >
                <Printer size={16} />
                طباعة الباركود
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm space-y-4 border-2 border-purple-50">
            <h3 className="font-bold text-purple-700 border-b pb-2 flex items-center gap-2">
              <MapPin size={18} /> إعدادات الموقع الجغرافي
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">دائرة العرض</label>
                <input 
                  type="number" 
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-2 py-2 bg-white text-gray-900 border rounded-lg ltr text-left text-sm"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">خط الطول</label>
                <input 
                  type="number" 
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full px-2 py-2 bg-white text-gray-900 border rounded-lg ltr text-left text-sm"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نطاق السماح (متر)</label>
              <input 
                type="number" 
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full px-4 py-2 bg-white text-gray-900 border rounded-lg"
              />
            </div>

            <button 
              onClick={setCurrentLocationAsWorkshop}
              className="w-full py-2 px-4 border border-primary text-primary rounded-lg flex items-center justify-center gap-2 hover:bg-teal-50"
            >
              <MapPin size={18} />
              تعيين موقعي الحالي كمركز للورشة
            </button>
          </div>

          <button 
            onClick={handleSave}
            disabled={!isDirty}
            className={`w-full mt-2 py-3 rounded-xl font-bold shadow-lg transition-colors flex items-center justify-center gap-2 ${isDirty ? 'bg-primary text-white hover:bg-teal-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            <Save size={20} />
            {isDirty ? 'حفظ التعديلات' : 'لا توجد تعديلات'}
          </button>
        </>
      )}

      <div className="mt-8 pt-6 border-t space-y-4">
        {isAdmin && (
          <button 
            onClick={onOpenDashboard}
            className="w-full py-3 bg-gray-800 text-white rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-900 transition"
          >
            <LayoutDashboard size={20} />
            الدخول للوحة التحكم (الإدارة)
          </button>
        )}

        <button 
          type="button"
          onClick={handleLogoutClick}
          className="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition active:scale-95 transform"
        >
          <LogOut size={20} />
          تسجيل الخروج
        </button>
      </div>

      {message && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 text-center rounded-lg animate-fade-in">
          {message}
        </div>
      )}
      
      {/* Spacer for bottom nav if needed, but flex layout handles it */}
      <div className="h-4"></div>
    </div>
  );
};

export default SettingsView;