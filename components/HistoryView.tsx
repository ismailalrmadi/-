import React, { useState } from 'react';
import { AttendanceRecord, AttendanceType } from '../types';
import { generateSmartReport } from '../services/geminiService';
import { Sparkles, Calendar, Clock, MapPin, CheckCircle, XCircle, User } from 'lucide-react';

interface HistoryViewProps {
  records: AttendanceRecord[];
  workerName: string;
}

const HistoryView: React.FC<HistoryViewProps> = ({ records, workerName }) => {
  const [filter, setFilter] = useState<'WEEK' | 'MONTH' | 'ALL'>('WEEK');
  const [report, setReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const filteredRecords = records.filter(record => {
    const recordDate = new Date(record.timestamp);
    const now = new Date();
    
    if (filter === 'WEEK') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return recordDate >= oneWeekAgo;
    }
    if (filter === 'MONTH') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return recordDate >= oneMonthAgo;
    }
    return true;
  });

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    const result = await generateSmartReport(filteredRecords, workerName);
    setReport(result);
    setLoadingReport(false);
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">سجل الحضور</h2>
        <div className="flex bg-gray-200 rounded-lg p-1 text-sm">
          <button 
            onClick={() => setFilter('WEEK')}
            className={`px-3 py-1 rounded-md transition ${filter === 'WEEK' ? 'bg-white shadow text-primary' : 'text-gray-600'}`}
          >
            أسبوع
          </button>
          <button 
            onClick={() => setFilter('MONTH')}
            className={`px-3 py-1 rounded-md transition ${filter === 'MONTH' ? 'bg-white shadow text-primary' : 'text-gray-600'}`}
          >
            شهر
          </button>
          <button 
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-md transition ${filter === 'ALL' ? 'bg-white shadow text-primary' : 'text-gray-600'}`}
          >
            الكل
          </button>
        </div>
      </div>

      <button
        onClick={handleGenerateReport}
        disabled={loadingReport || filteredRecords.length === 0}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
      >
        <Sparkles size={20} className={loadingReport ? "animate-spin" : ""} />
        {loadingReport ? "جاري تحليل البيانات..." : "تحليل الأداء بالذكاء الاصطناعي"}
      </button>

      {report && (
        <div className="bg-white p-4 rounded-xl shadow-md border-r-4 border-purple-500 text-gray-700 text-sm leading-relaxed animate-fade-in">
          <h3 className="font-bold text-purple-700 mb-2 flex items-center gap-2">
            <Sparkles size={16} /> تقرير الذكاء الاصطناعي
          </h3>
          <p className="whitespace-pre-line">{report}</p>
        </div>
      )}

      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-10 text-gray-400">لا توجد سجلات في هذه الفترة</div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex gap-3">
              <div className="h-24 w-24 flex-shrink-0">
                <img 
                  src={record.photoUrl} 
                  alt="Proof" 
                  className="w-full h-full object-cover rounded-lg bg-gray-100"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    record.type === AttendanceType.CHECK_IN 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-rose-100 text-rose-700'
                  }`}>
                    {record.type === AttendanceType.CHECK_IN ? 'تسجيل دخول' : 'تسجيل خروج'}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(record.timestamp).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                
                <div className="mt-1 mb-1">
                  <div className="text-sm font-bold text-gray-800 flex items-center gap-1">
                     <User size={14} className="text-gray-400" />
                     {record.workerName}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-gray-600 text-sm">
                  <Clock size={14} />
                  {new Date(record.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </div>

                <div className="flex justify-between items-end mt-2">
                  <div className={`text-xs flex items-center gap-1 ${record.locationVerified ? 'text-green-600' : 'text-orange-500'}`}>
                    <MapPin size={12} />
                    {record.locationVerified ? 'داخل الورشة' : 'خارج النطاق'}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryView;