import { db } from '../js/db.js';
import { UserAccount, UserRole, UserPermissions } from '../types';
import { getAuthAuditLogs, AuthAuditLogEntry } from './authAuditService';

export interface UserLevelAuditResult {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pinProtectedUsers: number;
  unprotectedUsers: UserAccount[];
  adminCount: number;
  usersWithCustomOverrides: UserAccount[];
  roleDistribution: Record<string, number>;
  securityScore: number; // 0 - 100%
  warnings: string[];
  recommendations: string[];
}

export interface TreatmentAuditItem {
  id: string;
  catId: number | string;
  catName: string;
  type: 'oltas' | 'kezeles' | 'teszt' | 'mutet' | 'esemeny';
  title: string;
  date: string;
  doctorOrAdmin?: string;
  cost: number;
  hasAuditStamp: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  status: 'valid' | 'missing_doctor' | 'invalid_date' | 'suspicious_cost' | 'missing_stamp';
  issueDescription?: string;
}

export interface MedicalAuditSummary {
  totalTreatments: number;
  validTreatments: number;
  treatmentsWithIssues: number;
  totalMedicalCost: number;
  doctorAttributionCount: number;
  missingDoctorCount: number;
  missingAuditStampCount: number;
  treatmentsByType: Record<string, number>;
  doctorDistribution: Record<string, number>;
  issuesList: TreatmentAuditItem[];
}

export interface FullSystemAuditReport {
  timestamp: string;
  overallScore: number; // 0 - 100%
  userAudit: UserLevelAuditResult;
  medicalAudit: MedicalAuditSummary;
  authAudit: {
    totalAuthEvents: number;
    loginCount: number;
    failedAttempts: number;
    userSwitchCount: number;
    rootAccessCount: number;
    recentSessions: AuthAuditLogEntry[];
  };
}

/**
 * Felhasználói szintek és jogosultsági architektúra mélyreható auditálása
 */
export function auditUserLevelsAndRoles(users: UserAccount[], roles: UserRole[]): UserLevelAuditResult {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.active).length;
  const inactiveUsers = users.filter((u) => !u.active).length;
  const pinProtectedUsers = users.filter((u) => u.pin && u.pin.trim().length > 0).length;
  const unprotectedUsers = users.filter((u) => !u.pin || u.pin.trim().length === 0);
  const usersWithCustomOverrides = users.filter((u) => !!u.customPermissionsOverride && Object.keys(u.customPermissionsOverride).length > 0);

  const roleDistribution: Record<string, number> = {};
  roles.forEach((r) => {
    roleDistribution[r.id] = 0;
  });
  users.forEach((u) => {
    roleDistribution[u.roleId] = (roleDistribution[u.roleId] || 0) + 1;
  });

  const adminCount = users.filter((u) => u.roleId === 'root' || u.roleId === 'owner' || u.roleId === 'admin').length;

  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Security score calculation
  let score = 100;

  // Unprotected admin or high privilege accounts
  const unprotectedAdmins = unprotectedUsers.filter((u) => u.roleId === 'root' || u.roleId === 'owner');
  if (unprotectedAdmins.length > 0) {
    score -= 30;
    warnings.push(`Kritikus: ${unprotectedAdmins.length} vezető/főadminisztrátor fiók nem rendelkezik PIN kódos védelemmel! (${unprotectedAdmins.map((u) => u.name).join(', ')})`);
    recommendations.push('Azonnal állíts be 4-6 számjegyű biztonsági PIN kódot a vezetői és root profilokhoz.');
  }

  // General unprotected users
  if (unprotectedUsers.length > unprotectedAdmins.length) {
    score -= 10;
    warnings.push(`${unprotectedUsers.length - unprotectedAdmins.length} munkatársi/önkéntes fiók jelszó/PIN nélkül érhető el.`);
  }

  // Too many root/owner accounts
  if (adminCount > 3) {
    score -= 10;
    warnings.push(`Túl sok (${adminCount} db) főadminisztrátori vagy tulajdonosi jogosultságú fiók van aktív státuszban.`);
    recommendations.push('Alkalmazd a legkisebb jogosultság elvét (Principle of Least Privilege): a mindennapi feladatokhoz STAFF vagy FOSTER szint javasolt.');
  }

  // Custom permission overrides check
  if (usersWithCustomOverrides.length > 0) {
    score -= 5;
    warnings.push(`${usersWithCustomOverrides.length} felhasználó egyedi jogosultság-felülbírálással rendelkezik (nem standard szerepkör).`);
    recommendations.push('Ellenőrizd a személyre szabott egyedi jogosultságokat az Audit Inspectorban az eltérések elkerülése végett.');
  }

  // Inactive users with elevated permissions
  const inactiveElevated = users.filter((u) => !u.active && (u.roleId === 'root' || u.roleId === 'owner' || u.roleId === 'staff'));
  if (inactiveElevated.length > 0) {
    warnings.push(`${inactiveElevated.length} inaktív fiók rendelkezik magas szintű jogosultsággal (${inactiveElevated.map((u) => u.name).join(', ')}).`);
  }

  if (score < 0) score = 0;

  return {
    totalUsers,
    activeUsers,
    inactiveUsers,
    pinProtectedUsers,
    unprotectedUsers,
    adminCount,
    usersWithCustomOverrides,
    roleDistribution,
    securityScore: score,
    warnings,
    recommendations,
  };
}

/**
 * Kezelések, oltások, tesztek és egészségügyi események átfogó auditálása
 */
export async function auditMedicalTreatmentsAndEvents(): Promise<MedicalAuditSummary> {
  const cats = await db.cats.toArray();
  const events = await db.events.toArray();

  const issuesList: TreatmentAuditItem[] = [];
  const treatmentsByType: Record<string, number> = {
    oltas: 0,
    kezeles: 0,
    teszt: 0,
    mutet: 0,
    esemeny: 0,
  };
  const doctorDistribution: Record<string, number> = {};

  let totalTreatments = 0;
  let validTreatments = 0;
  let totalMedicalCost = 0;
  let doctorAttributionCount = 0;
  let missingDoctorCount = 0;
  let missingAuditStampCount = 0;

  // 1. Audit Inline Medical Logs in Cats (oltasok, kezelesek, tesztek)
  for (const cat of cats) {
    const catName = cat.nev || `Cica #${cat.id}`;

    // Oltások auditja
    if (Array.isArray(cat.oltasok)) {
      for (const item of cat.oltasok) {
        totalTreatments++;
        treatmentsByType.oltas = (treatmentsByType.oltas || 0) + 1;
        const cost = Number(item.koltseg) || 0;
        totalMedicalCost += cost;

        const doctor = item.orvos || item.allatorvos || item.administeredBy;
        if (doctor && doctor.trim()) {
          doctorAttributionCount++;
          doctorDistribution[doctor] = (doctorDistribution[doctor] || 0) + 1;
        } else {
          missingDoctorCount++;
        }

        const hasAuditStamp = !!(item.created_at || item.created_by);
        if (!hasAuditStamp) missingAuditStampCount++;

        let status: TreatmentAuditItem['status'] = 'valid';
        let issueDescription: string | undefined;

        if (!item.datum) {
          status = 'invalid_date';
          issueDescription = 'Hiányzó oltási dátum!';
        } else if (cost < 0 || isNaN(cost)) {
          status = 'suspicious_cost';
          issueDescription = `Érvénytelen költségérték: ${cost}`;
        } else if (!doctor) {
          status = 'missing_doctor';
          issueDescription = 'Nincs megadva beadó orvos/gondozó';
        } else if (!hasAuditStamp) {
          status = 'missing_stamp';
          issueDescription = 'Hiányzó audit időbélyeg/felhasználói azonosító';
        }

        if (status !== 'valid') {
          issuesList.push({
            id: `oltas_${cat.id}_${item.id || Math.random()}`,
            catId: cat.id,
            catName,
            type: 'oltas',
            title: item.megnevezes || item.tipus || 'Oltás',
            date: item.datum || 'N/A',
            doctorOrAdmin: doctor,
            cost,
            hasAuditStamp,
            createdBy: item.created_by,
            createdByName: item.created_by_name,
            createdAt: item.created_at,
            status,
            issueDescription,
          });
        } else {
          validTreatments++;
        }
      }
    }

    // Kezelések auditja
    if (Array.isArray(cat.kezelesek)) {
      for (const item of cat.kezelesek) {
        totalTreatments++;
        treatmentsByType.kezeles = (treatmentsByType.kezeles || 0) + 1;
        const cost = Number(item.koltseg) || 0;
        totalMedicalCost += cost;

        const doctor = item.orvos || item.allatorvos || item.administeredBy;
        if (doctor && doctor.trim()) {
          doctorAttributionCount++;
          doctorDistribution[doctor] = (doctorDistribution[doctor] || 0) + 1;
        } else {
          missingDoctorCount++;
        }

        const hasAuditStamp = !!(item.created_at || item.created_by);
        if (!hasAuditStamp) missingAuditStampCount++;

        let status: TreatmentAuditItem['status'] = 'valid';
        let issueDescription: string | undefined;

        if (!item.datum) {
          status = 'invalid_date';
          issueDescription = 'Hiányzó kezelési dátum!';
        } else if (cost < 0 || isNaN(cost)) {
          status = 'suspicious_cost';
          issueDescription = `Érvénytelen kezelési költség: ${cost}`;
        } else if (!doctor) {
          status = 'missing_doctor';
          issueDescription = 'Nincs rögzítve kezelőorvos';
        } else if (!hasAuditStamp) {
          status = 'missing_stamp';
          issueDescription = 'Hiányzó audit időbélyeg';
        }

        if (status !== 'valid') {
          issuesList.push({
            id: `kezeles_${cat.id}_${item.id || Math.random()}`,
            catId: cat.id,
            catName,
            type: 'kezeles',
            title: item.megnevezes || item.tunet || 'Orvosi kezelés',
            date: item.datum || 'N/A',
            doctorOrAdmin: doctor,
            cost,
            hasAuditStamp,
            createdBy: item.created_by,
            createdByName: item.created_by_name,
            createdAt: item.created_at,
            status,
            issueDescription,
          });
        } else {
          validTreatments++;
        }
      }
    }

    // Tesztek auditja
    if (Array.isArray(cat.tesztek)) {
      for (const item of cat.tesztek) {
        totalTreatments++;
        treatmentsByType.teszt = (treatmentsByType.teszt || 0) + 1;
        const cost = Number(item.koltseg) || 0;
        totalMedicalCost += cost;

        const doctor = item.orvos || item.allatorvos;
        if (doctor && doctor.trim()) {
          doctorAttributionCount++;
          doctorDistribution[doctor] = (doctorDistribution[doctor] || 0) + 1;
        } else {
          missingDoctorCount++;
        }

        const hasAuditStamp = !!(item.created_at || item.created_by);
        if (!hasAuditStamp) missingAuditStampCount++;

        let status: TreatmentAuditItem['status'] = 'valid';
        let issueDescription: string | undefined;

        if (!item.datum) {
          status = 'invalid_date';
          issueDescription = 'Hiányzó tesztelési dátum!';
        } else if (!doctor) {
          status = 'missing_doctor';
          issueDescription = 'Nincs megadva tesztet végző állatorvos / rendelő';
        }

        if (status !== 'valid') {
          issuesList.push({
            id: `teszt_${cat.id}_${item.id || Math.random()}`,
            catId: cat.id,
            catName,
            type: 'teszt',
            title: item.megnevezes || item.tipus || 'Labor / Gyorsteszt',
            date: item.datum || 'N/A',
            doctorOrAdmin: doctor,
            cost,
            hasAuditStamp,
            createdBy: item.created_by,
            createdByName: item.created_by_name,
            createdAt: item.created_at,
            status,
            issueDescription,
          });
        } else {
          validTreatments++;
        }
      }
    }
  }

  // 2. Audit Events table records
  for (const ev of events) {
    totalTreatments++;
    treatmentsByType.esemeny = (treatmentsByType.esemeny || 0) + 1;
    const cost = Number(ev.cost) || 0;
    totalMedicalCost += cost;

    const doctor = ev.doctor || ev.allatorvos || ev.created_by_name;
    if (doctor) {
      doctorAttributionCount++;
      doctorDistribution[doctor] = (doctorDistribution[doctor] || 0) + 1;
    } else {
      missingDoctorCount++;
    }

    const hasAuditStamp = !!(ev.created_at || ev.createdAt);
    if (!hasAuditStamp) missingAuditStampCount++;

    if (!ev.date) {
      issuesList.push({
        id: `event_${ev.id}`,
        catId: ev.catId || 'N/A',
        catName: ev.catName || 'Naptári esemény',
        type: 'esemeny',
        title: ev.title || 'Orvosi esemény',
        date: 'N/A',
        doctorOrAdmin: doctor,
        cost,
        hasAuditStamp,
        status: 'invalid_date',
        issueDescription: 'Hiányzó esemény dátum',
      });
    } else {
      validTreatments++;
    }
  }

  return {
    totalTreatments,
    validTreatments,
    treatmentsWithIssues: issuesList.length,
    totalMedicalCost,
    doctorAttributionCount,
    missingDoctorCount,
    missingAuditStampCount,
    treatmentsByType,
    doctorDistribution,
    issuesList,
  };
}

/**
 * Automatikus korrekciós és pecsétpótló motor a kezelésekhez és egészségügyi rekordokhoz
 */
export async function autoRepairMedicalAuditStamps(currentUserName = 'Audit Rendszer'): Promise<{ fixedCount: number }> {
  let fixedCount = 0;
  const now = new Date().toISOString();

  await db.cats.toCollection().modify((cat) => {
    let modified = false;

    // Fix oltasok
    if (Array.isArray(cat.oltasok)) {
      cat.oltasok = cat.oltasok.map((olt: any) => {
        if (!olt.created_at || !olt.created_by) {
          fixedCount++;
          modified = true;
          return {
            ...olt,
            koltseg: Number(olt.koltseg) || 0,
            created_at: olt.created_at || olt.datum || now,
            created_by: olt.created_by || 'audit_system',
            created_by_name: olt.created_by_name || olt.orvos || currentUserName,
          };
        }
        return olt;
      });
    }

    // Fix kezelesek
    if (Array.isArray(cat.kezelesek)) {
      cat.kezelesek = cat.kezelesek.map((kez: any) => {
        if (!kez.created_at || !kez.created_by) {
          fixedCount++;
          modified = true;
          return {
            ...kez,
            koltseg: Number(kez.koltseg) || 0,
            created_at: kez.created_at || kez.datum || now,
            created_by: kez.created_by || 'audit_system',
            created_by_name: kez.created_by_name || kez.orvos || currentUserName,
          };
        }
        return kez;
      });
    }

    // Fix tesztek
    if (Array.isArray(cat.tesztek)) {
      cat.tesztek = cat.tesztek.map((teszt: any) => {
        if (!teszt.created_at || !teszt.created_by) {
          fixedCount++;
          modified = true;
          return {
            ...teszt,
            koltseg: Number(teszt.koltseg) || 0,
            created_at: teszt.created_at || teszt.datum || now,
            created_by: teszt.created_by || 'audit_system',
            created_by_name: teszt.created_by_name || teszt.orvos || currentUserName,
          };
        }
        return teszt;
      });
    }

    if (modified) {
      cat.updated_at = now;
      cat.updated_by_name = currentUserName;
    }
  });

  return { fixedCount };
}

/**
 * Futtatja a teljes, összevont 360°-os Rendszer & Felhasználói Auditot
 */
export async function runFullSystemAudit(users: UserAccount[], roles: UserRole[]): Promise<FullSystemAuditReport> {
  const userAudit = auditUserLevelsAndRoles(users, roles);
  const medicalAudit = await auditMedicalTreatmentsAndEvents();
  const authLogs = getAuthAuditLogs();

  const loginCount = authLogs.filter((l) => l.eventType === 'LOGIN_SUCCESS').length;
  const failedAttempts = authLogs.filter((l) => l.status === 'FAILED' || l.eventType === 'LOGIN_FAILED' || l.eventType === 'ROOT_AUTH_FAILED').length;
  const userSwitchCount = authLogs.filter((l) => l.eventType === 'USER_SWITCH').length;
  const rootAccessCount = authLogs.filter((l) => l.eventType === 'ROOT_MODE_ENTER').length;

  // Overall system audit score
  let overallScore = userAudit.securityScore;
  if (medicalAudit.totalTreatments > 0) {
    const medicalHealthRatio = (medicalAudit.validTreatments / medicalAudit.totalTreatments) * 100;
    overallScore = Math.round((userAudit.securityScore * 0.5) + (medicalHealthRatio * 0.5));
  }
  if (failedAttempts > 5) {
    overallScore = Math.max(0, overallScore - 10);
  }

  return {
    timestamp: new Date().toISOString(),
    overallScore,
    userAudit,
    medicalAudit,
    authAudit: {
      totalAuthEvents: authLogs.length,
      loginCount,
      failedAttempts,
      userSwitchCount,
      rootAccessCount,
      recentSessions: authLogs.slice(0, 50),
    },
  };
}
