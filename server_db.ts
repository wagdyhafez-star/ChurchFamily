import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DbSchema, Family, AttendanceRecord, AuditLog, ChurchUser } from './src/types';

// Extremely robust database path detection and access verification
function resolveDatabasePath(): string {
  const cwdPath = path.join(process.cwd(), 'church_db.json');
  let scriptPath = '';

  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    scriptPath = path.resolve(currentDir, currentDir.endsWith('dist') ? '../church_db.json' : 'church_db.json');
  } catch (e) {
    // Fallback if URL / fileURLToPath or import.meta.url is not supported/vibe
    try {
      if (typeof __dirname !== 'undefined' && __dirname) {
        scriptPath = path.resolve(__dirname, __dirname.endsWith('dist') ? '../church_db.json' : 'church_db.json');
      }
    } catch (err) {
      // Ignore
    }
  }

  const candidates = [cwdPath];
  if (scriptPath) {
    candidates.push(scriptPath);
  }

  // 1. Try first to use existing writable files
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        fs.accessSync(candidate, fs.constants.R_OK | fs.constants.W_OK);
        return candidate;
      }
    } catch (e) {
      // Ignore security errors or file locks and check next candidate
    }
  }

  // 2. If no file exists yet, try to find a writable parent directory
  for (const candidate of candidates) {
    try {
      const parentDir = path.dirname(candidate);
      if (fs.existsSync(parentDir)) {
        fs.accessSync(parentDir, fs.constants.W_OK);
        return candidate;
      }
    } catch (e) {
      // Ignore and check next
    }
  }

  // 3. Absolute fallback to standard writable container memory space
  return path.join('/tmp', 'church_db.json');
}

const DB_FILE_PATH = resolveDatabasePath();
console.log(`[Database Connection] Active database file path is resolved to: ${DB_FILE_PATH}`);

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
