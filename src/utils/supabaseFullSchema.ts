import { APP_VERSION } from '../version';

/**
 * Generates a complete, copy-paste-ready PostgreSQL / Supabase DDL and RLS schema SQL script.
 * Can be pasted directly into Supabase Dashboard -> SQL Editor.
 */
export function generateFullSupabaseSchemaSql(): string {
  const generatedDate = new Date().toLocaleString('hu-HU');

  return `-- ====================================================================
-- CICA NYILVÁNTARTÓ (Cica-NyT v${APP_VERSION}) - TELJES SUPABASE SQL SÉMA
-- ====================================================================
-- ÚTMUTATÓ:
-- 1. Másold ki ezt a teljes SQL scriptet.
-- 2. Nyisd meg a Supabase Dashboard -> SQL Editor felületét.
-- 3. Illeszd be és kattints a "Run" gombra.
-- Új projektnél egyszer futtasd; meglévőnél IF NOT EXISTS miatt biztonságos.
-- Generálva: ${generatedDate}
-- ====================================================================

-- 0. KITERJESZTÉSEK (EXTENSIONS)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. TÁBLÁK LÉTREHOZÁSA (DDL TABLES & CONSTRAINTS)
-- ====================================================================

-- 1.1. Szerepkörök (app_roles)
CREATE TABLE IF NOT EXISTS public.app_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2. Felhasználók (app_users)
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT NOT NULL,
    pin_code TEXT,
    role_id TEXT REFERENCES public.app_roles(id) ON DELETE SET NULL,
    custom_permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_root BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3. Állatnyilvántartás (cats)
CREATE TABLE IF NOT EXISTS public.cats (
    id TEXT PRIMARY KEY,
    sorszam TEXT,
    nev TEXT NOT NULL,
    ivar TEXT,
    szin TEXT,
    szuletes TEXT,
    status TEXT DEFAULT 'gondozasban',
    chip_number TEXT,
    chip_date TEXT,
    chip_location TEXT,
    has_chip BOOLEAN DEFAULT false,
    is_spayed BOOLEAN DEFAULT false,
    spayed_date TEXT,
    spayed_location TEXT,
    has_kiskonyv BOOLEAN DEFAULT false,
    kiskonyv_szam TEXT,
    kiskonyv_date TEXT,
    has_passport BOOLEAN DEFAULT false,
    passport_szam TEXT,
    passport_date TEXT,
    intake_type TEXT DEFAULT 'sajat',
    gazdis_date TEXT,
    gazdis_person TEXT,
    foster_id TEXT,
    tags TEXT[] DEFAULT '{}'::text[],
    device_id TEXT,
    device_group TEXT DEFAULT 'foundation',
    oltasok JSONB DEFAULT '[]'::jsonb,
    tesztek JSONB DEFAULT '[]'::jsonb,
    kezelesek JSONB DEFAULT '[]'::jsonb,
    ossz_koltseg NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT,
    created_by_name TEXT,
    updated_by TEXT,
    updated_by_name TEXT
);

-- 1.4. Ideiglenes Befogadók (foster_parents)
CREATE TABLE IF NOT EXISTS public.foster_parents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    max_capacity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'aktiv',
    notes TEXT,
    is_quarantine BOOLEAN DEFAULT false,
    is_kitten_specialist BOOLEAN DEFAULT false,
    is_medical_specialist BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Foreign key add if cats was created first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_cats_foster'
    ) THEN
        ALTER TABLE public.cats ADD CONSTRAINT fk_cats_foster FOREIGN KEY (foster_id) REFERENCES public.foster_parents(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 1.5. Egészségügyi Események & Naptár (events)
CREATE TABLE IF NOT EXISTS public.events (
    id BIGSERIAL PRIMARY KEY,
    cat_id TEXT REFERENCES public.cats(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    cost NUMERIC DEFAULT 0,
    notes TEXT,
    finance_id BIGINT,
    payment_method TEXT,
    invoice_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT,
    created_by_name TEXT,
    updated_by TEXT,
    updated_by_name TEXT
);

-- 1.6. TNR Műtéti & Befogási Rekordok (tnr_records / tnr)
CREATE TABLE IF NOT EXISTS public.tnr_records (
    id TEXT PRIMARY KEY,
    cat_name_or_tag TEXT NOT NULL,
    location_trapped TEXT,
    trapped_date TEXT,
    trapped_by TEXT,
    clinic_location TEXT,
    surgeon_name TEXT,
    location_released TEXT,
    released_date TEXT,
    status TEXT DEFAULT 'befogva',
    ear_tip BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT,
    created_by_name TEXT,
    updated_by TEXT,
    updated_by_name TEXT
);

-- Alias view for tnr if app queries 'tnr' or 'tnr_records'
CREATE OR REPLACE VIEW public.tnr AS SELECT * FROM public.tnr_records;

-- 1.7. Befogadói Ellátmányok (foster_supplies)
CREATE TABLE IF NOT EXISTS public.foster_supplies (
    id BIGSERIAL PRIMARY KEY,
    foster_id TEXT REFERENCES public.foster_parents(id) ON DELETE CASCADE,
    cat_id TEXT REFERENCES public.cats(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    item TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    unit TEXT DEFAULT 'db',
    date TEXT NOT NULL,
    status TEXT DEFAULT 'igenyelve',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.8. Befogadói Kiadások (foster_expenses)
CREATE TABLE IF NOT EXISTS public.foster_expenses (
    id BIGSERIAL PRIMARY KEY,
    foster_id TEXT REFERENCES public.foster_parents(id) ON DELETE CASCADE,
    cat_id TEXT REFERENCES public.cats(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    date TEXT NOT NULL,
    receipt_number TEXT,
    vendor TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.9. Leltár & Raktárkészlet (inventory)
CREATE TABLE IF NOT EXISTS public.inventory (
    id BIGSERIAL PRIMARY KEY,
    direction TEXT NOT NULL,
    item_type TEXT NOT NULL,
    source_type TEXT,
    brand_or_name TEXT,
    quantity NUMERIC DEFAULT 1,
    unit TEXT NOT NULL,
    date TEXT NOT NULL,
    expiry_date TEXT,
    batch_number TEXT,
    min_stock_threshold NUMERIC,
    target_age_or_condition TEXT,
    source_or_recipient TEXT NOT NULL,
    destination TEXT,
    notes TEXT,
    purchase_cost NUMERIC,
    finance_id BIGINT,
    foster_supply_id BIGINT,
    sync_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.10. Pénzügyek & Adó 1% (finances)
CREATE TABLE IF NOT EXISTS public.finances (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    partner_name TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'teljesult',
    invoice_number TEXT,
    tax_year INTEGER,
    nav_reference TEXT,
    cat_id TEXT REFERENCES public.cats(id) ON DELETE SET NULL,
    foster_id TEXT REFERENCES public.foster_parents(id) ON DELETE SET NULL,
    source_module TEXT,
    source_reference_id TEXT,
    notes TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.11. Cica Súly Mérési Adatok (cat_weights)
CREATE TABLE IF NOT EXISTS public.cat_weights (
    id BIGSERIAL PRIMARY KEY,
    cat_id TEXT REFERENCES public.cats(id) ON DELETE CASCADE,
    weight NUMERIC NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.12. Adománygyűjtő Akciók (donation_campaigns)
CREATE TABLE IF NOT EXISTS public.donation_campaigns (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    location TEXT NOT NULL,
    participants TEXT[] DEFAULT '{}'::text[],
    status TEXT DEFAULT 'tervezett',
    notes TEXT,
    inventory_converted BOOLEAN DEFAULT false,
    sync_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.13. Gyűjtött Adomány Tételek (donation_campaign_items)
CREATE TABLE IF NOT EXISTS public.donation_campaign_items (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT REFERENCES public.donation_campaigns(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    brand_or_name TEXT,
    quantity NUMERIC DEFAULT 1,
    unit TEXT DEFAULT 'db',
    estimated_value NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.14. Esemény Sablonok (event_templates)
CREATE TABLE IF NOT EXISTS public.event_templates (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    default_title TEXT,
    default_cost NUMERIC,
    default_notes TEXT,
    default_status TEXT DEFAULT 'pending',
    days_offset INTEGER DEFAULT 0,
    is_built_in BOOLEAN DEFAULT false,
    category TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.15. Automatikus Mentések (auto_backups)
CREATE TABLE IF NOT EXISTS public.auto_backups (
    id BIGSERIAL PRIMARY KEY,
    timestamp TEXT NOT NULL,
    format TEXT,
    record_count INTEGER,
    trigger_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.16. Beállítások (settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.17. Eseménynapló & Audit rekordok (audit_events)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id TEXT PRIMARY KEY,
    ts TIMESTAMPTZ DEFAULT now() NOT NULL,
    level TEXT NOT NULL DEFAULT 'info',
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    user_id TEXT,
    user_name TEXT,
    role TEXT,
    entity_type TEXT,
    entity_id TEXT,
    summary TEXT NOT NULL,
    details JSONB,
    ok BOOLEAN DEFAULT true NOT NULL,
    error_message TEXT,
    app_version TEXT
);

-- ====================================================================
-- 2. ALAPÉRTELMEZETT SEED ADATOK (ROLES & USERS)
-- ====================================================================

INSERT INTO public.app_roles (id, name, description, is_system, permissions) VALUES
('root', '👑 ROOT / Főadminisztrátor', 'Korlátlan hozzáférés a teljes rendszerhez, adatbázishoz, beállításokhoz és jogosultságkezeléshez.', true, '{"animal.read":true,"animal.create":true,"animal.update":true,"animal.delete":true,"health.read":true,"health.create":true,"health.update":true,"health.delete":true,"tnr.read":true,"tnr.create":true,"tnr.update":true,"tnr.delete":true,"finance.read":true,"finance.create":true,"finance.update":true,"finance.delete":true,"users.read":true,"users.create":true,"users.update":true,"users.delete":true}'::jsonb),
('owner', '🏆 OWNER / Menhely Vezető', 'A menhely / egyesület tulajdonosa. Teljes üzleti hozzáférés: Állatok CRUD, Egészségügy CRUD, TNR CRUD, Pénzügy CRUD, Felhasználók CRUD, Beállítások CRUD.', true, '{"animal.read":true,"animal.create":true,"animal.update":true,"animal.delete":true,"health.read":true,"health.create":true,"health.update":true,"health.delete":true,"tnr.read":true,"tnr.create":true,"tnr.update":true,"tnr.delete":true,"finance.read":true,"finance.create":true,"finance.update":true,"finance.delete":true,"users.read":true,"users.create":true,"users.update":true,"users.delete":true}'::jsonb),
('staff', '🩺 STAFF / Munkatárs', 'Gondozó / munkatárs: Állatok CRUD, Egészségügy CRUD, TNR CRUD, Pénzügy Read (korlátozott olvasás), Felhasználókezelés nélkül.', true, '{"animal.read":true,"animal.create":true,"animal.update":true,"animal.delete":true,"health.read":true,"health.create":true,"health.update":true,"health.delete":true,"tnr.read":true,"tnr.create":true,"tnr.update":true,"tnr.delete":true,"finance.read":true,"finance.create":false,"finance.update":false,"finance.delete":false,"users.read":false,"users.create":false,"users.update":false,"users.delete":false}'::jsonb),
('foster', '🏡 FOSTER / Ideiglenes Befogadó', 'Ideiglenes befogadó: Állatok Read/Update, Egészségügy Read/Update, TNR Read, Pénzügy -, Felhasználók -.', true, '{"animal.read":true,"animal.create":false,"animal.update":true,"animal.delete":false,"health.read":true,"health.create":true,"health.update":true,"health.delete":false,"tnr.read":true,"tnr.create":false,"tnr.update":false,"tnr.delete":false,"finance.read":false,"finance.create":false,"finance.update":false,"finance.delete":false,"users.read":false,"users.create":false,"users.update":false,"users.delete":false}'::jsonb),
('volunteer', '🤝 VOLUNTEER / Önkéntes', 'Önkéntes segítő: Állatok Read/Korlátozott Update, Egészségügy Read, TNR Read/Create, Pénzügy -, Felhasználók -.', true, '{"animal.read":true,"animal.create":false,"animal.update":true,"animal.delete":false,"health.read":true,"health.create":false,"health.update":false,"health.delete":false,"tnr.read":true,"tnr.create":true,"tnr.update":false,"tnr.delete":false,"finance.read":false,"finance.create":false,"finance.update":false,"finance.delete":false,"users.read":false,"users.create":false,"users.update":false,"users.delete":false}'::jsonb),
('guest', '👁️ GUEST / Vendég (Olvasó)', 'Vendég / Látogató: Kizárólag olvasási jogosultság (Állatok R, Egészségügy R, TNR R).', true, '{"animal.read":true,"animal.create":false,"animal.update":false,"animal.delete":false,"health.read":true,"health.create":false,"health.update":false,"health.delete":false,"tnr.read":true,"tnr.create":false,"tnr.update":false,"tnr.delete":false,"finance.read":false,"finance.create":false,"finance.update":false,"finance.delete":false,"users.read":false,"users.create":false,"users.update":false,"users.delete":false}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions;

INSERT INTO public.app_users (id, name, pin_code, role_id, is_root) VALUES
('usr_root', 'Root Adminisztrátor', '1342', 'root', true)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 3. INDEXEK AZ OPTIMÁLIS LEKÉRDEZÉSI PERFORMANCIÁÉRT
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_cats_status ON public.cats(status);
CREATE INDEX IF NOT EXISTS idx_cats_chip_number ON public.cats(chip_number);
CREATE INDEX IF NOT EXISTS idx_cats_foster_id ON public.cats(foster_id);
CREATE INDEX IF NOT EXISTS idx_events_cat_id ON public.events(cat_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_tnr_cat_id ON public.tnr_records(cat_name_or_tag);
CREATE INDEX IF NOT EXISTS idx_foster_supplies_foster_id ON public.foster_supplies(foster_id);
CREATE INDEX IF NOT EXISTS idx_foster_expenses_foster_id ON public.foster_expenses(foster_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_type ON public.inventory(item_type);
CREATE INDEX IF NOT EXISTS idx_finances_cat_id ON public.finances(cat_id);
CREATE INDEX IF NOT EXISTS idx_finances_foster_id ON public.finances(foster_id);
CREATE INDEX IF NOT EXISTS idx_finances_tax_year ON public.finances(tax_year);
CREATE INDEX IF NOT EXISTS idx_cat_weights_cat_id ON public.cat_weights(cat_id);
CREATE INDEX IF NOT EXISTS idx_donation_items_campaign_id ON public.donation_campaign_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_ts ON public.audit_events(ts);
CREATE INDEX IF NOT EXISTS idx_audit_events_level ON public.audit_events(level);
CREATE INDEX IF NOT EXISTS idx_audit_events_category ON public.audit_events(category);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON public.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.audit_events(action);

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) ENGEDÉLYEZÉSE
-- ====================================================================

ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foster_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tnr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foster_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foster_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_campaign_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. RLS JOGOSULTSÁG ELLENŐRZŐ SEGÉDFÜGGVÉNY (PL/pgSQL HELPER)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.check_user_permission(p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id TEXT;
    v_is_root BOOLEAN;
    v_custom_perms JSONB;
    v_role_perms JSONB;
BEGIN
    v_user_id := auth.uid()::text;
    IF v_user_id IS NULL THEN
        -- Anonim / Kódalapú fallback
        RETURN TRUE;
    END IF;

    SELECT is_root, custom_permissions, r.permissions
    INTO v_is_root, v_custom_perms, v_role_perms
    FROM public.app_users u
    LEFT JOIN public.app_roles r ON u.role_id = r.id
    WHERE u.id = v_user_id;

    IF v_is_root IS TRUE THEN
        RETURN TRUE;
    END IF;

    IF v_custom_perms ? p_permission THEN
        RETURN (v_custom_perms->>p_permission)::boolean;
    END IF;

    IF v_role_perms ? p_permission THEN
        RETURN (v_role_perms->>p_permission)::boolean;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 6. GRANULÁRIS RLS POLICIES (MÁSOLHATÓ SUPABASE SZABÁLYOK)
-- ====================================================================

-- APP ROLES (SZEREPKÖRÖK)
DROP POLICY IF EXISTS "roles_select_policy" ON public.app_roles;
CREATE POLICY "roles_select_policy" ON public.app_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "roles_insert_policy" ON public.app_roles;
CREATE POLICY "roles_insert_policy" ON public.app_roles FOR INSERT WITH CHECK (public.check_user_permission('users.create'));

DROP POLICY IF EXISTS "roles_update_policy" ON public.app_roles;
CREATE POLICY "roles_update_policy" ON public.app_roles FOR UPDATE USING (public.check_user_permission('users.update'));

DROP POLICY IF EXISTS "roles_delete_policy" ON public.app_roles;
CREATE POLICY "roles_delete_policy" ON public.app_roles FOR DELETE USING (public.check_user_permission('users.delete'));

-- USERS (FELHASZNÁLÓK & PROFILOK)
DROP POLICY IF EXISTS "users_select_policy" ON public.app_users;
CREATE POLICY "users_select_policy" ON public.app_users FOR SELECT USING (public.check_user_permission('users.read'));

DROP POLICY IF EXISTS "users_insert_policy" ON public.app_users;
CREATE POLICY "users_insert_policy" ON public.app_users FOR INSERT WITH CHECK (public.check_user_permission('users.create'));

DROP POLICY IF EXISTS "users_update_policy" ON public.app_users;
CREATE POLICY "users_update_policy" ON public.app_users FOR UPDATE USING (public.check_user_permission('users.update'));

DROP POLICY IF EXISTS "users_delete_policy" ON public.app_users;
CREATE POLICY "users_delete_policy" ON public.app_users FOR DELETE USING (public.check_user_permission('users.delete'));

-- CATS (ÁLLATOK)
DROP POLICY IF EXISTS "cats_select_policy" ON public.cats;
CREATE POLICY "cats_select_policy" ON public.cats FOR SELECT USING (public.check_user_permission('animal.read'));

DROP POLICY IF EXISTS "cats_insert_policy" ON public.cats;
CREATE POLICY "cats_insert_policy" ON public.cats FOR INSERT WITH CHECK (public.check_user_permission('animal.create'));

DROP POLICY IF EXISTS "cats_update_policy" ON public.cats;
CREATE POLICY "cats_update_policy" ON public.cats FOR UPDATE USING (public.check_user_permission('animal.update'));

DROP POLICY IF EXISTS "cats_delete_policy" ON public.cats;
CREATE POLICY "cats_delete_policy" ON public.cats FOR DELETE USING (public.check_user_permission('animal.delete'));

-- CAT WEIGHTS (CICA SÚLY MÉRÉSEK)
DROP POLICY IF EXISTS "cat_weights_select_policy" ON public.cat_weights;
CREATE POLICY "cat_weights_select_policy" ON public.cat_weights FOR SELECT USING (public.check_user_permission('animal.read'));

DROP POLICY IF EXISTS "cat_weights_insert_policy" ON public.cat_weights;
CREATE POLICY "cat_weights_insert_policy" ON public.cat_weights FOR INSERT WITH CHECK (public.check_user_permission('health.create'));

DROP POLICY IF EXISTS "cat_weights_update_policy" ON public.cat_weights;
CREATE POLICY "cat_weights_update_policy" ON public.cat_weights FOR UPDATE USING (public.check_user_permission('health.update'));

DROP POLICY IF EXISTS "cat_weights_delete_policy" ON public.cat_weights;
CREATE POLICY "cat_weights_delete_policy" ON public.cat_weights FOR DELETE USING (public.check_user_permission('health.delete'));

-- FOSTER PARENTS (BEFOGADÓ HÁLÓZAT)
DROP POLICY IF EXISTS "foster_parents_select_policy" ON public.foster_parents;
CREATE POLICY "foster_parents_select_policy" ON public.foster_parents FOR SELECT USING (public.check_user_permission('animal.read'));

DROP POLICY IF EXISTS "foster_parents_insert_policy" ON public.foster_parents;
CREATE POLICY "foster_parents_insert_policy" ON public.foster_parents FOR INSERT WITH CHECK (public.check_user_permission('animal.create'));

DROP POLICY IF EXISTS "foster_parents_update_policy" ON public.foster_parents;
CREATE POLICY "foster_parents_update_policy" ON public.foster_parents FOR UPDATE USING (public.check_user_permission('animal.update'));

DROP POLICY IF EXISTS "foster_parents_delete_policy" ON public.foster_parents;
CREATE POLICY "foster_parents_delete_policy" ON public.foster_parents FOR DELETE USING (public.check_user_permission('animal.delete'));

-- FOSTER SUPPLIES (BEFOGADÓI ELLÁTMÁNYOK)
DROP POLICY IF EXISTS "foster_supplies_select_policy" ON public.foster_supplies;
CREATE POLICY "foster_supplies_select_policy" ON public.foster_supplies FOR SELECT USING (public.check_user_permission('animal.read'));

DROP POLICY IF EXISTS "foster_supplies_insert_policy" ON public.foster_supplies;
CREATE POLICY "foster_supplies_insert_policy" ON public.foster_supplies FOR INSERT WITH CHECK (public.check_user_permission('animal.create'));

DROP POLICY IF EXISTS "foster_supplies_update_policy" ON public.foster_supplies;
CREATE POLICY "foster_supplies_update_policy" ON public.foster_supplies FOR UPDATE USING (public.check_user_permission('animal.update'));

DROP POLICY IF EXISTS "foster_supplies_delete_policy" ON public.foster_supplies;
CREATE POLICY "foster_supplies_delete_policy" ON public.foster_supplies FOR DELETE USING (public.check_user_permission('animal.delete'));

-- FOSTER EXPENSES (BEFOGADÓI KIADÁSOK)
DROP POLICY IF EXISTS "foster_expenses_select_policy" ON public.foster_expenses;
CREATE POLICY "foster_expenses_select_policy" ON public.foster_expenses FOR SELECT USING (public.check_user_permission('finance.read'));

DROP POLICY IF EXISTS "foster_expenses_insert_policy" ON public.foster_expenses;
CREATE POLICY "foster_expenses_insert_policy" ON public.foster_expenses FOR INSERT WITH CHECK (public.check_user_permission('finance.create'));

DROP POLICY IF EXISTS "foster_expenses_update_policy" ON public.foster_expenses;
CREATE POLICY "foster_expenses_update_policy" ON public.foster_expenses FOR UPDATE USING (public.check_user_permission('finance.update'));

DROP POLICY IF EXISTS "foster_expenses_delete_policy" ON public.foster_expenses;
CREATE POLICY "foster_expenses_delete_policy" ON public.foster_expenses FOR DELETE USING (public.check_user_permission('finance.delete'));

-- EVENTS (EGÉSZSÉGÜGYI ESEMÉNYEK)
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
CREATE POLICY "events_select_policy" ON public.events FOR SELECT USING (public.check_user_permission('health.read'));

DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
CREATE POLICY "events_insert_policy" ON public.events FOR INSERT WITH CHECK (public.check_user_permission('health.create'));

DROP POLICY IF EXISTS "events_update_policy" ON public.events;
CREATE POLICY "events_update_policy" ON public.events FOR UPDATE USING (public.check_user_permission('health.update'));

DROP POLICY IF EXISTS "events_delete_policy" ON public.events;
CREATE POLICY "events_delete_policy" ON public.events FOR DELETE USING (public.check_user_permission('health.delete'));

-- EVENT TEMPLATES (ESEMÉNY SABLONOK)
DROP POLICY IF EXISTS "event_templates_select_policy" ON public.event_templates;
CREATE POLICY "event_templates_select_policy" ON public.event_templates FOR SELECT USING (public.check_user_permission('health.read'));

DROP POLICY IF EXISTS "event_templates_insert_policy" ON public.event_templates;
CREATE POLICY "event_templates_insert_policy" ON public.event_templates FOR INSERT WITH CHECK (public.check_user_permission('health.create'));

DROP POLICY IF EXISTS "event_templates_update_policy" ON public.event_templates;
CREATE POLICY "event_templates_update_policy" ON public.event_templates FOR UPDATE USING (public.check_user_permission('health.update'));

DROP POLICY IF EXISTS "event_templates_delete_policy" ON public.event_templates;
CREATE POLICY "event_templates_delete_policy" ON public.event_templates FOR DELETE USING (public.check_user_permission('health.delete'));

-- TNR (BEFOGÁS - IVARTALANÍTÁS)
DROP POLICY IF EXISTS "tnr_select_policy" ON public.tnr_records;
CREATE POLICY "tnr_select_policy" ON public.tnr_records FOR SELECT USING (public.check_user_permission('tnr.read'));

DROP POLICY IF EXISTS "tnr_insert_policy" ON public.tnr_records;
CREATE POLICY "tnr_insert_policy" ON public.tnr_records FOR INSERT WITH CHECK (public.check_user_permission('tnr.create'));

DROP POLICY IF EXISTS "tnr_update_policy" ON public.tnr_records;
CREATE POLICY "tnr_update_policy" ON public.tnr_records FOR UPDATE USING (public.check_user_permission('tnr.update'));

DROP POLICY IF EXISTS "tnr_delete_policy" ON public.tnr_records;
CREATE POLICY "tnr_delete_policy" ON public.tnr_records FOR DELETE USING (public.check_user_permission('tnr.delete'));

-- FINANCES (PÉNZÜGYEK & ADÓ 1%)
DROP POLICY IF EXISTS "finances_select_policy" ON public.finances;
CREATE POLICY "finances_select_policy" ON public.finances FOR SELECT USING (public.check_user_permission('finance.read'));

DROP POLICY IF EXISTS "finances_insert_policy" ON public.finances;
CREATE POLICY "finances_insert_policy" ON public.finances FOR INSERT WITH CHECK (public.check_user_permission('finance.create'));

DROP POLICY IF EXISTS "finances_update_policy" ON public.finances;
CREATE POLICY "finances_update_policy" ON public.finances FOR UPDATE USING (public.check_user_permission('finance.update'));

DROP POLICY IF EXISTS "finances_delete_policy" ON public.finances;
CREATE POLICY "finances_delete_policy" ON public.finances FOR DELETE USING (public.check_user_permission('finance.delete'));

-- INVENTORY (LELTÁR & RAKTÁR)
DROP POLICY IF EXISTS "inventory_select_policy" ON public.inventory;
CREATE POLICY "inventory_select_policy" ON public.inventory FOR SELECT USING (public.check_user_permission('finance.read'));

DROP POLICY IF EXISTS "inventory_insert_policy" ON public.inventory;
CREATE POLICY "inventory_insert_policy" ON public.inventory FOR INSERT WITH CHECK (public.check_user_permission('finance.create'));

DROP POLICY IF EXISTS "inventory_update_policy" ON public.inventory;
CREATE POLICY "inventory_update_policy" ON public.inventory FOR UPDATE USING (public.check_user_permission('finance.update'));

DROP POLICY IF EXISTS "inventory_delete_policy" ON public.inventory;
CREATE POLICY "inventory_delete_policy" ON public.inventory FOR DELETE USING (public.check_user_permission('finance.delete'));

-- DONATION CAMPAIGNS (ADOMÁNYGYŰJTŐ AKCIÓK)
DROP POLICY IF EXISTS "campaigns_select_policy" ON public.donation_campaigns;
CREATE POLICY "campaigns_select_policy" ON public.donation_campaigns FOR SELECT USING (public.check_user_permission('finance.read'));

DROP POLICY IF EXISTS "campaigns_insert_policy" ON public.donation_campaigns;
CREATE POLICY "campaigns_insert_policy" ON public.donation_campaigns FOR INSERT WITH CHECK (public.check_user_permission('finance.create'));

DROP POLICY IF EXISTS "campaigns_update_policy" ON public.donation_campaigns;
CREATE POLICY "campaigns_update_policy" ON public.donation_campaigns FOR UPDATE USING (public.check_user_permission('finance.update'));

DROP POLICY IF EXISTS "campaigns_delete_policy" ON public.donation_campaigns;
CREATE POLICY "campaigns_delete_policy" ON public.donation_campaigns FOR DELETE USING (public.check_user_permission('finance.delete'));

-- DONATION CAMPAIGN ITEMS (ADOMÁNY TÉTELEK)
DROP POLICY IF EXISTS "campaign_items_select_policy" ON public.donation_campaign_items;
CREATE POLICY "campaign_items_select_policy" ON public.donation_campaign_items FOR SELECT USING (public.check_user_permission('finance.read'));

DROP POLICY IF EXISTS "campaign_items_insert_policy" ON public.donation_campaign_items;
CREATE POLICY "campaign_items_insert_policy" ON public.donation_campaign_items FOR INSERT WITH CHECK (public.check_user_permission('finance.create'));

DROP POLICY IF EXISTS "campaign_items_update_policy" ON public.donation_campaign_items;
CREATE POLICY "campaign_items_update_policy" ON public.donation_campaign_items FOR UPDATE USING (public.check_user_permission('finance.update'));

DROP POLICY IF EXISTS "campaign_items_delete_policy" ON public.donation_campaign_items;
CREATE POLICY "campaign_items_delete_policy" ON public.donation_campaign_items FOR DELETE USING (public.check_user_permission('finance.delete'));

-- AUTO BACKUPS (AUTOMATIKUS MENTÉSEK)
DROP POLICY IF EXISTS "backups_select_policy" ON public.auto_backups;
CREATE POLICY "backups_select_policy" ON public.auto_backups FOR SELECT USING (public.check_user_permission('users.read'));

DROP POLICY IF EXISTS "backups_insert_policy" ON public.auto_backups;
CREATE POLICY "backups_insert_policy" ON public.auto_backups FOR INSERT WITH CHECK (public.check_user_permission('users.create'));

DROP POLICY IF EXISTS "backups_update_policy" ON public.auto_backups;
CREATE POLICY "backups_update_policy" ON public.auto_backups FOR UPDATE USING (public.check_user_permission('users.update'));

DROP POLICY IF EXISTS "backups_delete_policy" ON public.auto_backups;
CREATE POLICY "backups_delete_policy" ON public.auto_backups FOR DELETE USING (public.check_user_permission('users.delete'));

-- SETTINGS (RENDSZER BEÁLLÍTÁSOK)
DROP POLICY IF EXISTS "settings_select_policy" ON public.settings;
CREATE POLICY "settings_select_policy" ON public.settings FOR SELECT USING (public.check_user_permission('users.read'));

DROP POLICY IF EXISTS "settings_insert_policy" ON public.settings;
CREATE POLICY "settings_insert_policy" ON public.settings FOR INSERT WITH CHECK (public.check_user_permission('users.update'));

DROP POLICY IF EXISTS "settings_update_policy" ON public.settings;
CREATE POLICY "settings_update_policy" ON public.settings FOR UPDATE USING (public.check_user_permission('users.update'));

DROP POLICY IF EXISTS "settings_delete_policy" ON public.settings;
CREATE POLICY "settings_delete_policy" ON public.settings FOR DELETE USING (public.check_user_permission('users.delete'));

-- AUDIT EVENTS (ESEMÉNYNAPLÓ)
DROP POLICY IF EXISTS "audit_events_select_policy" ON public.audit_events;
CREATE POLICY "audit_events_select_policy" ON public.audit_events FOR SELECT USING (public.check_user_permission('users.read'));

DROP POLICY IF EXISTS "audit_events_insert_policy" ON public.audit_events;
CREATE POLICY "audit_events_insert_policy" ON public.audit_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "audit_events_update_policy" ON public.audit_events;
CREATE POLICY "audit_events_update_policy" ON public.audit_events FOR UPDATE USING (false);

DROP POLICY IF EXISTS "audit_events_delete_policy" ON public.audit_events;
CREATE POLICY "audit_events_delete_policy" ON public.audit_events FOR DELETE USING (public.check_user_permission('users.delete'));

-- ====================================================================
-- 7. JOGOSULTSÁGOK A SUPABASE API RÉSZÉRE (GRANTS)
-- ====================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
`;
}
