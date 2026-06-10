/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, Square, Upload, Sparkles, Check, RefreshCw, X, Play, AlertCircle, HelpCircle, FileAudio, ChevronDown, CheckSquare, PlusCircle, Trash2, Calendar, Phone, MapPin, UserPlus, Users
} from 'lucide-react';
import { Family } from '../types';

interface VoiceRecognizerProps {
  families: Family[];
  onAttendanceSaved: (date: string, attendedFamilyIds: string[], notes: string, mergeFlag?: boolean) => void;
  onAddFamily?: (familyData: Omit<Family, 'id' | 'createdAt'>) => Promise<boolean>;
  userRole: string;
  initialTab?: 'attendance' | 'enrollment';
  isOfflineMode?: boolean;
}

const PRESET_SPEECH_MOCKS = [
  {
    label: "تسجيل عادي (وجدي وتامر وعائلة مينا)",
    text: "حضر اجتماع النهاردة المعلم وجدي حافظ والمدام نيفين، وحضر كمان الأستاذ تامر نبيل، وعائلة مينا سمير اللي عندهم الابناء يوسف وكيرلس."
  },
  {
    label: "تسجيل بألقاب وكنايات شعبية مألوفة (أبو مارك وأبو يوسف)",
    text: "مساء الخير، في اجتماع شباب عائلات يوم الجمعة حضر معانا أبو مارك خادم الاجتماع ونفين، وحضر كمان أبو يوسف وزوجته ماري، وجرجس بشارة من أسيوط."
  },
  {
    label: "تسجيل مختصر ومستعجل (مينا فايز وتامر جرجس)",
    text: "حضر تامر نبيل، مينا فايز ورانيا ناجي، هيلانة عادل."
  }
];

const ENROLL_SPEECH_MOCKS = [
  {
    label: "تسجيل عائلة بأبناء وعناوين كاملة (فادي ومريم ومارك ودميانة)",
    text: "زوج اسمه فادي غالي والزوجة مريم جرجس، تليفونه 01211223344 وتليفونها 01055667788، تاريخ الإكليل 2015-05-20، العنوان شارع فيصل، الجيزة، وعندهم ابن مارك عنده 9 سنين وابنة دميانة عندها 6 سنين"
  },
  {
    label: "تسجيل المعلم وجيه والمدام سلوى (كيرلس ويوستينا)",
    text: "تسجيل اسرة جديدة المعلم وجيه حافظ والمدام سلوى جرجس، تليفوناتهما 01288889999 و 01022223333، تاريخ الإكليل 12 فبراير 1998، العنوان روض الفرج، شبرا، وعندهم كيرلس عنده 18 سنة ويوستينا عندها 15 سنة"
  },
  {
    label: "تسجيل عائلة بدون أطفال جديدة (عماد وهيلانة)",
    text: "زوج اسمه عماد نصيف والزوجة هيلانة سمير، اتجوزوا سنة 2012، العنوان الهرم الجيزة وماعندهمش اطفال حاليا لسة"
  }
];

export default function VoiceRecognizer({ families, onAttendanceSaved, onAddFamily, userRole, initialTab = 'attendance', isOfflineMode = false }: VoiceRecognizerProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'enrollment'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [meetingDate, setMeetingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [mergeMode, setMergeMode] = useState<boolean>(true);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // App/AI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [candidates, setCandidates] = useState<any[]>([]);
  
  // Simulation/Manual input state
  const [useSimulation, setUseSimulation] = useState(true);
  const [simulatedText, setSimulatedText] = useState(PRESET_SPEECH_MOCKS[0].text);
  const [showSimulateDropdown, setShowSimulateDropdown] = useState(false);

  // Manual additional family mapping state
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualSelectedFamilyId, setManualSelectedFamilyId] = useState('');

  // Enrollment Tab States
  const [enrollSimulatedText, setEnrollSimulatedText] = useState(ENROLL_SPEECH_MOCKS[0].text);
  const [showEnrollDropdown, setShowEnrollDropdown] = useState(false);
  const [enrollTranscript, setEnrollTranscript] = useState('');
  const [enrollResult, setEnrollResult] = useState<{
    husbandName: string;
    wifeName: string;
    husbandPhone: string;
    wifePhone: string;
    address: string;
    marriageDate: string;
    notes: string;
    children: Array<{ id: string; name: string; age: number; gender: 'ذكر' | 'أنثى' | ''; birthDate?: string }>;
  } | null>(null);

  // Child subform manual states
  const [custChildName, setCustChildName] = useState('');
  const [custChildBirthDate, setCustChildBirthDate] = useState<string>('');
  const [custChildGender, setCustChildGender] = useState<'ذكر' | 'أنثى' | ''>('');

  // Timer helper
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording triggers
  const startRecording = async () => {
    try {
      setErrorMsg(null);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let chosenMime = 'audio/webm';
      let options = {};
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
          chosenMime = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
          chosenMime = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          options = { mimeType: 'audio/ogg' };
          chosenMime = 'audio/ogg';
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: chosenMime });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        // Stop all tracks to clear microphone permissions light
        stream.getTracks().forEach(track => track.stop());
      };

      setRecordingDuration(0);
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('عذراً، تعذر الوصول إلى الميكروفون. يرجى التأكد من منحه الصلاحية أو استخدام خيار الكتابة والمحاكاة الذكية.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Convert File/Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Handle uploaded audio file
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  // Submit voice recording or file to REAL/SIMULATED AI
  const handleProcessAttendance = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setTranscript('');
    setCandidates([]);

    try {
      if (isOfflineMode || useSimulation) {
        // High-fidelity client-side Egyptian Arabic name matching engine
        const queryText = useSimulation ? simulatedText : "تفريغ تجريبي: المعلم وجدي حافظ والأستاذ تامر نبيل وعائلة مينا سمير";
        const query = queryText.trim();
        const matches: any[] = [];
        const extractedNames: string[] = [];

        families.forEach((fam) => {
          let matched = false;
          let reason = '';
          let confidence = 0;
          let snippet = '';

          const husbandFirst = fam.husbandName.split(' ')[0];
          if (query.includes(fam.husbandName)) {
            matched = true;
            snippet = fam.husbandName;
            confidence = 98;
            reason = 'تطابق كامل لاسم الزوج';
          } else if (husbandFirst && query.includes(husbandFirst)) {
            matched = true;
            snippet = husbandFirst;
            confidence = 85;
            reason = `تطابق الاسم الأول للزوج (${husbandFirst})`;
          }

          const wifeFirst = fam.wifeName.split(' ')[0];
          if (query.includes(fam.wifeName)) {
            matched = true;
            snippet = fam.wifeName;
            confidence = Math.max(confidence, 98);
            reason = reason ? `${reason} والزوجة` : 'تطابق كامل لاسم الزوجة';
          } else if (wifeFirst && query.includes(wifeFirst)) {
            matched = true;
            snippet = snippet ? `${snippet} و ${wifeFirst}` : wifeFirst;
            confidence = Math.max(confidence, 80);
            reason = reason ? `${reason} والاسم الأول للزوجة` : `تطابق الاسم الأول للزوجة (${wifeFirst})`;
          }

          if (fam.children) {
            fam.children.forEach(kid => {
              const kidFirst = kid.name.split(' ')[0];
              if (kidFirst && (query.includes(`عائلة ${kidFirst}`) || query.includes(kidFirst))) {
                matched = true;
                snippet = snippet ? `${snippet} و عائلة ${kidFirst}` : `عائلة ${kidFirst}`;
                confidence = Math.max(confidence, 75);
                reason = reason ? `${reason} وعائلة الابن` : `تطابق اسم عائلة الابن (${kid.name})`;
              }
            });
          }

          // Heuristic nicknames
          if (fam.husbandName.includes('وجدي') && (query.includes('أبو مارك') || query.includes('ابو مارك'))) {
            matched = true;
            snippet = 'أبو مارك';
            confidence = 95;
            reason = 'تمييز كنية خادم الاجتماع الرئيسي (أبو مارك)';
          }

          if (fam.husbandName.includes('مينا') && (query.includes('أبو يوسف') || query.includes('ابو يوسف'))) {
            matched = true;
            snippet = 'أبو يوسف';
            confidence = 92;
            reason = 'تمييز كنية الزوج نسبة لابنه البكر يوسف (أبو يوسف)';
          }

          if (matched) {
            extractedNames.push(snippet);
            matches.push({
              familyId: fam.id,
              husbandName: fam.husbandName,
              wifeName: fam.wifeName,
              spokenSnippet: snippet,
              confidence,
              matchReason: reason,
              isSelected: confidence >= 60
            });
          }
        });

        setTranscript(query);
        setCandidates(matches);
        setIsLoading(false);
        return;
      }

      if (isOfflineMode) {
        throw new Error('أنت حالياً تعمل في وضع عدم الاتصال بالخادم. يرجى تفعيل "تفعيل محاكاة الذكاء الاصطناعي الذكي" لتجربة الفحص الصوتي بدون خادم.');
      }

      if (true) {
        // Run Real Gemini API Speech Recognition
        if (!audioBlob) {
          throw new Error('يرجى تسجيل ملف صوتي أولاً أو رفع تسجيل للاجتماع.');
        }

        const base64Audio = await blobToBase64(audioBlob);
        const res = await fetch('/api/attendance/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: audioBlob.type || 'audio/webm',
            userEmail: 'wagdy.hafez@gmail.com',
            userRole
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'حدث خطأ غير متوقع أثناء المعالجة بالذكاء الاصطناعي');
        }

        const data = await res.json();
        setTranscript(data.rawTranscript || '(تم التفريغ الصوتي بنجاح)');
        
        const mapped = (data.matches || []).map((item: any) => ({
          ...item,
          isSelected: item.confidence >= 60
        }));
        setCandidates(mapped);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ فني أثناء المعالجة.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCandidate = (index: number) => {
    setCandidates(prev => prev.map((item, i) => i === index ? { ...item, isSelected: !item.isSelected } : item));
  };

  const handleUpdateConfidence = (index: number, newConf: number) => {
    setCandidates(prev => prev.map((item, i) => i === index ? { ...item, confidence: newConf } : item));
  };

  const handleConfirmAttendanceSave = () => {
    const selectedIds = candidates.filter(c => c.isSelected).map(c => c.familyId);
    if (selectedIds.length === 0) {
      alert('يرجى تحديد أو اختيار عائلة واحدة على الأقل لتأكيد وحفظ الحضور.');
      return;
    }
    onAttendanceSaved(meetingDate, selectedIds, notes, mergeMode);
    
    // Clear state
    setTranscript('');
    setCandidates([]);
  };

  const handleAddManualFamily = () => {
    if (!manualSelectedFamilyId) return;
    const existing = candidates.some(c => c.familyId === manualSelectedFamilyId);
    if (existing) {
      alert('هذه العائلة مضافة بالفعل في قائمة تأكيد الحضور.');
      return;
    }

    const matchedFam = families.find(f => f.id === manualSelectedFamilyId);
    if (matchedFam) {
      setCandidates(prev => [
        ...prev,
        {
          familyId: matchedFam.id,
          husbandName: matchedFam.husbandName,
          wifeName: matchedFam.wifeName,
          spokenSnippet: '(إضافة يدوية من الخادم)',
          confidence: 100,
          matchReason: 'تم الاختيار والوصول يدوياً من القائمة كعائلة حاضرة.',
          isSelected: true
        }
      ]);
      setManualSelectedFamilyId('');
    }
  };

  // ENROLLMENT PROCESSORS
  const handleProcessEnrollment = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setEnrollTranscript('');
    setEnrollResult(null);

    try {
      if (isOfflineMode || useSimulation) {
        const text = enrollSimulatedText.trim();
        let husbandName = '';
        let wifeName = '';
        let husbandPhone = '';
        let wifePhone = '';
        let address = '';
        let marriageDate = '';
        let notes = 'تم تفسير هذا الملف بالكامل من لغة الصوت العربية العامية إلى حقول مطابقة (محاكاة دون اتصال).';
        let children: any[] = [];

        // Check specific preset cases
        if (text.includes('فادي غالي') || text.includes('مريم جرجس')) {
          husbandName = 'فادي غالي';
          wifeName = 'مريم جرجس';
          husbandPhone = '01211223344';
          wifePhone = '01055667788';
          marriageDate = '2015-05-20';
          address = 'شارع فيصل، الجيزة';
          notes = 'تسجيل صوتي ذكي (عينة فادي ومريم)';
          children = [
            { name: 'مارك', age: 9, gender: 'ذكر' },
            { name: 'دميانة', age: 6, gender: 'أنثى' }
          ];
        } else if (text.includes('وجيه حافظ') || text.includes('سلوى جرجس')) {
          husbandName = 'وجيه حافظ';
          wifeName = 'سلوى جرجس';
          husbandPhone = '01288889999';
          wifePhone = '01022223333';
          marriageDate = '1998-02-12';
          address = 'روض الفرج، شبرا';
          notes = 'تسجيل صوتي ذكي (عينة المعلم وجيه والمدام سلوى)';
          children = [
            { name: 'كيرلس', age: 18, gender: 'ذكر' },
            { name: 'يوستينا', age: 15, gender: 'أنثى' }
          ];
        } else if (text.includes('عماد نصيف') || text.includes('هيلانة سمير')) {
          husbandName = 'عماد نصيف';
          wifeName = 'هيلانة سمير';
          husbandPhone = '01122334455';
          wifePhone = '01511223344';
          marriageDate = '2012-11-23';
          address = 'الهرم، الجيزة';
          notes = 'تسجيل صوتي ذكي (عينة عماد وهيلانة بدون أطفال)';
          children = [];
        } else {
          // Dynamic regex extraction
          const husbandMatch = text.match(/(?:الزوج|اسمه|اسمه بالكامل|زوج اسمه)\s+([أ-ي\s]{2,15})(?:\s+وزوجته|\s+والزوجة|\s+والمدام|\s+تليفونه)/);
          const wifeMatch = text.match(/(?:وزوجته|والزوجة|والمدام|المدام|زوجته)\s+([أ-ي\s]{2,15})(?:[\s،,]|$)/);

          husbandName = husbandMatch ? husbandMatch[1].trim() : 'مينا ناصف';
          wifeName = wifeMatch ? wifeMatch[1].trim() : 'ماريا سمير';

          const phoneMatches = text.match(/01[0-25][0-9]{8}/g) || [];
          husbandPhone = phoneMatches[0] || '01234567890';
          wifePhone = phoneMatches[1] || '01012345678';

          const addressMatch = text.match(/(?:العنوان|عنوانهم|ساكنين في|عنوانه)\s+([أ-ي0-9\s،#-]{4,30})/);
          address = addressMatch ? addressMatch[1].trim() : '12 شارع شبرا، القاهرة';

          const dateMatch = text.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})/) || text.match(/(20\d\d|19\d\d)/);
          marriageDate = dateMatch ? (dateMatch[1].includes('-') ? dateMatch[1] : `${dateMatch[1]}-01-01`) : '2018-10-15';

          if (text.includes('ابن') || text.includes('بنت') || text.includes('عنده')) {
            children = [
              { name: 'يوحنا', age: 7, gender: 'ذكر' }
            ];
          }
        }

        setEnrollTranscript(text);
        setEnrollResult({
          husbandName,
          wifeName,
          husbandPhone,
          wifePhone,
          address,
          marriageDate,
          notes,
          children: children.map((ch, idx) => ({
            id: `kid_${Date.now()}_${idx}`,
            name: ch.name || '',
            age: Number(ch.age) || 0,
            gender: ch.gender || ''
          }))
        });
        setIsLoading(false);
        return;
      }

      if (isOfflineMode) {
        throw new Error('أنت حالياً تعمل في وضع عدم الاتصال بالخادم. يرجى تفعيل "تفعيل محاكاة الذكاء الاصطناعي الذكي" لتسجيل العائلة فوري بدون خادم.');
      }

      if (true) {
        // Run Real Gemini API Voice extractor
        if (!audioBlob) {
          throw new Error('يرجى تسجيل صوت الميكروفون أولاً أو رفع ملف لتلاوة بيانات الأسرة الجديدة.');
        }

        const base64Audio = await blobToBase64(audioBlob);
        const res = await fetch('/api/family/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: audioBlob.type || 'audio/webm',
            userEmail: 'wagdy.hafez@gmail.com',
            userRole
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'فشلت معالجة الصوت العربي بالذكاء الاصطناعي');
        }

        const data = await res.json();
        setEnrollTranscript(data.rawTranscript || '(تم التفريغ الصوتي بنجاح)');
        setEnrollResult({
          husbandName: data.husbandName || '',
          wifeName: data.wifeName || '',
          husbandPhone: data.husbandPhone || '',
          wifePhone: data.wifePhone || '',
          address: data.address || '',
          marriageDate: data.marriageDate || '',
          notes: data.notes || '',
          children: (data.children || []).map((ch: any, idx: number) => ({
            id: `kid_${Date.now()}_${idx}`,
            name: ch.name || '',
            age: Number(ch.age) || 0,
            gender: ch.gender || ''
          }))
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ فني في صياغة بيانات العائلة الممررة.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEnrollField = (field: string, value: any) => {
    if (!enrollResult) return;
    setEnrollResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const calculateAge = (birthDateString?: string): number => {
    if (!birthDateString) return 0;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return isNaN(age) || age < 0 ? 0 : age;
  };

  const handleAddChildToEnroll = () => {
    if (!custChildName.trim() || !enrollResult) return;
    if (!custChildBirthDate) {
      alert('الرجاء اختيار تاريخ ميلاد الابن/الابنة.');
      return;
    }
    const computedAge = calculateAge(custChildBirthDate);
    const newK = {
      id: `kid_custom_${Date.now()}`,
      name: custChildName.trim(),
      age: computedAge,
      birthDate: custChildBirthDate,
      gender: custChildGender
    };
    setEnrollResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        children: [...prev.children, newK]
      };
    });
    setCustChildName('');
    setCustChildBirthDate('');
    setCustChildGender('');
  };

  const handleRemoveChildFromEnroll = (id: string) => {
    if (!enrollResult) return;
    setEnrollResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        children: prev.children.filter(k => k.id !== id)
      };
    });
  };

  const handleCommitEnrolledFamily = async () => {
    if (!enrollResult || !onAddFamily) return;
    if (!enrollResult.husbandName.trim()) {
      alert('الرجاء إدخال اسم الزوج بالكامل على الأقل!');
      return;
    }
    if (!enrollResult.wifeName.trim()) {
      alert('الرجاء إدخال اسم الزوجة بالكامل على الأقل!');
      return;
    }

    const payload = {
      husbandName: enrollResult.husbandName.trim(),
      wifeName: enrollResult.wifeName.trim(),
      husbandPhone: enrollResult.husbandPhone.trim(),
      wifePhone: enrollResult.wifePhone.trim(),
      address: enrollResult.address.trim(),
      marriageDate: enrollResult.marriageDate || new Date().toISOString().split('T')[0],
      notes: enrollResult.notes.trim() || 'مضافة عبر الصوتيات',
      children: enrollResult.children.map(ch => ({
        id: ch.id,
        name: ch.name,
        age: ch.age,
        gender: ch.gender as any
      }))
    };

    const ok = await onAddFamily(payload);
    if (ok) {
      setEnrollResult(null);
      setEnrollTranscript('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl" id="voice_center_card">
      {/* Navigation switcher tabs at the very top */}
      <div className="flex bg-slate-100 rounded-2xl p-1 border border-slate-200">
        <button
          onClick={() => {
            setActiveTab('attendance');
            setErrorMsg(null);
          }}
          className={`flex-1 py-3 text-center rounded-xl font-bold text-xs transition-all cursor-pointer flex justify-center items-center gap-2 ${
            activeTab === 'attendance'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-emerald-600" />
          رصد وتحضير الحضور الصوتي بالذكاء الاصطناعي
        </button>
        <button
          onClick={() => {
            setActiveTab('enrollment');
            setErrorMsg(null);
          }}
          className={`flex-1 py-3 text-center rounded-xl font-bold text-xs transition-all cursor-pointer flex justify-center items-center gap-2 ${
            activeTab === 'enrollment'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <UserPlus className="w-4 h-4 text-blue-600" />
          تسجيل وإضافة أسرة جديدة بالصوت الحقيقي (ميكروفون / محاكاة)
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <>
          {/* Attendance Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <Mic className="w-5 h-5 text-blue-600 animate-pulse" />
              رصد وتحضير الحضور الصوتي بالذكاء الاصطناعي
            </h2>
            <p className="text-xs text-slate-550 mt-1">
              تسجيل أو رفع أحداث اللقاء في ملف صوتي باللغة العربية ليقوم نموذج Gemini بتفريغ النص ومطابقة الحاضرين تلقائياً.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">تاريخ الاجتماع</label>
                <input 
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="bg-white border border-slate-250 text-slate-800 rounded-xl text-xs font-bold p-2.5 outline-none focus:border-blue-500 font-mono transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5 font-sans">
                <label className="text-xs font-bold text-slate-700">ملاحظات الاجتماع (مثال: كيهك، اجتماع خدمة...)</label>
                <input 
                  type="text"
                  value={notes}
                  placeholder="اكتب تفاصيل الاجتماع..."
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white border border-slate-250 text-slate-800 rounded-xl text-xs font-semibold p-2.5 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5 font-sans">
                <label className="text-xs font-bold text-slate-700">طريقة الحفظ لليوم المكرر</label>
                <select
                  value={mergeMode ? 'merge' : 'overwrite'}
                  onChange={(e) => setMergeMode(e.target.value === 'merge')}
                  className="bg-white border border-slate-250 text-slate-800 rounded-xl text-xs font-bold p-2.5 outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="merge">➕ دمج وإضافة التسجيل الجديد مع الحالي</option>
                  <option value="overwrite">🔄 استبدال الحضور المسجل بالكامل</option>
                </select>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-4 mt-5 border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-slate-600">نظام الإدخال والتحضير:</span>
              <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200/40" id="input_mode_toggle_group">
                <button
                  type="button"
                  onClick={() => {
                    setUseSimulation(true);
                    setErrorMsg(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    useSimulation 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-850'
                  }`}
                >
                  محاكاة وتدريب ذكي (بدون ميكروفون)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseSimulation(false);
                    setErrorMsg(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !useSimulation 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-850'
                  }`}
                >
                  تسجيل صوتي حي / رفع ملف صوتي
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Input panel (based on toggle) */}
            <div className="lg:col-span-5 space-y-6">
              {useSimulation ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                      مدبر المحاكاة ومطابقة النص العربي
                    </span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowSimulateDropdown(!showSimulateDropdown)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 cursor-pointer"
                      >
                        عرض لغات وأقاويل جاهزة
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      
                      {showSimulateDropdown && (
                        <div className="absolute left-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden text-right animate-fade-in">
                          {PRESET_SPEECH_MOCKS.map((mock, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setSimulatedText(mock.text);
                                setShowSimulateDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-xs hover:bg-slate-50 text-slate-800 border-b border-slate-100 last:border-b-0 block text-right cursor-pointer"
                            >
                              <div className="font-bold text-blue-600">{mock.label}</div>
                              <div className="text-slate-500 truncate mt-0.5 font-medium">{mock.text}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">اكتب هنا نص الحاضرين باللهجة المصرية العامية:</label>
                    <textarea
                      value={simulatedText}
                      rows={4}
                      onChange={(e) => setSimulatedText(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono leading-relaxed"
                      placeholder="مثال: حضر النهاردة الأستاذ وجدي حافظ من اللجنة، ومينا سمير جاب معاه يوسف..."
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isLoading || !simulatedText}
                    onClick={handleProcessAttendance}
                    className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    تشغيل محرك المطابقة الذكي بالذكاء الاصطناعي
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6 space-y-6">
                  <span className="text-xs font-bold text-slate-850 block mb-2">المسجل والمحلل الصوتي الفعلي للاجتماع</span>
                  
                  {/* Voice Recorder Actions */}
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-150 flex flex-col items-center justify-center space-y-4">
                    {isRecording ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
                          <span className="text-sm font-mono font-bold text-red-600">{formatDuration(recordingDuration)}</span>
                        </div>
                        <p className="text-xs text-slate-550 text-center font-bold">ميكروفون المتصفح يسجل الان... اذكر أسماء الحاضرين و عائلاتهم بوضوح</p>
                        
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="mt-2 w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                        >
                          <Square className="w-5 h-5 fill-current" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <p className="text-xs text-slate-500 text-center font-semibold">اضغط على الزر للبدء في تلاوة الحاضرين عبر الميكروفون</p>
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={userRole === 'Viewer'}
                          className="w-14 h-14 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-55 text-white rounded-full flex items-center justify-center shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                        >
                          <Mic className="w-6 h-6" />
                        </button>
                        {audioUrl && (
                          <div className="pt-4 w-full flex flex-col items-center space-y-2 border-t border-slate-200/60 mt-2">
                            <span className="text-xs font-bold text-slate-650">التسجيل الجاهز الحالي:</span>
                            <audio src={audioUrl} controls className="w-full max-w-xs h-10" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Or upload audio file */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>أو رفع ملف صوتي جاهز من تليفونك/كمبيوترك:</span>
                    </div>
                    <div className="relative border border-slate-200 rounded-xl p-3.5 bg-slate-50 hover:bg-slate-100/50 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="audio/*"
                        disabled={userRole === 'Viewer'}
                        onChange={handleAudioFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex items-center gap-2 text-slate-700 justify-center">
                        <FileAudio className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold">اختر ملف صوتي (MP3, WAV, WebM)</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isLoading || !audioBlob || userRole === 'Viewer'}
                    onClick={handleProcessAttendance}
                    className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    تشغيل التحليل الصوتي الذكي (Gemini API)
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-2.5 text-red-800 animate-fade-in">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <span className="font-bold">فشل أثناء المعالجة:</span>
                    <p className="font-semibold leading-relaxed">{errorMsg}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setUseSimulation(true);
                        setErrorMsg(null);
                      }}
                      className="underline block font-bold text-red-700 mt-1 cursor-pointer"
                    >
                      التحويل لنظام المحاكاة الذكي الآمن
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Output Analysis Results Panel */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6 min-h-[350px] relative">
                {isLoading ? (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center z-10 space-y-4 rounded-2xl animate-fade-in">
                    <div className="relative flex items-center justify-center">
                      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                      <Sparkles className="w-5 h-5 text-amber-500 absolute animate-pulse" />
                    </div>
                    <div className="text-center space-y-1 px-4">
                      <h4 className="font-bold text-slate-1000 text-sm">يقوم خادم الذكاء الاصطناعي الآن بصياغة وفلترة حضور الأسر...</h4>
                      <p className="text-xs text-slate-550 font-bold">يتولى نموذج Gemini تحليل العامية المصرية ومطابقة الكنى والألقاب بدقة فائقة</p>
                    </div>
                  </div>
                ) : null}

                {candidates.length === 0 && !isLoading ? (
                  <div className="text-center py-20 flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-slate-50 rounded-full text-slate-400">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">لا نتائج محللة حالياً</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                      قم بتشغيل معالجة الحضور في القسم الأيمن ليعرض لك الذكاء الاصطناعي هنا التفريغ والـ Confidence Scores مع عينات المراجعة الموصى بها.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">التفريغ الصوتي المحلل (Transcript)</h3>
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-slate-800 text-xs font-bold leading-relaxed italic">
                        &ldquo; {transcript} &rdquo;
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                          نتائج المطابقة ومستوى الثقة (AI Confidence Scoring)
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowAddManual(!showAddManual)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          إضافة عائلة يدوياً
                        </button>
                      </div>

                      {showAddManual && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex gap-2 items-center animate-fade-in">
                          <select
                            value={manualSelectedFamilyId}
                            onChange={(e) => setManualSelectedFamilyId(e.target.value)}
                            className="bg-white border text-xs border-slate-250 text-slate-850 font-bold rounded-lg p-2 flex-1 outline-none h-9"
                          >
                            <option value="">-- اختر عائلة لإضافتها يدوياً --</option>
                            {families.map(f => (
                              <option key={f.id} value={f.id}>{f.husbandName} & {f.wifeName}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleAddManualFamily}
                            disabled={!manualSelectedFamilyId}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3  rounded-lg h-9 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            إضافة
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddManual(false)}
                            className="text-slate-550 hover:text-slate-800 p-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="space-y-3">
                        {candidates.map((cand, idx) => (
                          <div 
                            key={cand.familyId} 
                            className={`border rounded-2xl p-4 transition-all flex items-start gap-3 ${
                              cand.isSelected 
                                ? 'bg-slate-50 border-slate-200 shadow-sm' 
                                : 'bg-white border-transparent/10 opacity-70'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={cand.isSelected}
                              onChange={() => handleToggleCandidate(idx)}
                              className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500 mt-1 cursor-pointer"
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-sm">{cand.husbandName} & {cand.wifeName}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 text-[10px] font-bold">نسبة التأكيد:</span>
                                  <span className={`text-xs font-mono font-bold ${
                                    cand.confidence >= 90 ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 
                                    cand.confidence >= 70 ? 'text-amber-700 bg-amber-50 border border-amber-100' : 'text-[#EF4444] bg-red-50 border border-red-100'
                                  } px-2 py-0.5 rounded-md`}>
                                    {cand.confidence}%
                                  </span>
                                </div>
                              </div>
                              
                              <p className="text-xs text-slate-650 flex items-center gap-1 font-semibold">
                                <span className="font-bold text-slate-805">دليل السماع:</span>
                                <span>&rdquo;{cand.spokenSnippet}&ldquo;</span>
                              </p>

                              <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded-xl border border-slate-150 flex items-center justify-between mt-1.5 font-medium leading-relaxed">
                                <div>
                                  <strong className="text-slate-600 font-bold">تفسير الذكاء الاصطناعي:</strong> {cand.matchReason}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] text-slate-400 font-bold">تعديل النسبة:</span>
                                  <select
                                    value={cand.confidence}
                                    onChange={(e) => handleUpdateConfidence(idx, parseInt(e.target.value))}
                                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[10px] p-0.5 outline-none bg-white font-bold"
                                  >
                                    {[100, 95, 90, 85, 80, 75, 70, 60, 50, 40].map(v => (
                                      <option key={v} value={v}>{v}%</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-5">
                      <button
                        type="button"
                        onClick={() => {
                          setTranscript('');
                          setCandidates([]);
                        }}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer border border-transparent hover:border-slate-200"
                      >
                        إلغاء المعاينة
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmAttendanceSave}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/15 cursor-pointer animate-pulse-slow"
                      >
                        <Check className="w-4 h-4" />
                        حفظ وتأكيد حضور العائلات المحللة ({candidates.filter(c => c.isSelected).length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Enrollment Section (Add New Family with Arabic Voice) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <UserPlus className="w-5 h-5 text-blue-600" />
              إضافة وتسجيل أسرة جديدة بالصوت الحقيقي أو المحاكاة
            </h2>
            <p className="text-xs text-slate-550 mt-1">
              تلاوة اسم الزوجين، أرقام الموبايل، تاريخ الزواج (الإكليل)، العنوان، وتفاصيل الأبناء بالكامل بالصوت المصري/العربي ليصيغها الذكاء الاصطناعي تلقائياً في حقول مخصصة.
            </p>

            {/* Mode Selector for Enrollment */}
            <div className="flex items-center gap-4 mt-5 border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-slate-600">طريقة الإدخال الصوتي:</span>
              <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200/40">
                <button
                  type="button"
                  onClick={() => {
                    setUseSimulation(true);
                    setErrorMsg(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    useSimulation 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-850'
                  }`}
                >
                  محاكاة الصوت العامي (مكتوب)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseSimulation(false);
                    setErrorMsg(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !useSimulation 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-850'
                  }`}
                >
                  تسجيل ميكروفون مباشر / ملف صوتي
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left controller panel */}
            <div className="lg:col-span-5 space-y-6">
              {useSimulation ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                      جمل تلاوة البيانات الجاهزة للتدريب
                    </span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEnrollDropdown(!showEnrollDropdown)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 cursor-pointer"
                      >
                        اختر عينة كاملة للتجربة
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      
                      {showEnrollDropdown && (
                        <div className="absolute left-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden text-right animate-fade-in">
                          {ENROLL_SPEECH_MOCKS.map((mock, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setEnrollSimulatedText(mock.text);
                                setShowEnrollDropdown(false);
                              }}
                              className="w-full px-4 py-3 text-xs hover:bg-slate-50 text-slate-800 border-b border-slate-100 last:border-b-0 block text-right cursor-pointer"
                            >
                              <div className="font-bold text-blue-600 block">{mock.label}</div>
                              <div className="text-slate-400 truncate mt-1 font-medium">{mock.text}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">اكتب أو عدل صيغة تلاوة بيانات الأسرة للتجربة:</label>
                    <textarea
                      value={enrollSimulatedText}
                      rows={5}
                      onChange={(e) => setEnrollSimulatedText(e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-505 focus:ring-1 focus:ring-blue-500/20 transition-all leading-relaxed"
                      placeholder="املاء صيغة دقيقة لاسم الزوج والمدام والأولاد..."
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isLoading || !enrollSimulatedText}
                    onClick={handleProcessEnrollment}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    بدء محاكاة تفكيك البيانات وتوليد الاستمارة
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6 space-y-6">
                  <span className="text-xs font-bold text-slate-850 block mb-1">المسجل الصوتي للتسجيل بالاستمارة</span>
                  
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-150 flex flex-col items-center justify-center space-y-4">
                    {isRecording ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 bg-red-650 rounded-full animate-ping" />
                          <span className="text-sm font-mono font-bold text-red-600">{formatDuration(recordingDuration)}</span>
                        </div>
                        <p className="text-xs text-slate-550 text-center font-bold px-2 leading-relaxed">تحدث الآن بالميكروفون واذكر: اسم الزوج، اسم الزوجة، الموبايل، العنوان والاطفال بوضوح</p>
                        
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="mt-2 w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                        >
                          <Square className="w-5 h-5 fill-current" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <p className="text-xs text-slate-500 text-center font-semibold">اضغط على زر التسجيل لتبدأ في تلاوة بيانات الأسرة هاتفياً</p>
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={userRole === 'Viewer'}
                          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-55 text-white rounded-full flex items-center justify-center shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                        >
                          <Mic className="w-6 h-6" />
                        </button>
                        {audioUrl && (
                          <div className="pt-4 w-full flex flex-col items-center space-y-2 border-t border-slate-200/60 mt-2">
                            <span className="text-xs font-bold text-slate-650">الملف المسموع المسجل:</span>
                            <audio src={audioUrl} controls className="w-full max-w-xs h-10" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Upload file code */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>أو اختر تسجيل مسبق بصوت ملقن:</span>
                    </div>
                    <div className="relative border border-slate-200 rounded-xl p-3.5 bg-slate-50 hover:bg-slate-100/50 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="audio/*"
                        disabled={userRole === 'Viewer'}
                        onChange={handleAudioFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex items-center gap-2 text-slate-705 justify-center">
                        <FileAudio className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold">رصد ملف صوتي كنسي</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isLoading || !audioBlob || userRole === 'Viewer'}
                    onClick={handleProcessEnrollment}
                    className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    معالجة وتعبئة الاستمارة بالذكاء الاصطناعي (Gemini)
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-2.5 text-red-800 animate-fade-in">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-650 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <span className="font-bold">فشل التحليل الصوتي للأسرة:</span>
                    <p className="font-semibold leading-relaxed">{errorMsg}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setUseSimulation(true);
                        setErrorMsg(null);
                      }}
                      className="underline block font-bold text-red-700 mt-1 cursor-pointer"
                    >
                      التحويل لاستخدام خادم محاكاة البيانات الصوتي الآمن
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Interactive Form Output Review & Edit Panel with Arabic fields only */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6 min-h-[350px] relative">
                {isLoading && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center z-10 space-y-4 rounded-2xl animate-fade-in">
                    <div className="relative flex items-center justify-center">
                      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                      <Sparkles className="w-5 h-5 text-amber-500 absolute animate-pulse" />
                    </div>
                    <div className="text-center space-y-1 px-4">
                      <h4 className="font-bold text-slate-1000 text-sm">يقوم محرك Gemini بفصل وتعبئة حقول استمارة البيانات...</h4>
                      <p className="text-xs text-slate-500 font-bold">صياغة وتخمين بيانات الأطفال، التواريخ، أرقام الموبايل بدقة كاملة</p>
                    </div>
                  </div>
                )}

                {enrollResult === null && !isLoading ? (
                  <div className="text-center py-20 flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-slate-50 rounded-full text-slate-400">
                      <Users className="w-8 h-8 text-blue-500" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">لا توجد استمارة مصاغة في الوقت الحالي</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
                      سجل صوتك أو استخدم المحاكاة في الطرف الأيمن، وسيقوم الذكاء الاصطناعي بتعبئة استمارة التسجيل العربية لتراجعها وتعديلها يدوياً قبل تأكيد الحفظ بقاعدة البيانات.
                    </p>
                  </div>
                ) : (
                  enrollResult && (
                    <div className="space-y-6">
                      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" />
                          مراجعة وتعديل بيانات الأسرة الجديدة (Fields in Arabic)
                        </h3>
                        <span className="text-[10px] bg-blue-50 border border-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                          معاينة الاستمارة الذكية
                        </span>
                      </div>

                      {enrollTranscript && (
                        <div>
                          <label className="text-slate-500 text-[10px] font-bold block mb-1">البيانات الصوتية المسموعة:</label>
                          <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed font-semibold italic">
                            &ldquo; {enrollTranscript} &rdquo;
                          </div>
                        </div>
                      )}

                      {/* Main Family Forms fields in Arabic */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <span className="text-red-500">*</span> اسم الزوج بالكامل
                          </label>
                          <input
                            type="text"
                            value={enrollResult.husbandName}
                            onChange={(e) => handleUpdateEnrollField('husbandName', e.target.value)}
                            className="bg-white border border-slate-200 text-slate-850 font-semibold rounded-xl text-xs p-2.5 outline-none focus:border-blue-500 transition-all"
                            placeholder="مثال: فادي غالي غطاس"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <span className="text-red-500">*</span> اسم الزوجة بالكامل
                          </label>
                          <input
                            type="text"
                            value={enrollResult.wifeName}
                            onChange={(e) => handleUpdateEnrollField('wifeName', e.target.value)}
                            className="bg-white border border-slate-200 text-slate-850 font-semibold rounded-xl text-xs p-2.5 outline-none focus:border-blue-500 transition-all"
                            placeholder="مثال: مريم جرجس سمعان"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> رقم هاتف الزوج
                          </label>
                          <input
                            type="text"
                            value={enrollResult.husbandPhone}
                            onChange={(e) => handleUpdateEnrollField('husbandPhone', e.target.value)}
                            className="bg-white border border-slate-200 text-slate-800 font-semibold rounded-xl text-xs p-2.5 outline-none focus:border-blue-500 font-mono transition-all"
                            placeholder="012XXXXXXXX"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> رقم هاتف الزوجة
                          </label>
                          <input
                            type="text"
                            value={enrollResult.wifePhone}
                            onChange={(e) => handleUpdateEnrollField('wifePhone', e.target.value)}
                            className="bg-white border border-slate-200 text-slate-800 font-semibold rounded-xl text-xs p-2.5 outline-none focus:border-blue-500 font-mono transition-all"
                            placeholder="010XXXXXXXX"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> تاريخ الزواج / الإكليل
                          </label>
                          <input
                            type="date"
                            value={enrollResult.marriageDate}
                            onChange={(e) => handleUpdateEnrollField('marriageDate', e.target.value)}
                            className="bg-white border border-slate-200 text-slate-800 font-semibold rounded-xl text-xs p-2.5 outline-none focus:border-blue-500 font-mono transition-all"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> العنوان السكني للأسرة
                          </label>
                          <input
                            type="text"
                            value={enrollResult.address}
                            onChange={(e) => handleUpdateEnrollField('address', e.target.value)}
                            className="bg-white border border-slate-200 text-slate-850 font-semibold rounded-xl text-xs p-2.5 outline-none focus:border-blue-500 transition-all"
                            placeholder="مثال: شارع شبرا، القاهرة"
                          />
                        </div>

                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-700">ملاحظات العائلة الإضافية</label>
                          <input
                            type="text"
                            value={enrollResult.notes}
                            onChange={(e) => handleUpdateEnrollField('notes', e.target.value)}
                            className="bg-white border border-slate-200 text-slate-850 font-semibold rounded-xl text-xs p-2.5 outline-none focus:border-blue-500 transition-all"
                            placeholder="أي تفاصيل أو مهام أو متطلبات عن الأسرة..."
                          />
                        </div>
                      </div>

                      {/* Display children list parsed or manually added */}
                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                          <span>قائمة الأطفال والأعضاء ({enrollResult.children.length})</span>
                          <span className="text-[10px] text-slate-400 font-semibold">تأكد من إضافتهم بشكل دقيق</span>
                        </h4>

                        {enrollResult.children.length === 0 ? (
                          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-center text-xs text-slate-500 font-medium">
                            لا يوجد أطفال مضافين لهذه العائلة حالياً.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {enrollResult.children.map((child) => (
                              <div key={child.id} className="border border-slate-200 bg-slate-50/65 rounded-xl p-3 flex justify-between items-center animate-fade-in">
                                <div className="space-y-0.5">
                                  <div className="text-xs font-bold text-slate-900">{child.name}</div>
                                  <div className="text-[10px] text-slate-500 font-semibold flex gap-2">
                                    {child.birthDate ? (
                                      <span>تاريخ الميلاد: {child.birthDate} ({child.age} سنة)</span>
                                    ) : (
                                      <span>السن: {child.age} سنة</span>
                                    )}
                                    <span>•</span>
                                    <span>النوع: {child.gender || 'غير محدد'}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChildFromEnroll(child.id)}
                                  className="text-[#EF4444] hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-100 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Subform to add a child to the voice record */}
                        <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 space-y-3">
                          <label className="text-[11px] font-bold text-slate-700 block">إضافة ابن/ابنة جديدة لهذه الأسرة المكتشفة:</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                            <input
                              type="text"
                              value={custChildName}
                              onChange={(e) => setCustChildName(e.target.value)}
                              className="bg-white border border-slate-200 text-slate-850 font-semibold rounded-lg text-xs p-2 outline-none"
                              placeholder="اسم الابن/الابنة"
                            />
                            <input
                              type="date"
                              value={custChildBirthDate}
                              onChange={(e) => setCustChildBirthDate(e.target.value)}
                              className="bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg text-xs p-2 outline-none h-9 font-mono"
                              placeholder="تاريخ الميلاد"
                            />
                            <select
                              value={custChildGender}
                              onChange={(e) => setCustChildGender(e.target.value as any)}
                              className="bg-white border border-slate-200 text-slate-850 font-bold rounded-lg text-xs p-2 outline-none h-9"
                            >
                              <option value="">-- اختر النوع --</option>
                              <option value="ذكر">ذكر</option>
                              <option value="أنثى">أنثى</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddChildToEnroll}
                            disabled={!custChildName.trim()}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold py-2 px-4 transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer w-full border border-slate-300/40"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-slate-650" />
                            تأكيد إضافة الابن المؤقت للاستمارة
                          </button>
                        </div>
                      </div>

                      {/* Final Confirm and Import actions */}
                      <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            setEnrollResult(null);
                            setEnrollTranscript('');
                          }}
                          className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl cursor-pointer"
                        >
                          إلغاء المعاينة
                        </button>
                        <button
                          type="button"
                          onClick={handleCommitEnrolledFamily}
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/15 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          تأكيد واستيراد الأسرة بقاعدة البيانات الكنسية
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
