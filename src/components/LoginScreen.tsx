import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle, HelpCircle } from 'lucide-react';
import { ChurchUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: ChurchUser) => void;
}

const EMBEDDED_USERS = [
  { 
    username: 'Admin', 
    password: 'WHNfamily$1909', 
    name: 'أ. أدمن (مدير عام)', 
    email: 'admin@church.org', 
    role: 'Super Admin' as const 
  },
  { 
    username: 'khadem1', 
    password: 'Family_$2026', 
    name: 'خادم الاجتماع (١)', 
    email: 'khadem1@church.org', 
    role: 'Admin' as const 
  },
  { 
    username: 'khadem2', 
    password: 'Family_$2026', 
    name: 'خادم الاجتماع (٢)', 
    email: 'khadem2@church.org', 
    role: 'Admin' as const 
  },
  { 
    username: 'Peter', 
    password: 'PAfamily$1909', 
    name: 'أ. بيتر (مدير عام)', 
    email: 'peter@church.org', 
    role: 'Super Admin' as const 
  },
];

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    // Simulate database lookup/verification
    setTimeout(() => {
      const trimmedUser = username.trim();
      const trimmedPass = password.trim();

      if (!trimmedUser || !trimmedPass) {
        setErrorMsg('يرجى كتابة اسم المستخدم وكلمة المرور كامليْن.');
        setIsLoading(false);
        return;
      }

      const match = EMBEDDED_USERS.find(
        (u) => u.username.toLowerCase() === trimmedUser.toLowerCase() && u.password === trimmedPass
      );

      if (match) {
        onLoginSuccess({
          email: match.email,
          name: match.name,
          role: match.role,
        });
      } else {
        setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.');
      }
      setIsLoading(false);
    }, 600);
  };

  const handleQuickFill = (user: typeof EMBEDDED_USERS[0]) => {
    setUsername(user.username);
    setPassword(user.password);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8" dir="rtl">
      {/* Decorative Cross/Aura Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-sky-500 rounded-full blur-[160px]" />
        <div className="absolute bottom-[10%] left-1/3 w-[400px] h-[400px] bg-amber-500 rounded-full blur-[140px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          
          {/* Subtle Coptic-style Frame Accent */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-sky-500 to-amber-500" />
          
          {/* Main Icon/Identity Block */}
          <div className="text-center space-y-3 mb-8">
            <div className="mx-auto w-12 h-12 bg-gradient-to-tr from-amber-500 to-sky-500 rounded-2xl flex items-center justify-center shadow-lg relative">
              <span className="text-2xl text-slate-950 font-black">✝</span>
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-amber-500 to-sky-500 opacity-20 blur-sm pointer-events-none" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">الكنيسة الإنجيلية بمدينة نصر</h2>
              <p className="text-xs text-slate-400 font-semibold block">سجل قاعدة بيانات وافتقاد الأسر والاجتماعات</p>
              <div className="h-px w-16 bg-slate-800 mx-auto mt-2" />
              <p className="text-[11px] text-slate-550 font-bold mt-1 bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-lg inline-block text-amber-400">
                بوابة الدخول الموحدة للخدام والمسؤولين
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300">اسم المستخدم (Username)</label>
              <div className="relative">
                <input
                  type="text"
                  autoCapitalize="none"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: Admin"
                  className="w-full bg-slate-900 text-slate-100 placeholder-slate-600 text-xs rounded-xl border border-slate-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 p-3 pr-10 outline-none transition-all font-mono"
                  id="login_username_input"
                />
                <User className="w-4 h-4 text-slate-550 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-300">كلمة المرور (Password)</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••"
                  className="w-full bg-slate-900 text-slate-100 placeholder-slate-600 text-xs rounded-xl border border-slate-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 p-3 pr-10 pl-11 outline-none transition-all font-mono"
                  id="login_password_input"
                />
                <Lock className="w-4 h-4 text-slate-550 absolute right-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-500 hover:text-slate-300 absolute left-3 top-2.5 transition-colors cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-950/40 border border-red-500/30 text-red-200 p-3 rounded-lg text-[11px] font-medium flex gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 p-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-4"
              id="login_submit_btn"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>تأكيد تسجيل الدخول الآمن</span>
                </>
              )}
            </button>
          </form>

          {/* Inline Quick Help / Users reference */}
          <div className="mt-6 border-t border-slate-900 pt-4">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-450 hover:text-amber-400 transition-colors font-semibold cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>استعراض حسابات الدخول المعتمدة والامتيازات</span>
            </button>

            {showHelp && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 bg-slate-900 border border-slate-850 p-3 rounded-xl space-y-2.5 max-h-48 overflow-y-auto"
              >
                <p className="text-[10px] text-amber-500/90 font-bold leading-relaxed border-b border-slate-800 pb-1.5">
                  أهلاً بك؛ يرجى النقر على أي حساب أدناه لتعبئة البيانات تلقائياً للتجربة والتحقق السريع:
                </p>
                {EMBEDDED_USERS.map((u, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickFill(u)}
                    className="w-full text-right p-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800/80 hover:border-amber-500/30 transition-all text-[10px] flex justify-between items-center group cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-slate-200 block group-hover:text-amber-400">{u.name}</span>
                      <span className="text-[9px] text-slate-500">مستخدم: {u.username}</span>
                    </div>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                      u.role === 'Super Admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    }`}>
                      {u.role === 'Super Admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

        </div>

        {/* Outer Minimalist Footer */}
        <p className="text-center text-[10px] text-slate-650 mt-6 font-medium">
          مستند إلى نظام الإحصاء والتحليل الذكي لبيانات كنيستنا 🕊️
        </p>

      </motion.div>
    </div>
  );
}
