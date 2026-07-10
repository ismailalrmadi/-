sed -i '/{activeTab === '\''rules'\'' && (/a \
        {distributionSummary && (\
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mt-6 mb-6 animate-fade-in">\
            <div className="flex items-center gap-3 justify-end mb-4">\
              <h4 className="text-sm font-black text-emerald-800">تقرير توزيع المواعيد وحساب المسافات الجغرافية</h4>\
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">\
                <MapPin className="w-4 h-4 text-emerald-600" />\
              </div>\
            </div>\
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">\
              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">\
                <div className="text-2xl font-black text-emerald-600">{distributionSummary.totalScheduled}</div>\
                <div className="text-[10px] font-bold text-emerald-800 mt-1">موعد تم توطينه وجدولته</div>\
              </div>\
              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">\
                <div className="text-2xl font-black text-emerald-600">%{distributionSummary.mileageSavedPercent}</div>\
                <div className="text-[10px] font-bold text-emerald-800 mt-1">نسبة توفير الكيلومترات المقطوعة</div>\
              </div>\
              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">\
                <div className="text-2xl font-black text-emerald-600">{distributionSummary.drivingTimeSavedHrs}</div>\
                <div className="text-[10px] font-bold text-emerald-800 mt-1">ساعة توفير في وقت القيادة المهدر</div>\
              </div>\
              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">\
                <div className="text-2xl font-black text-emerald-600">{distributionSummary.gasolineSavedLiters}</div>\
                <div className="text-[10px] font-bold text-emerald-800 mt-1">لتر بنزين متوقع توفيره</div>\
              </div>\
            </div>\
            <div className="mt-4 flex justify-end">\
              <button onClick={() => setActiveTab('\''distribution'\'')} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20">\
                الانتقال لمعاينة المسارات الآن\
              </button>\
            </div>\
          </div>\
        )}\
' src/components/RegionalPlanner.tsx
