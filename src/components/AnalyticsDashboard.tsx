import React from 'react';
import { Client, Technician, Visit, Route } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import { CheckCircle2, TrendingUp, ShieldAlert, Award, Compass, Truck, Star } from 'lucide-react';

interface AnalyticsDashboardProps {
  clients: Client[];
  technicians: Technician[];
  visits: Visit[];
  routes: Route[];
}

export default function AnalyticsDashboard({
  clients,
  technicians,
  visits,
  routes
}: AnalyticsDashboardProps) {
  // Aggregate KPI stats
  const totalVisits = visits.length;
  const completedVisits = visits.filter(v => v.status === 'completed').length;
  const activeTravelers = technicians.filter(t => t.status === 'traveling').length;
  const activeWorkers = technicians.filter(t => t.status === 'working').length;
  const activeDelays = visits.filter(v => v.status === 'delayed').length;

  // Calculate total driving distances from routes
  const totalDrivingDist = routes.reduce((sum, r) => sum + r.totalDistanceKm, 0);

  // Recharts Chart Data 1: Workload distribution (Visits per Technician)
  const workloadData = technicians.map(t => {
    const techVisits = visits.filter(v => v.technicianId === t.id);
    return {
      name: t.name.split(' ')[0],
      Completed: techVisits.filter(v => v.status === 'completed').length,
      Pending: techVisits.filter(v => v.status !== 'completed').length,
      color: t.color
    };
  });

  // Recharts Chart Data 2: Average Client Service Rating
  const ratedVisits = visits.filter(v => v.feedbackRating !== undefined);
  const averageRating = ratedVisits.length > 0
    ? (ratedVisits.reduce((sum, v) => sum + (v.feedbackRating || 0), 0) / ratedVisits.length).toFixed(1)
    : '4.8';

  // Ratings distribution per engineer
  const ratingData = technicians.map(t => {
    const tRatings = visits.filter(v => v.technicianId === t.id && v.feedbackRating !== undefined);
    const avg = tRatings.length > 0
      ? tRatings.reduce((sum, v) => sum + (v.feedbackRating || 0), 0) / tRatings.length
      : t.rating;
    return {
      name: t.name.split(' ')[0],
      Rating: parseFloat(avg.toFixed(1)),
      color: t.color
    };
  });

  // Recharts Chart Data 3: Visits type break
  const typeCount = visits.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const serviceTypeData = Object.keys(typeCount).map(k => ({
    name: k,
    value: typeCount[k]
  }));

  const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#6366f1'];

  return (
    <div id="analytics-panel" className="space-y-6">
      {/* Overview Cards (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Completed Tasks */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm text-right justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">المهام المنجزة</span>
            <span className="text-xl font-black text-slate-800 block mt-0.5">{completedVisits} / {totalVisits}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              📈 معدل الإنجاز {totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0}%
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Driving km */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm text-right justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">المسافات المقطوعة</span>
            <span className="text-xl font-black text-slate-800 block mt-0.5">{totalDrivingDist.toFixed(1)} كم</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">تتبع ذكي لكفاءة الوقود</span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Active Statuses */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm text-right justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">الفنيين الميدانيين</span>
            <span className="text-xl font-black text-slate-800 block mt-0.5">{activeTravelers + activeWorkers} متصلين</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              ⚡ {activeTravelers} بالطريق | {activeWorkers} بالموقع
            </span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Average Rating */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm text-right justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">معدل تقييم الخدمة</span>
            <span className="text-xl font-black text-slate-800 block mt-0.5">{averageRating} / 5.0</span>
            <div className="flex gap-0.5 mt-1 justify-end">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              ))}
            </div>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Delay Warnings Board */}
      {activeDelays > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-pulse text-right">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-rose-900">مطلوب اتخاذ إجراء فوري: تأخيرات مرورية ميدانية!</h4>
            <ul className="list-disc pr-5 text-rose-700 space-y-1 mt-1 leading-relaxed">
              {visits
                .filter(v => v.status === 'delayed')
                .map((d, index) => {
                  const tech = technicians.find(t => t.id === d.technicianId);
                  return (
                    <li key={d.id}>
                      تأخر الفني <strong>{tech?.name}</strong> في مهمة <em>{d.title}</em>. السبب: "{d.delayReason}"
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left hand: Operations Workload bar chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-right">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">موازنة وحمولة عمل الفنيين الميدانيين</h4>
            <p className="text-xs text-slate-400">إجمالي الزيارات والمهام المكتملة مقارنة بالمهام المتبقية اليوم.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', textAlign: 'right' }} />
                <Bar name="مكتملة" dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar name="قيد الانتظار" dataKey="Pending" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right hand: Client Rating scores */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-right">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">بطاقة مستوى جودة الأداء الميداني</h4>
            <p className="text-xs text-slate-400">متوسط تقييمات رضا العملاء المستخلصة من تقارير الزيارات.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingData} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 5]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', textAlign: 'right' }} />
                <Bar name="معدل التقييم" dataKey="Rating" radius={[0, 4, 4, 0]}>
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
