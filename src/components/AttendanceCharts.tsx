/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { Family, AttendanceRecord } from '../types';
import { 
  Calendar, TrendingUp, Users, PieChart as PieIcon, BarChart2,
  Search, Copy, Check, MessageCircle, Download, BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AttendanceChartsProps {
  families: Family[];
  attendance: AttendanceRecord[];
}

export default function AttendanceCharts({ families, attendance }: AttendanceChartsProps) {
  const [chartType, setChartType] = useState<'trend' | 'distribution' | 'children' | 'date_list'>('trend');
  const [selectedMeetingDate, setSelectedMeetingDate] = useState<string>('');
  const [attendeesSearch, setAttendeesSearch] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalFamilies = families.length;

  // 1. Prepare data for weekly attendance trend
  // Sort attendance records chronologically (oldest to newest) for chart display
  const trendData = [...attendance]
    .reverse()
    .map((record) => {
      const count = record.attendedFamilyIds.length;
      const percent = totalFamilies > 0 ? Math.round((count / totalFamilies) * 100) : 0;
      const absentCount = Math.max(0, totalFamilies - count);
      return {
        name: record.notes || record.date,
        date: record.date,
        'العائلات الحاضرة': count,
        'العائلات الغائبة': absentCount,
        'نسبة الحضور %': percent,
      };
    });

  // Calculate average attendance
  const averageAttendance = attendance.length > 0
    ? Math.round(attendance.reduce((sum, r) => sum + r.attendedFamilyIds.length, 0) / attendance.length)
    : 0;
  const averageAttendancePct = totalFamilies > 0 ? Math.round((averageAttendance / totalFamilies) * 100) : 0;

  // 2. Prepare data for children demographics (by gender & age groups)
  const childrenList = families.flatMap(f => f.children || []);
  const maleCount = childrenList.filter(c => c.gender === 'ذكر').length;
  const femaleCount = childrenList.filter(c => c.gender === 'أنثى').length;
  const unknownGenderCount = childrenList.filter(c => !c.gender).length;

  const genderData = [
    { name: 'بنين (ذكور)', value: maleCount, color: '#2563EB' },
    { name: 'بنات (إناث)', value: femaleCount, color: '#EC4899' },
  ];
  if (unknownGenderCount > 0) {
    genderData.push({ name: 'غير محدد', value: unknownGenderCount, color: '#6B7280' });
  }

  // Age distribution
  const ageGroups = {
    '0 - 5 سنوات': childrenList.filter(c => c.age <= 5).length,
    '6 - 12 سنة': childrenList.filter(c => c.age > 5 && c.age <= 12).length,
    '13 - 18 سنة': childrenList.filter(c => c.age > 12 && c.age <= 18).length,
    '+18 سنة': childrenList.filter(c => c.age > 18).length,
  };

  const ageData = Object.entries(ageGroups).map(([group, count]) => ({
    name: group,
    'عدد الأبناء': count,
  }));

  const currentSelectedMeetingDate = selectedMeetingDate || (attendance.length > 0 ? attendance[0].date : '');
  const selectedRecord = attendance.find(r => r.date === currentSelectedMeetingDate);
  const attendedFamilies = selectedRecord
    ? families.filter(f => selectedRecord.attendedFamilyIds.includes(f.id))
    : [];

  const filteredAttendees = attendedFamilies.filter(fam => {
    const searchVal = attendeesSearch.toLowerCase().trim();
    if (!searchVal) return true;
    return (
      fam.husbandName.toLowerCase().includes(searchVal) ||
      fam.wifeName.toLowerCase().includes(searchVal) ||
      (fam.husbandPhone && fam.husbandPhone.includes(searchVal)) ||
      (fam.wifePhone && fam.wifePhone.includes(searchVal)) ||
      (fam.address && fam.address.toLowerCase().includes(searchVal))
    );
  });

  const exportMeetingAttendanceToExcel = () => {
    if (!selectedRecord) return;
    const mapped = attendedFamilies.map((f, idx) => ({
      'م': idx + 1,
      'تاريخ اللقاء': selectedRecord.date,
      'عنوان اللقاء': selectedRecord.notes || 'لقاء عام',
      'الزوج بالكامل': f.husbandName,
      'رقم هاتف الزوج': f.husbandPhone || '-',
      'وظيفة الزوج': f.husbandJob || '-',
      'الزوجة بالكامل': f.wifeName,
      'رقم هاتف الزوجة': f.wifePhone || '-',
      'وظيفة الزوجة': f.wifeJob || '-',
      'العنوان السكني': f.address || '-',
      'الأبناء': f.children && f.children.length > 0 
        ? f.children.map(c => `${c.name} (${c.age} سنة)`).join(' ، ')
        : 'لا يوجد'
    }));

    const ws = XLSX.utils.json_to_sheet(mapped);
    const wb = XLSX.utils.book_new();
    const fileName = `حاضرين_لقاء_${selectedRecord.date}.xlsx`;
    XLSX.utils.book_append_sheet(wb, ws, 'كشف الحضور');
    XLSX.writeFile(wb, fileName);
  };

  // Render tooltip with custom RTL styling and arabic texts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1 text-right" dir="rtl">
          <p className="font-bold mb-1.5 text-blue-400">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex items-center gap-2 justify-between">
              <span className="font-bold">{entry.value} {entry.name.includes('%') ? '%' : 'أسر'}</span>
              <span className="text-slate-350" style={{ color: entry.color }}>{entry.name}:</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ChildrenAgeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs text-right" dir="rtl">
          <p className="font-bold text-indigo-400">{label}</p>
          <p className="mt-1 font-semibold">{payload[0].value} ابن/ابنة في هذه الفئة</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6" id="attendance_charts_dashboard">
      {/* Feature Header and Selector Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-1000 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              لوحة الإحصائيات البيانية والتحليل الذكي (Recharts)
            </h3>
            <p className="text-xs text-slate-550 font-semibold">
              إحصائيات تفاعلية ونسب حضور الاجتماع وتجهيز المخططات التفصيلية لنشاط الأسر والأولاد.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200/60 font-medium self-end md:self-auto">
            <button
              onClick={() => setChartType('trend')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                chartType === 'trend'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-650 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              منحنى الحضور
            </button>
            <button
              onClick={() => setChartType('distribution')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                chartType === 'distribution'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-650 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              توزيع الحاضرين والغياب
            </button>
            <button
              onClick={() => setChartType('children')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                chartType === 'children'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-650 hover:text-slate-900'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              إحصائيات الأبناء
            </button>
            <button
              onClick={() => setChartType('date_list')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                chartType === 'date_list'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-650 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              أسماء الحضور بالتواريخ
            </button>
          </div>
        </div>

        {/* Small Analytics Snippets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/55 p-3.5 rounded-xl border border-slate-200/50 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-450 block">متوسط عدد الحاضرين</span>
            <span className="text-lg font-extrabold text-blue-700 font-mono mt-0.5">{averageAttendance} عائلة</span>
            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">بالنسبة لإجمالي {totalFamilies} أسر</span>
          </div>

          <div className="bg-slate-50/55 p-3.5 rounded-xl border border-slate-200/50 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-450 block">متوسط نسبة الحضور</span>
            <span className="text-lg font-extrabold text-emerald-700 font-mono mt-0.5">{averageAttendancePct}%</span>
            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">معدل التزام وتواجد متميز</span>
          </div>

          <div className="bg-slate-50/55 p-3.5 rounded-xl border border-slate-200/50 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-450 block">إجمالي الأطفال المسجلين</span>
            <span className="text-lg font-extrabold text-pink-700 font-mono mt-0.5">{childrenList.length} ابن وبنت</span>
            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">منهم {maleCount} ذكور و {femaleCount} إناث</span>
          </div>

          <div className="bg-slate-50/55 p-3.5 rounded-xl border border-slate-200/50 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-450 block">إجمالي لقاءات الخدمة المسجلة</span>
            <span className="text-lg font-extrabold text-indigo-700 font-mono mt-0.5">{attendance.length} اجتماعات</span>
            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">مسجلة بالكامل على الأرشيف الرقمي</span>
          </div>
        </div>
      </div>

      {/* Main Chart Viewer Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6 min-h-[380px] flex flex-col justify-center">
        {attendance.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center justify-center space-y-3">
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-full text-slate-400">
              <Calendar className="w-8 h-8" />
            </div>
            <h4 className="text-xs font-bold text-slate-700">لا توجد بيانات حضور مسجلة لعرضها حالياً</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto font-medium">
              الرجاء تسجيل حضور لعائلة واحدة على الأقل في تبويب "تسجيل الحضور بالصوت" للبدء في تعبئة البيانات الإحصائية والرسومات البيانية التفاعلية.
            </p>
          </div>
        ) : (
          <div>
            {chartType === 'trend' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    منحنيات تطور نسب الحضور الأسبوعية (%)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">تحديث فوري</span>
                </div>
                
                <div className="w-full h-80 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748B" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#64748B" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                        domain={[0, 100]}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="نسبة الحضور %" 
                        stroke="#2563EB" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorPct)" 
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {chartType === 'distribution' && (
              <div className="space-y-4 animate-fade-in">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  مقارنة تعداد الحاضرين مقابل المتغيبين لكل لقاء
                </h4>

                <div className="w-full h-80 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trendData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748B" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#64748B" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
                      />
                      <Bar dataKey="العائلات الحاضرة" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={45} />
                      <Bar dataKey="العائلات الغائبة" fill="#FDA4AF" radius={[4, 4, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {chartType === 'children' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                {/* 1. Age distribution block */}
                <div className="space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider text-right">أعمار وفئات الأطفال</h5>
                  <div className="w-full h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={ageData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748B" 
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#64748B" 
                          fontSize={10} 
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<ChildrenAgeTooltip />} />
                        <Bar dataKey="عدد الأبناء" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={35} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Gender distribution block */}
                <div className="space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider text-right">توزيع جنس الأبناء</h5>
                  {childrenList.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-xs font-semibold">لا يوجد أبناء مسجلين لعرض نسب المخطط الدائري.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-8 h-56 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={genderData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {genderData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value, name) => [`${value} طفل`, name]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="sm:col-span-4 space-y-2.5">
                        {genderData.map((entry, index) => {
                          const pct = childrenList.length > 0 ? Math.round((entry.value / childrenList.length) * 100) : 0;
                          return (
                            <div key={index} className="flex flex-col gap-0.5 text-right">
                              <div className="flex items-center gap-1.5 font-bold text-xs justify-end">
                                <span className="text-slate-800">{entry.name}</span>
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                              </div>
                              <span className="text-[11px] font-mono text-slate-550 font-bold pr-4">
                                {entry.value} طفل ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {chartType === 'date_list' && (
              <div className="space-y-6 animate-fade-in text-right" dir="rtl" id="date_list_container">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 justify-end">
                      <BookOpen className="w-4 h-4 text-indigo-650 animate-pulse" />
                      استعراض كشف الحاضرين لقاء معين
                    </h4>
                    <p className="text-xs text-slate-550 font-semibold">
                      اختر تاريخ اللقاء من القائمة لعرض تفاصيل الأسماء المسجلة وبيانات تواصلهم الإفتقادية.
                    </p>
                  </div>

                  {/* Date selector drop-down and action */}
                  <div className="flex flex-wrap items-center gap-2.5 justify-end">
                    <span className="text-xs font-bold text-slate-600">تاريخ اللقاء:</span>
                    <select
                      value={currentSelectedMeetingDate}
                      onChange={(e) => setSelectedMeetingDate(e.target.value)}
                      className="bg-slate-50 border border-slate-250 text-slate-850 rounded-xl text-xs font-bold p-2 px-3 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      {attendance.map((rec) => (
                        <option key={rec.date} value={rec.date}>
                          📅 {rec.date} {rec.notes ? `(${rec.notes})` : ''} — ({rec.attendedFamilyIds.length} عائلات)
                        </option>
                      ))}
                    </select>

                    {/* Export to Excel for this specific day */}
                    <button
                      type="button"
                      onClick={exportMeetingAttendanceToExcel}
                      disabled={attendedFamilies.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold py-2 px-3.5 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      تصدير الكشف (Excel)
                    </button>
                  </div>
                </div>

                {selectedRecord ? (
                  <div className="space-y-4">
                    {/* Search and Summary Panel */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
                        <span>إجمالي الحاضرين:</span>
                        <span className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg text-xs font-extrabold font-mono">
                          {attendedFamilies.length} عائلات حاضرة
                        </span>
                        {selectedRecord.notes && (
                          <>
                            <span className="text-slate-300">|</span>
                            <span>تفاصيل الاجتماع:</span>
                            <span className="text-slate-600 font-semibold">{selectedRecord.notes}</span>
                          </>
                        )}
                      </div>

                      {/* Search Input */}
                      <div className="relative max-w-sm w-full">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Search className="w-4 h-4 text-slate-400" />
                        </span>
                        <input
                          type="text"
                          placeholder="ابحث عن اسم زوج، زوجة، أو هاتف في كشف الحضور..."
                          value={attendeesSearch}
                          onChange={(e) => setAttendeesSearch(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl text-xs pr-9 pl-3 py-2 outline-none focus:border-indigo-500 transition-all font-semibold text-right animate-none"
                        />
                      </div>
                    </div>

                    {filteredAttendees.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-semibold">
                        {attendeesSearch ? 'لا توجد عائلات تطابق معايير البحث في كشف هذا اللقاء.' : 'لا توجد عائلات مسجلة في هذا اللقاء.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAttendees.map((fam) => {
                          const wishesText = `سلام ومحبة يا أستاذ ${fam.husbandName}! اجتماع عائلات الكنيسة يتمنى لكم دوام البركة لتواجدكم المبارك بلقائنا الأخير بتاريخ ${selectedRecord.date} 🌹🎈`;
                          return (
                            <div 
                              key={fam.id} 
                              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all space-y-3 text-right cursor-default"
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <h5 className="font-bold text-slate-900 text-xs">{fam.husbandName} / {fam.wifeName}</h5>
                                  <p className="text-[10px] text-slate-500 font-semibold">📍 العنوان: {fam.address || 'غير محدد'}</p>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md shrink-0">
                                  حضور ✅
                                </span>
                              </div>

                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] space-y-1.5 text-slate-650">
                                <div className="flex items-center justify-between">
                                  <span>📱 هاتف الزوج: <span className="font-mono text-xs">{fam.husbandPhone || '-'}</span></span>
                                  {fam.husbandPhone && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(fam.husbandPhone);
                                        setCopiedId(fam.id + '_hp');
                                        setTimeout(() => setCopiedId(null), 1500);
                                      }}
                                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                                    >
                                      {copiedId === fam.id + '_hp' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                      {copiedId === fam.id + '_hp' ? 'تم النسخ' : 'نسخ رقم الزوج'}
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>📱 هاتف الزوجة: <span className="font-mono text-xs">{fam.wifePhone || '-'}</span></span>
                                  {fam.wifePhone && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(fam.wifePhone);
                                        setCopiedId(fam.id + '_wp');
                                        setTimeout(() => setCopiedId(null), 1500);
                                      }}
                                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                                    >
                                      {copiedId === fam.id + '_wp' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                      {copiedId === fam.id + '_wp' ? 'تم النسخ' : 'نسخ رقم الزوجة'}
                                    </button>
                                  )}
                                </div>
                                <div>
                                  💼 وظيفة الزوج: {fam.husbandJob || '-'}
                                </div>
                                <div>
                                  💼 وظيفة الزوجة: {fam.wifeJob || '-'}
                                </div>
                                <div>
                                  👶 الأبناء: {fam.children && fam.children.length > 0 
                                    ? fam.children.map(c => `${c.name} (${c.age} سنة)`).join(' ، ')
                                    : 'لا يوجد'}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(wishesText);
                                    setCopiedId(fam.id + '_wis');
                                    setTimeout(() => setCopiedId(null), 1500);
                                  }}
                                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-205 py-1.5 px-2 rounded-lg text-[10px] font-bold flex-1 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  {copiedId === fam.id + '_wis' ? 'تم نسخ التهنئة!' : 'نسخ تهنئة الحضور'}
                                </button>
                                {fam.husbandPhone && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cleanPhone = fam.husbandPhone.replace(/\s+/g, '');
                                      const url = `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(wishesText)}`;
                                      window.open(url, '_blank');
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    مراسلة واتساب
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-500 text-xs font-semibold bg-slate-50/50 rounded-xl">
                    اختر لقاء صحيح لعرض الكشف الخاص به
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
