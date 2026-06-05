import fs from 'fs';
import path from 'path';
import { DbSchema, Family, AttendanceRecord, AuditLog, ChurchUser } from './src/types';

const DB_FILE_PATH = path.join(process.cwd(), 'church_db.json');

const DEFAULT_USERS: ChurchUser[] = [
  { email: 'wagdy.hafez@gmail.com', name: 'أ. وجدي حافظ', role: 'Super Admin' },
  { email: 'servant1@church.org', name: 'خادم الاجتماع ۱', role: 'Admin' },
  { email: 'viewer@church.org', name: 'مشاهد فقط', role: 'Viewer' }
];

const DEFAULT_FAMILIES: Family[] = [];

const DEFAULT_ATTENDANCE: AttendanceRecord[] = [];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [];

export function getDatabase(): DbSchema {
  if (!fs.existsSync(DB_FILE_PATH)) {
    const defaultDb: DbSchema = {
      families: DEFAULT_FAMILIES,
      attendance: DEFAULT_ATTENDANCE,
      auditLogs: DEFAULT_AUDIT_LOGS,
      users: DEFAULT_USERS
    };
    saveDatabase(defaultDb);
    return defaultDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
    return JSON.parse(raw) as DbSchema;
  } catch (err) {
    console.error('Error reading database file, resetting to default', err);
    const defaultDb: DbSchema = {
      families: DEFAULT_FAMILIES,
      attendance: DEFAULT_ATTENDANCE,
      auditLogs: DEFAULT_AUDIT_LOGS,
      users: DEFAULT_USERS
    };
    saveDatabase(defaultDb);
    return defaultDb;
  }
}

export function saveDatabase(db: DbSchema): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save database file', err);
  }
}

export function addAuditLog(
  userEmail: string,
  role: 'Super Admin' | 'Admin' | 'Viewer',
  action: string,
  details: string
): void {
  const db = getDatabase();
  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    userEmail,
    role,
    action,
    details
  };
  db.auditLogs.unshift(newLog); // Push to start to show newest first
  // Cap logs at 200 items to prevent file bloat
  if (db.auditLogs.length > 200) {
    db.auditLogs = db.auditLogs.slice(0, 200);
  }
  saveDatabase(db);
}
