/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Shield, Server, FileText, Database, ShieldAlert, Key, UserCheck, AlertTriangle, Coffee, Download, RefreshCw, Layers, CheckSquare, HelpCircle, HardDrive, Check
} from 'lucide-react';
import { AuditLog, ChurchUser } from '../types';

interface SystemSettingsProps {
  auditLogs: AuditLog[];
  users: ChurchUser[];
  activeUser: ChurchUser;
  onSelectUser: (user: ChurchUser) => void;
  onRestoreDatabase: () => Promise<void>;
  userRole: string;
}

export default function SystemSettings({
  auditLogs,
  users,
  activeUser,
  onSelectUser,
  onRestoreDatabase,
  userRole
}: SystemSettingsProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'docs' | 'db'>('users');
  const [restoring, setRestoring] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showRestoreSuccess, setShowRestoreSuccess] = useState(false);

  // Trigger restore
  const handleRestore = async () => {
    setShowRestoreModal(true);
  };

  const confirmRestoreAction = async () => {
    setShowRestoreModal(false);
    setRestoring(true);
    await onRestoreDatabase();
    setRestoring(false);
    setShowRestoreSuccess(true);
  };

  const downloadJsonBackup = () => {
    // Save database as local json file
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ auditLogs, users }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `اجتماع_العائلات_نسخة_احتياطية_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden" dir="rtl" id="system_settings_card">
      {/* Upper Navigation Row */}
      <div className="bg-stone-50 border-b border-stone-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-stone-700 animate-pulse-slow" />
            لوحة المسؤولين وإعدادات حماية النظام كلياً
          </h2>
          <p className="text-xs text-stone-500 mt-1">إدارة أدوار الخدام، تصفح سجل المراجعة، ومراجعة الهندسة السحابية المتكاملة للاجتماع</p>
        </div>

        <div className="flex bg-stone-200/60 rounded-lg p-0.5 self-stretch md:self-auto scrollbar-none overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              activeTab === 'users' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-850'
            }`}
          >
            التحكم بالأدوار والصلاحيات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              activeTab === 'logs' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-850'
            }`}
          >
            سجل التدقيق والتفتيش (Audit)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('db')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              activeTab === 'db' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-850'
            }`}
          >
            النسخ الاحتياطي والطوارئ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              activeTab === 'docs' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-850'
            }`}
          >
            الملف الهندسي وبطاقة التشغيل
          </button>
        </div>
      </div>

      {/* Body contents */}
      <div className="p-6">
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="p-4 bg-red-50 border border-red-150 rounded-xl space-y-1.5">
              <span className="text-xs font-extrabold text-red-900 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" />
                تنبيه تجريب الخواص للمراجع والخدام (Role Session Switching)
              </span>
              <p className="text-xs text-red-800 leading-relaxed font-semibold">
                لتسهيل المراجعة وتقييم التطبيق، يمكنك التبديل الفوري بين حسابات الخدام التالية لتختبر قيود الصلاحيات المطبقة (Super Admin, Admin, Viewer).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {users.map((usr) => (
                <div 
                  key={usr.email}
                  onClick={() => onSelectUser(usr)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all flex items-start gap-3 relative ${
                    activeUser.email === usr.email 
                      ? 'border-red-600 bg-red-50/10 shadow-xs' 
                      : 'border-stone-200 hover:bg-stone-50/50 bg-white'
                  }`}
                >
                  <UserCheck className={`w-5 h-5 shrink-0 mt-0.5 ${
                    activeUser.email === usr.email ? 'text-red-605' : 'text-stone-400'
                  }`} />
                  <div className="space-y-1">
                    <span className="font-bold text-stone-900 text-sm block">{usr.name}</span>
                    <span className="text-stone-440 text-xs font-mono block">{usr.email}</span>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-2 ${
                      usr.role === 'Super Admin' ? 'bg-stone-950 text-white' :
                      usr.role === 'Admin' ? 'bg-red-100 text-red-850' : 'bg-stone-100 text-stone-700'
                    }`}>
                      {usr.role === 'Super Admin' ? 'مسؤول مال مميز (Super Admin)' :
                       usr.role === 'Admin' ? 'خادم مطور (Admin)' : 'مشاهد فقط (Viewer)'}
                    </span>
                  </div>
                  {activeUser.email === usr.email && (
                    <span className="absolute top-2 left-2 text-[10px] bg-red-600 text-white font-bold p-1 rounded-sm shadow-xs">
                      الحساب الحالي نشط
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs text-stone-605 leading-relaxed space-y-2">
              <h5 className="font-bold text-stone-850">قائمة الصلاحيات حسب الدور المعتمد:</h5>
              <ul className="list-disc list-inside space-y-1 pr-2">
                <li><strong className="text-stone-800">مسؤول النظام الممتاز (Super Admin)</strong>: له مطلق الحرية في تعديل العائلات، تسجيل الحضور الصوتي واليدوي، رؤية وتطوير سجلات التدقيق، وعمل Backup وإعادة ضبط من الصفر.</li>
                <li><strong className="text-stone-800">خادم المطور (Admin)</strong>: يمكنه إضافة وتطوير بيانات الأسر وتسجيل الحضور بالصوت والتاكيد، لكن لا يتاح له إعادة تهيئة النظام كلياً أو التحكم بالمسؤولين.</li>
                <li><strong className="text-stone-800">مشاهد فقط (Viewer)</strong>: تصفح العائلات وتحميل تقارير الغياب الحالية دون استيراد أو تعديل أو إضافة أي عائلة أو اجتماع حضور.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-850 text-xs">سجل حركة البيانات والتغييرات المفتش عليها (Audit Logging)</h3>
              <span className="text-[10px] text-stone-400 font-mono">العدد الأقصى المعروض: آخر ٢٠٠ عملية</span>
            </div>

            <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-stone-705">
                  <thead>
                    <tr className="bg-stone-105 bg-stone-50 border-b border-stone-200 text-stone-700 font-semibold uppercase">
                      <th className="px-4 py-3">التوقيت الفعلي</th>
                      <th className="px-4 py-3">المستخدم والبريد</th>
                      <th className="px-4 py-3">الدور الحركي</th>
                      <th className="px-4 py-3">الحدث المطلوب</th>
                      <th className="px-4 py-3">تفاصيل المعالجة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-stone-105 hover:bg-stone-50/40">
                        <td className="px-4 py-3 font-mono text-stone-500 text-[11px]">
                          {new Date(log.timestamp).toLocaleString('ar-EG')}
                        </td>
                        <td className="px-4 py-3 font-medium text-stone-900">{log.userEmail}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            log.role === 'Super Admin' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {log.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-red-800">{log.action}</td>
                        <td className="px-4 py-3 text-stone-605 max-w-xs truncate">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'db' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-stone-905">أدوات استرداد الكوارث والطوارئ</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-stone-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">تنزيل نسخة احتياطية كاملة (JSON Local Backup)</h4>
                    <p className="text-xs text-stone-500">تنزيل ملف بالكامل في صيغة JSON يحتوي على الأسر الحالية، سجلات التدقيق، والمسجلات.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={downloadJsonBackup}
                    className="w-full bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors"
                  >
                    بدء تصدير ملف النسخة الاحتياطية
                  </button>
                </div>
              </div>

              <div className="border border-amber-205 border-dashed border-stone-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-50 rounded-lg text-red-650">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">استعادة وضبط المصنع (Revert Database Initialize)</h4>
                    <p className="text-xs text-red-800 font-bold">سيقوم هذا بحذف الترتيبات الحالية وإعادة تصفية قاعدة البيانات كلياً وتطهير السجلات لبدء العام الجديد.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={restoring || userRole !== 'Super Admin'}
                    onClick={handleRestore}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors"
                  >
                    {restoring ? 'جاري إعادة التهيئة...' : 'إعادة تهيئة وضبط قاعدة البيانات'}
                  </button>
                  {userRole !== 'Super Admin' && (
                    <span className="text-[10px] text-red-700 font-semibold block text-center mt-1.5">متاح لحساب مسؤول السوبر أدمن (Wagdy Hafez) فقط</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-6 text-stone-800 text-xs leading-relaxed max-h-[500px] overflow-y-auto pr-1">
            <div className="border-b border-stone-105 pb-3">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1">
                <Layers className="w-4 h-4 text-amber-600" />
                كتيب المواصفات والحل المعماري المتكامل لتشغيل التطبيق (Architecture Spec)
              </h3>
              <p className="text-[10px] text-stone-400 mt-0.5">منهجية التطوير لبيئات الويب وتطبيقات Android و iOS</p>
            </div>

            <div className="space-y-4 font-semibold">
              <section className="space-y-1">
                <h4 className="text-stone-900 font-bold flex items-center gap-1 text-[11px]"><CheckSquare className="w-3.5 h-3.5 text-green-600" /> ١. البنية التحتية المفضلة (Preferred Tech Stack)</h4>
                <ul className="list-decimal list-inside space-y-1 pr-2 text-stone-605">
                  <li><strong className="text-stone-850">قاعدة البيانات:</strong> PostgreSQL لضمان موثوقية العلاقات أو Firebase Cloud Firestore للسرعة اللحظية ومزامنة البيانات دون اتصال بالإنترنت (Offline Sync).</li>
                  <li><strong className="text-stone-850">الخلفية (Backend):</strong> Node.js مع Express.js لسهولة كتابة المسارات وعمل Proxy ذكي ومؤمن لـ API الخاص بنموذج Gemini الذكي.</li>
                  <li><strong className="text-stone-850">الواجهة الأمامية والقرص المحمول (Frontend & Mobile Mobile):</strong> Flutter أو React Native الذي يتيح إعادة تدوير كود المظهر بنسبة ٩٠٪ ليصنع نسخة Android و iPhone في نفس اللحظة.</li>
                </ul>
              </section>

              <section className="space-y-1">
                <h4 className="text-stone-900 font-bold flex items-center gap-1 text-[11px]"><CheckSquare className="w-3.5 h-3.5 text-green-600" /> ٢. تفاصيل عمل المعالجة الصوتية بالذكاء الاصطناعي (AI Translation & Match)</h4>
                <p className="text-stone-605">
                  يقوم خادم التطبيق لـ Node.js بتمرير المسارات الصوتية (WAV/WebM) مباشرةً إلى لوح استنتاج مستخدمي Gemini ومطابقتها بمستخرج الأسماء الموثوق لضمان تفادي تشابه المسميات، مثل مينا سمير وجدي مارك، مع رصد دقيق للكنى الكنسية المألوفة (الأب البكر) والنسب المئوية ومبرراتها.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="text-stone-900 font-bold flex items-center gap-1 text-[11px]"><CheckSquare className="w-3.5 h-3.5 text-green-600" /> ٣. ترشيد وضبط التكلفة والمنصات (Cost Optimization & Hosting)</h4>
                <ul className="list-disc list-inside space-y-1 pr-2 text-stone-605">
                  <li>استخدام منصة <strong className="text-stone-850">Google Cloud Run</strong> للاستضافة ذاتية الحجم صفر عند عدم عمل الاجتماع، مما يوفر أكثر من ٩٠٪ من كلفة السيرفرات التقليدية.</li>
                  <li>تنفيذ استراتيجية <strong className="text-stone-850">Fuzzy Search (Levenshtein Distance)</strong> على المتصفح مسبقاً قبل استدعاء الذكاء الاصطناعي لتقليل عدد التوكينز المستهلكة في المكالمات وضمان حماية موازنة الخدمة.</li>
                </ul>
              </section>

              <section className="space-y-1">
                <h4 className="text-stone-900 font-bold flex items-center gap-1 text-[11px]"><CheckSquare className="w-3.5 h-3.5 text-green-600" /> ٤. خطة إطلاق النسخة الأولية (MVP Roadmap Deployment)</h4>
                <ol className="list-decimal list-inside space-y-1 pr-2 text-stone-605">
                  <li><strong className="text-stone-850">الأسبوع ١-٢:</strong> تهيئة جداول قاعدة البيانات والافتقاد وإعداد عمليات الاستيراد من ملفات الاكسل.</li>
                  <li><strong className="text-stone-850">الأسبوع ٣-٤:</strong> فحص واجهة الميكروفون والفلترة وتأسيس واصفة الكلمات الصوتية لنمذجة Gemini.</li>
                  <li><strong className="text-stone-850">الأسبوع ٥:</strong> إرسال واجهات الهواتف (آيفون وأندرويد) للمراجعة في متاجر التطبيقات.</li>
                </ol>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Restore */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in" id="restore_confirm_overlay">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 p-6 space-y-4 text-right">
            <div className="flex items-center gap-3 text-red-600 justify-start" dir="rtl">
              <div className="w-10 h-10 bg-red-50 text-red-650 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-stone-900 text-base">تأكيد إعادة تهيئة النظام كلياً</h3>
            </div>
            
            <p className="text-xs text-stone-605 font-bold leading-relaxed" dir="rtl">
              تحذير: هل أنت متأكد من إعادة تهيئة قاعدة البيانات واستعادة النسخة والماكيت الأصلي؟ سيؤدي هذا لتفريغ جميع العائلات المدخلة وسجلات الحضور والغياب التراكمي وتطهيرها تماماً. لا يمكن التراجع عن هذا الإجراء أبداً!
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100" dir="rtl">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                onClick={confirmRestoreAction}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer animate-pulse"
              >
                تأكيد ومسح الكل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal for Restore */}
      {showRestoreSuccess && (
        <div className="fixed inset-0 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in" id="restore_success_overlay">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">تم تفريغ وإعادة تهيئة النظام</h3>
            <p className="text-xs text-stone-600 leading-relaxed font-semibold">
              تم بنجاح تفريغ جداول الحضور وقاعدة بيانات العائلات تماماً وإعدادها للعمل الحر الطليق واستيراد الملفات الرسمية.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowRestoreSuccess(false)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                حسنًا، فهمت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
