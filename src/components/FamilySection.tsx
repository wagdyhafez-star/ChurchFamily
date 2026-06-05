/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, Search, X, Check, Eye, Users, Phone, MapPin, Calendar, Heart, FileText, Gift, PlusCircle, MinusCircle, UserPlus, Image, Briefcase
} from 'lucide-react';
import { Family, Child } from '../types';

interface FamilySectionProps {
  families: Family[];
  onAddFamily: (family: Omit<Family, 'id' | 'createdAt'>) => Promise<boolean>;
  onEditFamily: (id: string, family: Partial<Family>) => Promise<boolean>;
  onDeleteFamily: (id: string) => Promise<boolean>;
  userRole: string;
}

export default function FamilySection({ families, onAddFamily, onEditFamily, onDeleteFamily, userRole }: FamilySectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [deleteConfirmFamily, setDeleteConfirmFamily] = useState<{ id: string; name: string } | null>(null);
  
  // Modals / Forms state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields
  const [husbandName, setHusbandName] = useState('');
  const [wifeName, setWifeName] = useState('');
  const [husbandPhone, setHusbandPhone] = useState('');
  const [wifePhone, setWifePhone] = useState('');
  const [address, setAddress] = useState('');
  const [marriageDate, setMarriageDate] = useState('2015-01-01');
  const [husbandBirthDate, setHusbandBirthDate] = useState('');
  const [wifeBirthDate, setWifeBirthDate] = useState('');
  const [husbandJob, setHusbandJob] = useState('');
  const [wifeJob, setWifeJob] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('من فضلك اختر ملف صورة كنسية صالح (PNG, JPG, JPEG)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  // Child temporary values in form
  const [newKidName, setNewKidName] = useState('');
  const [newKidAge, setNewKidAge] = useState('');
  const [newKidBirth, setNewKidBirth] = useState('');
  const [newKidGender, setNewKidGender] = useState<'ذكر' | 'أنثى' | ''>('');

  // Filtered list
  const filteredFamilies = families.filter(fam => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;

    // Search by husband, wife, children name, phone number
    const kidsMatch = fam.children?.some(c => c.name.toLowerCase().includes(q)) || false;
    return (
      fam.husbandName.toLowerCase().includes(q) ||
      fam.wifeName.toLowerCase().includes(q) ||
      fam.husbandPhone.includes(q) ||
      fam.wifePhone.includes(q) ||
      fam.address.toLowerCase().includes(q) ||
      kidsMatch
    );
  });

  const openAddForm = () => {
    setEditId(null);
    setHusbandName('');
    setWifeName('');
    setHusbandPhone('');
    setWifePhone('');
    setAddress('');
    setMarriageDate('2015-01-01');
    setHusbandBirthDate('');
    setWifeBirthDate('');
    setHusbandJob('');
    setWifeJob('');
    setNotes('');
    setPhotoUrl('');
    setChildren([]);
    setIsFormOpen(true);
  };

  const openEditForm = (fam: Family) => {
    setEditId(fam.id);
    setHusbandName(fam.husbandName);
    setWifeName(fam.wifeName);
    setHusbandPhone(fam.husbandPhone);
    setWifePhone(fam.wifePhone);
    setAddress(fam.address);
    setMarriageDate(fam.marriageDate);
    setHusbandBirthDate(fam.husbandBirthDate || '');
    setWifeBirthDate(fam.wifeBirthDate || '');
    setHusbandJob(fam.husbandJob || '');
    setWifeJob(fam.wifeJob || '');
    setNotes(fam.notes);
    setPhotoUrl(fam.photoUrl || '');
    setChildren(fam.children || []);
    setIsFormOpen(true);
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

  const handleAddKid = () => {
    if (!newKidName.trim()) {
      alert('فضلاً اكتب اسم ابن/ابنة لإدراجه.');
      return;
    }
    if (!newKidBirth) {
      alert('فضلاً اختر تاريخ ميلاد الابن/الابنة.');
      return;
    }
    const computedAge = calculateAge(newKidBirth);
    const kid: Child = {
      id: `kid_${Date.now()}`,
      name: newKidName.trim(),
      age: computedAge,
      birthDate: newKidBirth,
      gender: newKidGender || undefined
    };
    setChildren([...children, kid]);

    // reset kid inputs
    setNewKidName('');
    setNewKidAge('');
    setNewKidBirth('');
    setNewKidGender('');
  };

  const handleRemoveKid = (kidId: string) => {
    setChildren(children.filter(c => c.id !== kidId));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!husbandName || !wifeName) {
      alert('اسم الزوج واسم الزوجة حقول مطلوبة بالكامل.');
      return;
    }

    // Basic validator on Egyptian phone numbers (optional check but good practice)
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (husbandPhone && !phoneRegex.test(husbandPhone)) {
      alert('رقم هاتف الزوج يجب أن يكون رقم تليفون مصري صحيح مكون من ١١ رقم (مثال: 01234567890)');
      return;
    }

    const payload = {
      husbandName,
      wifeName,
      husbandPhone,
      wifePhone,
      address,
      marriageDate,
      husbandBirthDate: husbandBirthDate || undefined,
      wifeBirthDate: wifeBirthDate || undefined,
      husbandJob: husbandJob || undefined,
      wifeJob: wifeJob || undefined,
      notes,
      photoUrl,
      children
    };

    let success = false;
    if (editId) {
      success = await onEditFamily(editId, payload);
    } else {
      success = await onAddFamily(payload);
    }

    if (success) {
      setIsFormOpen(false);
    }
  };

  const handleDelete = async (famId: string, hName: string) => {
    setDeleteConfirmFamily({ id: famId, name: hName });
  };

  const activeFamily = families.find(f => f.id === activeFamilyId);

  // Generate generic stylish Coptic-style avatar symbols for church representation
  const getInitials = (h: string, w: string) => {
    return `${h.slice(0, 1)}✝${w.slice(0, 1)}`;
  };

  return (
    <div className="space-y-6" dir="rtl" id="families_manager_block">
      {/* Search Header Row */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="ابحث باسم الزوج، الزوجة، الملاحظات، رقم التليفون، أو رقم الابن..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-10 outline-none text-sm focus:border-blue-500 focus:bg-white transition-all font-medium"
          />
        </div>
        
        {userRole !== 'Viewer' && (
          <button
            type="button"
            onClick={openAddForm}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            إضافة عائلة جديدة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Family List Grid */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-700 uppercase tracking-widest">
            <span>العائلات المسجلة ({filteredFamilies.length})</span>
            {searchTerm && <span className="text-blue-600 font-bold">جدول تصفية نشط</span>}
          </div>

          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1" id="families_scroll_view">
            {filteredFamilies.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-slate-500 text-sm font-bold">لا يوجد عائلات مسجلة تطابق معايير البحث.</p>
              </div>
            ) : (
              filteredFamilies.map((fam) => (
                <div 
                  key={fam.id}
                  onClick={() => setActiveFamilyId(fam.id)}
                  className={`bg-white rounded-2xl border p-4 transition-all hover:border-blue-500/40 cursor-pointer flex items-center justify-between ${
                    fam.id === activeFamilyId 
                      ? 'border-blue-500/80 shadow-premium bg-blue-50/10' 
                      : 'border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Circle initials representation */}
                    <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center font-bold text-blue-600 shrink-0 text-sm overflow-hidden">
                      {fam.photoUrl ? (
                        <img src={fam.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        getInitials(fam.husbandName, fam.wifeName)
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900 text-base">
                        {fam.husbandName} & {fam.wifeName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{fam.husbandPhone || 'بدون رقم'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[150px]">{fam.address}</span>
                        </span>
                        {fam.children?.length > 0 && (
                          <span className="bg-slate-100 text-slate-650 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {fam.children.length} أبناء
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setActiveFamilyId(fam.id)}
                      className="p-1 px-1.5 hover:bg-slate-50 text-[#2563EB] rounded-lg text-xs font-bold hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      عرض
                    </button>
                    {userRole !== 'Viewer' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditForm(fam)}
                          className="p-1.5 hover:bg-slate-50 text-slate-500 rounded-lg hover:text-amber-500"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmFamily({ id: fam.id, name: fam.husbandName })}
                          className="p-1.5 hover:bg-slate-50 text-slate-500 rounded-lg hover:text-[#EF4444]"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side detailed family card view */}
        <div className="lg:col-span-5">
          {activeFamily ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6 space-y-6 shrink-0" id="family_detail_card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#2563EB]" />
                  بروفايل وبيانات العائلة التفصيلية
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveFamilyId(null)}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-50 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Header card view */}
              <div className="bg-slate-50 rounded-xl p-4 flex gap-4 border border-slate-200/50 items-center">
                <div className="w-16 h-16 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl flex items-center justify-center text-lg font-black tracking-widest leading-none shrink-0 overflow-hidden">
                  {activeFamily.photoUrl ? (
                    <img src={activeFamily.photoUrl} alt="" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                  ) : (
                    getInitials(activeFamily.husbandName, activeFamily.wifeName)
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-base">{activeFamily.husbandName}</h4>
                  <p className="text-xs font-bold text-slate-650">شريك الحياة الزوجة: {activeFamily.wifeName}</p>
                  <div className="text-[10px] text-slate-400 block font-semibold font-mono">تاريخ التأسيس: {new Date(activeFamily.createdAt).toLocaleDateString('ar-EG')}</div>
                </div>
              </div>

              {/* Data Lists */}
              <div className="space-y-3.5 text-xs font-medium">
                <div className="flex justify-between py-1 border-b border-slate-150 items-center">
                  <span className="text-slate-500 font-bold flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> هاتف الزوج:</span>
                  <span className="font-mono text-slate-850 font-bold">{activeFamily.husbandPhone || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-150 items-center">
                  <span className="text-slate-500 font-bold flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> هاتف الزوجة:</span>
                  <span className="font-mono text-slate-850 font-bold">{activeFamily.wifePhone || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-150 items-center">
                  <span className="text-slate-500 font-bold flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> العنوان السكني:</span>
                  <span className="text-slate-850 text-left font-bold">{activeFamily.address}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-150 items-center">
                  <span className="text-slate-500 font-bold flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-slate-400" /> تاريخ الزواج / الإكليل:</span>
                  <span className="font-mono text-slate-850 font-bold">{activeFamily.marriageDate}</span>
                </div>
                {activeFamily.husbandJob && (
                  <div className="flex justify-between py-1 border-b border-slate-150 items-center">
                    <span className="text-slate-500 font-bold flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-slate-400" /> وظيفة الزوج:</span>
                    <span className="text-slate-850 font-bold">{activeFamily.husbandJob}</span>
                  </div>
                )}
                {activeFamily.husbandBirthDate && (
                  <div className="flex justify-between py-1 border-b border-slate-150 items-center">
                    <span className="text-slate-500 font-bold flex items-center gap-1"><Gift className="w-3.5 h-3.5 text-slate-400" /> تاريخ ميلاد الزوج:</span>
                    <span className="font-mono text-slate-850 font-bold">{activeFamily.husbandBirthDate}</span>
                  </div>
                )}
                {activeFamily.wifeJob && (
                  <div className="flex justify-between py-1 border-b border-slate-150 items-center">
                    <span className="text-slate-500 font-bold flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-slate-400" /> وظيفة الزوجة:</span>
                    <span className="text-slate-850 font-bold">{activeFamily.wifeJob}</span>
                  </div>
                )}
                {activeFamily.wifeBirthDate && (
                  <div className="flex justify-between py-1 border-b border-slate-150 items-center">
                    <span className="text-slate-500 font-bold flex items-center gap-1"><Gift className="w-3.5 h-3.5 text-slate-400" /> تاريخ ميلاد الزوجة:</span>
                    <span className="font-mono text-slate-850 font-bold">{activeFamily.wifeBirthDate}</span>
                  </div>
                )}
              </div>

              {/* Children Panel */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-750 flex items-center gap-1 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  الأبناء والرعية ({activeFamily.children?.length || 0})
                </span>
                {activeFamily.children?.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-xl text-center border border-slate-100">لا يوجد أبناء مسجلين لهذه العائلة حالياً.</p>
                ) : (
                  <div className="space-y-2">
                    {activeFamily.children.map((kid) => (
                      <div key={kid.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{kid.name}</p>
                          <span className="text-[10px] text-slate-400 font-bold">النوع: {kid.gender || 'غير محدد'} | تاريخ الميلاد: {kid.birthDate || 'غير مسجل'} ({kid.age} سنة)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes Panel */}
              {activeFamily.notes && (
                <div className="bg-amber-50/50 p-3.5 rounded-lg border border-amber-100 space-y-1 text-xs">
                  <span className="font-bold text-amber-900 block flex items-center gap-1">ملاحظات وطلبات الافتقاد:</span>
                  <p className="text-amber-800 leading-relaxed font-semibold italic">&ldquo; {activeFamily.notes} &rdquo;</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center sticky top-4">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-xs font-bold select-none text-slate-500">اختر إحدى العائلات لاستعراض بيانات الاتصال، الأبناء، والخطابات بالتفصيل.</p>
            </div>
          )}
        </div>
      </div>

      {/* Complete Responsive React Modal wrapper for Add/Edit Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto" id="family_form_modal">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {editId ? `تحديث بيانات عائلة: ${husbandName}` : 'إضافة عائلة كنسية جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitForm} className="overflow-y-auto p-6 space-y-6">
              {/* Photo Upload Widget with Drag and Drop and click */}
              <div className="space-y-1.5 bg-slate-50 border border-slate-250/50 p-4 rounded-2xl">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Image className="w-4 h-4 text-blue-600" />
                  صورة العائلة أو الملف الشخصي (اسحب الصورة أو اضغط للتحميل)
                </label>
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-all relative min-h-[140px] cursor-pointer ${
                    isDragging 
                      ? 'border-blue-600 bg-blue-50/50' 
                      : photoUrl 
                        ? 'border-slate-350 bg-white' 
                        : 'border-slate-205 bg-white hover:bg-slate-50'
                  }`}
                >
                  {photoUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 shadow-md">
                        <img src={photoUrl} alt="Family thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPhotoUrl('');
                          }}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition-colors z-10"
                          title="إزالة الصورة"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">تم تحميل الصورة بنجاح. اسحب صورة جديدة أو اضغط لتغييرها.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-2">
                      <div className="p-3 bg-slate-100 border border-slate-200 rounded-full text-slate-500 mb-1 p-2 bg-slate-50 rounded-lg">
                        <Image className="w-5 h-5 text-slate-500" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">اسحب صورة العائلة السعيدة هنا</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">أو اضغط لاختيار صورة من جهازك (PNG, JPG)</p>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="تحميل صورة العائلة"
                  />
                </div>
              </div>

              {/* Husband Wife Basic Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">اسم الزوج بالكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="الاسم الأول واللقب باللغة العربية"
                    value={husbandName}
                    onChange={(e) => setHusbandName(e.target.value)}
                    className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-2.5 bg-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">اسم الزوجة بالكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="الاسم والأب العائلي باللغة العربية"
                    value={wifeName}
                    onChange={(e) => setWifeName(e.target.value)}
                    className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-2.5 bg-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Phones and Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">هاتف الزوج (مثال: 01234567890)</label>
                  <input
                    type="text"
                    placeholder="اكتب الأرقام فقط"
                    value={husbandPhone}
                    onChange={(e) => setHusbandPhone(e.target.value)}
                    className="w-full text-sm font-bold font-mono border border-slate-200 rounded-xl p-2.5 bg-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">هاتف الزوجة</label>
                  <input
                    type="text"
                    placeholder="اكتب الأرقام فقط"
                    value={wifePhone}
                    onChange={(e) => setWifePhone(e.target.value)}
                    className="w-full text-sm font-bold font-mono border border-slate-200 rounded-xl p-2.5 bg-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Husband & Wife Job + Birth Date Additions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Husband Info Block */}
                <div className="space-y-3 p-4 bg-blue-50/20 border border-blue-100/40 rounded-2xl">
                  <span className="text-xs font-black text-blue-800 flex items-center gap-1">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    بيانات الزوج المهنية والخاصة
                  </span>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-705 block">وظيفة الزوج / المهنة</label>
                    <input
                      type="text"
                      placeholder="مثال: مهندس برمجيات، طبيب، محاسب..."
                      value={husbandJob}
                      onChange={(e) => setHusbandJob(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2 bg-white outline-none focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-705 block">تاريخ ميلاد الزوج</label>
                    <input
                      type="date"
                      value={husbandBirthDate}
                      onChange={(e) => setHusbandBirthDate(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2 bg-white outline-none focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Wife Info Block */}
                <div className="space-y-3 p-4 bg-pink-50/20 border border-pink-100/40 rounded-2xl">
                  <span className="text-xs font-black text-pink-800 flex items-center gap-1">
                    <Briefcase className="w-4 h-4 text-pink-600" />
                    بيانات الزوجة المهنية والخاصة
                  </span>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-705 block">وظيفة الزوجة / المهنة</label>
                    <input
                      type="text"
                      placeholder="مثال: معلمة، ربة منزل، صيدلانية..."
                      value={wifeJob}
                      onChange={(e) => setWifeJob(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-2 bg-white outline-none focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-705 block">تاريخ ميلاد الزوجة</label>
                    <input
                      type="date"
                      value={wifeBirthDate}
                      onChange={(e) => setWifeBirthDate(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2 bg-white outline-none focus:border-blue-550 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-800 block">العنوان والتفاصيل السكنية</label>
                <input
                  type="text"
                  placeholder="المحافظة، الحي، اسم الشارع، رقم العمارة..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-2.5 bg-white outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">تاريخ الإكليل / الزواج</label>
                  <input
                    type="date"
                    value={marriageDate}
                    onChange={(e) => setMarriageDate(e.target.value)}
                    className="w-full text-sm font-bold border border-slate-200 rounded-xl p-2.5 bg-white outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">ملاحظات الافتقاد</label>
                  <input
                    type="text"
                    placeholder="اكتب أي ملاحظات أولية للافتقاد الحالية..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-2.5 bg-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Dynamic Children Form Section */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  بيانات الأبناء والرعاية ({children.length})
                </span>

                {children.length > 0 && (
                  <div className="space-y-2">
                    {children.map((child, idx) => (
                      <div key={child.id} className="bg-white p-2.5 rounded-xl border border-slate-150 flex justify-between items-center text-xs">
                        <div className="font-bold text-slate-800">
                          <strong>{child.name}</strong> - تاريخ الميلاد: {child.birthDate || 'غير مسجل'} ({child.age} سنة، {child.gender || 'غير محدد'})
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveKid(child.id)}
                          className="text-[#EF4444] hover:text-[#DC2626] font-bold text-xs cursor-pointer"
                        >
                          إزالة
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Add Child controls */}
                <div className="bg-white p-4 rounded-xl border border-slate-250 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700">إضافة ابن/ابنة في القائمة:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold">اسم الابن/الابنة</label>
                      <input
                        type="text"
                        placeholder="الاسم بالكامل"
                        value={newKidName}
                        onChange={(e) => setNewKidName(e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-200 rounded p-1.5 outline-none h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold">تاريخ ميلاد الابن/الابنة</label>
                      <input
                        type="date"
                        value={newKidBirth}
                        onChange={(e) => setNewKidBirth(e.target.value)}
                        className="w-full text-[11px] font-bold border border-slate-200 rounded p-1.5 outline-none font-mono h-8 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold">النوع</label>
                      <select
                        value={newKidGender}
                        onChange={(e) => setNewKidGender(e.target.value as any)}
                        className="w-full text-xs font-bold border border-slate-200 rounded p-1 outline-none h-8 bg-white"
                      >
                        <option value="">غير محدد</option>
                        <option value="ذكر">ذكر</option>
                        <option value="أنثى">أنثى</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddKid}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg py-1.5 h-8 transition-colors cursor-pointer"
                    >
                      أدرج الابن
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-8">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-350 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
                >
                  {editId ? 'تعديل وحفظ البيانات' : 'حفظ كعائلة جديدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog for Safe Cross-iframe Deletion */}
      {deleteConfirmFamily && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in" id="delete_confirm_modal">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#EF4444]">
              <div className="w-10 h-10 bg-red-50 text-[#EF4444] rounded-xl flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">تأكيد حذف العائلة</h3>
            </div>
            
            <p className="text-xs text-slate-605 font-bold leading-relaxed">
              هل أنت متأكد من حذف بيانات عائلة <strong className="text-slate-950 font-black">الأستاذ {deleteConfirmFamily.name}</strong> بالكامل من السجلات كنسياً؟ 
              سيؤدي هذا إلى إزالة العائلة وتطهير كافة بيانات الحضور والغياب الخاصة بها بصورة نهائية ودون إمكانية للتراجع!
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmFamily(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmFamily.id;
                  setDeleteConfirmFamily(null);
                  await onDeleteFamily(id);
                  if (activeFamilyId === id) setActiveFamilyId(null);
                }}
                className="px-4 py-2 bg-[#EF4444] hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                نعم، احذف نهائياً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
