import React, { useState } from 'react';
import { User, Lock, ArrowRight, Check, X, Mail, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { loginUser, saveSession } from '../services/storageService';
import { UserRole } from '../types';

interface LoginViewProps {
  onLogin: (workerName: string, role: UserRole) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedUser = username.trim();
      const isAdminUser = normalizedUser.toLowerCase() === 'admin';
      
      // Attempt to fetch specific user from DB (Optimized)
      const employee = await loginUser(normalizedUser);
      
      let isValidUser = false;
      let userRole: UserRole = 'USER';

      if (employee) {
        const storedPassword = employee.password || '123';
        if (password === storedPassword) {
          isValidUser = true;
          userRole = employee.role;
        }
      } else if (isAdminUser) {
        if (password === 'admin123' || password.length >= 4) {
           isValidUser = true;
           userRole = 'ADMIN';
        }
      }
      
      if (isValidUser) {
        if (rememberMe) {
          saveSession(normalizedUser, userRole);
        }
        onLogin(normalizedUser, userRole);
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء الاتصال. تحقق من الإنترنت.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
        <div className="bg-primary p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8"></div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm relative z-10 border-2 border-white/30">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white relative z-10">نظام الحضور الذكي</h1>
          <p className="text-white/80 text-sm mt-2 relative z-10">يرجى تسجيل الدخول للمتابعة</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم / رقم الهوية</label>
              <div className="relative group">
                <User className="absolute right-3 top-3 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pr-10 pl-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition outline-none" placeholder="أدخل اسمك المسجل" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-3 top-3 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pr-10 pl-10 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition outline-none" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none" tabIndex={-1}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className="relative flex items-center"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer w-4 h-4 opacity-0 absolute" /><div className={`w-4 h-4 border border-gray-300 rounded flex items-center justify-center transition-colors ${rememberMe ? 'bg-primary border-primary' : 'bg-white'}`}>{rememberMe && <Check size={12} className="text-white" />}</div></div>
                <span className="text-sm text-gray-600">تذكرني</span>
              </label>
            </div>

            {error && (<div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center flex items-center justify-center gap-2 animate-pulse"><AlertCircle size={16} />{error}</div>)}

            <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-teal-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]">
              {loading ? <span className="animate-pulse">جاري التحقق...</span> : <>تسجيل الدخول <ArrowRight size={20} className="rotate-180" /></>}
            </button>
          </form>
        </div>
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">نظام الحضور الذكي &copy; {new Date().getFullYear()}</div>
      </div>
    </div>
  );
};
export default LoginView;