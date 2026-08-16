import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { UserAccount, UserRole, UserPermissions, DEFAULT_PERMISSIONS_FULL } from '../types';
import { SupabaseRbacSection } from './SupabaseRbacSection';
import { VisualRbacCanvasModal } from './VisualRbacCanvasModal';
import { logAuthAuditEvent } from '../services/authAuditService';
import { CustomSelect } from './CustomSelect';

export const UserPermissionsManager: React.FC = () => {
  const {
    multiUserModeEnabled,
    setMultiUserModeEnabled,
    users,
    roles,
    currentUserId,
    setCurrentUserId,
    addUser,
    updateUser,
    deleteUser,
    addRole,
    updateRole,
    deleteRole,
    resetUsersAndRoles,
    addDebugLog,
    isRootMode,
  } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'roles' | 'supabase'>('accounts');
  const [showCanvasModal, setShowCanvasModal] = useState(false);

  // --- User Form Modal State ---
  const [editingUser, setEditingUser] = useState<UserAccount | null | 'new'>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('caregiver');
  const [userEmoji, setUserEmoji] = useState('🩺');
  const [userPin, setUserPin] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userActive, setUserActive] = useState(true);
  const [hasCustomOverride, setHasCustomOverride] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<Partial<UserPermissions>>({});

  // --- Role Form Modal State ---
  const [editingRole, setEditingRole] = useState<UserRole | null | 'new'>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [rolePermissions, setRolePermissions] = useState<UserPermissions>({ ...DEFAULT_PERMISSIONS_FULL });

  // --- PIN Switch Modal State ---
  const [switchingToUser, setSwitchingToUser] = useState<UserAccount | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // --- Reset Confirmation ---
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const handleOpenNewUserModal = () => {
    setEditingUser('new');
    setUserName('');
    setUserRole('caregiver');
    setUserEmoji('🩺');
    setUserPin('');
    setUserEmail('');
    setUserPhone('');
    setUserActive(true);
    setHasCustomOverride(false);
    setCustomPermissions({});
  };

  const handleOpenEditUserModal = (user: UserAccount) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserRole(user.roleId);
    setUserEmoji(user.avatarEmoji);
    setUserPin(user.pin || '');
    setUserEmail(user.email || '');
    setUserPhone(user.phone || '');
    setUserActive(user.active);
    setHasCustomOverride(!!user.customPermissionsOverride);
    setCustomPermissions(user.customPermissionsOverride || {});
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    if (editingUser === 'new') {
      const newUser: UserAccount = {
        id: `user_${Date.now()}`,
        name: userName.trim(),
        roleId: userRole,
        avatarEmoji: userEmoji || '👤',
        pin: userPin.trim(),
        email: userEmail.trim(),
        phone: userPhone.trim(),
        active: userActive,
        customPermissionsOverride: hasCustomOverride ? customPermissions : undefined,
      };
      addUser(newUser);
      addDebugLog(`[Multi-User] Új felhasználó hozzáadva: ${newUser.name}`);
      logAuthAuditEvent('USER_CREATED', { id: currentUser.id, name: currentUser.name, roleId: currentUser.roleId }, `Új felhasználó regisztrálva: ${newUser.name} (${newUser.roleId})`, {
        targetUserId: newUser.id,
        targetUserName: newUser.name,
      });
    } else if (editingUser) {
      updateUser(editingUser.id, {
        name: userName.trim(),
        roleId: userRole,
        avatarEmoji: userEmoji || '👤',
        pin: userPin.trim(),
        email: userEmail.trim(),
        phone: userPhone.trim(),
        active: userActive,
        customPermissionsOverride: hasCustomOverride ? customPermissions : undefined,
      });
      addDebugLog(`[Multi-User] Felhasználó frissítve: ${userName}`);
      logAuthAuditEvent('USER_UPDATED', { id: currentUser.id, name: currentUser.name, roleId: currentUser.roleId }, `Felhasználó adatai és jogosultsági szintje frissítve: ${userName}`, {
        targetUserId: editingUser.id,
        targetUserName: userName,
        metadata: { roleId: userRole, hasCustomOverride },
      });
    }

    setEditingUser(null);
  };

  const handleOpenNewRoleModal = () => {
    setEditingRole('new');
    setRoleName('');
    setRoleDescription('');
    setRolePermissions({
      ...DEFAULT_PERMISSIONS_FULL,
      'animal.delete': false,
      'health.delete': false,
      'tnr.delete': false,
      'finance.delete': false,
      'users.create': false,
      'users.update': false,
      'users.delete': false,
      canDeleteCat: false,
      canManageSettings: false,
      canManageUsers: false,
    });
  };

  const handleOpenEditRoleModal = (role: UserRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description);
    setRolePermissions({ ...role.permissions });
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    if (editingRole === 'new') {
      const newRole: UserRole = {
        id: `role_${Date.now()}`,
        name: roleName.trim(),
        description: roleDescription.trim(),
        isSystemRole: false,
        permissions: rolePermissions,
      };
      addRole(newRole);
      addDebugLog(`[Multi-User] Új szerepkör létrehozva: ${newRole.name}`);
      logAuthAuditEvent('ROLE_CREATED', { id: currentUser.id, name: currentUser.name, roleId: currentUser.roleId }, `Új jogosultsági szerepkör létrehozva: ${newRole.name}`);
    } else if (editingRole) {
      updateRole(editingRole.id, {
        name: roleName.trim(),
        description: roleDescription.trim(),
        permissions: rolePermissions,
      });
      addDebugLog(`[Multi-User] Szerepkör frissítve: ${roleName}`);
      logAuthAuditEvent('ROLE_UPDATED', { id: currentUser.id, name: currentUser.name, roleId: currentUser.roleId }, `Jogosultsági szerepkör frissítve: ${roleName}`);
    }

    setEditingRole(null);
  };

  const handleAttemptUserSwitch = (targetUser: UserAccount) => {
    if (targetUser.id === currentUserId) return;

    if (targetUser.pin && targetUser.pin.trim().length > 0) {
      setSwitchingToUser(targetUser);
      setEnteredPin('');
      setPinError(false);
    } else {
      setCurrentUserId(targetUser.id);
      addDebugLog(`[Multi-User] Aktív profil átváltva: ${targetUser.name}`);
      logAuthAuditEvent('USER_SWITCH', { id: targetUser.id, name: targetUser.name, roleId: targetUser.roleId }, `Profilváltás PIN kód nélkül: ${currentUser.name} ➔ ${targetUser.name}`);
    }
  };

  const handleConfirmPinSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!switchingToUser) return;

    if (enteredPin === switchingToUser.pin) {
      setCurrentUserId(switchingToUser.id);
      addDebugLog(`[Multi-User] Profil átváltva PIN ellenőrzéssel: ${switchingToUser.name}`);
      logAuthAuditEvent('LOGIN_SUCCESS', { id: switchingToUser.id, name: switchingToUser.name, roleId: switchingToUser.roleId }, `Sikeres bejelentkezés / profilváltás PIN hitelesítéssel: ${switchingToUser.name}`);
      setSwitchingToUser(null);
      setEnteredPin('');
      setPinError(false);
    } else {
      setPinError(true);
      logAuthAuditEvent('LOGIN_FAILED', { id: switchingToUser.id, name: switchingToUser.name, roleId: switchingToUser.roleId }, `Sikertelen PIN próbálkozás profilváltáskor: ${switchingToUser.name}`, {
        status: 'FAILED',
      });
      setEnteredPin('');
    }
  };

  const permissionCategories: {
    category: string;
    icon: string;
    items: { key: keyof UserPermissions; label: string; desc: string }[];
  }[] = [
    {
      category: '🐾 Állatnyilvántartás (Animals)',
      icon: '🐾',
      items: [
        { key: 'animal.read', label: 'Állatok Olvasása (animal.read)', desc: 'Állatlapok és adatok megtekintése' },
        { key: 'animal.create', label: 'Új Állat Hozzáadása (animal.create)', desc: 'Új cica regisztrálása a rendszerbe' },
        { key: 'animal.update', label: 'Adatok Módosítása (animal.update)', desc: 'Állat adatlapjának és státuszának frissítése' },
        { key: 'animal.delete', label: 'Állat Törlése (animal.delete)', desc: 'Cica eltávolítása a nyilvántartásból' },
      ],
    },
    {
      category: '🩺 Egészségügyi Nyilvántartás (Health)',
      icon: '🩺',
      items: [
        { key: 'health.read', label: 'Orvosi Lapok Olvasása (health.read)', desc: 'Kezelések, oltások, szűrések megtekintése' },
        { key: 'health.create', label: 'Kezelés Rögzítése (health.create)', desc: 'Új oltás, vizsgálat vagy kezelés hozzáadása' },
        { key: 'health.update', label: 'Esemény Módosítása (health.update)', desc: 'Orvosi bejegyzések frissítése' },
        { key: 'health.delete', label: 'Esemény Törlése (health.delete)', desc: 'Egészségügyi rekord törlése' },
      ],
    },
    {
      category: '✂️ TNR Műveletek (TNR)',
      icon: '✂️',
      items: [
        { key: 'tnr.read', label: 'TNR Nyilvántartás (tnr.read)', desc: 'Befogási és ivartalanítási akciók megtekintése' },
        { key: 'tnr.create', label: 'Új TNR Akció (tnr.create)', desc: 'Befogás vagy ivartalanítás rögzítése' },
        { key: 'tnr.update', label: 'TNR Módosítása (tnr.update)', desc: 'Műtéti vagy elengedési adatok frissítése' },
        { key: 'tnr.delete', label: 'TNR Törlése (tnr.delete)', desc: 'TNR rekord törlése' },
      ],
    },
    {
      category: '💰 Pénzügy & Költségek (Finance)',
      icon: '💰',
      items: [
        { key: 'finance.read', label: 'Költségek Olvasása (finance.read)', desc: 'Pénzügyi kimutatások és kiadások megtekintése' },
        { key: 'finance.create', label: 'Új Költség Rögzítése (finance.create)', desc: 'Tétel hozzáadása a kiadásokhoz' },
        { key: 'finance.update', label: 'Költség Módosítása (finance.update)', desc: 'Kiadási tételek szerkesztése' },
        { key: 'finance.delete', label: 'Költség Törlése (finance.delete)', desc: 'Pénzügyi tétel eltávolítása' },
      ],
    },
    {
      category: '🔑 Felhasználók & Rendszer (Users)',
      icon: '🔑',
      items: [
        { key: 'users.read', label: 'Profilok Olvasása (users.read)', desc: 'Felhasználói fiókok és szerepkörök megtekintése' },
        { key: 'users.create', label: 'Új Felhasználó (users.create)', desc: 'Új munkatárs vagy gondozó fiók létrehozása' },
        { key: 'users.update', label: 'Fiók/Jogosultság Módosítás (users.update)', desc: 'Szerepkörök és PIN kódok szerkesztése' },
        { key: 'users.delete', label: 'Fiók Törlése (users.delete)', desc: 'Felhasználó eltávolítása a rendszerből' },
      ],
    },
  ];

  const allPermissionItems = permissionCategories.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, icon: cat.icon }))
  );

  return (
    <div className="space-y-4 text-xs">
      {/* Master Enable Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white border border-purple-500/40 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              <h4 className="font-black text-sm text-purple-200">
                Több-felhasználós Mód & Jogosultsági Szintek
              </h4>
            </div>
            <p className="text-[11px] text-purple-100/90 leading-snug max-w-xl">
              Engedélyezze a több-felhasználós üzemet gondozók, ideiglenes befogadók és önkéntesek számára. 
              Minden szerepkörhöz egyedileg testreszabhatja a hozzáférési jogosultságokat.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCanvasModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer text-xs"
              title="Vizuális Drag & Drop RLS Jogosultság Szerkesztő Canvas Munkaterület"
            >
              <span>🎨</span>
              <span>Drag & Drop Vizuális Canvas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const nextState = !multiUserModeEnabled;
                setMultiUserModeEnabled(nextState);
                addDebugLog(`[Multi-User] Több-felhasználós mód ${nextState ? 'ENGEDÉLYEZVE' : 'KIKAPCSOLVA'}`);
              }}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs shadow-sm transition flex items-center gap-2 shrink-0 cursor-pointer ${
                multiUserModeEnabled
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white ring-2 ring-emerald-300'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <span>{multiUserModeEnabled ? '✅ Mód Aktív' : '🔒 Mód Bekapcsolása'}</span>
            </button>
          </div>
        </div>

        {/* Current Active User Status Bar */}
        {multiUserModeEnabled && (
          <div className="pt-2 border-t border-purple-700/50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2 bg-purple-950/70 px-3 py-1.5 rounded-xl border border-purple-500/30">
              <span className="text-base">{currentUser?.avatarEmoji || '👤'}</span>
              <div>
                <span className="text-purple-300">Jelenlegi Aktív Profil:</span>{' '}
                <strong className="text-white font-extrabold">{currentUser?.name}</strong>{' '}
                <span className="text-[10px] bg-purple-800 text-purple-200 px-1.5 py-0.5 rounded-md ml-1 font-bold">
                  {roles.find((r) => r.id === currentUser?.roleId)?.name || currentUser?.roleId}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-purple-300 italic">
              ⚡ Gyors profilváltáshoz kattintson a kívánt felhasználóra alább.
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex border-b border-gray-200 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 text-xs sm:text-sm shrink-0 min-w-0">
        <button
          type="button"
          onClick={() => setActiveSubTab('accounts')}
          className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
            activeSubTab === 'accounts'
              ? 'border-purple-600 text-purple-600 font-black'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>👤 Felhasználói Fiókok ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('roles')}
          className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
            activeSubTab === 'roles'
              ? 'border-purple-600 text-purple-600 font-black'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>🛡️ Jogosultsági Szintek & Szerepkörök ({roles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('supabase')}
          className={`py-2.5 px-3.5 font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 text-xs sm:text-sm ${
            activeSubTab === 'supabase'
              ? 'border-indigo-600 text-indigo-600 font-black'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>⚡ Supabase Cloud RBAC Áttekintés</span>
        </button>
      </div>

      {/* SUB-TAB 1: ACCOUNTS */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="font-bold text-gray-800 text-xs">Regisztrált Felhasználók</h5>
              <p className="text-[10px] text-gray-500">Kattintson az "Átváltás" gombra a profil kiválasztásához.</p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewUserModal}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
            >
              <span>➕ Új Felhasználó</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {users.map((u) => {
              const role = roles.find((r) => r.id === u.roleId);
              const isActiveUser = u.id === currentUserId;

              return (
                <div
                  key={u.id}
                  className={`p-3 rounded-2xl border transition relative flex flex-col justify-between space-y-2 ${
                    isActiveUser
                      ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-300 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 text-xl flex items-center justify-center shrink-0 font-black shadow-2xs">
                        {u.avatarEmoji}
                      </span>
                      <div>
                        <div className="font-extrabold text-gray-900 flex items-center gap-1.5">
                          {u.name}
                          {isActiveUser && (
                            <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider">
                              Aktív
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-purple-700 mt-0.5">
                          {role?.name || u.roleId}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditUserModal(u)}
                        className="p-1 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                        title="Szerkesztés"
                      >
                        ✏️
                      </button>
                      {u.id !== 'user_root' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Biztosan törölni szeretné ezt a felhasználót: ${u.name}?`)) {
                              deleteUser(u.id);
                              logAuthAuditEvent('USER_DELETED', { id: currentUser.id, name: currentUser.name, roleId: currentUser.roleId }, `Felhasználó törölve a rendszerből: ${u.name} (ID: ${u.id})`, {
                                targetUserId: u.id,
                                targetUserName: u.name,
                              });
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Törlés"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded-xl flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span>{u.pin ? '🔑 PIN Kód' : '🔓 Nincs PIN'}</span>
                      {u.email && <span>• 📧 {u.email}</span>}
                    </div>
                    {u.customPermissionsOverride && (
                      <span className="text-amber-700 font-bold bg-amber-50 px-1 rounded border border-amber-200">
                        ⚡ Egyedi Jogok
                      </span>
                    )}
                  </div>

                  {/* Switch Action Button */}
                  <button
                    type="button"
                    onClick={() => handleAttemptUserSwitch(u)}
                    disabled={isActiveUser}
                    className={`w-full py-1.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer ${
                      isActiveUser
                        ? 'bg-purple-200 text-purple-800 cursor-default opacity-80'
                        : 'bg-gray-100 hover:bg-purple-600 hover:text-white text-gray-700'
                    }`}
                  >
                    {isActiveUser ? '✓ Ez a Bejelentkezett Fiók' : '⚡ Átváltás Erre a Profilra'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ROLES & PERMISSIONS */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="font-bold text-gray-800 text-xs">Jogosultsági Szintek (Szerepkörök)</h5>
              <p className="text-[10px] text-gray-500">Módosítsa a meglévő szerepkörök engedélyeit vagy hozzon létre újat.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-[11px]"
              >
                🔄 Alapértékek
              </button>
              <button
                type="button"
                onClick={handleOpenNewRoleModal}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>➕ Új Egyedi Szerepkör</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {roles.map((r) => (
              <div key={r.id} className="p-3.5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-start justify-between gap-2 border-b pb-2">
                  <div>
                    <h5 className="font-black text-gray-900 text-xs flex items-center gap-2">
                      <span>{r.name}</span>
                      {r.isSystemRole && (
                        <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border font-semibold">
                          Gyári Szerepkör
                        </span>
                      )}
                    </h5>
                    <p className="text-[10px] text-gray-500 mt-0.5">{r.description}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditRoleModal(r)}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-[10px] transition"
                    >
                      ✏️ Jogosultságok
                    </button>
                    {!r.isSystemRole && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Biztosan törli ezt a szerepkört: ${r.name}?`)) {
                            deleteRole(r.id);
                          }
                        }}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-[10px] transition"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* Permissions Grid Tags */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {allPermissionItems.map((perm) => {
                    const isGranted = r.permissions[perm.key];

                    return (
                      <div
                        key={perm.key}
                        className={`p-1.5 rounded-xl border flex items-center gap-1.5 text-[10px] transition ${
                          isGranted
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                            : 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                        }`}
                      >
                        <span>{perm.icon}</span>
                        <span className="truncate">{perm.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SUPABASE RBAC VIEW */}
      {activeSubTab === 'supabase' && <SupabaseRbacSection />}

      {/* USER EDIT/NEW MODAL */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-200 text-xs"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-black text-gray-900 text-sm">
                  {editingUser === 'new' ? '➕ Új Felhasználó Hozzáadása' : '✏️ Felhasználó Szerkesztése'}
                </h4>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600 font-bold text-base">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Felhasználó Neve *</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Pl. Kovács Anna"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Avatar Emoji</label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        maxLength={2}
                        value={userEmoji}
                        onChange={(e) => setUserEmoji(e.target.value)}
                        className="w-12 text-center text-lg p-1.5 bg-gray-50 border border-gray-300 rounded-xl"
                      />
                      <div className="flex gap-1 overflow-x-auto text-base">
                        {['🩺', '🏡', '🤝', '👑', '👁️', '🐱', '👨‍⚕️'].map((emo) => (
                          <button
                            key={emo}
                            type="button"
                            onClick={() => setUserEmoji(emo)}
                            className="p-1 hover:bg-purple-100 rounded cursor-pointer"
                          >
                            {emo}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Szerepkör</label>
                    <CustomSelect
                      value={userRole}
                      onChange={(val) => setUserRole(val)}
                      options={roles.map((r) => ({
                        value: r.id,
                        label: r.name,
                        icon: '🛡️',
                      }))}
                      title="Szerepkör Kiválasztása"
                      colorScheme="purple"
                      buttonClassName="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Belépési PIN Kód (Opcionális)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={userPin}
                      onChange={(e) => setUserPin(e.target.value)}
                      placeholder="Pl. 1234"
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-center tracking-widest"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Email Cím (Opcionális)</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="anna@menhely.hu"
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium"
                    />
                  </div>
                </div>

                {/* Custom Permissions Override Accordion */}
                <div className="pt-2 border-t border-gray-200">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCustomOverride}
                      onChange={(e) => setHasCustomOverride(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>⚡ Egyedi Jogosultsági Felülbírálás (User Overrides)</span>
                  </label>

                  {hasCustomOverride && (
                    <div className="mt-2.5 p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2">
                      <p className="text-[10px] text-purple-800 font-medium">
                        Kapcsolja be azokat a jogosultságokat, amelyeket kifejezetten engedélyezni vagy megtiltani kíván ennek a felhasználónak.
                      </p>
                      <div className="space-y-3">
                        {permissionCategories.map((cat) => (
                          <div key={cat.category} className="space-y-1">
                            <div className="text-[10px] font-extrabold text-purple-900 border-b border-purple-200 pb-0.5">
                              {cat.category}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {cat.items.map((p) => {
                                const val = customPermissions[p.key] ?? roles.find((r) => r.id === userRole)?.permissions[p.key];

                                return (
                                  <label key={p.key} className="flex items-center gap-2 text-[10px] font-bold text-gray-800 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!val}
                                      onChange={(e) =>
                                        setCustomPermissions({
                                          ...customPermissions,
                                          [p.key]: e.target.checked,
                                        })
                                      }
                                      className="w-3.5 h-3.5 text-purple-600 rounded"
                                    />
                                    <span>{p.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-xs transition"
                  >
                    💾 Mentés
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ROLE EDIT/NEW MODAL */}
      <AnimatePresence>
        {editingRole && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-200 text-xs"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-black text-gray-900 text-sm">
                  {editingRole === 'new' ? '➕ Új Egyedi Szerepkör' : '✏️ Szerepkör Jogosultságai'}
                </h4>
                <button onClick={() => setEditingRole(null)} className="text-gray-400 hover:text-gray-600 font-bold text-base">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRole} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Szerepkör Neve *</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Pl. 🩺 Asszisztens"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Leírás</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Rövid leírás a feladatkörről..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-800 uppercase tracking-wider mb-2">
                    🔑 Engedélyezett Jogosultságok:
                  </label>
                  <div className="space-y-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    {permissionCategories.map((cat) => (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="text-[10px] font-black text-purple-900 border-b border-purple-200 pb-0.5 flex items-center justify-between">
                          <span>{cat.category}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                          {cat.items.map((p) => {
                            const isChecked = rolePermissions[p.key];

                            return (
                              <label
                                key={p.key}
                                className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                                    : 'bg-white border-gray-200 text-gray-600'
                                }`}
                              >
                                <div>
                                  <div className="text-[11px]">{p.label}</div>
                                  <div className="text-[9px] text-gray-500 font-normal">{p.desc}</div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={!!isChecked}
                                  onChange={(e) =>
                                    setRolePermissions({
                                      ...rolePermissions,
                                      [p.key]: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setEditingRole(null)}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-xs transition"
                  >
                    💾 Szerepkör Mentése
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN SWITCH MODAL */}
      <AnimatePresence>
        {switchingToUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-purple-100 text-xs"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{switchingToUser.avatarEmoji}</span>
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-sm">Profilváltás PIN Kóddal</h4>
                    <p className="text-[10px] text-gray-500">{switchingToUser.name}</p>
                  </div>
                </div>
                <button onClick={() => setSwitchingToUser(null)} className="text-gray-400 hover:text-gray-600 font-bold text-base">
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmPinSwitch} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Adja meg a PIN kódot ({switchingToUser.name}):
                  </label>
                  <input
                    type="password"
                    autoFocus
                    maxLength={6}
                    value={enteredPin}
                    onChange={(e) => {
                      setEnteredPin(e.target.value);
                      setPinError(false);
                    }}
                    placeholder="••••"
                    className={`w-full p-3 bg-gray-50 border rounded-xl font-mono text-center text-lg tracking-widest focus:ring-2 focus:bg-white transition ${
                      pinError ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-300 focus:ring-purple-500'
                    }`}
                  />
                  {pinError && <p className="text-[10px] font-bold text-red-600 mt-1">⚠️ Hibás PIN kód!</p>}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSwitchingToUser(null)}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-xs transition"
                  >
                    🔓 Átváltás
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESET CONFIRMATION MODAL */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-red-200 text-xs"
            >
              <h4 className="font-extrabold text-red-900 text-sm flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Alapértelmezett Beállítások Visszaállítása</span>
              </h4>

              <p className="text-[11px] text-gray-600 leading-snug">
                Biztosan visszaállítja az összes felhasználói fiókot és gyári szerepkört az alapértelmezett gyári értékekre?
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                  Mégse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetUsersAndRoles();
                    setShowResetConfirm(false);
                    addDebugLog('[Multi-User] Felhasználók és szerepkörök visszaállítva alapértelmezettre');
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-xs transition"
                >
                  🔄 Visszaállítás
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Visual Drag & Drop Canvas Workspace Modal */}
      <VisualRbacCanvasModal
        isOpen={showCanvasModal}
        onClose={() => setShowCanvasModal(false)}
      />
    </div>
  );
};
