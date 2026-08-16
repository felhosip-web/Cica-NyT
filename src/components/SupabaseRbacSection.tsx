import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAppStore } from '../store/useAppStore';
import { UserRole, UserPermissions } from '../types';
import { VisualRbacCanvasModal } from './VisualRbacCanvasModal';
import { CustomSelect } from './CustomSelect';

interface SupabaseRoleRecord {
  id: string;
  name: string;
  description?: string;
  is_system?: boolean;
  permissions?: Record<string, boolean>;
  created_at?: string;
}

interface CrudOperation {
  op: 'read' | 'create' | 'update' | 'delete';
  label: string;
  badge: string;
  sqlOp: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  permKey: keyof UserPermissions;
  desc: string;
}

interface ModuleDefinition {
  id: string;
  name: string;
  icon: string;
  table: string;
  color: string;
  operations: CrudOperation[];
}

export const SupabaseRbacSection: React.FC = () => {
  const { roles, users, addDebugLog } = useAppStore();

  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'connected' | 'error' | 'local'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fetchedRoles, setFetchedRoles] = useState<SupabaseRoleRecord[] | null>(null);
  const [fetchedUsersCount, setFetchedUsersCount] = useState<number | null>(null);
  const [lastQueryTime, setLastQueryTime] = useState<string | null>(null);

  // View mode state
  const [viewMode, setViewMode] = useState<'matrix' | 'cards' | 'tester'>('matrix');
  const [matrixStyle, setMatrixStyle] = useState<'detailed' | 'condensed'>('detailed');
  const [showCanvasModal, setShowCanvasModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Filters & Interactivity
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showRawJsonMap, setShowRawJsonMap] = useState<Record<string, boolean>>({});

  // Test Permission Checker Simulation
  const [testRoleCode, setTestRoleCode] = useState<string>('STAFF');
  const [testPermKey, setTestPermKey] = useState<keyof UserPermissions>('animal.create');

  useEffect(() => {
    const url = localStorage.getItem('supabase_url') || '';
    const key = localStorage.getItem('supabase_anon_key') || '';
    setSupabaseUrl(url);
    setSupabaseKey(key);

    if (url && key) {
      handleQuerySupabaseRbac(url, key);
    } else {
      setFetchStatus('local');
      setStatusMessage('Nincs Supabase URL/Kulcs elmentve. A helyi alkalmazás RBAC sémája látható alább.');
    }
  }, []);

  const handleQuerySupabaseRbac = async (urlOverride?: string, keyOverride?: string) => {
    const url = (urlOverride || supabaseUrl).trim();
    const key = (keyOverride || supabaseKey).trim();

    if (!url || !key) {
      setFetchStatus('local');
      setStatusMessage('Adj meg Supabase URL-t és Anon Key-t a felhő lekérdezéshez!');
      return;
    }

    setLoading(true);
    setStatusMessage('Lekérdezés folyamatban a Supabase adatbázisból...');
    addDebugLog('[Supabase RBAC] Lekérdezés indítása app_roles és app_users táblákra...');

    try {
      const client = createClient(url, key);

      // Fetch app_roles
      const { data: rolesData, error: rolesError } = await client
        .from('app_roles')
        .select('*');

      // Fetch app_users count
      const { count: usersCount, error: usersError } = await client
        .from('app_users')
        .select('*', { count: 'exact', head: true });

      if (rolesError) {
        throw new Error(`Sikertelen szerepkör lekérdezés: ${rolesError.message}`);
      }

      setFetchedRoles(rolesData as SupabaseRoleRecord[]);
      setFetchedUsersCount(usersCount ?? null);
      setFetchStatus('connected');
      const nowStr = new Date().toLocaleTimeString('hu-HU');
      setLastQueryTime(nowStr);
      setStatusMessage(`✅ Sikeres csatlakozás! ${rolesData ? rolesData.length : 0} szerepkör lekérdezve a Supabase Cloudból (${nowStr}).`);
      addDebugLog(`[Supabase RBAC] Sikeres válasz: ${rolesData?.length || 0} szerepkör betöltve.`);
    } catch (err: any) {
      console.warn('Supabase RBAC query failed:', err);
      setFetchStatus('error');
      setStatusMessage(`⚠️ Supabase hiba (${err.message}). A helyi tárolóban lévő RBAC szabályok láthatóak.`);
      addDebugLog(`[Supabase RBAC Hiba] ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleRawJson = (roleId: string) => {
    setShowRawJsonMap((prev) => ({ ...prev, [roleId]: !prev[roleId] }));
  };

  const modules: ModuleDefinition[] = [
    {
      id: 'animal',
      name: 'Állatnyilvántartás (Cats / Animals)',
      icon: '🐾',
      table: 'cats',
      color: 'pink',
      operations: [
        { op: 'read', label: 'Olvasás (Read)', badge: 'READ', sqlOp: 'SELECT', permKey: 'animal.read', desc: 'Állatlapok és törzsadatok böngészése' },
        { op: 'create', label: 'Létrehozás (Create)', badge: 'CREATE', sqlOp: 'INSERT', permKey: 'animal.create', desc: 'Új cica regisztrálása a rendszerbe' },
        { op: 'update', label: 'Módosítás (Update)', badge: 'UPDATE', sqlOp: 'UPDATE', permKey: 'animal.update', desc: 'Cica adatlap frissítése' },
        { op: 'delete', label: 'Törlés (Delete)', badge: 'DELETE', sqlOp: 'DELETE', permKey: 'animal.delete', desc: 'Cica törlése az adatbázisból' },
      ],
    },
    {
      id: 'health',
      name: 'Egészségügyi Lapok (Events / Medical)',
      icon: '🩺',
      table: 'events',
      color: 'purple',
      operations: [
        { op: 'read', label: 'Olvasás (Read)', badge: 'READ', sqlOp: 'SELECT', permKey: 'health.read', desc: 'Orvosi előzmények és oltások megtekintése' },
        { op: 'create', label: 'Létrehozás (Create)', badge: 'CREATE', sqlOp: 'INSERT', permKey: 'health.create', desc: 'Új oltás, vizsgálat rögzítése' },
        { op: 'update', label: 'Módosítás (Update)', badge: 'UPDATE', sqlOp: 'UPDATE', permKey: 'health.update', desc: 'Orvosi bejegyzések módosítása' },
        { op: 'delete', label: 'Törlés (Delete)', badge: 'DELETE', sqlOp: 'DELETE', permKey: 'health.delete', desc: 'Egészségügyi bejegyzés törlése' },
      ],
    },
    {
      id: 'tnr',
      name: 'TNR Műtéti Akciók (TNR Records)',
      icon: '✂️',
      table: 'tnr_records',
      color: 'rose',
      operations: [
        { op: 'read', label: 'Olvasás (Read)', badge: 'READ', sqlOp: 'SELECT', permKey: 'tnr.read', desc: 'Befogási és ivartalanítási akciók olvasása' },
        { op: 'create', label: 'Létrehozás (Create)', badge: 'CREATE', sqlOp: 'INSERT', permKey: 'tnr.create', desc: 'Új TNR bejegyzés rögzítése' },
        { op: 'update', label: 'Módosítás (Update)', badge: 'UPDATE', sqlOp: 'UPDATE', permKey: 'tnr.update', desc: 'TNR akció adatainak frissítése' },
        { op: 'delete', label: 'Törlés (Delete)', badge: 'DELETE', sqlOp: 'DELETE', permKey: 'tnr.delete', desc: 'TNR rekord törlése' },
      ],
    },
    {
      id: 'finance',
      name: 'Pénzügyek & Kiadások (Finance / Expenses)',
      icon: '💰',
      table: 'expenses',
      color: 'emerald',
      operations: [
        { op: 'read', label: 'Olvasás (Read)', badge: 'READ', sqlOp: 'SELECT', permKey: 'finance.read', desc: 'Kiadások és pénzügyi kimutatások olvasása' },
        { op: 'create', label: 'Létrehozás (Create)', badge: 'CREATE', sqlOp: 'INSERT', permKey: 'finance.create', desc: 'Új költség tétel felvitele' },
        { op: 'update', label: 'Módosítás (Update)', badge: 'UPDATE', sqlOp: 'UPDATE', permKey: 'finance.update', desc: 'Költség tételsor módosítása' },
        { op: 'delete', label: 'Törlés (Delete)', badge: 'DELETE', sqlOp: 'DELETE', permKey: 'finance.delete', desc: 'Költség tétel törlése' },
      ],
    },
    {
      id: 'users',
      name: 'Felhasználók & Rendszer (Users / System)',
      icon: '🔑',
      table: 'app_users',
      color: 'indigo',
      operations: [
        { op: 'read', label: 'Olvasás (Read)', badge: 'READ', sqlOp: 'SELECT', permKey: 'users.read', desc: 'Felhasználói profilok és szerepkörök olvasása' },
        { op: 'create', label: 'Létrehozás (Create)', badge: 'CREATE', sqlOp: 'INSERT', permKey: 'users.create', desc: 'Új munkatárs fiók létrehozása' },
        { op: 'update', label: 'Módosítás (Update)', badge: 'UPDATE', sqlOp: 'UPDATE', permKey: 'users.update', desc: 'Fiókok és szerepkörök szerkesztése' },
        { op: 'delete', label: 'Törlés (Delete)', badge: 'DELETE', sqlOp: 'DELETE', permKey: 'users.delete', desc: 'Felhasználó törlése' },
      ],
    },
  ];

  // Display roles from Supabase if connected, else local store roles
  const activeRolesDisplay: UserRole[] = (fetchedRoles && fetchedRoles.length > 0)
    ? fetchedRoles.map((r) => ({
        id: r.id,
        code: (r.id.toUpperCase() as any) || 'CUSTOM',
        name: r.name,
        description: r.description || 'Supabase RBAC szerepkör bejegyzés',
        isSystemRole: r.is_system,
        permissions: (r.permissions as any) || {},
      }))
    : roles;

  const filteredRoles = activeRolesDisplay.filter((role) => {
    const matchesRoleFilter = selectedRoleFilter === 'all' || role.id === selectedRoleFilter || role.code === selectedRoleFilter;
    if (!matchesRoleFilter) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesName = role.name.toLowerCase().includes(query) || role.id.toLowerCase().includes(query) || (role.code && role.code.toLowerCase().includes(query));
    const matchesDesc = role.description.toLowerCase().includes(query);
    const matchesPerms = Object.entries(role.permissions || {}).some(([k, v]) => k.toLowerCase().includes(query) && v);

    return matchesName || matchesDesc || matchesPerms;
  });

  // Calculate matrix summary statistics
  const totalRoles = activeRolesDisplay.length;
  const totalOperations = modules.length * 4;
  let totalGranted = 0;
  activeRolesDisplay.forEach((r) => {
    modules.forEach((m) => {
      m.operations.forEach((op) => {
        if (r.permissions?.[op.permKey]) {
          totalGranted++;
        }
      });
    });
  });
  const coveragePercent = totalRoles * totalOperations > 0
    ? Math.round((totalGranted / (totalRoles * totalOperations)) * 100)
    : 0;

  // Test evaluation simulation
  const selectedTestRole = activeRolesDisplay.find((r) => r.id === testRoleCode || r.code === testRoleCode) || activeRolesDisplay[0];
  const isTestPermAllowed = selectedTestRole?.permissions?.[testPermKey] === true;

  // Copy matrix summary to markdown / csv
  const handleExportMatrixMarkdown = () => {
    let md = `# Supabase RBAC CRUD Permissions Matrix\n\n`;
    md += `| Modul / Akció | ${activeRolesDisplay.map((r) => r.name).join(' | ')} |\n`;
    md += `| --- | ${activeRolesDisplay.map(() => '---').join(' | ')} |\n`;

    modules.forEach((m) => {
      m.operations.forEach((op) => {
        const rowVals = activeRolesDisplay.map((r) => (r.permissions?.[op.permKey] ? '✅ YES' : '❌ NO'));
        md += `| ${m.icon} ${m.name} - ${op.badge} (${op.sqlOp}) | ${rowVals.join(' | ')} |\n`;
      });
    });

    navigator.clipboard.writeText(md);
    alert('📋 A CRUD Jogosultsági Mátrix sikeresen másolva Markdown táblázat formátumban!');
  };

  const handleDirectJsonExport = () => {
    const savedPositions = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('cica_rls_canvas_positions') || '{}') : {};
    const config = {
      app: 'cica-nyt-rbac-rls',
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      roles,
      users,
      canvasPositions: savedPositions,
    };
    const jsonString = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cica-rls-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addDebugLog('[JSON Export] RLS konfiguráció letöltve a Mátrix felületről.');
  };

  const generateFullSqlScript = () => {
    let sql = `-- ==========================================================\n`;
    sql += `-- TELJES SUPABASE DDL ÉS ROW LEVEL SECURITY (RLS) SCRIPT\n`;
    sql += `-- Alkalmazás: Cica Nyilvántartó & Menhely Menedzsment\n`;
    sql += `-- Generálva: ${new Date().toLocaleString('hu-HU')}\n`;
    sql += `-- ==========================================================\n\n`;

    sql += `-- 0. Kiterjesztések engedélyezése\n`;
    sql += `CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n`;

    sql += `-- 1. TÁBLÁK LÉTREHOZÁSA (DDL)\n`;
    sql += `-- ----------------------------------------------------------\n\n`;

    sql += `-- 1.1. Szerepkörök tábla (app_roles)\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.app_roles (\n`;
    sql += `    id text PRIMARY KEY,\n`;
    sql += `    name text NOT NULL,\n`;
    sql += `    description text,\n`;
    sql += `    is_system boolean DEFAULT false,\n`;
    sql += `    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,\n`;
    sql += `    created_at timestamptz DEFAULT now()\n`;
    sql += `);\n\n`;

    sql += `-- 1.2. Felhasználók tábla (app_users)\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.app_users (\n`;
    sql += `    id text PRIMARY KEY,\n`;
    sql += `    email text UNIQUE,\n`;
    sql += `    name text NOT NULL,\n`;
    sql += `    role_id text REFERENCES public.app_roles(id) ON DELETE SET NULL,\n`;
    sql += `    avatar_url text,\n`;
    sql += `    active boolean DEFAULT true,\n`;
    sql += `    created_at timestamptz DEFAULT now()\n`;
    sql += `);\n\n`;

    sql += `-- 1.3. Állatnyilvántartás tábla (cats)\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.cats (\n`;
    sql += `    id text PRIMARY KEY,\n`;
    sql += `    nev text NOT NULL,\n`;
    sql += `    status text,\n`;
    sql += `    ivar text,\n`;
    sql += `    fajta text,\n`;
    sql += `    szin text,\n`;
    sql += `    kor_ev integer,\n`;
    sql += `    kor_honap integer,\n`;
    sql += `    chip_szam text,\n`;
    sql += `    befogas_helye text,\n`;
    sql += `    befogas_datuma text,\n`;
    sql += `    megjegyzes text,\n`;
    sql += `    foto_url text,\n`;
    sql += `    suly_kg numeric,\n`;
    sql += `    created_at timestamptz DEFAULT now(),\n`;
    sql += `    updated_at timestamptz DEFAULT now()\n`;
    sql += `);\n\n`;

    sql += `-- 1.4. Egészségügyi bejegyzések tábla (events)\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.events (\n`;
    sql += `    id text PRIMARY KEY,\n`;
    sql += `    cat_id text REFERENCES public.cats(id) ON DELETE CASCADE,\n`;
    sql += `    type text NOT NULL,\n`;
    sql += `    title text NOT NULL,\n`;
    sql += `    date text NOT NULL,\n`;
    sql += `    status text,\n`;
    sql += `    notes text,\n`;
    sql += `    vet_name text,\n`;
    sql += `    cost numeric,\n`;
    sql += `    created_at timestamptz DEFAULT now(),\n`;
    sql += `    updated_at timestamptz DEFAULT now()\n`;
    sql += `);\n\n`;

    sql += `-- 1.5. TNR akciók tábla (tnr_records)\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.tnr_records (\n`;
    sql += `    id text PRIMARY KEY,\n`;
    sql += `    cat_id text REFERENCES public.cats(id) ON DELETE SET NULL,\n`;
    sql += `    location text NOT NULL,\n`;
    sql += `    capture_date text NOT NULL,\n`;
    sql += `    release_date text,\n`;
    sql += `    status text NOT NULL,\n`;
    sql += `    vet_name text,\n`;
    sql += `    cost numeric,\n`;
    sql += `    notes text,\n`;
    sql += `    created_at timestamptz DEFAULT now(),\n`;
    sql += `    updated_at timestamptz DEFAULT now()\n`;
    sql += `);\n\n`;

    sql += `-- 1.6. Pénzügyi kiadások tábla (expenses)\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.expenses (\n`;
    sql += `    id text PRIMARY KEY,\n`;
    sql += `    cat_id text REFERENCES public.cats(id) ON DELETE SET NULL,\n`;
    sql += `    category text NOT NULL,\n`;
    sql += `    amount numeric NOT NULL,\n`;
    sql += `    date text NOT NULL,\n`;
    sql += `    description text,\n`;
    sql += `    invoice_number text,\n`;
    sql += `    created_at timestamptz DEFAULT now(),\n`;
    sql += `    updated_at timestamptz DEFAULT now()\n`;
    sql += `);\n\n`;

    sql += `-- 2. KEZDŐ ADATOK (SEED ROLES & USERS)\n`;
    sql += `-- ----------------------------------------------------------\n\n`;

    roles.forEach((r) => {
      const cleanDesc = (r.description || '').replace(/'/g, "''");
      const cleanName = r.name.replace(/'/g, "''");
      sql += `INSERT INTO public.app_roles (id, name, description, is_system, permissions)\n`;
      sql += `VALUES ('${r.id}', '${cleanName}', '${cleanDesc}', ${r.isSystemRole ? 'TRUE' : 'FALSE'}, '${JSON.stringify(r.permissions)}'::jsonb)\n`;
      sql += `ON CONFLICT (id) DO UPDATE SET\n`;
      sql += `  name = EXCLUDED.name,\n`;
      sql += `  description = EXCLUDED.description,\n`;
      sql += `  permissions = EXCLUDED.permissions;\n\n`;
    });

    users.forEach((u) => {
      const cleanName = u.name.replace(/'/g, "''");
      const cleanEmail = (u.email || '').replace(/'/g, "''");
      sql += `INSERT INTO public.app_users (id, email, name, role_id, active)\n`;
      sql += `VALUES ('${u.id}', '${cleanEmail}', '${cleanName}', '${u.roleId}', ${u.active !== false ? 'TRUE' : 'FALSE'})\n`;
      sql += `ON CONFLICT (id) DO UPDATE SET\n`;
      sql += `  email = EXCLUDED.email,\n`;
      sql += `  name = EXCLUDED.name,\n`;
      sql += `  role_id = EXCLUDED.role_id;\n\n`;
    });

    sql += `-- 3. ROW LEVEL SECURITY (RLS) ENGEDÉLYEZÉSE\n`;
    sql += `-- ----------------------------------------------------------\n\n`;
    sql += `ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;\n`;
    sql += `ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;\n`;
    sql += `ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;\n`;
    sql += `ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;\n`;
    sql += `ALTER TABLE public.tnr_records ENABLE ROW LEVEL SECURITY;\n`;
    sql += `ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;\n\n`;

    sql += `-- 4. RLS JOGOSULTSÁG ELLENŐRZŐ SEGÉDFÜGGVÉNY\n`;
    sql += `-- ----------------------------------------------------------\n\n`;
    sql += `CREATE OR REPLACE FUNCTION public.check_user_permission(p_permission text)\n`;
    sql += `RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$\n`;
    sql += `DECLARE\n`;
    sql += `  v_allowed boolean;\n`;
    sql += `  v_role_id text;\n`;
    sql += `BEGIN\n`;
    sql += `  -- Service Role bypass\n`;
    sql += `  IF auth.role() = 'service_role' THEN\n`;
    sql += `    RETURN true;\n`;
    sql += `  END IF;\n\n`;
    sql += `  -- Lekérdezzük a bejelentkezett felhasználó szerepkörét és az adott engedélyt\n`;
    sql += `  SELECT r.id, COALESCE((r.permissions ->> p_permission)::boolean, false)\n`;
    sql += `  INTO v_role_id, v_allowed\n`;
    sql += `  FROM public.app_users u\n`;
    sql += `  JOIN public.app_roles r ON u.role_id = r.id\n`;
    sql += `  WHERE u.id = auth.uid()::text OR u.email = (auth.jwt() ->> 'email');\n\n`;
    sql += `  -- ROOT & OWNER szerepkörök mindenhez hozzáférnek\n`;
    sql += `  IF v_role_id = 'root' OR v_role_id = 'owner' THEN\n`;
    sql += `    RETURN true;\n`;
    sql += `  END IF;\n\n`;
    sql += `  RETURN COALESCE(v_allowed, false);\n`;
    sql += `END;\n`;
    sql += `$$;\n\n`;

    sql += `-- 5. GRANULÁRIS RLS HÁZIRENDEK (POLICIES)\n`;
    sql += `-- ----------------------------------------------------------\n\n`;

    // 5.1 cats
    sql += `-- Policies for public.cats\n`;
    sql += `DROP POLICY IF EXISTS "cats_select_policy" ON public.cats;\n`;
    sql += `CREATE POLICY "cats_select_policy" ON public.cats FOR SELECT\n`;
    sql += `  USING (public.check_user_permission('animal.read') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "cats_insert_policy" ON public.cats;\n`;
    sql += `CREATE POLICY "cats_insert_policy" ON public.cats FOR INSERT\n`;
    sql += `  WITH CHECK (public.check_user_permission('animal.create') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "cats_update_policy" ON public.cats;\n`;
    sql += `CREATE POLICY "cats_update_policy" ON public.cats FOR UPDATE\n`;
    sql += `  USING (public.check_user_permission('animal.update') OR auth.role() = 'service_role')\n`;
    sql += `  WITH CHECK (public.check_user_permission('animal.update') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "cats_delete_policy" ON public.cats;\n`;
    sql += `CREATE POLICY "cats_delete_policy" ON public.cats FOR DELETE\n`;
    sql += `  USING (public.check_user_permission('animal.delete') OR auth.role() = 'service_role');\n\n`;

    // 5.2 events
    sql += `-- Policies for public.events\n`;
    sql += `DROP POLICY IF EXISTS "events_select_policy" ON public.events;\n`;
    sql += `CREATE POLICY "events_select_policy" ON public.events FOR SELECT\n`;
    sql += `  USING (public.check_user_permission('health.read') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "events_insert_policy" ON public.events;\n`;
    sql += `CREATE POLICY "events_insert_policy" ON public.events FOR INSERT\n`;
    sql += `  WITH CHECK (public.check_user_permission('health.create') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "events_update_policy" ON public.events;\n`;
    sql += `CREATE POLICY "events_update_policy" ON public.events FOR UPDATE\n`;
    sql += `  USING (public.check_user_permission('health.update') OR auth.role() = 'service_role')\n`;
    sql += `  WITH CHECK (public.check_user_permission('health.update') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "events_delete_policy" ON public.events;\n`;
    sql += `CREATE POLICY "events_delete_policy" ON public.events FOR DELETE\n`;
    sql += `  USING (public.check_user_permission('health.delete') OR auth.role() = 'service_role');\n\n`;

    // 5.3 tnr_records
    sql += `-- Policies for public.tnr_records\n`;
    sql += `DROP POLICY IF EXISTS "tnr_select_policy" ON public.tnr_records;\n`;
    sql += `CREATE POLICY "tnr_select_policy" ON public.tnr_records FOR SELECT\n`;
    sql += `  USING (public.check_user_permission('tnr.read') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "tnr_insert_policy" ON public.tnr_records;\n`;
    sql += `CREATE POLICY "tnr_insert_policy" ON public.tnr_records FOR INSERT\n`;
    sql += `  WITH CHECK (public.check_user_permission('tnr.create') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "tnr_update_policy" ON public.tnr_records;\n`;
    sql += `CREATE POLICY "tnr_update_policy" ON public.tnr_records FOR UPDATE\n`;
    sql += `  USING (public.check_user_permission('tnr.update') OR auth.role() = 'service_role')\n`;
    sql += `  WITH CHECK (public.check_user_permission('tnr.update') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "tnr_delete_policy" ON public.tnr_records;\n`;
    sql += `CREATE POLICY "tnr_delete_policy" ON public.tnr_records FOR DELETE\n`;
    sql += `  USING (public.check_user_permission('tnr.delete') OR auth.role() = 'service_role');\n\n`;

    // 5.4 expenses
    sql += `-- Policies for public.expenses\n`;
    sql += `DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;\n`;
    sql += `CREATE POLICY "expenses_select_policy" ON public.expenses FOR SELECT\n`;
    sql += `  USING (public.check_user_permission('finance.read') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;\n`;
    sql += `CREATE POLICY "expenses_insert_policy" ON public.expenses FOR INSERT\n`;
    sql += `  WITH CHECK (public.check_user_permission('finance.create') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;\n`;
    sql += `CREATE POLICY "expenses_update_policy" ON public.expenses FOR UPDATE\n`;
    sql += `  USING (public.check_user_permission('finance.update') OR auth.role() = 'service_role')\n`;
    sql += `  WITH CHECK (public.check_user_permission('finance.update') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;\n`;
    sql += `CREATE POLICY "expenses_delete_policy" ON public.expenses FOR DELETE\n`;
    sql += `  USING (public.check_user_permission('finance.delete') OR auth.role() = 'service_role');\n\n`;

    // 5.5 app_users
    sql += `-- Policies for public.app_users\n`;
    sql += `DROP POLICY IF EXISTS "app_users_select_policy" ON public.app_users;\n`;
    sql += `CREATE POLICY "app_users_select_policy" ON public.app_users FOR SELECT\n`;
    sql += `  USING (public.check_user_permission('users.read') OR auth.role() = 'service_role' OR id = auth.uid()::text);\n\n`;

    sql += `DROP POLICY IF EXISTS "app_users_insert_policy" ON public.app_users;\n`;
    sql += `CREATE POLICY "app_users_insert_policy" ON public.app_users FOR INSERT\n`;
    sql += `  WITH CHECK (public.check_user_permission('users.create') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "app_users_update_policy" ON public.app_users;\n`;
    sql += `CREATE POLICY "app_users_update_policy" ON public.app_users FOR UPDATE\n`;
    sql += `  USING (public.check_user_permission('users.update') OR auth.role() = 'service_role' OR id = auth.uid()::text)\n`;
    sql += `  WITH CHECK (public.check_user_permission('users.update') OR auth.role() = 'service_role' OR id = auth.uid()::text);\n\n`;

    sql += `DROP POLICY IF EXISTS "app_users_delete_policy" ON public.app_users;\n`;
    sql += `CREATE POLICY "app_users_delete_policy" ON public.app_users FOR DELETE\n`;
    sql += `  USING (public.check_user_permission('users.delete') OR auth.role() = 'service_role');\n\n`;

    // 5.6 app_roles
    sql += `-- Policies for public.app_roles\n`;
    sql += `DROP POLICY IF EXISTS "app_roles_select_policy" ON public.app_roles;\n`;
    sql += `CREATE POLICY "app_roles_select_policy" ON public.app_roles FOR SELECT\n`;
    sql += `  USING (true);\n\n`;

    sql += `DROP POLICY IF EXISTS "app_roles_insert_policy" ON public.app_roles;\n`;
    sql += `CREATE POLICY "app_roles_insert_policy" ON public.app_roles FOR INSERT\n`;
    sql += `  WITH CHECK (public.check_user_permission('users.create') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "app_roles_update_policy" ON public.app_roles;\n`;
    sql += `CREATE POLICY "app_roles_update_policy" ON public.app_roles FOR UPDATE\n`;
    sql += `  USING (public.check_user_permission('users.update') OR auth.role() = 'service_role')\n`;
    sql += `  WITH CHECK (public.check_user_permission('users.update') OR auth.role() = 'service_role');\n\n`;

    sql += `DROP POLICY IF EXISTS "app_roles_delete_policy" ON public.app_roles;\n`;
    sql += `CREATE POLICY "app_roles_delete_policy" ON public.app_roles FOR DELETE\n`;
    sql += `  USING (public.check_user_permission('users.delete') OR auth.role() = 'service_role');\n\n`;

    sql += `-- 6. INDEXEK AZ OPTIMÁLIS PERFORMANCIÁÉRT\n`;
    sql += `-- ----------------------------------------------------------\n\n`;
    sql += `CREATE INDEX IF NOT EXISTS idx_cats_status ON public.cats(status);\n`;
    sql += `CREATE INDEX IF NOT EXISTS idx_events_cat_id ON public.events(cat_id);\n`;
    sql += `CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);\n`;
    sql += `CREATE INDEX IF NOT EXISTS idx_tnr_cat_id ON public.tnr_records(cat_id);\n`;
    sql += `CREATE INDEX IF NOT EXISTS idx_expenses_cat_id ON public.expenses(cat_id);\n`;
    sql += `CREATE INDEX IF NOT EXISTS idx_app_users_role_id ON public.app_users(role_id);\n\n`;

    return sql;
  };

  const handleDirectSqlDownload = () => {
    const sql = generateFullSqlScript();
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cica-supabase-schema-rls-${new Date().toISOString().slice(0, 10)}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addDebugLog('[SQL Export] SQL DDL & RLS script sikeresen letöltve.');
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Supabase RBAC Header Banner */}
      <div className="p-4 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl border border-purple-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h4 className="font-extrabold text-sm text-purple-200">
                Supabase Cloud RBAC & CRUD Jogosultsági Áttekintő
              </h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug max-w-xl">
              Tekintse át a Supabase PostgreSQL adatbázisban és a kliens alkalmazásban konfigurált szerepköröket (ROOT, OWNER, STAFF, FOSTER, VOLUNTEER stb.) és a hozzájuk tartozó granuláris Row Level Security (RLS) engedélyeket.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCanvasModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer text-[11px] animate-pulse"
              title="Vizuális Drag & Drop RLS Jogosultság Szerkesztő Canvas megnyitása"
            >
              <span>🎨</span>
              <span>Drag & Drop Canvas Szerkesztő</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer text-[11px]"
              title="Teljes Supabase SQL DDL és RLS Házirend Script megtekintése / letöltése"
            >
              <span>📜</span>
              <span>Teljes SQL Script (.sql)</span>
            </button>

            <button
              type="button"
              onClick={handleDirectJsonExport}
              className="px-3 py-2 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-bold rounded-xl border border-emerald-700 transition flex items-center gap-1.5 cursor-pointer text-[11px]"
              title="RLS & Szerepkör Konfiguráció letöltése JSON fájlba"
            >
              <span>📥</span>
              <span>JSON Export</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCanvasModal(true)}
              className="px-3 py-2 bg-amber-900/80 hover:bg-amber-800 text-amber-200 font-bold rounded-xl border border-amber-700 transition flex items-center gap-1.5 cursor-pointer text-[11px]"
              title="JSON Import felület megnyitása a Canvas munkaterületen"
            >
              <span>📤</span>
              <span>JSON Import</span>
            </button>

            <button
              type="button"
              onClick={handleExportMatrixMarkdown}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-200 font-bold rounded-xl border border-purple-700 transition flex items-center gap-1.5 cursor-pointer text-[11px]"
              title="Másolás Markdown táblázatként"
            >
              <span>📋</span>
              <span>Mátrix Exportálása</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuerySupabaseRbac()}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 text-[11px]"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Lekérdezés...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Supabase Lekérdezése</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status & Stats Bar */}
        <div className="pt-2 border-t border-purple-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-bold">Kapcsolat:</span>
            {fetchStatus === 'connected' ? (
              <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-black rounded-full text-[10px] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ⚡ Supabase Cloud Kapcsolódva
              </span>
            ) : fetchStatus === 'error' ? (
              <span className="px-2.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-700/60 font-black rounded-full text-[10px] flex items-center gap-1">
                ⚠️ Helyi Adatmodell (Supabase Hiba)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-slate-800 text-purple-300 border border-purple-700/60 font-bold rounded-full text-[10px]">
                🌐 Helyi Alkalmazás Sémája
              </span>
            )}

            {lastQueryTime && (
              <span className="text-[10px] text-slate-400 font-mono">
                Utolsó frissítés: {lastQueryTime}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="bg-purple-900/60 text-purple-200 border border-purple-700 px-2 py-0.5 rounded-lg">
              👑 Szerepkörök: <strong>{totalRoles} db</strong>
            </span>
            <span className="bg-purple-900/60 text-emerald-300 border border-purple-700 px-2 py-0.5 rounded-lg">
              ✓ Engedélyezett műveletek: <strong>{totalGranted} / {totalRoles * totalOperations} ({coveragePercent}%)</strong>
            </span>
            {fetchedUsersCount !== null && (
              <span className="bg-purple-900/60 text-purple-200 border border-purple-700 px-2 py-0.5 rounded-lg">
                👥 Felhasználók: <strong>{fetchedUsersCount} db</strong>
              </span>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className={`p-2 rounded-xl text-[10px] font-bold border ${
            fetchStatus === 'connected'
              ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800/80'
              : fetchStatus === 'error'
              ? 'bg-rose-950/80 text-rose-200 border-rose-800/80'
              : 'bg-slate-950/80 text-purple-200 border-purple-800/80'
          }`}>
            {statusMessage}
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs & View Mode Bar */}
      <div className="p-3 bg-white border border-gray-200 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
        {/* Main View Mode Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'matrix'
                ? 'bg-white text-indigo-900 shadow-xs font-black'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>📊</span>
            <span>CRUD Jogosultsági Mátrix</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'cards'
                ? 'bg-white text-indigo-900 shadow-xs font-black'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>📇</span>
            <span>Szerepkör Kártyák</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('tester')}
            className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'tester'
                ? 'bg-white text-indigo-900 shadow-xs font-black'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>🧪</span>
            <span>RLS Tesztelő</span>
          </button>
        </div>

        {/* Matrix Controls / Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === 'matrix' && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setMatrixStyle('detailed')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  matrixStyle === 'detailed'
                    ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Részletes CRUD
              </button>
              <button
                type="button"
                onClick={() => setMatrixStyle('condensed')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  matrixStyle === 'condensed'
                    ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Összegző [R|C|U|D]
              </button>
            </div>
          )}

          <div className="w-48 sm:w-56">
            <CustomSelect
              value={selectedRoleFilter}
              onChange={(val) => setSelectedRoleFilter(val)}
              options={[
                { value: 'all', label: `Összes Szerepkör (${activeRolesDisplay.length})`, icon: '🔍' },
                ...activeRolesDisplay.map((r) => ({
                  value: r.id,
                  label: `${r.name} (${r.id})`,
                  icon: '🛡️',
                })),
              ]}
              title="Szerepkör Szűrő"
              colorScheme="purple"
              buttonClassName="p-1.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900 text-xs"
            />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keresés..."
            className="p-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 w-36 sm:w-48"
          />
        </div>
      </div>

      {/* VIEW 1: VISUAL PERMISSIONS MATRIX TABLE */}
      {viewMode === 'matrix' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden space-y-0">
          <div className="p-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-900">
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <div>
                <h5 className="font-extrabold text-xs text-indigo-100 uppercase tracking-wider">
                  Supabase RBAC CRUD Jogosultsági Mátrix
                </h5>
                <p className="text-[10px] text-slate-300 font-medium">
                  Atomi CRUD (Read / Create / Update / Delete) engedélyek mátrixos nézete az alkalmazás moduljaira.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-md">
                ✓ Engedélyezve
              </span>
              <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-700/60 rounded-md">
                ✕ Megtagadva
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-100 border-b border-gray-200 text-gray-800 text-[11px]">
                  <th className="p-3 font-black w-64 sticky left-0 bg-slate-100 z-10 shadow-xs">
                    Modul / CRUD Művelet
                  </th>
                  {filteredRoles.map((role) => {
                    const userCount = users.filter((u) => u.roleId === role.id || u.roleId === role.code?.toLowerCase()).length;
                    return (
                      <th key={role.id} className="p-2.5 font-extrabold text-center border-l border-gray-200 min-w-[110px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm">
                            {role.code === 'ROOT' ? '👑' : role.code === 'OWNER' ? '🏆' : role.code === 'STAFF' ? '🩺' : role.code === 'FOSTER' ? '🏡' : role.code === 'VOLUNTEER' ? '🤝' : '👤'}
                          </span>
                          <span className="font-black text-gray-900 text-xs truncate max-w-[120px]" title={role.name}>
                            {role.name}
                          </span>
                          <span className="px-1.5 py-0.2 bg-purple-100 text-purple-900 font-mono text-[9px] font-black rounded border border-purple-200">
                            {role.id}
                          </span>
                          <span className="text-[9px] text-gray-500 font-medium">
                            👥 {userCount} fő
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 text-[11px]">
                {/* DETAILED MATRIX STYLE */}
                {matrixStyle === 'detailed' && (
                  modules.map((m) => (
                    <React.Fragment key={m.id}>
                      {/* Module Header Row */}
                      <tr className="bg-slate-800 text-white font-extrabold">
                        <td
                          colSpan={filteredRoles.length + 1}
                          className="p-2.5 bg-slate-900 text-purple-200 font-black text-xs uppercase tracking-wider flex items-center gap-2"
                        >
                          <span className="text-sm">{m.icon}</span>
                          <span>{m.name}</span>
                          <span className="ml-auto font-mono text-[10px] text-purple-300 font-normal bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                            RLS Table: <code>{m.table}</code>
                          </span>
                        </td>
                      </tr>

                      {/* Operations Rows */}
                      {m.operations.map((op) => (
                        <tr key={op.permKey} className="hover:bg-purple-50/40 transition">
                          <td className="p-2.5 font-bold text-gray-900 sticky left-0 bg-white shadow-xs border-r border-gray-200 space-y-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-xs text-gray-900">
                                {op.label}
                              </span>
                              <span className={`px-1.5 py-0.2 font-mono text-[8px] font-black rounded uppercase border ${
                                op.op === 'read' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                                op.op === 'create' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' :
                                op.op === 'update' ? 'bg-amber-100 text-amber-900 border-amber-200' :
                                'bg-rose-100 text-rose-900 border-rose-200'
                              }`}>
                                {op.sqlOp}
                              </span>
                            </div>
                            <div className="text-[9px] text-gray-500 font-mono truncate">
                              Key: {op.permKey}
                            </div>
                          </td>

                          {filteredRoles.map((role) => {
                            const isAllowed = role.permissions?.[op.permKey] === true;

                            return (
                              <td
                                key={`${role.id}-${op.permKey}`}
                                className={`p-2 text-center border-l border-gray-200 align-middle ${
                                  isAllowed ? 'bg-emerald-50/50' : 'bg-gray-50/30'
                                }`}
                              >
                                {isAllowed ? (
                                  <div className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-emerald-600 text-white font-black text-[10px] rounded-lg shadow-2xs border border-emerald-700">
                                    <span>✓</span>
                                    <span>Engedélyezve</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-400 font-bold text-[10px] rounded-lg border border-gray-200 opacity-60">
                                    <span>✕</span>
                                    <span>Megtagadva</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}

                {/* CONDENSED MATRIX STYLE */}
                {matrixStyle === 'condensed' && (
                  modules.map((m) => (
                    <tr key={m.id} className="hover:bg-purple-50/40 transition">
                      <td className="p-3 font-extrabold text-gray-900 sticky left-0 bg-white shadow-xs border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{m.icon}</span>
                          <div>
                            <div className="font-black text-xs text-gray-900">{m.name}</div>
                            <div className="text-[9px] font-mono text-gray-500">Table: {m.table}</div>
                          </div>
                        </div>
                      </td>

                      {filteredRoles.map((role) => {
                        const canR = role.permissions?.[m.operations[0].permKey] === true;
                        const canC = role.permissions?.[m.operations[1].permKey] === true;
                        const canU = role.permissions?.[m.operations[2].permKey] === true;
                        const canD = role.permissions?.[m.operations[3].permKey] === true;

                        return (
                          <td key={`${role.id}-${m.id}`} className="p-2 text-center border-l border-gray-200 align-middle">
                            <div className="inline-flex items-center justify-center gap-1 p-1 bg-gray-50 border border-gray-200 rounded-xl shadow-2xs">
                              <span className={`px-1.5 py-0.5 rounded font-mono font-black text-[10px] ${canR ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`} title="Read / SELECT">R</span>
                              <span className={`px-1.5 py-0.5 rounded font-mono font-black text-[10px] ${canC ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`} title="Create / INSERT">C</span>
                              <span className={`px-1.5 py-0.5 rounded font-mono font-black text-[10px] ${canU ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-400'}`} title="Update / UPDATE">U</span>
                              <span className={`px-1.5 py-0.5 rounded font-mono font-black text-[10px] ${canD ? 'bg-rose-600 text-white' : 'bg-gray-200 text-gray-400'}`} title="Delete / DELETE">D</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: ROLES & PERMISSIONS CARDS LISTING */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {filteredRoles.map((role) => {
            const userCount = users.filter((u) => u.roleId === role.id || u.roleId === role.code?.toLowerCase()).length;
            const isRawJsonOpen = !!showRawJsonMap[role.id];

            return (
              <div
                key={role.id}
                className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3.5 shadow-2xs hover:border-purple-300 transition"
              >
                {/* Role Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">
                        {role.code === 'ROOT' ? '👑' : role.code === 'OWNER' ? '🏆' : role.code === 'STAFF' ? '🩺' : role.code === 'FOSTER' ? '🏡' : role.code === 'VOLUNTEER' ? '🤝' : '👤'}
                      </span>
                      <h5 className="font-black text-gray-900 text-sm">{role.name}</h5>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-900 font-mono text-[10px] font-black rounded-md border border-purple-200">
                        ID: {role.id}
                      </span>
                      {role.isSystemRole && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[9px] rounded border border-slate-300">
                          Gyári Rendszer Szerepkör
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                      {role.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-800 font-extrabold text-[10px] rounded-xl border border-purple-200">
                      👥 {userCount} Hozzárendelt Felhasználó
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleRawJson(role.id)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-purple-300 font-mono text-[10px] font-bold rounded-xl transition cursor-pointer"
                    >
                      {isRawJsonOpen ? '✕ JSON Bezárása' : '{ } Raw JSON'}
                    </button>
                  </div>
                </div>

                {/* Collapsible Raw JSON preview */}
                {isRawJsonOpen && (
                  <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1">
                      <span>// Supabase app_roles.permissions (JSONB) Structure:</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(role.permissions, null, 2))}
                        className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
                      >
                        📋 Másolás
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap break-all leading-tight">
                      {JSON.stringify(role.permissions, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Categorized Permissions Grid */}
                <div className="space-y-3">
                  {modules.map((m) => (
                    <div key={m.id} className="space-y-1.5">
                      <div className="font-extrabold text-[11px] text-gray-800 flex items-center gap-1.5 border-b border-gray-100 pb-1">
                        <span>{m.icon}</span>
                        <span>{m.name}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {m.operations.map((op) => {
                          const isAllowed = role.permissions?.[op.permKey] === true;

                          return (
                            <div
                              key={op.permKey}
                              className={`p-2 rounded-xl border transition flex flex-col justify-between space-y-1 ${
                                isAllowed
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                  : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-black text-[10px] break-all">
                                  {op.permKey}
                                </span>
                                {isAllowed ? (
                                  <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-black text-[8px] rounded uppercase shrink-0">
                                    ✓ Engedélyezve
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 bg-gray-200 text-gray-600 font-bold text-[8px] rounded uppercase shrink-0">
                                    ✕ Tiltva
                                  </span>
                                )}
                              </div>

                              <p className="text-[9px] text-gray-600 line-clamp-1 font-medium">
                                {op.desc}
                              </p>

                              <div className="text-[8px] font-mono text-slate-500 bg-white/80 p-1 rounded border border-gray-200/80 truncate">
                                🛡️ {m.table} FOR {op.sqlOp}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredRoles.length === 0 && (
            <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
              <span className="text-2xl">🔍</span>
              <p className="font-bold text-gray-700 text-xs">Nem található a keresésnek megfelelő szerepkör.</p>
              <button
                onClick={() => { setSelectedRoleFilter('all'); setSearchQuery(''); }}
                className="text-purple-600 font-bold hover:underline text-xs cursor-pointer"
              >
                Szűrők alaphelyzetbe állítása
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: INTERACTIVE SUPABASE RLS SIMULATION TESTER */}
      {(viewMode === 'tester' || viewMode === 'matrix' || viewMode === 'cards') && (
        <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-700 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="font-black text-xs text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
              🧪 Supabase check_user_permission() RLS Tesztelő Engine
            </h4>
            <span className="text-[9px] bg-purple-950 text-purple-200 border border-purple-800 px-2 py-0.5 rounded-full font-bold">
              PostgreSQL RLS Simulator
            </span>
          </div>

          <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
            Teszteld le, hogy a Supabase PostgreSQL adatbázis RLS szabálya szerinti <code className="font-mono text-pink-300">check_user_permission('{testPermKey}')</code> függvény milyen értéket adna vissza a kiválasztott szerepkörre!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pt-1">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 mb-1">Tesztelt Szerepkör:</label>
              <CustomSelect
                value={testRoleCode}
                onChange={(val) => setTestRoleCode(val)}
                options={activeRolesDisplay.map((r) => ({
                  value: r.id,
                  label: `${r.name} (${r.id})`,
                  icon: '🛡️',
                }))}
                title="Tesztelt Szerepkör Kiválasztása"
                colorScheme="purple"
                buttonClassName="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl font-bold text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 mb-1">Lekérdezett Jogosultság Kulcs:</label>
              <CustomSelect
                value={testPermKey}
                onChange={(val) => setTestPermKey(val as any)}
                options={modules.flatMap((m) => m.operations).map((op) => ({
                  value: op.permKey,
                  label: `${op.permKey} (${op.desc})`,
                  icon: '🔑',
                }))}
                title="Jogosultság Kulcs Kiválasztása"
                colorScheme="purple"
                buttonClassName="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl font-bold text-slate-100 text-xs font-mono"
              />
            </div>

            <div className="p-2.5 rounded-xl border flex items-center justify-between gap-2 sm:mt-5 bg-slate-950 border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold">RLS Válasz:</span>
              {isTestPermAllowed ? (
                <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono font-black text-xs rounded-lg flex items-center gap-1 shadow-sm">
                  <span>TRUE</span>
                  <span>✅ (Engedélyezve)</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-rose-950 text-rose-300 border border-rose-700 font-mono font-black text-xs rounded-lg flex items-center gap-1 shadow-sm">
                  <span>FALSE</span>
                  <span>❌ (Megtagadva)</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Standalone SQL Export Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <h4 className="font-extrabold text-sm text-purple-200">
                  Teljes Supabase DDL & Row Level Security (RLS) SQL Script
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Az alábbi önálló PostgreSQL script hiánytalanul tartalmazza az összes táblát (<code className="text-purple-300 font-mono">app_roles, app_users, cats, events, tnr_records, expenses</code>), a kezdő adatokat (seed), a biztonsági RLS házirendeket (SELECT, INSERT, UPDATE, DELETE), a jogosultság-ellenőrző függvényt és a teljesítmény indexeket. Futtasd le a Supabase SQL Editor-ban!
            </p>

            <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-2xl border border-slate-800 max-h-80 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{generateFullSqlScript()}</pre>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <span className="text-[10px] text-slate-400 font-mono">
                6 Adatbázis Tábla + RLS Szabályok + Seed Adatok
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generateFullSqlScript());
                    alert('📋 Az SQL script sikeresen másolva a vágólapra!');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span>📋</span>
                  <span>SQL Másolása</span>
                </button>
                <button
                  type="button"
                  onClick={handleDirectSqlDownload}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>SQL Fájl Letöltése (.sql)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Bezárás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Drag & Drop Canvas Workspace Modal */}
      <VisualRbacCanvasModal
        isOpen={showCanvasModal}
        onClose={() => setShowCanvasModal(false)}
      />
    </div>
  );
};
