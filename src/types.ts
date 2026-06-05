/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Child {
  id: string;
  name: string;
  age: number;
  birthDate?: string;
  gender?: 'ذكر' | 'أنثى' | '';
}

export interface Family {
  id: string;
  husbandName: string; // Arabic
  wifeName: string; // Arabic
  photoUrl?: string; // Optional family photo URL Base64 or standard asset
  husbandPhone: string;
  wifePhone: string;
  address: string;
  marriageDate: string; // YYYY-MM-DD
  husbandBirthDate?: string; // YYYY-MM-DD
  wifeBirthDate?: string; // YYYY-MM-DD
  husbandJob?: string;
  wifeJob?: string;
  notes: string;
  children: Child[];
  createdAt: string;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD representing Friday meeting or any other day
  attendedFamilyIds: string[]; // List of family IDs present
  notes?: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  role: 'Super Admin' | 'Admin' | 'Viewer';
  action: string;
  details: string;
}

export interface ChurchUser {
  email: string;
  name: string;
  role: 'Super Admin' | 'Admin' | 'Viewer';
}

export interface DbSchema {
  families: Family[];
  attendance: AttendanceRecord[];
  auditLogs: AuditLog[];
  users: ChurchUser[];
}

export interface AIMatchCandidate {
  familyId: string;
  husbandName: string;
  wifeName: string;
  spokenSnippet: string;
  confidence: number; // 0 - 100
  matchReason: string; // e.g., "Matched husband's name", "Spoken nickname match"
  isSelected: boolean;
}

export interface AIParsingResult {
  rawTranscript: string;
  extractedNames: string[];
  matches: AIMatchCandidate[];
}
