import React, { useState, useEffect } from 'react';
import { getLeaveRequests, saveNewLeaveRequest } from '../services/storageService';
import { LeaveRequest } from '../types';
import { Plus, X, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface LeavesViewProps {
  workerName: string;
}

const LeavesView: React.FC<LeavesViewProps> = ({ workerName }) => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const loadLeaves = async () => {
    const allLeaves = await getLeaveRequests();
    const myLeaves = allLeaves.filter(l => l.employeeName === workerName);
    setLeaves(myLeaves);
  };

  useEffect(() => {
    loadLeaves();
  }, [workerName, isModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (new Date(startDate) > new Date(endDate)) {
      alert("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
      return;
    }

    const newRequest: LeaveRequest = {
      id: Date.now().toString(),
      employeeId: workerName, // Using name as ID for simplicity in this demo
      employeeName: workerName,
      startDate,
      endDate,
      reason,
      status: 'Pending'
    };

    await saveNewLeaveRequest(newRequest);
    setIsModalOpen(false);
    setStartDate('');
    setEndDate('');
    setReason('');
    alert("تم تقديم طلب الإجازة بنجاح");
    loadLeaves();
  };

  return (
    <div className="p-4 h-full relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">إجازاتي</h2>
        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          الرصيد: 21 يوم
        </div>
      </div>

      <div className="space-y-4 pb-20">
        {leaves.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Calendar size={32} />
            </div>
            <p className="text-gray-500">لا توجد طلبات إجازة سابقة</p>
          </div>
        ) : (
          leaves.map((leave) => (
            <div key={leave.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="text-primary" size={18} />
                  <span className="font-bold text-gray-800 text-sm">
                    {leave.startDate} <span className="text-gray-400 mx-1">إلى</span> {leave.endDate}
                  </span>
                </div>
                <StatusBadge status={leave.status} />
              </div>
              <p className="text-gray-600 text-sm bg-gray-50 p-2 rounded-lg mt-2 border border-gray-100">
                {leave.reason}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 left-6 bg-primary text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-teal-800 transition-colors z-20"
      >
        <Plus size={28} />
      </button>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-lg font-bold text-gray-900">طلب إجازة جديد</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">من تاريخ</label>
                  <input 
                    type="date" 
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">إلى تاريخ</label>
                  <input 
                    type="date" 
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">سبب الإجازة</label>
                <textarea 
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اكتب سبب طلب الإجازة..."
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-primary outline-none resize-none"
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-teal-800 transition shadow-lg mt-2"
              >
                إرسال الطلب
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: 'Pending' | 'Approved' | 'Rejected' }> = ({ status }) => {
  if (status === 'Approved') {
    return (
      <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
        <CheckCircle size={14} /> مقبول
      </span>
    );
  }
  if (status === 'Rejected') {
    return (
      <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
        <XCircle size={14} /> مرفوض
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">
      <Clock size={14} /> قيد المراجعة
    </span>
  );
};

export default LeavesView;