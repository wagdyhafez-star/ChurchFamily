/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, Calendar, AlertTriangle, MessageCircle, Copy, Check, ChevronLeft, Download, Award, Clock, Heart, Gift
} from 'lucide-react';
import { Family, AttendanceRecord } from '../types';
import * as XLSX from 'xlsx';
import AttendanceCharts from './AttendanceCharts';

interface DashboardViewProps {
  families: Family[];
  attendance: AttendanceRecord[];
}

export default function DashboardView({ families, attendance }: DashboardViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [absentFilter, setAbsentFilter] = useState<'1_week' | '2_weeks' | '1_month'>('1_week');

  // Basic Stats
  const totalFamilies = families.length;
  const totalKids = families.reduce((sum, f) => sum + (f.children?.length || 0), 0);
  const totalAttendeesSessions = attendance.reduce((sum, a) => sum + a.attendedFamilyIds.length, 0);
  const avgAttendance = attendance.length > 0 ? Math.round(totalAttendeesSessions / attendance.length) : 0;
  
  const lastSession = attendance[0];
  const lastSessionCount = lastSession ? lastSession.attendedFamilyIds.length : 0;
  const lastSessionPct = totalFamilies > 0 ? Math.round((lastSessionCount / totalFamilies) * 100) : 0;

  // Track absentees based on duration
  const getAbsentees = (weeksCount: number) => {
    if (attendance.length === 0) return families;
    
    // Get latest academic session dates
    const latestSessions = attendance.slice(0, weeksCount);
    const attendedFamilyIdsInPeriod = new Set(
      latestSessions.flatMap(session => session.attendedFamilyIds)
    );

    // Return families who didn't attend any session in this latest academic period
    return families.filter(fam => !attendedFamilyIdsInPeriod.has(fam.id));
  };

  const getAbsenteesByFilter = () => {
    switch (absentFilter) {
      case '1_week': return getAbsentees(1);
      case '2_weeks': return getAbsentees(2);
      case '1_month': return getAbsentees(4);
    }
  };

  const currentAbsentList = getAbsenteesByFilter();

  // Smart Birthday Reminders (for this month)
  const currentMonthNum = new Date().getMonth() + 1; // 1-12
  const birthdayKids = families.flatMap(f => (f.children || []).map(c => ({
    family: f,
    kidName: c.name,
    age: c.age,
    birthDate: c.birthDate // YYYY-MM-DD
  }))).filter(item => {
    if (!item.birthDate) return false;
    const parts = item.birthDate.split('-');
    return parts.length >= 2 && parseInt(parts[1]) === currentMonthNum;
  });

  // Anniversary reminders
  const anniversaryReminders = families.filter(f => {
    if (!f.marriageDate) return false;
    const parts = f.marriageDate.split('-');
    return parts.length >= 2 && parseInt(parts[1]) === currentMonthNum;
  });

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareWhatsApp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const url = `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Export reports to Excel
  const exportAbsentReport = () => {
    const mapped = currentAbsentList.map(f => ({
      'اسم عائلة الزوج': f.husbandName,
      'رقم هاتف الزوج': f.husbandPhone,
      'اسم الزوجة': f.wifeName,
      'رقم هاتف الزوجة': f.wifePhone,
      'العنوان الحالي': f.address,
      'آخر تاريخ حضور': getLatestAttendanceDateForFamily(f.id),
      'ملاحظات الغياب الموصى بها': f.notes || 'لا يوجد ملاحظات مدونة'
    }));

    const ws = XLSX.utils.json_to_sheet(mapped);
    const wb = XLSX.utils.book_new();
    const fileName = `تقرير_الأسر_الغائبة_${absentFilter === '1_week' ? 'أسبوع' : absentFilter === '2_weeks' ? 'أسبوعين' : 'شهر'}.xlsx`;
    XLSX.utils.book_append_sheet(wb, ws, 'الأسر الغائبة');
    XLSX.writeFile(wb, fileName);
  };

  const getLatestAttendanceDateForFamily = (fId: string) => {
    const latest = attendance.find(a => a.attendedFamilyIds.includes(fId));
    return latest ? latest.date : 'لم يحضر من قبل';
  };

  // Pre-calculated data for simple and highly responsive pure HTML/SVG rendering
  const maxWeeklyAttendance = Math.max(...attendance.map(a => a.attendedFamilyIds.length), 10);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl" id="dashboard_canvas">
      {/* 1. Stat Summary banner rows */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-5 relative overflow-hidden flex items-center justify-between transition-all hover:translate-y-[-2px]" id="stat_families">
          <div className="space-y-1 z-10">
            <span className="text-xs font-bold text-slate-500 block">إجمالي عائلات الاجتماع</span>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">{totalFamilies}</span>
            <span className="text-[10px] text-emerald-600 block font-bold">تغطية متميزة</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 z-10">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-5 relative overflow-hidden flex items-center justify-between transition-all hover:translate-y-[-2px]" id="stat_kids">
          <div className="space-y-1 z-10">
            <span className="text-xs font-bold text-slate-500 block">عدد الأبناء المسجلين</span>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">{totalKids}</span>
            <span className="text-[10px] text-blue-500 block font-bold">تحت الرعاية</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 z-10">
            <Heart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-5 relative overflow-hidden flex items-center justify-between transition-all hover:translate-y-[-2px]" id="stat_avg">
          <div className="space-y-1 z-10">
            <span className="text-xs font-bold text-slate-500 block">متوسط الحضور الأسبوعي</span>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">{avgAttendance}</span>
            <span className="text-[10px] text-slate-500 block font-semibold">من مجموع {totalFamilies} أسر</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 z-10">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-5 relative overflow-hidden flex items-center justify-between transition-all hover:translate-y-[-2px]" id="stat_percentage">
          <div className="space-y-1 z-10">
            <span className="text-xs font-bold text-slate-500 block">حضور آخر اجتماع</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">{lastSessionPct}%</span>
              <span className="text-xs font-bold text-slate-500 font-mono">({lastSessionCount}/{totalFamilies})</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-semibold">{lastSession ? lastSession.date : 'لم يتم التسجيل'}</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 z-10">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Visual Trend Chart and Reminders Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend chart */}
        <div className="lg:col-span-8" id="weekly_attendance_chart_card">
          <AttendanceCharts families={families} attendance={attendance} />
        </div>

        {/* Reminders / Birthdays and Anniversaries panel */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-premium p-6 space-y-5" id="anniversary_announcements_card">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">مناسبات وافتقاد هذا الشهر</h3>
            <p className="text-xs text-slate-500">أعياد ميلاد الأولاد وأعياد إكليل الزواج فرصة ذهبية للافتقاد وتوطيد الروابط</p>
          </div>

          <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
            {/* Birthdays section */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                <Gift className="w-3.5 h-3.5" />
                أعياد ميلاد الأبناء (شهر {currentMonthNum})
              </div>
              {birthdayKids.length === 0 ? (
                <p className="text-xs text-stone-400 bg-stone-50 p-2 rounded">لا توجد أعياد ميلاد أبناء مسجلة هذا الشهر.</p>
              ) : (
                <div className="space-y-2">
                  {birthdayKids.map((item, idx) => {
                    const wishesText = `كل سنة وأنت طيب يا بطل ${item.kidName}! اجتماع عائلات الكنيسة يتمنى لك عيد ميلاد سعيد وعمر مديد مبارك في أحضان يسوع 🎂🎈🌹`;
                    return (
                      <div key={idx} className="bg-stone-50/65 rounded-lg p-2.5 border border-stone-100 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-800">{item.kidName} ({item.age} سنة)</span>
                          <span className="text-[10px] text-stone-500 font-mono italic">عيد ميلاد: {item.birthDate}</span>
                        </div>
                        <div className="text-[10px] text-stone-550 truncate">ابن عائلة: {item.family.husbandName}</div>
                        
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-dashed border-stone-200/50">
                          <button
                            type="button"
                            onClick={() => handleCopyText(wishesText, `b_${idx}`)}
                            className="bg-white hover:bg-stone-100 text-stone-605 border border-stone-200 py-1 px-2 rounded text-[10px] font-medium flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedId === `b_${idx}` ? 'تم النسخ!' : 'نسخ التهنئة'}
                          </button>
                          <button
                            type="button"
                            onClick={() => shareWhatsApp(item.family.husbandPhone, wishesText)}
                            className="bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-[10px] font-medium flex items-center gap-1"
                          >
                            <MessageCircle className="w-3 h-3" />
                            ارسال واتساب الزوج
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Anniversaries section */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="text-[11px] font-bold text-red-700 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                أعياد الأكاليل والزواج (شهر {currentMonthNum})
              </div>
              {anniversaryReminders.length === 0 ? (
                <p className="text-xs text-stone-400 bg-stone-50 p-2 rounded">لا توجد أعياد زواج في هذا الشهر.</p>
              ) : (
                <div className="space-y-2">
                  {anniversaryReminders.map((fam, idx) => {
                    const wishesText = `تهنئة خاصة من اجتماع العائلات بالكنيسة لحضرتك والمدام بمناسبة عيد جوازكم المبارك! الرب يبارك بيتكم دائمًا بالمحبة والسلام والفرح والمحبة 🕊️❤️`;
                    return (
                      <div key={fam.id} className="bg-stone-50/65 rounded-lg p-2.5 border border-stone-100 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-850">عائلة {fam.husbandName}</span>
                          <span className="text-[10px] text-stone-500 font-mono italic">إكليل: {fam.marriageDate}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-dashed border-stone-200/50">
                          <button
                            type="button"
                            onClick={() => handleCopyText(wishesText, `ann_${idx}`)}
                            className="bg-white hover:bg-stone-100 text-stone-605 border border-stone-200 py-1 px-2 rounded text-[10px] font-medium flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedId === `ann_${idx}` ? 'تم النسخ!' : 'نسخ التهنئة'}
                          </button>
                          <button
                            type="button"
                            onClick={() => shareWhatsApp(fam.husbandPhone, wishesText)}
                            className="bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-[10px] font-medium flex items-center gap-1"
                          >
                            <MessageCircle className="w-3 h-3" />
                            تهنئة واتساب
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Absent families tracker view and export */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6 animate-fade-in" id="absent_families_tracker_card">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500 animate-pulse" />
              تتبع الأسر المتغيبة وتحديد فترات الافتقاد
            </h3>
            <p className="text-xs text-slate-550">مراقبة ورصد الأسر التي تتغيب عن عدد محدد من اللقاءات للاتصال التوجيهي أو الزيارات المباركة</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-650">مدة الغياب:</span>
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
              <button
                type="button"
                onClick={() => setAbsentFilter('1_week')}
                className={`px-3 py-1.5 text-xs rounded-md font-bold transition-all ${
                  absentFilter === '1_week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                أسبوع واحد
              </button>
              <button
                type="button"
                onClick={() => setAbsentFilter('2_weeks')}
                className={`px-3 py-1.5 text-xs rounded-md font-bold transition-all ${
                  absentFilter === '2_weeks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                أسبوعين
              </button>
              <button
                type="button"
                onClick={() => setAbsentFilter('1_month')}
                className={`px-3 py-1.5 text-xs rounded-md font-bold transition-all ${
                  absentFilter === '1_month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                شهر واحد
              </button>
            </div>

            <button
              type="button"
              onClick={exportAbsentReport}
              disabled={currentAbsentList.length === 0}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-55 text-white py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              تصدير المجموع لـ Excel
            </button>
          </div>
        </div>

        {currentAbsentList.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-xs font-semibold">
            رائع! لم تتغيب أي عائلات على مدار هذه الفترة المختارة. جميع الأعضاء ملتزمون بالمثول.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {currentAbsentList.map(fam => {
              const lastAtt = getLatestAttendanceDateForFamily(fam.id);
              const copyText = `سلام والمحبة يا أستاذ ${fam.husbandName}! وحشنا حضوركم في اجتماع العائلات الأخير ونبقى دائمًا في انتظار بركة وجودكم معنا. نصلي لكم في كل وقت 🕊️`;
              return (
                <div key={fam.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-350 hover:shadow-premium transition-all space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{fam.husbandName} & {fam.wifeName}</h4>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">تليفون: {fam.husbandPhone}</div>
                    </div>
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                      غائب
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] space-y-1 text-slate-650">
                    <div><strong className="text-slate-800">العنوان:</strong> {fam.address}</div>
                    <div><strong className="text-slate-800">آخر مشاركة:</strong> <span className="font-mono text-xs">{lastAtt}</span></div>
                    {fam.notes && <div className="truncate"><strong className="text-slate-800">ملاحظة:</strong> {fam.notes}</div>}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleCopyText(copyText, `abs_${fam.id}`)}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2 px-3 rounded-xl text-[10px] font-bold flex-1 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedId === `abs_${fam.id}` ? 'تم النسخ!' : 'نسخ نص الافتقاد'}
                    </button>
                    <button
                      type="button"
                      onClick={() => shareWhatsApp(fam.husbandPhone, copyText)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-[10px] cursor-pointer"
                    >
                      أرسل مسج هاتفية
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
