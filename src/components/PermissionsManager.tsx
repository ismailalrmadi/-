import React, { useState } from 'react';
import { UserRole, RolePermissions, AppUser } from '../types';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Save, 
  RefreshCw, 
  Check, 
  X, 
  Users, 
  Key, 
  Info,
  UserCheck,
  Edit2,
  Trash2
} from 'lucide-react';

interface PermissionsManagerProps {
  currentRole: UserRole;
  permissions: Record<UserRole, RolePermissions>;
  onUpdatePermissions: (newPerms: Record<UserRole, RolePermissions>) => void;
  appendLog: (techId: string, action: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onCleanupArchive: () => void;
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
  dbSaveUser: (user: AppUser) => Promise<void>;
  dbDeleteUser: (id: string) => Promise<void>;
  technicians?: import("../types").Technician[];
  onAddTechnician?: (techData: Omit<import("../types").Technician, "id">) => void;
}



export default function PermissionsManager({
  currentRole,
  permissions,
  onUpdatePermissions,
  appendLog,
  onCleanupArchive,
  users,
  setUsers,
  dbSaveUser,
  dbDeleteUser,
  technicians = [],
  onAddTechnician
}: PermissionsManagerProps) {
  const [activeRoleTab, setActiveRoleTab] = useState<UserRole>('admin');
  const [tempPermissions, setTempPermissions] = useState<Record<UserRole, RolePermissions>>({ ...permissions });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('technician');
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('technician');
  const [editUserPassword, setEditUserPassword] = useState('');

  // Permission description helper
  const permissionMeta: Array<{ key: keyof RolePermissions; label: string; desc: string }> = [
    { 
      key: 'manageUsers', 
      label: 'إدارة الفنيين والعملاء والمشاريع', 
      desc: 'صلاحية إضافة، تعديل، وحذف السجلات الخاصة بالفنيين الميدانيين وعملاء رفع المقاسات من النظام.' 
    },
    { 
      key: 'scheduleVisits', 
      label: 'جدولة وتعديل مواعيد رفع المقاسات', 
      desc: 'صلاحية إنشاء مواعيد جديدة، تعيينها للفنيين، السحب والإفلات وتعديل أوقات الزيارة اليومية.' 
    },
    { 
      key: 'optimizeRoutes', 
      label: 'تحسين وتخطيط المسارات ذكياً', 
      desc: 'تشغيل خوارزمية المسار الأقصر (TSP) لتخطيط القيادة تلقائياً وموازنة وتوزيع المهام الجغرافية بالفنيين.' 
    },
    { 
      key: 'importCRM', 
      label: 'استيراد السجلات من ملفات الـ CRM', 
      desc: 'صلاحية ربط ومزامنة جدول بيانات جوجل (CRM Sheet) واستيراد طلبات العملاء الميدانية دفعة واحدة.' 
    },
    { 
      key: 'viewAnalytics', 
      label: 'عرض تقارير وتحليلات الميدان', 
      desc: 'الوصول إلى لوحات البيانات، مستويات الضغط الميداني، إحصائيات التوزيع وحساب الكفاءة التشغيلية.' 
    },
    { 
      key: 'managePermissions', 
      label: 'إدارة أدوار النظام وتغيير الصلاحيات', 
      desc: 'تعديل هذا الجدول بالكامل وإعادة توزيع ميزات الأمان على المجموعات الثلاث للنظام.' 
    },
    { 
      key: 'completeVisits', 
      label: 'تنفيذ المهام وتحديث المواعيد ميدانياً', 
      desc: 'تسجيل الحضور في الموقع، رفع التقارير والملاحظات، إمضاء العميل وتصوير المساحات.' 
    },
    { 
      key: 'resetDatabase', 
      label: 'الحذف النهائي وإعادة ضبط قاعدة البيانات', 
      desc: 'إفراغ البيانات السحابية (Firestore) وإعادة تعيين النظام بالكامل لوضع الصفر.' 
    },
  ];

  const handleTogglePermission = (role: UserRole, key: keyof RolePermissions) => {
    // If current user is not admin, prevent modifying permissions
    if (currentRole !== 'admin') {
      alert('عذراً، يحق لمدير النظام (Admin) فقط تعديل مصفوفة الصلاحيات الرئيسية.');
      return;
    }
    
    // Prevent locking Admin out of managePermissions to avoid deadlocks
    if (role === 'admin' && key === 'managePermissions') {
      alert('لا يمكن إلغاء صلاحية "إدارة الصلاحيات" عن مسؤول النظام لضمان استمرارية الإدارة.');
      return;
    }

    setTempPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role][key]
      }
    }));
  };

  const handleSavePermissions = () => {
    if (currentRole !== 'admin') {
      alert('يحتاج هذا الإجراء إلى رتبة أدمن النظام للقيام بالحفظ النهائي.');
      return;
    }

    setIsSaving(true);
    setTimeout(() => {
      onUpdatePermissions(tempPermissions);
      setIsSaving(false);
      setSaveSuccess(true);
      appendLog('t1', `قام مدير النظام بتحديث مصفوفة الصلاحيات الأمنية والتحكم في الوصول`, 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1200);
  };

  const handleResetToDefault = () => {
    if (currentRole !== 'admin') return;

    const defaultPerms: Record<UserRole, RolePermissions> = {
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

    setTempPermissions(defaultPerms);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserPhone) return;

    const newUser: AppUser = {
      id: `u_${Date.now()}`,
      name: newUserName,
      phone: newUserPhone,
      password: '123',
      role: newUserRole,
      status: 'active',
      lastActive: 'لم ينشط بعد'
    };

    setUsers(prev => [...prev, newUser]);
    dbSaveUser(newUser);
    appendLog('t1', `تم تسجيل حساب مستخدم جديد "${newUserName}" برتبة ${getRoleLabel(newUserRole)}`, 'success');
    
    // Auto add to technicians database if target role is technician
    if (newUserRole === 'technician' && onAddTechnician) {
      const exists = technicians.some(t => t.phone === newUserPhone);
      if (!exists) {
        onAddTechnician({
          name: newUserName,
          phone: newUserPhone,
          status: 'idle',
          rating: 5.0,
          vehicle: 'مركبة جديدة',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUserName}&backgroundColor=e2e8f0`,
          color: '#10b981', // emerald
          currentLat: 24.7136,
          currentLng: 46.6753,
          shiftStart: '09:00',
          shiftEnd: '17:00',
          breaks: []
        });
        appendLog('t1', `تمت إضافة "${newUserName}" تلقائياً إلى قاعدة بيانات الفنيين`, 'success');
      }
    }

    setNewUserName('');
    setNewUserPhone('');
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserName || !editUserPhone || !editingUserId) return;
    
    const updatedUsers = users.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          name: editUserName,
          phone: editUserPhone,
          role: editUserRole,
          password: editUserPassword || u.password,
        };
      }
      return u;
    });
    setUsers(updatedUsers);
    const edited = updatedUsers.find(u => u.id === editingUserId);
    if (edited) dbSaveUser(edited);
    
    appendLog('t1', `تم تعديل بيانات المستخدم "${editUserName}"`, 'success');
    setEditingUserId(null);
  };

  const handleToggleUserStatus = (userId: string) => {
    if (currentRole !== 'admin') {
      alert('صلاحية تعليق الحسابات مقصورة على مسؤول النظام.');
      return;
    }
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, status: (u.status === 'active' ? 'suspended' : 'active') as 'active' | 'suspended' };
      }
      return u;
    });
    setUsers(updatedUsers);
    const toggled = updatedUsers.find(u => u.id === userId);
    if (toggled) dbSaveUser(toggled);
  };

  const handleUserRoleChange = (userId: string, targetRole: UserRole) => {
    if (currentRole !== 'admin') {
      alert('تعديل مسميات وأدوار الموظفين مقصور على الأدمن.');
      return;
    }
    
    let updatedUser: AppUser | undefined;
    
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        appendLog('t1', `تم ترقية/تعديل دور المستخدم "${u.name}" إلى ${getRoleLabel(targetRole)}`, 'info');
        updatedUser = { ...u, role: targetRole };
        return updatedUser;
      }
      return u;
    }));
    
    // Auto add to technicians database if target role is technician
    if (targetRole === 'technician' && onAddTechnician) {
      // Find user if not already in updatedUser
      const user = users.find(u => u.id === userId);
      if (user || updatedUser) {
        const userData = updatedUser || user!;
        // Check if technician already exists with this phone
        const exists = technicians.some(t => t.phone === userData.phone);
        if (!exists) {
          onAddTechnician({
            name: userData.name,
            phone: userData.phone,
            status: 'idle',
            rating: 5.0,
            vehicle: 'مركبة جديدة',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name}&backgroundColor=e2e8f0`,
            color: '#10b981', // emerald
            currentLat: 24.7136,
            currentLng: 46.6753,
            shiftStart: '09:00',
            shiftEnd: '17:00',
            breaks: []
          });
          appendLog('t1', `تمت إضافة "${userData.name}" تلقائياً إلى قاعدة بيانات الفنيين`, 'success');
        }
      }
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'أدمن النظام / المسؤول';
      case 'manager': return 'المدير المنسق / المجدوِل';
      case 'technician': return 'الفني الميداني / المنفذ';
    }
  };

  const getRoleColorClass = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'manager': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'technician': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const canActiveRolePerform = (key: keyof RolePermissions) => {
    return permissions[currentRole][key];
  };

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      {/* Top Banner Notice */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl mt-1">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-sm">إدارة مصفوفة الأمان وصلاحيات الوصول الميداني (RBAC)</h2>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              تحكم بمرونة عالية في الصلاحيات الممنوحة للمديرين والفنيين. يمكنك تفعيل أو حظر ميزات النظام الجغرافية والتشغيلية لكل مجموعة وظيفية وتحديث السياسات لحظياً.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-800 shadow-inner">
          <Key className="w-4 h-4 text-amber-400" />
          <div className="text-right">
            <span className="block text-[9px] text-slate-400 leading-none font-bold">حسابك الفعلي الحالي:</span>
            <span className="text-[11px] font-black tracking-tight">{getRoleLabel(currentRole)}</span>
          </div>
        </div>
      </div>

      {/* Permissions Matrix Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* The Matrix Checklist Grid - 2 columns size */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-xs">مصفوفة التحكم في الوصول الوظيفي</h3>
            </div>
            
            {currentRole === 'admin' && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleResetToDefault}
                  className="px-3 py-1 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  إعادة تعيين الافتراضي
                </button>
              </div>
            )}
          </div>

          {/* Role tabs for the matrix */}
          <div className="flex bg-slate-100/60 p-1 border-b border-slate-100">
            {(['admin', 'manager', 'technician'] as UserRole[]).map(r => (
              <button
                key={r}
                onClick={() => setActiveRoleTab(r)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeRoleTab === r
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  r === 'admin' ? 'bg-indigo-600' : r === 'manager' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                {getRoleLabel(r)}
              </button>
            ))}
          </div>

          {/* Matrix list elements */}
          <div className="p-5 space-y-4 flex-1">
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex gap-2.5 text-blue-800 text-xs leading-relaxed">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p>
                أنت تقوم حالياً باستعراض وتعديل الصلاحيات الخاصة برتبة <strong className="text-blue-950">"{getRoleLabel(activeRoleTab)}"</strong>. 
                {currentRole !== 'admin' ? ' استعراض فقط (تحتاج رتبة أدمن للتعديل).' : ' تذكر الضغط على "حفظ مصفوفة الأمان" لتطبيق التغييرات.'}
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {permissionMeta.map(item => {
                const isChecked = tempPermissions[activeRoleTab][item.key];
                return (
                  <div key={item.key} className="py-4 flex items-start justify-between gap-4">
                    <div className="space-y-1 pl-4">
                      <span className="block text-slate-800 text-xs font-bold leading-none">{item.label}</span>
                      <span className="block text-slate-400 text-[10px] leading-relaxed">{item.desc}</span>
                    </div>

                    <div className="flex items-center">
                      <button
                        onClick={() => handleTogglePermission(activeRoleTab, item.key)}
                        disabled={currentRole !== 'admin'}
                        className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center ${
                          isChecked 
                            ? 'bg-emerald-500 justify-start flex-row-reverse' 
                            : 'bg-slate-200 justify-start'
                        } ${currentRole === 'admin' ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
                      >
                        <span className="w-4 h-4 bg-white rounded-full shadow-md transition-all" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Matrix Save Footer */}
          {currentRole === 'admin' && (
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-medium">مؤسسة ARS للمقاولات والمقاسات بالرياض • سياسة الخصوصية والأمان</span>
              <button
                onClick={handleSavePermissions}
                disabled={isSaving}
                className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  saveSuccess 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100'
                }`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري المزامنة...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    تم الحفظ المزامنة بنجاح!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    حفظ مصفوفة الأمان
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Live Simulator & Status Indicator */}
        <div className="space-y-6 lg:col-span-1">

          {currentRole === 'admin' && (
             <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  <RefreshCw className="w-4.5 h-4.5 text-indigo-600" />
                  أدوات صيانة قاعدة البيانات
                </h3>
                <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                  للحفاظ على أداء وسرعة النظام، يُنصح بتنقيح قاعدة البيانات كل أسبوعين بحذف المواعيد المكتملة وبيانات العملاء القديمة.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من رغبتك في حذف البيانات والأحداث المكتملة التي مر عليها أكثر من أسبوعين؟ هذا الإجراء لا يمكن التراجع عنه.')) {
                      onCleanupArchive();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-200 rounded-xl px-4 py-2 text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  تنقيح وتنظيف الأرشيف
                </button>
             </div>
          )}
          
          {/* Active Policies Rules Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <ShieldAlert className="w-4.5 h-4.5 text-indigo-600" />
              محاكاة القيود على حسابك الميداني
            </h3>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              فيما يلي حالة الميزات التفاعلية للنظام بناءً على دورك الحالي <span className="font-bold text-slate-800">({getRoleLabel(currentRole)})</span>:
            </p>

            <div className="space-y-2 text-xs">
              {permissionMeta.map(item => {
                const isAllowed = canActiveRolePerform(item.key);
                return (
                  <div 
                    key={item.key} 
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      isAllowed 
                        ? 'bg-emerald-50/50 border-emerald-100/70 text-emerald-800' 
                        : 'bg-red-50/50 border-red-100/70 text-red-800'
                    }`}
                  >
                    <span className="font-medium text-[11px]">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {isAllowed ? (
                        <>
                          <span className="text-[9px] font-bold">مسموح</span>
                          <Unlock className="w-3 h-3 text-emerald-600" />
                        </>
                      ) : (
                        <>
                          <span className="text-[9px] font-bold">محظور</span>
                          <Lock className="w-3 h-3 text-red-500" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Informational Guide */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10">
              <Shield className="w-48 h-48" />
            </div>
            <div className="relative z-10 space-y-3">
              <h4 className="font-bold text-slate-100 text-xs">أمن البيانات الميدانية بالرياض</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                يضمن هذا النظام فصل الصلاحيات التشغيلية عن الصلاحيات الإدارية، لمنع التعديلات العشوائية وحذف مسارات القيادة المجدولة عن طريق الخطأ.
              </p>
              <div className="border-t border-slate-800 pt-3 flex gap-2 text-[10px]">
                <div className="flex-1 bg-slate-950/50 rounded-lg p-2 text-center">
                  <span className="block font-black text-indigo-400">١٠٠٪</span>
                  <span className="text-slate-400 text-[9px]">أمان ومزامنة</span>
                </div>
                <div className="flex-1 bg-slate-950/50 rounded-lg p-2 text-center">
                  <span className="block font-black text-amber-400">إطار</span>
                  <span className="text-slate-400 text-[9px]">فصل المسؤولية</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* User Accounts Management Registry */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-xs">سجل الموظفين والمستخدمين المعتمدين</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-bold">إجمالي الحسابات: {users.length} مستخدمين</span>
        </div>

        <div className="p-5 space-y-6">
          {/* List of Registered Accounts */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold">
                  <th className="pb-3 text-right">الاسم والموظف</th>
                  <th className="pb-3 text-right">اسم المستخدم (الجوال)</th>
                  <th className="pb-3 text-right">الدور المخصص</th>
                  <th className="pb-3 text-right">حالة الحساب</th>
                  <th className="pb-3 text-right">آخر نشاط</th>
                  {currentRole === 'admin' && <th className="pb-3 text-left">إجراءات الإدارة</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 font-bold text-slate-950 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-[11px] border border-slate-200 uppercase">
                        {u.name.substring(0, 2)}
                      </div>
                      <div>
                        <span>{u.name}</span>
                        {u.id === 'u1' && <span className="mr-1.5 text-[8px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-black">أنت</span>}
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-500 font-mono text-[11px]">{u.phone}</td>
                    <td className="py-3.5">
                      {currentRole === 'admin' && u.id !== 'u1' ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleUserRoleChange(u.id, e.target.value as UserRole)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="admin">أدمن النظام</option>
                          <option value="manager">المدير المنسق</option>
                          <option value="technician">فني ميداني</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${getRoleColorClass(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                        u.status === 'active' ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {u.status === 'active' ? 'نشط وصالح' : 'معلق الحساب'}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-400 font-medium text-[10px]">{u.lastActive}</td>
                    
                    {currentRole === 'admin' && (
                      <td className="py-3.5 text-left flex items-center justify-end gap-1.5">
                        {u.id !== 'u1' ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditUserName(u.name);
                                setEditUserPhone(u.phone);
                                setEditUserRole(u.role);
                                setEditUserPassword('');
                              }}
                              title="تعديل الموظف"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setUsers(prev => prev.filter(user => user.id !== u.id))}
                              title="حذف الموظف"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u.id)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                u.status === 'active'
                                  ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {u.status === 'active' ? 'تعليق' : 'تفعيل'}
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">مؤمن بالكامل</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick form to add mock users */}
          {currentRole === 'admin' && (
            <div className="border-t border-slate-100 pt-5">
              {editingUserId ? (
                <>
                  <h4 className="text-slate-800 text-xs font-bold mb-3">تعديل بيانات الموظف</h4>
                  <form onSubmit={handleUpdateUser} className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="الاسم الكامل للموظف"
                      required
                      value={editUserName}
                      onChange={e => setEditUserName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs outline-none"
                    />
                    <input
                      type="text"
                      placeholder="رقم الجوال"
                      required
                      value={editUserPhone}
                      onChange={e => setEditUserPhone(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs outline-none font-mono"
                    />
                    <input
                      type="text"
                      placeholder="كلمة المرور (اختياري)"
                      value={editUserPassword}
                      onChange={e => setEditUserPassword(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs outline-none font-mono"
                    />
                    <select
                      value={editUserRole}
                      onChange={e => setEditUserRole(e.target.value as UserRole)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs outline-none font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="technician">فني ميداني / منفذ</option>
                      <option value="manager">المدير المنسق / جدولة</option>
                      <option value="admin">أدمن النظام / مسؤول</option>
                    </select>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Save className="w-4 h-4" />
                      حفظ التعديلات
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center cursor-pointer shrink-0"
                    >
                      إلغاء
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h4 className="text-slate-800 text-xs font-bold mb-3">تسجيل موظف أو فني ميداني جديد بالنظام</h4>
                  <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="الاسم الكامل للموظف (مثال: فهد المطيري)"
                      required
                      value={newUserName}
                      onChange={e => setNewUserName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs outline-none"
                    />
                    <input
                      type="text"
                      placeholder="رقم الجوال"
                      required
                      value={newUserPhone}
                      onChange={e => setNewUserPhone(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs outline-none font-mono"
                    />
                    <select
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value as UserRole)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs outline-none font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="technician">فني ميداني / منفذ</option>
                      <option value="manager">المدير المنسق / جدولة</option>
                      <option value="admin">أدمن النظام / مسؤول</option>
                    </select>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <UserCheck className="w-4 h-4" />
                      تسجيل وتفويض الموظف
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
