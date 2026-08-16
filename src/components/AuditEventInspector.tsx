import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/db';
import { formatAuditDate } from '../utils/audit';
import { useAppStore } from '../store/useAppStore';
import { UserAccount, UserRole } from '../types';
import { getAuthAuditLogs, AuthAuditLogEntry } from '../services/authAuditService';
import {
  auditUserLevelsAndRoles,
  auditMedicalTreatmentsAndEvents,
  autoRepairMedicalAuditStamps,
  runFullSystemAudit,
  UserLevelAuditResult,
  MedicalAuditSummary,
  TreatmentAuditItem,
  FullSystemAuditReport,
} from '../services/reviewAuditService';
import { CustomSelect } from './CustomSelect';

export interface AuditEventItem {
  id: string;
  timestamp: string;
  action: 'CREATED' | 'UPDATED' | 'AUTH' | 'MEDICAL';
  entityType: 'cats' | 'events' | 'tnr' | 'finances' | 'foster' | 'inventory' | 'auth';
  entityId: string | number;
  entityName: string;
  userId: string;
  userName: string;
  userRole?: string;
  details?: Record<string, any>;
}

export const AuditEventInspector: React.FC = () => {
  const { users, roles, getCurrentUser, addDebugLog } = useAppStore();

  const [activeTab, setActiveTab] = useState<'levels' | 'medical' | 'auth' | 'stream' | 'scanner'>('levels');
  const [loading, setLoading] = useState(true);

  // Global stream state
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedTable, setSelectedTable] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // User levels audit state
  const [userAuditData, setUserAuditData] = useState<UserLevelAuditResult | null>(null);

  // Medical audit state
  const [medicalAuditData, setMedicalAuditData] = useState<MedicalAuditSummary | null>(null);
  const [medicalFilter, setMedicalFilter] = useState<'ALL' | 'issues_only' | 'oltas' | 'kezeles' | 'teszt'>('ALL');
  const [isRepairingMedical, setIsRepairingMedical] = useState(false);
  const [repairFeedback, setRepairFeedback] = useState<string | null>(null);

  // Auth audit state
  const [authLogs, setAuthLogs] = useState<AuthAuditLogEntry[]>([]);
  const [authSearch, setAuthSearch] = useState('');
  const [authTypeFilter, setAuthTypeFilter] = useState<string>('ALL');

  // Full scan report state
  const [fullReport, setFullReport] = useState<FullSystemAuditReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const currentUser = getCurrentUser();

  // Load all audit streams & data
  const loadAllAuditData = async () => {
    setLoading(true);
    try {
      // 1. Audit User Levels & Roles
      const userAudit = auditUserLevelsAndRoles(users, roles);
      setUserAuditData(userAudit);

      // 2. Audit Medical Treatments & Events
      const medAudit = await auditMedicalTreatmentsAndEvents();
      setMedicalAuditData(medAudit);

      // 3. Load Auth & Session Logs
      const logs = getAuthAuditLogs();
      setAuthLogs(logs);

      // 4. Load Global Entity Stream (Cats, Events, TNR, Finances, etc.)
      const items: AuditEventItem[] = [];

      // Cats
      const cats = await db.cats.toArray();
      for (const cat of cats) {
        const cAt = cat.created_at || cat.created;
        if (cAt) {
          items.push({
            id: `audit_cat_create_${cat.id}`,
            timestamp: cAt,
            action: 'CREATED',
            entityType: 'cats',
            entityId: cat.id,
            entityName: cat.nev || 'Névtelen cica',
            userId: cat.created_by || 'system',
            userName: cat.created_by_name || 'Rendszer',
            details: {
              sorszam: cat.sorszam,
              status: cat.status,
              chipNumber: cat.chipNumber,
            },
          });
        }
        if (cat.updated_at && cat.updated_at !== cAt) {
          items.push({
            id: `audit_cat_update_${cat.id}_${cat.updated_at}`,
            timestamp: cat.updated_at,
            action: 'UPDATED',
            entityType: 'cats',
            entityId: cat.id,
            entityName: cat.nev || 'Névtelen cica',
            userId: cat.updated_by || cat.created_by || 'system',
            userName: cat.updated_by_name || cat.created_by_name || 'Rendszer',
            details: {
              status: cat.status,
              updatedAt: cat.updated_at,
            },
          });
        }
      }

      // Health Events
      const events = await db.events.toArray();
      for (const ev of events) {
        const eAt = ev.created_at || ev.createdAt;
        if (eAt) {
          items.push({
            id: `audit_event_create_${ev.id}`,
            timestamp: eAt,
            action: 'CREATED',
            entityType: 'events',
            entityId: ev.id,
            entityName: ev.title || 'Egészségügyi bejegyzés',
            userId: ev.created_by || 'system',
            userName: ev.created_by_name || 'Rendszer',
            details: {
              type: ev.type,
              catId: ev.catId,
              cost: ev.cost,
              status: ev.status,
            },
          });
        }
        if (ev.updated_at && ev.updated_at !== eAt) {
          items.push({
            id: `audit_event_update_${ev.id}_${ev.updated_at}`,
            timestamp: ev.updated_at,
            action: 'UPDATED',
            entityType: 'events',
            entityId: ev.id,
            entityName: ev.title || 'Egészségügyi bejegyzés',
            userId: ev.updated_by || ev.created_by || 'system',
            userName: ev.updated_by_name || ev.created_by_name || 'Rendszer',
            details: {
              type: ev.type,
              status: ev.status,
              cost: ev.cost,
            },
          });
        }
      }

      // TNR Records
      const tnrList = await db.tnr.toArray();
      for (const tnr of tnrList) {
        const tAt = tnr.created_at || tnr.createdAt;
        if (tAt) {
          items.push({
            id: `audit_tnr_create_${tnr.id}`,
            timestamp: tAt,
            action: 'CREATED',
            entityType: 'tnr',
            entityId: tnr.id,
            entityName: tnr.catNameOrTag || 'TNR Rekord',
            userId: tnr.created_by || 'system',
            userName: tnr.created_by_name || 'Rendszer',
            details: {
              location: tnr.locationTrapped,
              status: tnr.status,
            },
          });
        }
        if (tnr.updated_at && tnr.updated_at !== tAt) {
          items.push({
            id: `audit_tnr_update_${tnr.id}_${tnr.updated_at}`,
            timestamp: tnr.updated_at,
            action: 'UPDATED',
            entityType: 'tnr',
            entityId: tnr.id,
            entityName: tnr.catNameOrTag || 'TNR Rekord',
            userId: tnr.updated_by || tnr.created_by || 'system',
            userName: tnr.updated_by_name || tnr.created_by_name || 'Rendszer',
            details: {
              status: tnr.status,
            },
          });
        }
      }

      // Finances
      if (db.finances) {
        const finList = await db.finances.toArray();
        for (const f of finList) {
          const fAt = f.created_at || f.createdAt || f.date;
          if (fAt) {
            items.push({
              id: `audit_fin_${f.id}`,
              timestamp: fAt,
              action: 'CREATED',
              entityType: 'finances',
              entityId: f.id,
              entityName: `${f.type === 'bevetel' ? '💚 Bevétel' : '💸 Kiadás'}: ${f.title || f.category}`,
              userId: f.created_by || 'system',
              userName: f.created_by_name || 'Rendszer',
              details: {
                amount: f.amount,
                category: f.category,
                paymentMethod: f.paymentMethod,
              },
            });
          }
        }
      }

      // Auth logs into stream
      for (const log of logs) {
        items.push({
          id: log.id,
          timestamp: log.timestamp,
          action: 'AUTH',
          entityType: 'auth',
          entityId: log.userId,
          entityName: `${log.eventType}: ${log.details}`,
          userId: log.userId,
          userName: log.userName,
          userRole: log.userRole,
          details: {
            status: log.status,
            client: log.ipOrClient,
            metadata: log.metadata,
          },
        });
      }

      // Sort descending by timestamp
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditEvents(items);
    } catch (err) {
      console.error('Audit data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAuditData();
  }, [users, roles]);

  // Run auto repair for medical audit stamps
  const handleAutoRepairMedical = async () => {
    setIsRepairingMedical(true);
    setRepairFeedback(null);
    try {
      const result = await autoRepairMedicalAuditStamps(currentUser?.name || 'Főadminisztrátor');
      addDebugLog(`[Medical Audit] ${result.fixedCount} orvosi bejegyzés sikeresen pótolva audit pecséttel.`);
      setRepairFeedback(`✅ Sikeres javítás! ${result.fixedCount} kezelési és oltási bejegyzés lett hitelesítve és auditálva.`);
      await loadAllAuditData();
    } catch (err: any) {
      setRepairFeedback(`❌ Hiba a javítás során: ${err?.message || err}`);
    } finally {
      setIsRepairingMedical(false);
    }
  };

  // Run full 360 scanner
  const handleRunFullScanner = async () => {
    setIsScanning(true);
    try {
      const report = await runFullSystemAudit(users, roles);
      setFullReport(report);
      addDebugLog(`[Full Audit] 360° Rendszeraudit lefutott. Összesített pontszám: ${report.overallScore}%`);
    } catch (err) {
      console.error('Full audit scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    auditEvents.forEach((ev) => set.add(ev.userName));
    return Array.from(set);
  }, [auditEvents]);

  const filteredEvents = useMemo(() => {
    return auditEvents.filter((ev) => {
      if (selectedAction !== 'ALL' && ev.action !== selectedAction) return false;
      if (selectedTable !== 'ALL' && ev.entityType !== selectedTable) return false;
      if (selectedUser !== 'ALL' && ev.userName !== selectedUser) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = ev.entityName.toLowerCase().includes(term);
        const matchUser = ev.userName.toLowerCase().includes(term);
        const matchId = String(ev.entityId).toLowerCase().includes(term);
        const matchType = ev.entityType.toLowerCase().includes(term);
        if (!matchName && !matchUser && !matchId && !matchType) return false;
      }
      return true;
    });
  }, [auditEvents, selectedAction, selectedTable, selectedUser, searchTerm]);

  const filteredAuthLogs = useMemo(() => {
    return authLogs.filter((log) => {
      if (authTypeFilter !== 'ALL' && log.eventType !== authTypeFilter) return false;
      if (authSearch.trim()) {
        const term = authSearch.toLowerCase();
        const matchUser = log.userName.toLowerCase().includes(term);
        const matchDetails = log.details.toLowerCase().includes(term);
        const matchRole = log.userRole.toLowerCase().includes(term);
        if (!matchUser && !matchDetails && !matchRole) return false;
      }
      return true;
    });
  }, [authLogs, authTypeFilter, authSearch]);

  const handleExportAuditJson = () => {
    const payload = {
      exportDate: new Date().toISOString(),
      userAudit: userAuditData,
      medicalAudit: medicalAuditData,
      authLogs: authLogs,
      filteredStream: filteredEvents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CicaNyT_Audit_Report_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header & Sub-Tab Navigation */}
      <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-900/80 text-purple-200 border border-purple-700 flex items-center justify-center text-lg font-black shrink-0">
              🛡️
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <span>Review & Audit Center</span>
                <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800 font-mono font-bold">
                  360° Rendszeraudit
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Felhasználói szintek, kezelések, be- és kiléptetések, valamint rendszeresemények mélyreható ellenőrzése
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllAuditData}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] rounded-xl transition border border-slate-700 cursor-pointer flex items-center gap-1"
            >
              <span>🔄</span>
              <span>Frissítés</span>
            </button>
            <button
              onClick={handleExportAuditJson}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-[11px] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>📥</span>
              <span>Audit Export (JSON)</span>
            </button>
          </div>
        </div>

        {/* Audit Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('levels')}
            className={`py-2 px-2.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer border ${
              activeTab === 'levels'
                ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>🛡️</span>
            <span>Felhasználói Szintek</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('medical')}
            className={`py-2 px-2.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer border ${
              activeTab === 'medical'
                ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>🩺</span>
            <span>Kezelések Auditja</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auth')}
            className={`py-2 px-2.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer border ${
              activeTab === 'auth'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>🔑</span>
            <span>Be- és Kiléptetések</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stream')}
            className={`py-2 px-2.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer border ${
              activeTab === 'stream'
                ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>📜</span>
            <span>Eseményfolyam</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('scanner');
              if (!fullReport) handleRunFullScanner();
            }}
            className={`col-span-2 sm:col-span-1 py-2 px-2.5 rounded-xl font-black text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer border ${
              activeTab === 'scanner'
                ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                : 'bg-slate-950 text-amber-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>⚡</span>
            <span>360° Diagnosztika</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: FELHASZNÁLÓI SZINTEK & JOGOSULTSÁG AUDIT                       */}
      {/* ========================================================================= */}
      {activeTab === 'levels' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {userAuditData && (
            <>
              {/* Security Health Score Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black font-mono border ${
                      userAuditData.securityScore >= 80
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : userAuditData.securityScore >= 60
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-rose-950 text-rose-300 border-rose-700'
                    }`}>
                      {userAuditData.securityScore}%
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-indigo-100">
                        Felhasználói & Szerepkör Biztonsági Index
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        {userAuditData.securityScore >= 80
                          ? 'Kiváló biztonsági konfiguráció, PIN-kóddal védett kulcsfiókok'
                          : userAuditData.securityScore >= 60
                          ? 'Figyelmet igénylő hozzáférési beállítások vagy védelem nélküli profilok'
                          : 'Sürgős beavatkozást igénylő jogosultsági kockázatok!'}
                      </p>
                    </div>
                  </div>

                  {/* Quick KPIs */}
                  <div className="grid grid-cols-3 gap-2 font-mono text-center">
                    <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-sans font-bold">Összes Fiók</span>
                      <span className="font-black text-sm text-indigo-200">{userAuditData.totalUsers} db</span>
                    </div>
                    <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-emerald-400 block font-sans font-bold">PIN Védett</span>
                      <span className="font-black text-sm text-emerald-300">{userAuditData.pinProtectedUsers} db</span>
                    </div>
                    <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-amber-400 block font-sans font-bold">Egyedi Jogosultság</span>
                      <span className="font-black text-sm text-amber-300">{userAuditData.usersWithCustomOverrides.length} db</span>
                    </div>
                  </div>
                </div>

                {/* Warnings / Alerts */}
                {userAuditData.warnings.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-indigo-900/60 space-y-1.5">
                    <div className="text-[10px] font-extrabold uppercase text-amber-300 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>Azonosított Jogosultsági Kockázatok & Észrevételek:</span>
                    </div>
                    <div className="space-y-1">
                      {userAuditData.warnings.map((w, idx) => (
                        <div key={idx} className="p-2 bg-amber-950/40 border border-amber-800/60 rounded-xl text-[11px] text-amber-200 flex items-start gap-2">
                          <span className="text-amber-400 shrink-0">•</span>
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Level Matrix Table */}
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h5 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>👥</span>
                    <span>Regisztrált Felhasználók és Hozzáférési Szintek Auditja</span>
                  </h5>
                  <span className="text-[10px] font-bold text-gray-500 font-mono">
                    {users.length} fiók ellenőrizve
                  </span>
                </div>

                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {users.map((user) => {
                    const role = roles.find((r) => r.id === user.roleId) || { name: user.roleId, code: 'UNKNOWN' };
                    const isProtected = user.pin && user.pin.trim().length > 0;
                    const hasOverride = !!user.customPermissionsOverride && Object.keys(user.customPermissionsOverride).length > 0;

                    return (
                      <div key={user.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-base flex items-center justify-center shrink-0">
                            {user.avatarEmoji || '👤'}
                          </span>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              <span>{user.name}</span>
                              {user.active ? (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                                  Aktív
                                </span>
                              ) : (
                                <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full font-bold">
                                  Inaktív
                                </span>
                              )}
                              {user.id === 'user_root' && (
                                <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-black">
                                  ROOT
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2 mt-0.5">
                              <span>Szerepkör: <strong className="text-purple-700">{role.name}</strong></span>
                              {user.email && <span>• 📧 {user.email}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          {isProtected ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold flex items-center gap-1">
                              <span>🔒</span>
                              <span>PIN Védett</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold flex items-center gap-1">
                              <span>🔓</span>
                              <span>Nincs PIN</span>
                            </span>
                          )}

                          {hasOverride ? (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md font-bold">
                              ⚡ Egyedi Jog
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-md">
                              Standard
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: KEZELÉSEK & ORVOSI AUDIT                                       */}
      {/* ========================================================================= */}
      {activeTab === 'medical' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {medicalAuditData && (
            <>
              {/* Medical Overview Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white border border-teal-500/30 shadow-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-teal-100 flex items-center gap-2">
                      <span>🩺</span>
                      <span>Kezelések, Oltások és Egészségügyi Bejegyzések Auditja</span>
                    </h4>
                    <p className="text-[11px] text-teal-200/80">
                      Orvosi beavatkozások, kezelőorvos-hozzárendelések, költséghitelesítés és audit időbélyegek
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoRepairMedical}
                    disabled={isRepairingMedical}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>{isRepairingMedical ? '⏳' : '⚡'}</span>
                    <span>Hiányzó Pecsétek Pótlása</span>
                  </button>
                </div>

                {/* 4 KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center pt-1">
                  <div className="p-2 bg-slate-950/80 rounded-xl border border-teal-900/60">
                    <span className="text-[9px] text-teal-300 block font-sans font-bold">Összes Beavatkozás</span>
                    <span className="font-black text-sm text-white">{medicalAuditData.totalTreatments} db</span>
                  </div>
                  <div className="p-2 bg-slate-950/80 rounded-xl border border-teal-900/60">
                    <span className="text-[9px] text-emerald-400 block font-sans font-bold">Hiteles / Érvényes</span>
                    <span className="font-black text-sm text-emerald-300">{medicalAuditData.validTreatments} db</span>
                  </div>
                  <div className="p-2 bg-slate-950/80 rounded-xl border border-teal-900/60">
                    <span className="text-[9px] text-amber-400 block font-sans font-bold">Észrevételt Igénylő</span>
                    <span className="font-black text-sm text-amber-300">{medicalAuditData.treatmentsWithIssues} db</span>
                  </div>
                  <div className="p-2 bg-slate-950/80 rounded-xl border border-teal-900/60">
                    <span className="text-[9px] text-teal-300 block font-sans font-bold">Összes Kezelési Költség</span>
                    <span className="font-black text-sm text-teal-200">{medicalAuditData.totalMedicalCost.toLocaleString('hu-HU')} Ft</span>
                  </div>
                </div>

                {/* Subcategory breakdown */}
                <div className="flex flex-wrap gap-2 text-[10px] font-mono pt-1 text-teal-200">
                  <span className="bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-800">
                    💉 Oltások: {medicalAuditData.treatmentsByType.oltas || 0} db
                  </span>
                  <span className="bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-800">
                    🩺 Kezelések: {medicalAuditData.treatmentsByType.kezeles || 0} db
                  </span>
                  <span className="bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-800">
                    🔬 Tesztek: {medicalAuditData.treatmentsByType.teszt || 0} db
                  </span>
                  <span className="bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-800">
                    📅 Események: {medicalAuditData.treatmentsByType.esemeny || 0} db
                  </span>
                </div>

                {repairFeedback && (
                  <div className="p-2.5 bg-teal-950 border border-teal-700 rounded-xl text-teal-200 text-[11px] font-bold">
                    {repairFeedback}
                  </div>
                )}
              </div>

              {/* Medical Issues / Treatments List */}
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                  <h5 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>🩺</span>
                    <span>Audit Észrevételek & Kezelési Naplóbejegyzések</span>
                  </h5>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMedicalFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                        medicalFilter === 'ALL' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Mind ({medicalAuditData.issuesList.length})
                    </button>
                    <button
                      onClick={() => setMedicalFilter('oltas')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                        medicalFilter === 'oltas' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Oltások
                    </button>
                    <button
                      onClick={() => setMedicalFilter('kezeles')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                        medicalFilter === 'kezeles' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Kezelések
                    </button>
                  </div>
                </div>

                {medicalAuditData.issuesList.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 bg-teal-50/50 rounded-xl border border-teal-100 font-medium">
                    🎉 Minden orvosi bejegyzés, oltás és kezelés formailag és audit szempontból is tökéletes és hitelesített!
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                    {medicalAuditData.issuesList
                      .filter((item) => {
                        if (medicalFilter !== 'ALL' && item.type !== medicalFilter) return false;
                        return true;
                      })
                      .map((item) => (
                        <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="space-y-0.5">
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              <span>{item.type === 'oltas' ? '💉' : item.type === 'kezeles' ? '🩺' : '🔬'}</span>
                              <span>{item.title}</span>
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                🐾 {item.catName}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-3">
                              <span>📅 {item.date}</span>
                              <span>👨‍⚕️ {item.doctorOrAdmin || 'Nincs orvos megadva'}</span>
                              <span>💰 {item.cost.toLocaleString('hu-HU')} Ft</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] font-mono ${
                              item.status === 'missing_doctor'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : item.status === 'missing_stamp'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}>
                              {item.issueDescription || item.status}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: BE- ÉS KILÉPTETÉSEK & MUNKAMENETEK                             */}
      {/* ========================================================================= */}
      {activeTab === 'auth' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-900/60 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-indigo-100 flex items-center gap-2">
                  <span>🔑</span>
                  <span>Be- és Kiléptetési Napló & Hozzáférési Munkamenetek</span>
                </h4>
                <p className="text-[11px] text-slate-300">
                  Bejelentkezések, kijelentkezések, profilváltások, Root hozzáférések és sikertelen próbálkozások naplója
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="bg-indigo-900/80 px-2.5 py-1 rounded-xl border border-indigo-700 text-indigo-200 font-bold">
                  Összes esemény: {authLogs.length} db
                </span>
              </div>
            </div>

            {/* Auth Search & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[10px]">
              <div>
                <label className="block text-slate-400 mb-0.5 font-bold">🔍 Keresés felhasználó vagy leírás szerint:</label>
                <input
                  type="text"
                  value={authSearch}
                  onChange={(e) => setAuthSearch(e.target.value)}
                  placeholder="Keresés az auth naplóban..."
                  className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-0.5 font-bold text-xs">⚡ Művelet Típusa:</label>
                <CustomSelect
                  value={authTypeFilter}
                  onChange={(val) => setAuthTypeFilter(val)}
                  options={[
                    { value: 'ALL', label: 'Összes Hozzáférési Művelet', icon: '🌐' },
                    { value: 'LOGIN_SUCCESS', label: 'Sikeres Bejelentkezés (LOGIN_SUCCESS)', icon: '✅' },
                    { value: 'LOGIN_FAILED', label: 'Sikertelen Belépés / PIN Hiba (LOGIN_FAILED)', icon: '❌' },
                    { value: 'USER_SWITCH', label: 'Profilváltás (USER_SWITCH)', icon: '🔄' },
                    { value: 'ROOT_MODE_ENTER', label: 'Root Mód Aktiválás (ROOT_MODE_ENTER)', icon: '⚡' },
                    { value: 'ROOT_AUTH_FAILED', label: 'Root Jelszó Hiba (ROOT_AUTH_FAILED)', icon: '⚠️' },
                    { value: 'USER_CREATED', label: 'Új Felhasználó (USER_CREATED)', icon: '➕' },
                    { value: 'USER_UPDATED', label: 'Fiók Módosítás (USER_UPDATED)', icon: '✏️' },
                    { value: 'ROLE_UPDATED', label: 'Szerepkör Módosítás (ROLE_UPDATED)', icon: '🛡️' },
                  ]}
                  title="Művelet Típusának Kiválasztása"
                  colorScheme="indigo"
                  buttonClassName="w-full p-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Auth Logs Stream */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 px-1 border-b pb-2">
              <span>Munkamenet naplóbejegyzések ({filteredAuthLogs.length} találat)</span>
              {authSearch && (
                <button onClick={() => setAuthSearch('')} className="text-indigo-600 hover:underline cursor-pointer">
                  Szűrő törlése
                </button>
              )}
            </div>

            {filteredAuthLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                Nincs a keresési feltételeknek megfelelő be/kilépési naplóbejegyzés.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {filteredAuthLogs.map((log) => {
                  const isFailed = log.status === 'FAILED' || log.eventType.includes('FAILED');
                  const isRoot = log.eventType.includes('ROOT');

                  return (
                    <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-start gap-2.5">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 font-black border ${
                          isFailed
                            ? 'bg-rose-100 text-rose-700 border-rose-300'
                            : isRoot
                            ? 'bg-purple-100 text-purple-700 border-purple-300'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {isFailed ? '⚠️' : isRoot ? '⚡' : '🔑'}
                        </span>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            <span>{log.details}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase font-mono ${
                              isFailed
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2 mt-0.5">
                            <span>👤 {log.userName} ({log.userRole})</span>
                            <span>• 📅 {formatAuditDate(log.timestamp)}</span>
                            {log.ipOrClient && <span>• 💻 {log.ipOrClient}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 font-mono text-[10px] text-gray-400">
                        {log.eventType}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: GLOBÁLIS RENDSZER AUDIT ESEMÉNYFOLYAM                          */}
      {/* ========================================================================= */}
      {activeTab === 'stream' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h5 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>📜</span>
                <span>Globális Rendszer Audit Eseményfolyam (Cats, Events, TNR, Pénzügy, Auth)</span>
              </h5>
              <span className="text-[10px] text-purple-300 font-mono font-bold">
                {filteredEvents.length} / {auditEvents.length} esemény
              </span>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
              <div>
                <label className="block text-slate-400 mb-0.5 font-bold">🔍 Keresés (Név / ID / Mező):</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Keresés..."
                  className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-0.5 font-bold text-xs">⚡ Művelet (Action):</label>
                <CustomSelect
                  value={selectedAction}
                  onChange={(val) => setSelectedAction(val)}
                  options={[
                    { value: 'ALL', label: 'Mind (Létrehozás, Módosítás, Auth)', icon: '🌐' },
                    { value: 'CREATED', label: 'CREATED (Létrehozva)', icon: '➕' },
                    { value: 'UPDATED', label: 'UPDATED (Módosítva)', icon: '✏️' },
                    { value: 'AUTH', label: 'AUTH (Belépés / Kilépés)', icon: '🔑' },
                  ]}
                  title="Művelet Kiválasztása"
                  colorScheme="purple"
                  buttonClassName="w-full p-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-0.5 font-bold text-xs">🗄️ Entitás (Tábla):</label>
                <CustomSelect
                  value={selectedTable}
                  onChange={(val) => setSelectedTable(val)}
                  options={[
                    { value: 'ALL', label: 'Összes Tábla', icon: '🌐' },
                    { value: 'cats', label: 'Cica Adatlapok (cats)', icon: '🐾' },
                    { value: 'events', label: 'Egészségügyi (events)', icon: '🩺' },
                    { value: 'tnr', label: 'TNR Akciók (tnr)', icon: '✂️' },
                    { value: 'finances', label: 'Pénzügyek (finances)', icon: '💳' },
                    { value: 'auth', label: 'Munkamenetek (auth)', icon: '🔑' },
                  ]}
                  title="Entitás Kiválasztása"
                  colorScheme="purple"
                  buttonClassName="w-full p-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-0.5 font-bold text-xs">👤 Felhasználó:</label>
                <CustomSelect
                  value={selectedUser}
                  onChange={(val) => setSelectedUser(val)}
                  options={[
                    { value: 'ALL', label: 'Minden Felhasználó', icon: '🌐' },
                    ...uniqueUsers.map((u) => ({
                      value: u,
                      label: u,
                      icon: '👤',
                    })),
                  ]}
                  title="Felhasználó Kiválasztása"
                  colorScheme="purple"
                  buttonClassName="w-full p-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Events Stream */}
          {loading ? (
            <div className="p-8 text-center text-gray-400 font-mono animate-pulse bg-gray-50 rounded-xl border">
              🛡️ Audit események betöltése és feldolgozása...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
              Nincs a keresési szűrőknek megfelelő audit esemény a rendszerben.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredEvents.map((ev) => {
                const isExpanded = expandedEventId === ev.id;
                const actionBg =
                  ev.action === 'CREATED'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : ev.action === 'AUTH'
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                    : 'bg-blue-950 text-blue-300 border-blue-800';

                const tableIcon =
                  ev.entityType === 'cats'
                    ? '🐾'
                    : ev.entityType === 'events'
                    ? '🩺'
                    : ev.entityType === 'tnr'
                    ? '✂️'
                    : ev.entityType === 'finances'
                    ? '💳'
                    : '🔑';

                return (
                  <div
                    key={ev.id}
                    className="p-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${actionBg}`}>
                          {ev.action}
                        </span>
                        <span className="font-extrabold text-white flex items-center gap-1">
                          <span>{tableIcon}</span>
                          <span>{ev.entityName}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({ev.entityType} #{ev.entityId})</span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-purple-300 font-bold flex items-center gap-1">
                          <span>👤</span>
                          <span>{ev.userName}</span>
                        </span>
                        <span className="text-slate-400 font-mono">{formatAuditDate(ev.timestamp)}</span>
                        <button
                          onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                          className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer font-mono"
                        >
                          {isExpanded ? '▲ Bezár' : '▼ Részletek'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && ev.details && (
                      <div className="p-2 bg-black/80 rounded-lg text-emerald-400 font-mono text-[10px] border border-slate-900">
                        <div className="text-slate-500 border-b border-slate-800 pb-1 mb-1 font-bold">
                          Audit Record Snapshot:
                        </div>
                        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(ev.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: 360° TELJES RENDSZERAUDIT DIAGNOSZTIKA                         */}
      {/* ========================================================================= */}
      {activeTab === 'scanner' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white border border-amber-500/30 shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-900/60 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-amber-100 flex items-center gap-2">
                  <span>⚡</span>
                  <span>360° Rendszeraudit & Diagnosztikai Elemző</span>
                </h4>
                <p className="text-[11px] text-amber-200/80">
                  Egy kattintásos biztonsági pontozás, relációs integritás és orvosi/felhasználói audit
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunFullScanner}
                disabled={isScanning}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>{isScanning ? '⏳' : '🔍'}</span>
                <span>{isScanning ? 'Vizsgálat folyamatban...' : 'Audit Újrafuttatása'}</span>
              </button>
            </div>

            {fullReport && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3 bg-slate-950/90 rounded-xl border border-amber-900/60 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans font-bold">Összesített Rendszeraudit Pontszám</span>
                      <span className="text-lg font-black text-amber-300">{fullReport.overallScore} / 100%</span>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-sans">
                    <div>Vizsgálat ideje:</div>
                    <div className="font-mono text-slate-200">{formatAuditDate(fullReport.timestamp)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-center">
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-indigo-900/60">
                    <span className="text-[10px] text-indigo-300 block font-sans font-bold">🛡️ Jogosultsági Index</span>
                    <span className="text-base font-black text-white">{fullReport.userAudit.securityScore}%</span>
                    <span className="text-[9px] text-slate-400 block mt-1 font-sans">{fullReport.userAudit.activeUsers} aktív felhasználó</span>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-teal-900/60">
                    <span className="text-[10px] text-teal-300 block font-sans font-bold">🩺 Orvosi Integritás</span>
                    <span className="text-base font-black text-white">
                      {fullReport.medicalAudit.totalTreatments > 0
                        ? `${Math.round((fullReport.medicalAudit.validTreatments / fullReport.medicalAudit.totalTreatments) * 100)}%`
                        : '100%'}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-1 font-sans">{fullReport.medicalAudit.totalTreatments} orvosi bejegyzés</span>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-rose-900/60">
                    <span className="text-[10px] text-rose-300 block font-sans font-bold">🔑 Munkamenet Audit</span>
                    <span className="text-base font-black text-white">{fullReport.authAudit.loginCount} belépés</span>
                    <span className="text-[9px] text-slate-400 block mt-1 font-sans">{fullReport.authAudit.failedAttempts} sikertelen kísérlet</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
