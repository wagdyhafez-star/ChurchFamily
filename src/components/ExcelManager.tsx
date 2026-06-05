/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, Check, AlertTriangle, Play, RefreshCw, FileSpreadsheet, Calendar, Users } from 'lucide-react';
import { Family } from '../types';

interface ExcelManagerProps {
  families: Family[];
  onImportCompleted: (importedFamilies: any[]) => void;
  onAttendanceImported?: (records: { date: string; attendedFamilyIds: string[]; notes: string }[]) => Promise<void>;
  userRole: string;
}

function parseChildrenString(str: string): { id: string; name: string; age: number; birthDate?: string; gender?: 'ذكر' | 'أنثى' | '' }[] {
  if (!str) return [];
  const parts = str.split(/[،,;؛]/);
  const kids: { id: string; name: string; age: number; birthDate?: string; gender?: 'ذكر' | 'أنثى' | '' }[] = [];
  
  parts.forEach((part, i) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    
    let name = trimmed;
    let birthDate: string | undefined = undefined;
    let age = 0;
    let gender: 'ذكر' | 'أنثى' | '' = '';
    
    const parenMatch = trimmed.match(/^([^(]+)\(([^)]+)\)/);
    if (parenMatch) {
      name = parenMatch[1].trim();
      const content = parenMatch[2].trim();
      
      const dateMatch = content.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/) || content.match(/\b(\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/);
      if (dateMatch) {
        let rawDate = dateMatch[1].replace(/\//g, '-');
        const dParts = rawDate.split('-');
        if (dParts[0].length <= 2 && dParts[2].length === 4) {
          rawDate = `${dParts[2]}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`;
        }
        birthDate = rawDate;
        
        const today = new Date();
        const bDate = new Date(birthDate);
        let calculatedAge = today.getFullYear() - bDate.getFullYear();
        const m = today.getMonth() - bDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
          calculatedAge--;
        }
        age = isNaN(calculatedAge) || calculatedAge < 0 ? 0 : calculatedAge;
      }
      
      if (!birthDate) {
        const ageMatch = content.match(/\b(\d+)\b/);
        if (ageMatch) {
          age = parseInt(ageMatch[1], 10);
        }
      }
      
      if (content.includes('ذكر') || content.includes('ولد') || content.includes('ابن')) {
        gender = 'ذكر';
      } else if (content.includes('أنثى') || content.includes('بنت') || content.includes('ابنة')) {
        gender = 'أنثى';
      }
    } else {
      const numberMatches = trimmed.match(/\b(\d+)\b/);
      if (numberMatches) {
        age = parseInt(numberMatches[1], 10);
        name = trimmed.replace(/\b\d+\b/g, '').replace(/(?:سنة|سنوات|سنين|سنه|سلوات|عام|أعوام)/g, '').trim();
      }
    }
    
    if (name) {
      kids.push({
        id: `kid_imported_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        name,
        age,
        birthDate,
        gender: gender || undefined
      });
    }
  });
  
  return kids;
}

function normalizeDateString(dateStr: any): string {
  if (!dateStr) return '';
  if (dateStr instanceof Date) {
    return dateStr.toISOString().split('T')[0];
  }
  const str = dateStr.toString().trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }
  return str;
}

function calculateAgeFromBirthDate(birthDateStr?: string): number {
  if (!birthDateStr) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateStr);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return isNaN(age) || age < 0 ? 0 : age;
}

export default function ExcelManager({ families, onImportCompleted, onAttendanceImported, userRole }: ExcelManagerProps) {
  const [activeTab, setActiveTab] = useState<'families' | 'attendance'>('families');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columnsMap, setColumnsMap] = useState<Record<string, string>>({});
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [mappingRequired, setMappingRequired] = useState(false);
  const [importStep, setImportStep] = useState<'idle' | 'mapping' | 'preview' | 'success'>('idle');
  const [attendancePreview, setAttendancePreview] = useState<any[]>([]);
  const [unmatchedNames, setUnmatchedNames] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const REQUIRED_FIELDS_AR = {
    husbandName: 'اسم الزوج بالكامل',
    husbandJob: 'وظيفة الزوج (اختياري)',
    husbandBirthDate: 'تاريخ ميلاد الزوج (اختياري)',
    wifeName: 'اسم الزوجة بالكامل',
    wifeJob: 'وظيفة الزوجة (اختياري)',
    wifeBirthDate: 'تاريخ ميلاد الزوجة (اختياري)',
    husbandPhone: 'رقم هاتف الزوج',
    wifePhone: 'رقم هاتف الزوجة',
    address: 'العنوان السكني',
    marriageDate: 'تاريخ الإكليل / الزواج',
    firstChildName: 'اسم الابن الأول (اختياري)',
    firstChildBirthDate: 'تاريخ ميلاد الابن الأول (اختياري)',
    secondChildName: 'اسم الابن الثاني (اختياري)',
    secondChildBirthDate: 'تاريخ ميلاد الابن الثاني (اختياري)',
    childrenString: 'الأبناء وبياناتهم (قراءة بديلة صيغة نصية)',
    notes: 'ملاحظات'
  };

  const REQUIRED_ATTENDANCE_FIELDS_AR = {
    date: 'تاريخ الاجتماع (السنة-الشهر-اليوم)',
    husbandName: 'اسم الزوج بالكامل',
    notes: 'ملاحظات الاجتماع (اختياري)'
  };

  const handleTabChange = (tab: 'families' | 'attendance') => {
    setActiveTab(tab);
    setPreviewData([]);
    setColumnsMap({});
    setRawHeaders([]);
    setDuplicates([]);
    setSuccessCount(0);
    setMappingRequired(false);
    setImportStep('idle');
    setAttendancePreview([]);
    setUnmatchedNames([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Convert uploaded excel to raw JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Parse raw headers and payload
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rawJson.length === 0) {
          alert('الملف فارغ، يرجى اختيار ملف يحتوي على بيانات.');
          return;
        }

        const headers = (rawJson[0] as string[]).map(h => h?.toString().trim() || '');
        setRawHeaders(headers);

        const dataRows = rawJson.slice(1).map((row: any[]) => {
          const obj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            if (h) obj[h] = row[idx];
          });
          return obj;
        });

        // Smart Mapping Guess
        const mapping: Record<string, string> = {};
        if (activeTab === 'families') {
          headers.forEach(h => {
            const lowerH = h.toLowerCase();
            if (lowerH.includes('زوج') && !lowerH.includes('زوجة') && !lowerH.includes('امرأة')) {
              if (lowerH.includes('هاتف') || lowerH.includes('تليفون') || lowerH.includes('رقم')) {
                mapping['husbandPhone'] = h;
              } else if (lowerH.includes('عمل') || lowerH.includes('وظيفة') || lowerH.includes('مهنة')) {
                mapping['husbandJob'] = h;
              } else if (lowerH.includes('ميلاد') || lowerH.includes('سن')) {
                mapping['husbandBirthDate'] = h;
              } else {
                mapping['husbandName'] = h;
              }
            } else if (lowerH.includes('زوجة')) {
              if (lowerH.includes('هاتف') || lowerH.includes('تليفون') || lowerH.includes('رقم')) {
                mapping['wifePhone'] = h;
              } else if (lowerH.includes('عمل') || lowerH.includes('وظيفة') || lowerH.includes('مهنة')) {
                mapping['wifeJob'] = h;
              } else if (lowerH.includes('ميلاد') || lowerH.includes('سن')) {
                mapping['wifeBirthDate'] = h;
              } else {
                mapping['wifeName'] = h;
              }
            } else if (lowerH.includes('عنوان') || lowerH.includes('سكن')) {
              mapping['address'] = h;
            } else if (lowerH.includes('زواج') || lowerH.includes('اكليل') || lowerH.includes('إكليل')) {
              mapping['marriageDate'] = h;
            } else if (lowerH.includes('ملاحظة') || lowerH.includes('ملاحظات')) {
              mapping['notes'] = h;
            } else if (lowerH.includes('ابن') || lowerH.includes('طفل') || lowerH.includes('ولد') || lowerH.includes('بنت') || lowerH.includes('أبناء') || lowerH.includes('ابناء')) {
              if (lowerH.includes('أول') || lowerH.includes('اول') || lowerH.includes('1') || lowerH.includes('١')) {
                if (lowerH.includes('ميلاد') || lowerH.includes('تاريخ')) {
                  mapping['firstChildBirthDate'] = h;
                } else {
                  mapping['firstChildName'] = h;
                }
              } else if (lowerH.includes('ثان') || lowerH.includes('2') || lowerH.includes('٢')) {
                if (lowerH.includes('ميلاد') || lowerH.includes('تاريخ')) {
                  mapping['secondChildBirthDate'] = h;
                } else {
                  mapping['secondChildName'] = h;
                }
              } else {
                mapping['childrenString'] = h;
              }
            }
          });
        } else {
          headers.forEach(h => {
            const lowerH = h.toLowerCase();
            if (lowerH.includes('تاريخ') || lowerH.includes('يوم') || lowerH.includes('date') || lowerH.includes('time')) {
              mapping['date'] = h;
            } else if (lowerH.includes('اسم') || lowerH.includes('زوج') || lowerH.includes('عائلة') || lowerH.includes('المعرف') || lowerH.includes('name')) {
              mapping['husbandName'] = h;
            } else if (lowerH.includes('ملاحظة') || lowerH.includes('ملاحظات') || lowerH.includes('notes') || lowerH.includes('تفاصيل')) {
              mapping['notes'] = h;
            }
          });
        }

        setColumnsMap(mapping);
        setPreviewData(dataRows);
        setMappingRequired(true);
        setImportStep('mapping');
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء قراءة ملف الاكسيل. يرجى التأكد من توافق صيغة الملف.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleApplyMapping = () => {
    if (activeTab === 'families') {
      // Process mappings and convert rows to structured forms
      const validated: any[] = [];
      const dupMap: any[] = [];

      previewData.forEach((row, idx) => {
        const husbandName = row[columnsMap['husbandName'] || '']?.toString().trim() || '';
        const wifeName = row[columnsMap['wifeName'] || '']?.toString().trim() || '';
        const husbandPhone = row[columnsMap['husbandPhone'] || '']?.toString().trim() || '';
        const wifePhone = row[columnsMap['wifePhone'] || '']?.toString().trim() || '';
        const address = row[columnsMap['address'] || '']?.toString().trim() || 'غير محدد';
        const rawDate = row[columnsMap['marriageDate'] || ''];
        
        const marriageDate = normalizeDateString(rawDate) || '2015-01-01';
        
        const husbandJob = row[columnsMap['husbandJob'] || '']?.toString().trim() || '';
        const wifeJob = row[columnsMap['wifeJob'] || '']?.toString().trim() || '';
        const husbandBirthDate = normalizeDateString(row[columnsMap['husbandBirthDate'] || '']);
        const wifeBirthDate = normalizeDateString(row[columnsMap['wifeBirthDate'] || '']);
        
        const parsedChildren: any[] = [];
        
        const firstChildName = row[columnsMap['firstChildName'] || '']?.toString().trim() || '';
        const firstChildBirthDateRaw = row[columnsMap['firstChildBirthDate'] || ''];
        const firstChildBirthDate = normalizeDateString(firstChildBirthDateRaw);
        
        if (firstChildName) {
          parsedChildren.push({
            id: `kid_imported_${Date.now()}_0_${idx}_${Math.random().toString(36).substring(2, 6)}`,
            name: firstChildName,
            birthDate: firstChildBirthDate || undefined,
            age: firstChildBirthDate ? calculateAgeFromBirthDate(firstChildBirthDate) : 0,
            gender: ''
          });
        }
        
        const secondChildName = row[columnsMap['secondChildName'] || '']?.toString().trim() || '';
        const secondChildBirthDateRaw = row[columnsMap['secondChildBirthDate'] || ''];
        const secondChildBirthDate = normalizeDateString(secondChildBirthDateRaw);
        
        if (secondChildName) {
          parsedChildren.push({
            id: `kid_imported_${Date.now()}_1_${idx}_${Math.random().toString(36).substring(2, 6)}`,
            name: secondChildName,
            birthDate: secondChildBirthDate || undefined,
            age: secondChildBirthDate ? calculateAgeFromBirthDate(secondChildBirthDate) : 0,
            gender: ''
          });
        }

        const childrenString = row[columnsMap['childrenString'] || '']?.toString().trim() || '';
        if (childrenString && parsedChildren.length === 0) {
          const parsed = parseChildrenString(childrenString);
          parsedChildren.push(...parsed);
        }

        const notes = row[columnsMap['notes'] || '']?.toString().trim() || '';

        if (!husbandName || !wifeName) {
          return; // Ignore empty rows
        }

        // Check if duplicate exists in currently loaded database
        const isDuplicate = families.some(
          f => (f.husbandName === husbandName && f.wifeName === wifeName) || 
               (husbandPhone && f.husbandPhone === husbandPhone)
        );

        const parsedFamily = {
          husbandName,
          wifeName,
          husbandPhone,
          wifePhone,
          address,
          marriageDate,
          husbandJob: husbandJob || undefined,
          wifeJob: wifeJob || undefined,
          husbandBirthDate: husbandBirthDate || undefined,
          wifeBirthDate: wifeBirthDate || undefined,
          notes,
          children: parsedChildren,
          isDuplicate
        };

        if (isDuplicate) {
          dupMap.push({ index: idx + 2, ...parsedFamily });
        } else {
          validated.push(parsedFamily);
        }
      });

      setDuplicates(dupMap);
      setSuccessCount(validated.length);
      setPreviewData(validated);
      setImportStep('preview');
    } else {
      // Parsing attendance
      const parsedRows: { date: string; husbandName: string; notes: string; rowIndex: number }[] = [];
      
      previewData.forEach((row, idx) => {
        const rawDate = row[columnsMap['date'] || ''];
        let recordDate = '';
        if (rawDate instanceof Date) {
          recordDate = rawDate.toISOString().split('T')[0];
        } else if (rawDate) {
          recordDate = rawDate.toString().trim();
        }

        const husbandName = row[columnsMap['husbandName'] || '']?.toString().trim() || '';
        const notes = row[columnsMap['notes'] || '']?.toString().trim() || 'حضور كنسي مستورد';

        if (!husbandName || !recordDate) {
          return; // Skip empty rows
        }

        // Normalize Date slash formats (e.g. 15/05/2026 -> 2026-05-15)
        let normalizedDate = recordDate;
        if (recordDate.includes('/')) {
          const parts = recordDate.split('/');
          if (parts.length === 3) {
            if (parts[2].length === 4) {
              normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (parts[0].length === 4) {
              normalizedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
          }
        }

        parsedRows.push({
          date: normalizedDate,
          husbandName,
          notes,
          rowIndex: idx + 2
        });
      });

      // Match names to our database
      const groupRecords: Record<string, { attendedFamilyIds: string[]; notes: string; husbandNames: string[] }> = {};
      const unmatched: { date: string; row: number; name: string }[] = [];
      let totalSuccessMatches = 0;

      parsedRows.forEach(row => {
        // Find matched family by husband name smart sub-match
        const matchedFam = families.find(f => {
          const nameA = f.husbandName.toLowerCase().replace(/\s+/g, '');
          const nameB = row.husbandName.toLowerCase().replace(/\s+/g, '');
          return nameA.includes(nameB) || nameB.includes(nameA);
        });

        if (matchedFam) {
          totalSuccessMatches++;
          if (!groupRecords[row.date]) {
            groupRecords[row.date] = {
              attendedFamilyIds: [],
              notes: row.notes,
              husbandNames: []
            };
          }
          if (!groupRecords[row.date].attendedFamilyIds.includes(matchedFam.id)) {
            groupRecords[row.date].attendedFamilyIds.push(matchedFam.id);
            groupRecords[row.date].husbandNames.push(matchedFam.husbandName);
          }
        } else {
          unmatched.push({
            date: row.date,
            row: row.rowIndex,
            name: row.husbandName
          });
        }
      });

      const finalRecordsList = Object.entries(groupRecords).map(([date, data]) => ({
        date,
        attendedFamilyIds: data.attendedFamilyIds,
        notes: data.notes,
        husbandNames: data.husbandNames,
        matchedCount: data.attendedFamilyIds.length
      }));

      setAttendancePreview(finalRecordsList);
      setUnmatchedNames(unmatched);
      setSuccessCount(totalSuccessMatches);
      setImportStep('preview');
    }
  };

  const handleConfirmImport = async () => {
    if (activeTab === 'families') {
      onImportCompleted(previewData);
      setImportStep('success');
    } else {
      if (onAttendanceImported && attendancePreview.length > 0) {
        await onAttendanceImported(attendancePreview);
        setImportStep('success');
      }
    }
  };

  const triggerExport = () => {
    // Create Excel worksheet
    const dataToExport = families.map(f => ({
      'اسم الزوج بالكامل': f.husbandName,
      'رقم هاتف الزوج': f.husbandPhone,
      'تاريخ ميلاد الزوج': f.husbandBirthDate || 'غير مسجل',
      'وظيفة الزوج': f.husbandJob || 'غير مسجل',
      'اسم الزوجة بالكامل': f.wifeName,
      'رقم هاتف الزوجة': f.wifePhone,
      'تاريخ ميلاد الزوجة': f.wifeBirthDate || 'غير مسجل',
      'وظيفة الزوجة': f.wifeJob || 'غير مسجل',
      'تاريخ الإكليل': f.marriageDate,
      'العنوان السكني': f.address,
      'ملاحظات الخدمة': f.notes,
      'عدد الأبناء وبيناتهم': f.children.map(c => `${c.name} (${c.birthDate ? `${c.birthDate} - ` : ''}${c.age} سنة)`).join(' ، ')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قاعدة العائلات');

    XLSX.writeFile(wb, `اجتماع_العائلات_قاعدة_البيانات_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadSampleTemplate = () => {
    if (activeTab === 'families') {
      const wsData = [
        ['اسم الزوج بالكامل', 'وظيفة الزوج', 'تاريخ ميلاد الزوج', 'اسم الزوجة بالكامل', 'وظيفة الزوجة', 'تاريخ ميلاد الزوجة', 'رقم هاتف الزوج', 'رقم هاتف الزوجة', 'العنوان السكني', 'تاريخ الإكليل / الزواج', 'اسم الابن الأول', 'تاريخ ميلاد الابن الأول', 'اسم الابن الثاني', 'تاريخ ميلاد الابن الثاني', 'ملاحظات'],
        ['مينا سمير جرجس', 'مهندس برمجيات', '1988-10-15', 'ماري جرجس فايز', 'طبيبة أطفال', '1991-04-20', '01234567890', '01012345678', 'شبرا، القاهرة', '2015-11-23', 'شنودة مينا', '2016-08-12', 'مارينا مينا', '2019-11-05', 'يحتاج افتقاد مستمر'],
        ['تامر نبيل حنا', 'محاسب', '1985-03-12', 'سارة يوسف زكي', 'ربة منزل', '1989-07-25', '01111222333', '01511223344', 'مصر الجديدة، القاهرة', '2018-05-15', 'كيرلس تامر', '2020-01-10', '', '', 'غائب منذ فترة']
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'نموذج الاستيراد');
      XLSX.writeFile(wb, 'نموذج_استيراد_اجتماع_العائلات.xlsx');
    } else {
      const wsData = [
        ['تاريخ الاجتماع', 'اسم الزوج بالكامل', 'ملاحظات الاجتماع (اختياري)'],
        ['2026-05-15', 'مينا سمير', 'اجتماع العائلات الدوري'],
        ['2026-05-15', 'وجدي حافظ', 'اجتماع العائلات الدوري'],
        ['2026-05-22', 'وجدي حافظ', 'دراسة كتاب مقدس - سفر أعمال الرسل'],
        ['2026-05-22', 'تامر نبيل', 'دراسة كتاب مقدس - سفر أعمال الرسل']
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'نموذج حضور وغياب');
      XLSX.writeFile(wb, 'نموذج_حضور_وفيات_اجتماع_الأسرة.xlsx');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm p-6" dir="rtl" id="excel_manager_card">
      {/* Header Grid */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-stone-100 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-stone-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            استيراد وتصدير قاعدة البيانات والأنشطة (Excel)
          </h2>
          <p className="text-sm text-stone-500 mt-1">تسهيل نقل البيانات التأسيسية وسجلات حضور الأسرة من ملفات Excel بمرونة ومطابقة ذكية للمسميات</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <button 
            type="button"
            onClick={downloadSampleTemplate} 
            className="px-3 py-1.5 text-xs text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors rounded-lg font-medium flex items-center gap-1.5 cursor-pointer"
          >
            تحميل نموذج الاستيراد
          </button>
          {activeTab === 'families' && (
            <button 
              type="button"
              onClick={triggerExport} 
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm shadow-amber-600/10 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              تصدير قاعدة البيانات الحالية
            </button>
          )}
        </div>
      </div>

      {/* Tabs Selector Row */}
      <div className="flex border-b border-stone-150 mb-6 gap-6 text-sm">
        <button
          type="button"
          onClick={() => handleTabChange('families')}
          className={`pb-2.5 font-bold transition-all relative cursor-pointer ${
            activeTab === 'families' 
              ? 'text-amber-700 font-extrabold border-b-2 border-amber-605' 
              : 'text-stone-500 hover:text-stone-850'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            ١. استيراد وتأسيس العائلات
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('attendance')}
          className={`pb-2.5 font-bold transition-all relative cursor-pointer ${
            activeTab === 'attendance' 
              ? 'text-amber-700 font-extrabold border-b-2 border-amber-300' 
              : 'text-stone-500 hover:text-stone-850'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            ٢. استيراد حضور آخر اجتماعين (برسومات بيانية)
          </span>
        </button>
      </div>

      {userRole === 'Viewer' ? (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-lg p-4 text-sm font-medium animate-fade-in">
          عذراً، بصفتك مستخدم مشاهد فقط (Viewer)، لا يُسمح لك باستيراد ملفات جديدة أو التعديل في قاعدة البيانات. يمكنك فقط تنزيل وتصدير البيانات الحالية لتسهيل الافتقاد والتقارير.
        </div>
      ) : (
        <div className="space-y-6">
          {importStep === 'idle' && (
            <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center bg-stone-50/50 hover:bg-stone-50 hover:border-amber-400 transition-all cursor-pointer relative" id="drop_zone_excel">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center">
                <div className="p-3 bg-amber-100 rounded-full text-amber-600 mb-3 bg-opacity-70">
                  <Upload className="w-6 h-6 text-amber-700 animate-bounce" />
                </div>
                <h3 className="font-semibold text-stone-800 text-base">
                  {activeTab === 'families' ? 'قم بجر وإفلات ملف عائلات Excel هنا' : 'قم بجر وإفلات ملف حضور Excel هنا'}
                </h3>
                <p className="text-stone-500 text-xs mt-1">أو انقر لتصفح الملفات من جهازك (الملفات المدعومة .xlsx , .xls)</p>
              </div>
            </div>
          )}

          {importStep === 'mapping' && (
            <div className="bg-stone-50 rounded-xl p-5 border border-stone-200/60 animate-fade-in" id="smart_mappings_pane">
              <div className="flex items-center gap-2 text-stone-800 font-semibold mb-4">
                <RefreshCw className="w-5 h-5 text-amber-600 animate-spin-slow" />
                <span>ربط ومطابقة الأعمدة الذكية المكتشفة بالسجلات</span>
              </div>
              <p className="text-xs text-stone-605 mb-4 bg-white p-3 rounded-lg border border-stone-150 font-medium">
                لقد طابق النظام بعض الأعمدة التلقائية في ملفك. يرجى مراجعة وتعديل توجيه كل حقل من قاعدة البيانات بالعمود المناسب من ملف Excel الخاص بك لضمان صحة النقل.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTab === 'families' ? (
                  Object.entries(REQUIRED_FIELDS_AR).map(([fieldKey, labelText]) => (
                    <div key={fieldKey} className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-stone-700">{labelText}</label>
                      <select
                        value={columnsMap[fieldKey] || ''}
                        onChange={(e) => setColumnsMap({ ...columnsMap, [fieldKey]: e.target.value })}
                        className="bg-white border border-stone-200 text-stone-850 rounded-lg text-sm p-2 outline-none focus:border-amber-500 h-10 font-medium"
                      >
                        <option value="">-- تخطي أو غير متوفر --</option>
                        {rawHeaders.map((headerText, index) => (
                          <option key={index} value={headerText}>{headerText}</option>
                        ))}
                      </select>
                    </div>
                  ))
                ) : (
                  Object.entries(REQUIRED_ATTENDANCE_FIELDS_AR).map(([fieldKey, labelText]) => (
                    <div key={fieldKey} className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-stone-700">{labelText}</label>
                      <select
                        value={columnsMap[fieldKey] || ''}
                        onChange={(e) => setColumnsMap({ ...columnsMap, [fieldKey]: e.target.value })}
                        className="bg-white border border-stone-200 text-stone-850 rounded-lg text-sm p-2 outline-none focus:border-amber-500 h-10 font-medium"
                      >
                        <option value="">-- تخطي أو غير متوفر --</option>
                        {rawHeaders.map((headerText, index) => (
                          <option key={index} value={headerText}>{headerText}</option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setImportStep('idle')}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-lg text-sm transition-colors cursor-pointer font-bold"
                >
                  إلغاء الملف
                </button>
                <button
                  type="button"
                  onClick={handleApplyMapping}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer font-bold"
                >
                  <Play className="w-4 h-4" />
                  مراجعة وتحليل البيانات المنسقة
                </button>
              </div>
            </div>
          )}

          {importStep === 'preview' && activeTab === 'families' && (
            <div className="space-y-6 animate-fade-in" id="preview_families_pane">
              <div className="p-4 bg-amber-55/10 border border-amber-100 rounded-xl flex items-start gap-3 bg-amber-50">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-stone-850 text-sm">تم فحص وتشخيص البيانات الجاهزة للاستيراد</h4>
                  <p className="text-stone-600 text-xs mt-1">
                    عدد العائات الصالحة وجاهزة للتأسيس: <strong className="text-stone-900 text-sm">{successCount}</strong> عائلة.
                    {duplicates.length > 0 && (
                      <span className="text-amber-800 font-medium font-bold"> (تم رصد وتخطي عدد {duplicates.length} عائلة مكررة أو مسجلة مسبقاً)</span>
                    )}
                  </p>
                </div>
              </div>

              {previewData.length > 0 ? (
                <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-stone-50 border-b border-stone-200 px-4 py-3">
                    <h5 className="font-semibold text-stone-800 text-xs">معاينة البيانات قبل حفظها نهائياً لضمان عدم ازدواج السجل</h5>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs text-stone-700 border-collapse">
                      <thead>
                        <tr className="bg-stone-100/50 border-b border-stone-200 text-stone-700 font-semibold uppercase">
                          <th className="px-4 py-2">رقم</th>
                          <th className="px-4 py-2">اسم الزوج بالكامل</th>
                          <th className="px-4 py-2">اسم الزوجة بالكامل</th>
                          <th className="px-4 py-2">هاتف الزوج</th>
                          <th className="px-4 py-2">العنوان السكني</th>
                          <th className="px-4 py-2">تاريخ الزواج</th>
                          <th className="px-4 py-2">الوظائف (الزوج / الزوجة)</th>
                          <th className="px-4 py-2">تواريخ الميلاد</th>
                          <th className="px-4 py-2">الأبناء المكتشفون</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((fam, index) => (
                          <tr key={index} className="border-b border-stone-100 hover:bg-stone-50/50">
                            <td className="px-4 py-2 text-stone-500 font-mono">{index + 1}</td>
                            <td className="px-4 py-2 font-medium text-stone-905">{fam.husbandName}</td>
                            <td className="px-4 py-2 font-medium text-stone-905">{fam.wifeName}</td>
                            <td className="px-4 py-2 text-stone-605 font-mono">{fam.husbandPhone || '-'}</td>
                            <td className="px-4 py-2 text-stone-600 max-w-xs truncate">{fam.address}</td>
                            <td className="px-4 py-2 font-mono text-stone-600">{fam.marriageDate}</td>
                            <td className="px-4 py-2 text-stone-600">
                              {fam.husbandJob || '-'} / {fam.wifeJob || '-'}
                            </td>
                            <td className="px-4 py-2 text-stone-500 font-mono">
                              {fam.husbandBirthDate || '-'} / {fam.wifeBirthDate || '-'}
                            </td>
                            <td className="px-4 py-2 text-stone-650 max-w-xs truncate font-medium" title={fam.children?.map((c: any) => `${c.name} (${c.birthDate ? `${c.birthDate} - ` : ''}${c.age} سنة)`).join(' ، ')}>
                              {fam.children && fam.children.length > 0 
                                ? fam.children.map((c: any) => `${c.name} (${c.age} سنة)`).join(' ، ')
                                : 'لا يوجد'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-stone-100 rounded-xl bg-stone-50/20">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-stone-600 text-xs font-semibold">لا توجد بيانات صالحة للاستيراد في هذا الملف (جميع البيانات المسجلة بالملف مكررة بالفعل).</p>
                </div>
              )}

              {duplicates.length > 0 && (
                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100">
                  <h6 className="text-xs font-semibold text-amber-900 flex items-center gap-1 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                    تنبيه: العائلات المكررة المكتشفة بالملف (تم تصفيتها وتخطيها تلقائياً لحماية قاعدة البيانات):
                  </h6>
                  <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                    {duplicates.slice(0, 5).map((dup, idx) => (
                      <li key={idx}>السطر {dup.index}: {dup.husbandName} وباسم {dup.wifeName} {dup.husbandPhone ? `(هاتف: ${dup.husbandPhone})` : ''}</li>
                    ))}
                    {duplicates.length > 5 && <li>... وعائلة أخرى مكررة متطابقة مع المسجلين في النظام.</li>}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setImportStep('mapping')}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-lg text-sm transition-colors cursor-pointer font-bold"
                >
                  السابق / تغيير الربط
                </button>
                <button
                  type="button"
                  disabled={previewData.length === 0}
                  onClick={handleConfirmImport}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer font-bold"
                >
                  <Check className="w-4 h-4" />
                  اعتماد وحفظ العائلات الجديدة ({previewData.length})
                </button>
              </div>
            </div>
          )}

          {importStep === 'preview' && activeTab === 'attendance' && (
            <div className="space-y-6 animate-fade-in" id="preview_attendance_pane">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-stone-850">
                <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-stone-900 text-sm">تم فحص وتحليل الحضور والغياب التراكمي في الملف</h4>
                  <p className="text-stone-600 text-xs mt-1">
                    عدد العائلات التي تم مطابقتها واثبات حضورها بنجاح: <strong className="text-emerald-700 text-sm">{successCount}</strong> حضور.
                  </p>
                </div>
              </div>

              {attendancePreview.length > 0 ? (
                <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-stone-50 border-b border-stone-200 px-4 py-3">
                    <h5 className="font-bold text-stone-800 text-xs">معاينة التواريخ المكتشفة وتوزيع الحضور التراكمي عليها</h5>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs text-stone-700 border-collapse">
                      <thead>
                        <tr className="bg-stone-100/50 border-b border-stone-200 text-stone-700 font-semibold uppercase">
                          <th className="px-4 py-2">تاريخ الاجتماع</th>
                          <th className="px-4 py-2">عدد العائلات الحاضرة بالملف</th>
                          <th className="px-4 py-2">ملاحظات الاجتماع المضافة</th>
                          <th className="px-4 py-2">قائمة بأسماء الأزواج الحاضرين المطابقين بالنظام</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendancePreview.map((rec, index) => (
                          <tr key={index} className="border-b border-stone-100 hover:bg-stone-50/50">
                            <td className="px-4 py-2 font-bold text-amber-700 font-mono">{rec.date}</td>
                            <td className="px-4 py-2 font-bold text-stone-900">{rec.matchedCount} عائلات</td>
                            <td className="px-4 py-2 text-stone-500 font-sans">{rec.notes}</td>
                            <td className="px-4 py-2 text-stone-600 max-w-sm font-sans truncate" title={rec.husbandNames.join(', ')}>
                              {rec.husbandNames.join(', ') || 'لا يوجد عائلات مطابقة'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-stone-100 rounded-xl bg-stone-50/20">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-stone-600 text-xs font-semibold">لم نتمكن من مطابقة أي تاريخ أو حضور بالملف مع قاعدة البيانات.</p>
                </div>
              )}

              {unmatchedNames.length > 0 && (
                <div className="bg-red-50/45 p-4 rounded-xl border border-red-100">
                  <h6 className="text-xs font-bold text-red-900 flex items-center gap-1 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-650" />
                    تحديث: عائلات لم يستطع النظام إيجادها (يرجى التأكد من تطابق الاسم مع قاعدة بيانات الأسر):
                  </h6>
                  <p className="text-[10px] text-red-700 mb-2 font-medium">الأسماء غير المطابقة لن يتم تسجيل حضورها تلقائياً إلا بعد تعديل أسمائها في ملف Excel لتطابق الأسماء المسجلة بالنظام بدقة.</p>
                  <div className="max-h-[140px] overflow-y-auto space-y-1">
                    <ul className="text-xs text-red-800 space-y-1 list-disc list-inside leading-relaxed font-semibold">
                      {unmatchedNames.map((unm, idx) => (
                        <li key={idx}>السطر {unm.row}: الاسم &ldquo;<span className="text-red-950 font-black underline">{unm.name}</span>&rdquo; (التاريخ: {unm.date})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setImportStep('mapping')}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-lg text-sm transition-colors cursor-pointer font-bold"
                >
                  السابق / تغيير الإسناد
                </button>
                <button
                  type="button"
                  disabled={attendancePreview.length === 0}
                  onClick={handleConfirmImport}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer font-bold"
                >
                  <Check className="w-4 h-4" />
                  تأكيد واستيراد الحضور بالكامل ({successCount})
                </button>
              </div>
            </div>
          )}

          {importStep === 'success' && (
            <div className="bg-green-50/50 border border-green-100 p-8 rounded-xl text-center space-y-3 animate-fade-in" id="import_success_pane">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-stone-900 text-base">
                {activeTab === 'families' ? 'تم استيراد العائلات ودمج قاعدة البيانات بنجاح!' : 'تم دمج حضور آخر أسبوعين وتوزيع البيانات التاريخية بنجاح!'}
              </h3>
              <p className="text-stone-605 text-sm max-w-md mx-auto leading-relaxed">
                {activeTab === 'families'
                  ? 'تم استيراد العائلات الصالحة بنجاح إلى قاعدة بيانات الاجتماع، وأصبحت متاحة الآن للافتقاد وتتبع حضور وغياب الاجتماعات.'
                  : 'تم استيراد الحضور الفعلي لجميع التواريخ المكتشفة بالملف، وتمت مزامنة المخططات البيانية والإحصائيات التراكمية بنجاح.'}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleTabChange(activeTab)}
                  className="px-4 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  استيراد ملف إضافي
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
