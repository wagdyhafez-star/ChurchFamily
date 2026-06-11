/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, FileSpreadsheet, Mic, Shield, Layout, Smartphone, Eye, CheckCircle2, History, AlertCircle, Sparkles, LogOut, Clock, ArrowRight, CornerDownLeft, QrCode, Scan, UserPlus
} from 'lucide-react';
import { Family, AttendanceRecord, AuditLog, ChurchUser } from './types';
import { safeLocalStorage } from './lib/safeStorage';
import DashboardView from './components/DashboardView';
import FamilySection from './components/FamilySection';
import VoiceRecognizer from './components/VoiceRecognizer';
import ExcelManager from './components/ExcelManager';
import SystemSettings from './components/SystemSettings';
import { 
  isFirebaseConfigured, 
  fetchFamiliesFromFirebase, 
  fetchAttendanceFromFirebase, 
  fetchAuditLogsFromFirebase, 
  fetchUsersFromFirebase,
  saveFamilyToFirebase,
  deleteFamilyFromFirebase,
  saveAttendanceToFirebase,
  saveAuditLogToFirebase,
  saveUserToFirebase,
  migrateLocalToFirebase
} from './lib/firebaseSync';

export default function App() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<ChurchUser[]>([]);
  const [activeUser, setActiveUser] = useState<ChurchUser>({
    email: 'wagdy.hafez@gmail.com',
    name: 'أ. وجدي حافظ',
    role: 'Super Admin'
  });

  // Navigation and Layout modes
  const [currentSection, setCurrentSection] = useState<'dashboard' | 'families' | 'attendance' | 'voice_enrollment' | 'import_export' | 'settings' | 'qr_attendance'>('dashboard');
  const [viewMode, setViewMode] = useState<'desktop' | 'android' | 'iphone'>('desktop');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // QR check-in simulation helper
  const [qrSelectedFamilyId, setQrSelectedFamilyId] = useState('');
  const [qrCheckingIn, setQrCheckingIn] = useState(false);
  const [qrFeedback, setQrFeedback] = useState<string | null>(null);

  // Helper to fetch with an enforced timeout using AbortController
  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs: number = 4000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error: any) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error('فشل الاتصال: انتهت مهلة طلب البيانات (4 ثوانٍ)');
      }
      throw error;
    }
  };

  // Load the initial database records
  const fetchDatabase = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. If Firebase Cloud DB is configured, let's use it as our central database (meaning absolute global persistence!)
      if (isFirebaseConfigured()) {
        console.log('[Hybrid Database Engine] Loading from Live Firebase Cloud database...');
        try {
          let cloudFam = await fetchFamiliesFromFirebase();
          let cloudAtt = await fetchAttendanceFromFirebase();
          let cloudAud = await fetchAuditLogsFromFirebase();
          const cloudUsr = await fetchUsersFromFirebase();

          // If the Cloud Database is newly provisioned and completely empty, 
          // we fetch the standard server templates (church_db.json) as seed data 
          // so new devices don't show a completely empty layout on their first startup.
          if (cloudFam.length === 0 && cloudAtt.length === 0) {
            console.log('[Hybrid Database Engine] Cloud database resides empty. Fetching initial local backup seed.');
            try {
              const res = await fetchWithTimeout('/api/db');
              if (res.ok) {
                const contentType = res.headers.get('content-type');
                if (contentType && !contentType.includes('text/html')) {
                  const data = await res.json();
                  cloudFam = data.families || [];
                  cloudAtt = data.attendance || [];
                  cloudAud = data.auditLogs || [];
                }
              }
            } catch (seedErr) {
              console.warn('[Hybrid Database Engine] Unhandled seed loading failure:', seedErr);
            }
          }

          setFamilies(cloudFam);
          setAttendance(cloudAtt);
          setAuditLogs(cloudAud);
          
          const defaultUsers: ChurchUser[] = [
            { email: 'wagdy.hafez@gmail.com', name: 'أ. وجدي حافظ', role: 'Super Admin' },
            { email: 'servant1@church.org', name: 'خادم الاجتماع ۱', role: 'Admin' },
            { email: 'viewer@church.org', name: 'مشاهد فقط', role: 'Viewer' }
          ];
          const finalUsers = cloudUsr.length > 0 ? cloudUsr : defaultUsers;
          setUsers(finalUsers);
          setIsOfflineMode(false);

          // Always back up to local storage cache to support ultra-fast offline fallback
          syncLocalDb(cloudFam, cloudAtt, cloudAud, finalUsers);

          // Update activeUser session
          const exists = finalUsers.find((u: ChurchUser) => u.email === activeUser.email);
          if (exists) {
            setActiveUser(exists);
          }
          setLoading(false);
          return;
        } catch (firebaseErr: any) {
          console.warn('[Hybrid Database Engine] Firestore fetch failed. Falling back to local browser cache:', firebaseErr);
        }
      }

      // 2. Normal / original local database fetching from /api/db or files
      const res = await fetchWithTimeout('/api/db');
      if (!res.ok) {
        throw new Error('فشل تحميل قاعدة البيانات من الخادم الحوسبي.');
      }
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Static single-page routing fallback detected on Vercel/GitHub Pages.');
      }

      const data = await res.json();
      setFamilies(data.families || []);
      setAttendance(data.attendance || []);
      setAuditLogs(data.auditLogs || []);
      setUsers(data.users || []);
      setIsOfflineMode(false);

      // Persist in background localStorage as fallback cache
      try {
        safeLocalStorage.setItem('church_families', JSON.stringify(data.families || []));
        safeLocalStorage.setItem('church_attendance', JSON.stringify(data.attendance || []));
        safeLocalStorage.setItem('church_auditLogs', JSON.stringify(data.auditLogs || []));
        safeLocalStorage.setItem('church_users', JSON.stringify(data.users || []));
      } catch (err) {
        console.warn('Unable to back up to local storage cache', err);
      }

      // If user profile changed in logs on system reset, update session
      const exists = data.users?.find((u: ChurchUser) => u.email === activeUser.email);
      if (exists) {
        setActiveUser(exists);
      }
    } catch (err: any) {
      console.warn('[Hybrid Database Engine] Reverting to secure, zero-overhead browser LocalStorage database:', err.message);
      setIsOfflineMode(true);
      
      try {
        const localFamilies = safeLocalStorage.getItem('church_families');
        const localAttendance = safeLocalStorage.getItem('church_attendance');
        const localAuditLogs = safeLocalStorage.getItem('church_auditLogs');
        const localUsers = safeLocalStorage.getItem('church_users');

        const loadedFam = localFamilies ? JSON.parse(localFamilies) : [];
        const loadedAtt = localAttendance ? JSON.parse(localAttendance) : [];
        const loadedAud = localAuditLogs ? JSON.parse(localAuditLogs) : [];
        const defaultUsers: ChurchUser[] = [
          { email: 'wagdy.hafez@gmail.com', name: 'أ. وجدي حافظ', role: 'Super Admin' },
          { email: 'servant1@church.org', name: 'خادم الاجتماع ۱', role: 'Admin' },
          { email: 'viewer@church.org', name: 'مشاهد فقط', role: 'Viewer' }
        ];
        const loadedUsr = localUsers ? JSON.parse(localUsers) : defaultUsers;

        setFamilies(loadedFam);
        setAttendance(loadedAtt);
        setAuditLogs(loadedAud);
        setUsers(loadedUsr);
      } catch (e) {
        console.error('LocalStorage load failure', e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabase();
  }, []);

  // Helper to persist localStorage fallback
  const syncLocalDb = (newFamilies: Family[], newAttendance: AttendanceRecord[], newLogs: AuditLog[], newUsers: ChurchUser[]) => {
    try {
      safeLocalStorage.setItem('church_families', JSON.stringify(newFamilies));
      safeLocalStorage.setItem('church_attendance', JSON.stringify(newAttendance));
      safeLocalStorage.setItem('church_auditLogs', JSON.stringify(newLogs));
      safeLocalStorage.setItem('church_users', JSON.stringify(newUsers));
    } catch (err) {
      console.error('LocalStorage write failure', err);
    }
  };

  const addLocalAuditLog = (action: string, details: string, currentLogs: AuditLog[] = auditLogs) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userEmail: activeUser.email,
      role: activeUser.role as any,
      action,
      details
    };
    const updated = [newLog, ...currentLogs].slice(0, 200);
    setAuditLogs(updated);
    return updated;
  };

  // API operations
  const handleAddFamily = async (familyData: Omit<Family, 'id' | 'createdAt'>): Promise<boolean> => {
    if (isFirebaseConfigured() || isOfflineMode) {
      const isCloud = isFirebaseConfigured();
      const newFamily: Family = {
        ...familyData,
        id: `fam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString()
      };
      const updatedFamilies = [newFamily, ...families];
      setFamilies(updatedFamilies);
      const logAction = isCloud ? 'إضافة عائلية (سحابية)' : 'إضافة عائلية (محلية)';
      const logDetails = isCloud 
        ? `تم إضافة عائلة ${familyData.husbandName} في قاعدة البيانات السحابية (Firestore).`
        : `تم إضافة عائلة ${familyData.husbandName} في قاعدة البيانات المحلية (Vercel Offline Mode).`;
      const updatedLogs = addLocalAuditLog(logAction, logDetails);
      syncLocalDb(updatedFamilies, attendance, updatedLogs, users);

      if (isCloud) {
        try {
          await saveFamilyToFirebase(newFamily);
          await saveAuditLogToFirebase(updatedLogs[0]);
        } catch (err) {
          console.error('[FirebaseSync] Failed to save family to cloud:', err);
        }
      }
      alert('تم إضافة عائلة كنسية بنجاح وتسجيل العملية في الأرشيف.');
      return true;
    }

    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family: familyData,
          userEmail: activeUser.email,
          userRole: activeUser.role
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'فشلت إضافة العائلة');
        return false;
      }

      await fetchDatabase();
      alert('تم إضافة عائلة كنسية بنجاح وتسجيل العملية في الأرشيف.');
      return true;
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إجراء الطلب.');
      return false;
    }
  };

  const handleEditFamily = async (id: string, familyData: Partial<Family>): Promise<boolean> => {
    if (isFirebaseConfigured() || isOfflineMode) {
      const isCloud = isFirebaseConfigured();
      const targetFamily = families.find(f => f.id === id);
      const updatedFamilies = families.map(f => {
        if (f.id === id) {
          return { ...f, ...familyData };
        }
        return f;
      });
      setFamilies(updatedFamilies);
      const logAction = isCloud ? 'تحديث عائلية (سحابية)' : 'تحديث عائلية (محلية)';
      const logDetails = isCloud 
        ? `تم تحديث بيانات العائلة ${targetFamily?.husbandName || ''} في قاعدة البيانات السحابية.`
        : `تم تحديث بيانات العائلة ${targetFamily?.husbandName || ''} في قاعدة البيانات المحلية.`;
      const updatedLogs = addLocalAuditLog(logAction, logDetails);
      syncLocalDb(updatedFamilies, attendance, updatedLogs, users);

      if (isCloud && targetFamily) {
        try {
          await saveFamilyToFirebase({ ...targetFamily, ...familyData });
          await saveAuditLogToFirebase(updatedLogs[0]);
        } catch (err) {
          console.error('[FirebaseSync] Failed to update family on cloud:', err);
        }
      }
      return true;
    }

    try {
      const res = await fetch(`/api/family/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family: familyData,
          userEmail: activeUser.email,
          userRole: activeUser.role
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'فشل تحديث بيانات العائلة');
        return false;
      }

      await fetchDatabase();
      return true;
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إجراء طلب التحديث.');
      return false;
    }
  };

  const handleDeleteFamily = async (id: string): Promise<boolean> => {
    if (isFirebaseConfigured() || isOfflineMode) {
      const isCloud = isFirebaseConfigured();
      const targetFamily = families.find(f => f.id === id);
      const updatedFamilies = families.filter(f => f.id !== id);
      setFamilies(updatedFamilies);
      const logAction = isCloud ? 'حذف عائلية (سحابية)' : 'حذف عائلية (محلية)';
      const logDetails = isCloud 
        ? `تم حذف العائلة ${targetFamily?.husbandName || ''} من قاعدة البيانات السحابية.`
        : `تم حذف العائلة ${targetFamily?.husbandName || ''} من قاعدة البيانات المحلية.`;
      const updatedLogs = addLocalAuditLog(logAction, logDetails);
      syncLocalDb(updatedFamilies, attendance, updatedLogs, users);

      if (isCloud) {
        try {
          await deleteFamilyFromFirebase(id);
          await saveAuditLogToFirebase(updatedLogs[0]);
        } catch (err) {
          console.error('[FirebaseSync] Failed to delete family from cloud:', err);
        }
      }
      return true;
    }

    try {
      const res = await fetch(`/api/family/${id}?userEmail=${encodeURIComponent(activeUser.email)}&userRole=${activeUser.role}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'فشل الحذف');
        return false;
      }

      await fetchDatabase();
      return true;
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في عملية الإرسال.');
      return false;
    }
  };

  const handleAttendanceSaved = async (date: string, attendedFamilyIds: string[], notes: string, merge: boolean = false) => {
    if (isFirebaseConfigured() || isOfflineMode) {
      const isCloud = isFirebaseConfigured();
      let updatedAttendance = [...attendance];
      const existingIdx = updatedAttendance.findIndex(a => a.date === date);
      let targetRecord: AttendanceRecord;
      
      if (existingIdx !== -1) {
        if (merge) {
          const mergedIds = Array.from(new Set([...updatedAttendance[existingIdx].attendedFamilyIds, ...attendedFamilyIds]));
          targetRecord = {
            ...updatedAttendance[existingIdx],
            attendedFamilyIds: mergedIds,
            notes: notes || updatedAttendance[existingIdx].notes
          };
          updatedAttendance[existingIdx] = targetRecord;
        } else {
          targetRecord = {
            date,
            attendedFamilyIds,
            notes: notes || 'تحديث الحضور الكنسي',
            createdBy: updatedAttendance[existingIdx].createdBy || activeUser.name
          };
          updatedAttendance[existingIdx] = targetRecord;
        }
      } else {
        targetRecord = {
          date,
          attendedFamilyIds,
          notes: notes || 'حضور لقاء عام',
          createdBy: activeUser.name
        };
        updatedAttendance = [targetRecord, ...updatedAttendance];
      }
      
      setAttendance(updatedAttendance);
      const logAction = isCloud ? 'تسجيل حضور (سحابية)' : 'تسجيل حضور (محلية)';
      const logDetails = isCloud 
        ? `تم تسجيل حضور ${attendedFamilyIds.length} عائلات سحابياً في لقاء تاريخ ${date}.`
        : `تم تسجيل حضور ${attendedFamilyIds.length} عائلات محلياً في لقاء تاريخ ${date}.`;
      const updatedLogs = addLocalAuditLog(logAction, logDetails);
      syncLocalDb(families, updatedAttendance, updatedLogs, users);

      if (isCloud) {
        try {
          await saveAttendanceToFirebase(targetRecord);
          await saveAuditLogToFirebase(updatedLogs[0]);
        } catch (err) {
          console.error('[FirebaseSync] Failed to save attendance to cloud:', err);
        }
      }
      return;
    }

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          attendedFamilyIds,
          notes,
          userEmail: activeUser.email,
          userRole: activeUser.role,
          merge
        })
      });

      if (!res.ok) throw new Error('فشل تسجيل الحضور');
      await fetchDatabase();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'فشلت عملية الحفظ.');
    }
  };

  const handleImportCompleted = async (importedList: any[]) => {
    if (isFirebaseConfigured() || isOfflineMode) {
      const isCloud = isFirebaseConfigured();
      const mapped = importedList.map(fam => ({
        ...fam,
        id: fam.id || `fam_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        createdAt: fam.createdAt || new Date().toISOString()
      }));
      const updatedFamilies = [...mapped, ...families];
      setFamilies(updatedFamilies);
      const logAction = isCloud ? 'استيراد عائلات (سحابية)' : 'استيراد عائلات (محلية)';
      const logDetails = isCloud 
        ? `تم استيراد وتحميل ${importedList.length} عائلات سحابية من كشف Excel.`
        : `تم استيراد وتحميل ${importedList.length} عائلات محلية من كشف Excel.`;
      const updatedLogs = addLocalAuditLog(logAction, logDetails);
      syncLocalDb(updatedFamilies, attendance, updatedLogs, users);

      if (isCloud) {
        try {
          let successCount = 0;
          let failCount = 0;
          const uploadPromises = mapped.map(async (fam) => {
            try {
              await saveFamilyToFirebase(fam);
              successCount++;
            } catch (err) {
              console.error(`[FirebaseSync] Failed to upload family to Firestore: ${fam.husbandName}`, err);
              failCount++;
            }
          });
          await Promise.all(uploadPromises);
          console.log(`[FirebaseSync] Bulk cloud sync completed: ${successCount} successfully saved, ${failCount} failed.`);
          await saveAuditLogToFirebase(updatedLogs[0]);
        } catch (err) {
          console.error('[FirebaseSync] Import cloud sync error:', err);
        }
      }
      alert('تم استيراد العائلات بنجاح وتسجيل عملية الاستيراد في الأرشيف.');
      return;
    }

    try {
      // Loop import list concurrently
      const apiPromises = importedList.map(async (fam) => {
        const res = await fetch('/api/family', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            family: fam,
            userEmail: activeUser.email,
            userRole: activeUser.role
          })
        });
        if (!res.ok) {
          console.error(`[LocalImport] Failed to import family to server DB: ${fam.husbandName}`);
        }
      });
      await Promise.all(apiPromises);
      await fetchDatabase();
      alert('تم استيراد العائلات بنجاح وتسجيل عملية الاستيراد في الأرشيف.');
    } catch (err) {
      console.error(err);
      alert('فشل إكمال عملية الربط الشاملة للأسر المعينة.');
    }
  };

  const handleBulkAttendanceImport = async (records: { date: string; attendedFamilyIds: string[]; notes: string }[]) => {
    if (isFirebaseConfigured() || isOfflineMode) {
      const isCloud = isFirebaseConfigured();
      let updatedAttendance = [...attendance];
      const recsToSave: AttendanceRecord[] = [];

      for (const rec of records) {
        const existingIdx = updatedAttendance.findIndex(a => a.date === rec.date);
        let targetRec: AttendanceRecord;
        if (existingIdx !== -1) {
          targetRec = {
            ...updatedAttendance[existingIdx],
            attendedFamilyIds: Array.from(new Set([...updatedAttendance[existingIdx].attendedFamilyIds, ...rec.attendedFamilyIds])),
            notes: rec.notes || updatedAttendance[existingIdx].notes
          };
          updatedAttendance[existingIdx] = targetRec;
        } else {
          targetRec = {
            date: rec.date,
            attendedFamilyIds: rec.attendedFamilyIds,
            notes: rec.notes,
            createdBy: activeUser.name
          };
          updatedAttendance = [targetRec, ...updatedAttendance];
        }
        recsToSave.push(targetRec);
      }
      setAttendance(updatedAttendance);
      const logAction = isCloud ? 'استيراد حضور بالجملة (سحابية)' : 'استيراد حضور بالجملة (محلية)';
      const logDetails = isCloud 
        ? `تم استيراد حضور سحابي لعدد ${records.length} لقاءات.`
        : `تم استيراد حضور محلي لعدد ${records.length} لقاءات.`;
      const updatedLogs = addLocalAuditLog(logAction, logDetails);
      syncLocalDb(families, updatedAttendance, updatedLogs, users);

      if (isCloud) {
        try {
          const cloudPromises = recsToSave.map(async (r) => {
            await saveAttendanceToFirebase(r);
          });
          await Promise.all(cloudPromises);
          await saveAuditLogToFirebase(updatedLogs[0]);
        } catch (err) {
          console.error('[FirebaseSync] Bulk attendance cloud error:', err);
        }
      }
      alert('تم دمج واستيراد كشوف الحضور الكنسي بنجاح.');
      return;
    }

    try {
      const apiPromises = records.map(async (rec) => {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: rec.date,
            attendedFamilyIds: rec.attendedFamilyIds,
            notes: rec.notes,
            userEmail: activeUser.email,
            userRole: activeUser.role
          })
        });
        if (!res.ok) {
          console.error('[LocalImport] Failed to import attendance on date:', rec.date);
        }
      });
      await Promise.all(apiPromises);
      await fetchDatabase();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في عملية استيراد سجل حضور الاجتماعات.');
    }
  };

  const handleSaveFirebaseConfigText = async (configText: string): Promise<boolean> => {
    if (!configText || configText.trim() === '') {
      safeLocalStorage.removeItem('church_firebase_config_custom');
      await fetchDatabase();
      return true;
    }
    try {
      const parsed = JSON.parse(configText.trim());
      if (!parsed.apiKey || !parsed.projectId || !parsed.appId) {
        throw new Error('يجب احتواء كود التكوين المنسوخ على apiKey و projectId و appId.');
      }
      safeLocalStorage.setItem('church_firebase_config_custom', JSON.stringify(parsed));
      // Reload database immediately using new Firebase connection
      await fetchDatabase();
      return true;
    } catch (err: any) {
      console.error('Save Firebase Config Failed', err);
      return false;
    }
  };

  const handleMigrateToFirebase = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      const result = await migrateLocalToFirebase(families, attendance, auditLogs, users);
      if (result.success) {
        // Reload database using live cloud firebase contents to make sure everything is clean
        await fetchDatabase();
      }
      return result;
    } catch (e: any) {
      return { success: false, count: 0, error: e.message || 'Migration runtime exception.' };
    }
  };

  const handleRestoreDatabase = async () => {
    if (isOfflineMode) {
      try {
        safeLocalStorage.removeItem('church_families');
        safeLocalStorage.removeItem('church_attendance');
        safeLocalStorage.removeItem('church_auditLogs');
        safeLocalStorage.removeItem('church_users');
        setFamilies([]);
        setAttendance([]);
        setAuditLogs([]);
        alert('تم تصفير قاعدة البيانات المحلية بالكامل بنجاح وإعادة الملف خاوياً لقابلية البدء من جديد.');
        await fetchDatabase();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      const res = await fetch('/api/db/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: activeUser.email,
          userRole: activeUser.role
        })
      });
      if (!res.ok) throw new Error('فشلت عملية الاستعادة.');
      await fetchDatabase();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء فك الترسين.');
    }
  };

  const handleRebuildDatabaseConnection = async (): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    if (isOfflineMode) {
      return { success: true, filePath: 'LocalStorage Browser Sync (Offline Mode Engine)' };
    }

    try {
      const res = await fetch('/api/db/rebuild-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: activeUser.email,
          userRole: activeUser.role
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'فشلت عملية إعادة بناء الاتصال.' };
      }
      await fetchDatabase();
      return { success: true, filePath: data.filePath };
    } catch (err: any) {
      return { success: false, error: err.message || 'حدث خطأ أثناء الاتصال بالخادم.' };
    }
  };

  // QR Quick simulator scan
  const executeQrScanSimulator = () => {
    if (!qrSelectedFamilyId) return;
    setQrCheckingIn(true);
    setQrFeedback(null);

    setTimeout(async () => {
      const matchedFam = families.find(f => f.id === qrSelectedFamilyId);
      if (matchedFam) {
        const todayDate = new Date().toISOString().split('T')[0];
        
        // Find if attendance already initialized for today
        const todaysAttendanceRecord = attendance.find(a => a.date === todayDate);
        let currentAttended = todaysAttendanceRecord ? [...todaysAttendanceRecord.attendedFamilyIds] : [];
        
        if (!currentAttended.includes(matchedFam.id)) {
          currentAttended.push(matchedFam.id);
        }

        await handleAttendanceSaved(todayDate, currentAttended, 'حضور سريع باستخدام رمز الاستجابة السريعة (QR Passes)');
        setQrFeedback(`أهلاً بك عائلة الأستاذ ${matchedFam.husbandName}! تم تسجيل الحضور اللحظي لليوم بنجاح 🎉`);
      }
      setQrCheckingIn(false);
    }, 2000);
  };

  // Main navigation menu options
  const MENU_ITEMS = [
    { id: 'dashboard', label: 'لوحة التحليلات', icon: Layout },
    { id: 'families', label: 'قاعدة بيانات الأسر', icon: Users },
    { id: 'attendance', label: 'تسجيل الحضور بالصوت', icon: Mic },
    { id: 'voice_enrollment', label: 'تسجيل العائلات بالصوت', icon: UserPlus },
    { id: 'qr_attendance', label: 'تسجيل حضور سريع QR', icon: QrCode },
    { id: 'import_export', label: 'تصدير واستيراد Excel', icon: FileSpreadsheet },
    { id: 'settings', label: 'لوحة الأدوار والإعدادات', icon: Shield }
  ];

  // Render Section Selector Content
  const renderContent = () => {
    switch (currentSection) {
      case 'dashboard':
        return <DashboardView families={families} attendance={attendance} />;
      case 'families':
        return (
          <FamilySection 
            families={families} 
            onAddFamily={handleAddFamily}
            onEditFamily={handleEditFamily}
            onDeleteFamily={handleDeleteFamily}
            userRole={activeUser.role}
          />
        );
      case 'attendance':
        return (
          <VoiceRecognizer 
            families={families} 
            onAttendanceSaved={handleAttendanceSaved}
            onAddFamily={handleAddFamily}
            userRole={activeUser.role}
            initialTab="attendance"
            isOfflineMode={isOfflineMode}
          />
        );
      case 'voice_enrollment':
        return (
          <VoiceRecognizer 
            families={families} 
            onAttendanceSaved={handleAttendanceSaved}
            onAddFamily={handleAddFamily}
            userRole={activeUser.role}
            initialTab="enrollment"
            isOfflineMode={isOfflineMode}
          />
        );
      case 'import_export':
        return (
          <ExcelManager 
            families={families} 
            onImportCompleted={handleImportCompleted}
            onAttendanceImported={handleBulkAttendanceImport}
            userRole={activeUser.role}
          />
        );
      case 'qr_attendance':
        return (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm p-6" dir="rtl" id="qr_attendance_block">
            <div className="border-b border-stone-100 pb-3 mb-6">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" />
                نظام الحضور السريع باستخدام بطاقات الـ QR (QR Passports)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">تقنية ذكية وسريعة لتسجيل الحضور الكنسي بمجرد تقريب الرمز السريع من المتصفح أو كاميرا الخدمة.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Card Generator pass */}
              <div className="border border-stone-200 rounded-2xl p-5 bg-stone-50/40 space-y-4">
                <span className="text-xs font-bold text-emerald-800 block">١. مولّد بطاقة المرور (Christian Pass Generator)</span>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-stone-600">اختر العائلة لإصدار بطاقة الحضور المطبوعة:</label>
                  <select
                    value={qrSelectedFamilyId}
                    onChange={(e) => {
                      setQrSelectedFamilyId(e.target.value);
                      setQrFeedback(null);
                    }}
                    className="w-full text-xs bg-white border border-stone-200 text-stone-800 rounded-lg p-2.5 outline-none focus:border-emerald-500"
                  >
                    <option value="">-- اختر العائلة لإظهار الرمز --</option>
                    {families.map(f => (
                      <option key={f.id} value={f.id}>{f.husbandName} & {f.wifeName}</option>
                    ))}
                  </select>
                </div>

                {qrSelectedFamilyId ? (
                  <div className="bg-white p-4 rounded-xl border border-stone-200 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="bg-stone-50 p-3 rounded-lg border-2 border-stone-200 relative">
                      {/* Stylized QR Vector in pure SVG for premium fidelity */}
                      <svg className="w-32 h-32 text-stone-900" viewBox="0 0 100 100">
                        <rect x="0" y="0" width="25" height="25" fill="currentColor"/>
                        <rect x="75" y="0" width="25" height="25" fill="currentColor"/>
                        <rect x="0" y="75" width="25" height="25" fill="currentColor"/>
                        <rect x="40" y="40" width="20" height="20" fill="currentColor"/>
                        <rect x="15" y="40" width="10" height="15" fill="currentColor"/>
                        <rect x="45" y="15" width="15" height="10" fill="currentColor"/>
                        <rect x="70" y="45" width="15" height="15" fill="currentColor"/>
                        <rect x="45" y="75" width="20" height="10" fill="currentColor"/>
                        {/* Red velvet Cross indicator in the center representing Church Pass */}
                        <path d="M 45,50 H 55 M 50,45 V 55" stroke="red" strokeWidth="4"/>
                      </svg>
                      <Sparkles className="w-5 h-5 text-amber-500 absolute -top-2 -right-2 animate-bounce" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-800">بطاقة حضور عائلة {families.find(f => f.id === qrSelectedFamilyId)?.husbandName}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">رمز الخدمة المشفر: PASS_HASH_{qrSelectedFamilyId}</div>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 bg-white rounded-xl border border-stone-200 flex items-center justify-center text-[11px] text-stone-400 italic">
                    يرجى اختيار الأسرة المسجلة بالأعلى لبث رمزها المشفر.
                  </div>
                )}
              </div>

              {/* QR scanner simulation */}
              <div className="border border-stone-200 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <Scan className="w-4 h-4 text-emerald-600 animate-pulse" />
                  ٢. ماسح البوابة التفاعلي (Interactive Entrance Simulation)
                </span>

                <div className="bg-stone-900 rounded-xl p-6 text-center space-y-3 relative overflow-hidden h-44 flex flex-col justify-center items-center text-white">
                  {/* Visual laser scanner sweep animation line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-md shadow-emerald-500 animate-bounce top-1/2" />
                  
                  {qrCheckingIn ? (
                    <div className="space-y-2 z-10">
                      <div className="w-8 h-8 border-2 border-emerald-500 border-t-white rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-bold text-stone-300">جاري قراءة رمز الأسرة وفك التشفير...</p>
                    </div>
                  ) : (
                    <div className="space-y-1 z-10">
                      <QrCode className="w-10 h-10 text-stone-400 mx-auto" />
                      <p className="text-xs font-bold">بوابة الحرس الذكية للافتقاد</p>
                      <p className="text-[10px] text-stone-500">قم بتقريب بطاقة أي عائلة ثم انقر زر الفحص بالأسفل لتجرب المحاكاة</p>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={executeQrScanSimulator}
                    disabled={!qrSelectedFamilyId || qrCheckingIn}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition-colors"
                  >
                    تفقد ووميض ماسح البوابة الفعّال (Simulate Verification)
                  </button>
                </div>

                {qrFeedback && (
                  <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl text-xs font-bold text-emerald-800 animate-fadeIn flex gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                    <p>{qrFeedback}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <SystemSettings 
            auditLogs={auditLogs}
            users={users}
            activeUser={activeUser}
            onSelectUser={(usr) => setActiveUser(usr)}
            onRestoreDatabase={handleRestoreDatabase}
            onRebuildDatabaseConnection={handleRebuildDatabaseConnection}
            userRole={activeUser.role}
            isFirebaseActive={isFirebaseConfigured()}
            onSaveFirebaseConfig={handleSaveFirebaseConfigText}
            onMigrateToFirebase={handleMigrateToFirebase}
          />
        );
      default:
        return <DashboardView families={families} attendance={attendance} />;
    }
  };

  const getSidebarAndLayout = () => {
    // Left-to-Right menu, Arabic standard text translation
    const sidebarContent = (
      <aside className="w-full lg:w-64 bg-brand-sidebar text-slate-300 flex flex-col shrink-0 min-h-screen/90 shadow-lg justify-between border-l border-slate-700/50" dir="rtl">
        <div className="p-5 flex flex-col space-y-6">
          {/* Logo Brand layout */}
          <div className="flex items-center gap-3 border-b border-slate-700/65 pb-4">
            <div className="p-2 bg-brand-accent rounded-xl text-slate-900 shadow-md">
              <span className="font-extrabold text-sm">✝</span>
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-100 tracking-tight">الكنيسة الانجيلية بمدينة نصر - اجتماع الأسرة</h1>
              <span className="text-[10px] text-brand-accent block font-medium">إدارة ومتابعة الرعاية الذكية</span>
            </div>
          </div>

          {/* User Badge Profile info */}
          <div className="bg-brand-active/70 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              <span className="text-[11px] font-bold text-slate-200 truncate">{activeUser.name}</span>
            </div>
            <span className="text-[9px] text-slate-350 font-bold block bg-brand-sidebar/80 p-1 rounded-md text-center">{activeUser.role}</span>
          </div>

          {/* Menu navigation options */}
          <nav className="space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentSection(item.id as any)}
                  className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
                    currentSection === item.id 
                      ? 'bg-brand-active text-white border-r-4 border-brand-accent font-bold shadow-sm' 
                      : 'hover:bg-brand-active/50 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Technical Footer */}
        <div className="p-4 border-t border-slate-700/50 space-y-2">
          <div className="text-[9px] text-slate-500 font-mono text-center">
            تاريخ السيرفر: ٢٠٢٦-٠٦-٠١
          </div>
          <div className="text-[10px] text-slate-400 font-semibold text-center leading-relaxed">
            اجتماع العائلات الكنسي دائم النعمة بالبركة 🕊️
          </div>
        </div>
      </aside>
    );

    // Dynamic screen renderer wrapping in frames
    if (viewMode === 'desktop') {
      return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-bg-canvas" dir="rtl">
          {/* Sidebar */}
          {sidebarContent}
          
          {/* Main workspace frame container */}
          <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
            {/* Header Toolbar containing frame layouts */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-1.5">
                  <StarIcon />
                  {MENU_ITEMS.find(i => i.id === currentSection)?.label}
                </h2>
                <div className="text-xs text-slate-500 font-medium">سجلات متكاملة ومؤمنة لخدمة وافتقاد الكنيسة</div>
              </div>

              {/* View layout switchers */}
              <div className="flex bg-slate-200/80 rounded-lg p-0.5 gap-0.5 text-xs font-semibold self-start md:self-auto shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('desktop')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all ${
                    viewMode === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  مظهر الويب الكامل (Desktop)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('android')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all ${
                    viewMode === 'android' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  محاكي ملائم Android
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('iphone')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all ${
                    viewMode === 'iphone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  مظهر ملائم iPhone
                </button>
              </div>
            </div>

            {renderContent()}
          </main>
        </div>
      );
    } else {
      // Mock Android or iPhone Frames representation
      const isAndroid = viewMode === 'android';
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6" dir="rtl">
          {/* Back toolbar */}
          <div className="fixed top-4 right-4 z-40 bg-slate-800 border border-slate-700 text-slate-200 p-2.5 rounded-xl shadow-lg flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              className="text-xs font-bold text-[#EF4444] hover:text-[#F33333] underline flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              الرجوع لعرض الويب والكمبيوتر (الكامل)
            </button>
            <span className="text-slate-600 font-bold font-mono">|</span>
            <span className="text-[11px] font-medium text-slate-400">تختبر الآن مظهر الهواتف المحمولة</span>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Quick simulated interactive phone selector panel */}
            <div className="w-48 bg-slate-800 p-4 rounded-xl border border-slate-700 text-slate-300 space-y-3 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">قائمة الانتقالات الهاتفية</span>
              <div className="flex flex-col gap-1">
                {MENU_ITEMS.map(i => {
                  const Icon = i.icon;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setCurrentSection(i.id as any)}
                      className={`text-right text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                        currentSection === i.id ? 'bg-[#3B82F6] text-white' : 'hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {i.label.slice(0, 16)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulated smartphone casing device frame */}
            <div className={`relative bg-black transition-all border shadow-2xl p-3 ${
              isAndroid 
                ? 'w-[360px] h-[720px] rounded-[40px] border-slate-750' 
                : 'w-[375px] h-[760px] rounded-[48px] border-slate-800'
            }`}>
              {/* Notch for Camera */}
              {isAndroid ? (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-950 rounded-full z-30" />
              ) : (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-950 rounded-full z-30" />
              )}

              {/* Internal Screen Workspace container */}
              <div className="w-full h-full bg-slate-50 rounded-[30px] overflow-hidden flex flex-col relative" id="mobile_simulated_screen">
                {/* Simulated Phone Top StatusBar */}
                <div className="bg-slate-950 text-[10px] text-slate-400 p-2 px-6 pt-4 flex items-center justify-between font-mono z-20 select-none">
                  <span>20:24</span>
                  <div className="flex items-center gap-1.5">
                    <span>5G LTE</span>
                    <span>🔋 100%</span>
                  </div>
                </div>

                {/* Mobile screen appbar */}
                <div className="bg-slate-950 text-white p-3.5 flex items-center justify-between z-10 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-950 text-xs font-bold bg-brand-accent w-6 h-6 rounded flex items-center justify-center">✝</span>
                    <span className="text-xs font-black truncate max-w-[240px]">الكنيسة الانجيلية بمدينة نصر - اجتماع الأسرة</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 bg-slate-800 p-1 px-2 rounded-md">{activeUser.role}</span>
                </div>

                {/* Main scrollable body viewport of the simulated mobile */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                  <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest block text-right border-b border-slate-200 pb-1">
                    {MENU_ITEMS.find(i => i.id === currentSection)?.label}
                  </div>
                  {renderContent()}
                </div>

                {/* Smartphone software bottom navigation bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 p-1.5 flex items-center justify-around text-[10px] text-slate-400 z-20">
                  {MENU_ITEMS.slice(0, 4).map(i => {
                    const Icon = i.icon;
                    return (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setCurrentSection(i.id as any)}
                        className={`flex flex-col items-center gap-0.5 p-1 px-2 rounded-md transition-colors ${
                          currentSection === i.id ? 'text-[#3B82F6]' : 'hover:text-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[8px] font-semibold">{i.label.slice(0, 9)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  const StarIcon = () => (
    <span className="w-5 h-5 bg-[#1E293B] border border-[#FACC15] text-[#FACC15] rounded-md flex items-center justify-center text-xs font-extrabold shadow-sm">
      ✨
    </span>
  );

  if (loading && families.length === 0) {
    return (
      <div className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center p-6 space-y-4" dir="rtl">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          <span className="absolute text-xl">🙏</span>
        </div>
        <p className="text-slate-700 text-xs font-bold animate-pulse">جاري الاستعلام وقراءة البيانات الكنسية... يرجى الانتظار</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-canvas selection:bg-[#3B82F6]/15 selection:text-[#3B82F6]">
      {isOfflineMode && (
        <div className="bg-amber-500 hover:bg-amber-600/95 text-[#0F172A] text-[11px] font-bold py-2.5 px-4 text-center flex flex-col sm:flex-row items-center justify-center gap-2 transition-all border-b border-amber-600/30" dir="rtl">
          <span className="bg-slate-900 text-amber-400 text-[10px] px-2 py-0.5 rounded-lg font-mono tracking-tight shrink-0">
            Vercel & GitHub Active Mode 💾
          </span>
          <span>
            محرك التخزين المحلي الآمن نشط بالكامل. كافة التغييرات وحضور العائلات يُحفظ بأمان 100% في جهازك المتصفح الحالي، ويمكنك تصديرها كملف Excel في أي لحظه!
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-[#EF4444] text-white text-xs font-semibold p-3.5 text-center flex items-center justify-center gap-2" dir="rtl">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
          <button 
            type="button"
            onClick={fetchDatabase} 
            className="underline hover:text-slate-200 font-bold pr-4"
          >
            إعادة محاولة الربط
          </button>
        </div>
      )}
      
      {getSidebarAndLayout()}
    </div>
  );
}
