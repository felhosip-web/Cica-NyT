export interface AuditInfo {
  created_by?: string;      // User ID who created the record
  created_by_name?: string; // User Display Name
  created_at?: string;      // ISO Timestamp
  updated_by?: string;      // User ID who updated the record
  updated_by_name?: string; // User Display Name
  updated_at?: string;      // ISO Timestamp
}

export interface GranularPermissions {
  'animal.read': boolean;
  'animal.create': boolean;
  'animal.update': boolean;
  'animal.delete': boolean;

  'health.read': boolean;
  'health.create': boolean;
  'health.update': boolean;
  'health.delete': boolean;

  'tnr.read': boolean;
  'tnr.create': boolean;
  'tnr.update': boolean;
  'tnr.delete': boolean;

  'finance.read': boolean;
  'finance.create': boolean;
  'finance.update': boolean;
  'finance.delete': boolean;

  'users.read': boolean;
  'users.create': boolean;
  'users.update': boolean;
  'users.delete': boolean;
}

export interface UserPermissions extends GranularPermissions {
  // Legacy compatibility getters / flags
  canAddCat?: boolean;
  canEditCat?: boolean;
  canDeleteCat?: boolean;
  canManageMedical?: boolean;
  canManageExpenses?: boolean;
  canExportData?: boolean;
  canManageSettings?: boolean;
  canManageUsers?: boolean;
  canManageTnr?: boolean;
}

export interface MedicalProtocolStep {
  name: string;
  type: 'oltas' | 'orvosi' | 'teszt' | 'mutet' | 'egyeni';
  daysOffset: number;
  defaultTitle: string;
  defaultCost?: number;
  defaultNotes?: string;
}

export interface MedicalProtocol {
  id: string;
  name: string;
  description: string;
  category: 'kolyok' | 'felnott' | 'karanten' | 'mutet' | 'altalanos';
  steps: MedicalProtocolStep[];
  isBuiltIn?: boolean;
}

export interface EventTemplate {
  id?: number | string;
  name: string;
  type: 'oltas' | 'orvosi' | 'teszt' | 'mutet' | 'egyeni';
  defaultTitle: string;
  defaultCost: number | '';
  defaultNotes: string;
  defaultStatus?: 'pending' | 'done' | 'expired';
  daysOffset?: number;
  isBuiltIn?: boolean;
  category?: string;
  icon?: string;
  protocolId?: string;
}

export interface CatWeightRecord {
  id?: number;
  catId: string;
  weight: number;
  date: string;
  createdAt: string;
}

export interface TnrRecord extends AuditInfo {
  id: string;
  catId?: string; // Opcionális összekapcsolt cica azonosító
  catNameOrTag?: string; // Opcionális cica megnevezés/azonosító
  colonyName?: string; // Kolónia / Helyszín csoportosítás
  locationTrapped: string; // Hol lett befogva (kötelező)
  dateTrapped: string; // Mikor lett befogva (kötelező)
  trappedBy: string; // Ki fogta be (kötelező)
  clinicLocation: string; // Hol műtötték (kötelező)
  surgeonName?: string; // Ki műtötte (opcionális)
  locationReleased: string; // Hol lett elengedve (kötelező)
  dateReleased?: string; // Mikor lett elengedve (opcionális)
  status: 'befogva' | 'mutet_alatt' | 'elengedve'; // Státusz
  earTip?: boolean; // Fülcsipkézés megtörtént-e
  cost?: number; // Műtéti / orvosi költség (Ft)
  notes?: string; // Egyéb megjegyzés (opcionális)
  createdAt: string;
}

export interface UserRole {
  id: string;
  code: 'ROOT' | 'OWNER' | 'STAFF' | 'FOSTER' | 'VOLUNTEER' | 'GUEST' | string;
  name: string;
  description: string;
  isSystemRole?: boolean;
  permissions: UserPermissions;
}

export interface UserAccount {
  id: string;
  name: string;
  roleId: string;
  avatarEmoji: string;
  pin?: string;
  email?: string;
  phone?: string;
  active: boolean;
  customPermissionsOverride?: Partial<UserPermissions>;
}

export const DEFAULT_PERMISSIONS_FULL: UserPermissions = {
  'animal.read': true,
  'animal.create': true,
  'animal.update': true,
  'animal.delete': true,

  'health.read': true,
  'health.create': true,
  'health.update': true,
  'health.delete': true,

  'tnr.read': true,
  'tnr.create': true,
  'tnr.update': true,
  'tnr.delete': true,

  'finance.read': true,
  'finance.create': true,
  'finance.update': true,
  'finance.delete': true,

  'users.read': true,
  'users.create': true,
  'users.update': true,
  'users.delete': true,

  canAddCat: true,
  canEditCat: true,
  canDeleteCat: true,
  canManageMedical: true,
  canManageExpenses: true,
  canExportData: true,
  canManageSettings: true,
  canManageUsers: true,
  canManageTnr: true,
};

export const DEFAULT_ROLES: UserRole[] = [
  {
    id: 'root',
    code: 'ROOT',
    name: '👑 ROOT / Főadminisztrátor',
    description: 'Korlátlan hozzáférés a teljes rendszerhez, adatbázishoz, beállításokhoz és jogosultságkezeléshez.',
    isSystemRole: true,
    permissions: { ...DEFAULT_PERMISSIONS_FULL },
  },
  {
    id: 'owner',
    code: 'OWNER',
    name: '🏆 OWNER / Menhely Vezető',
    description: 'A menhely / egyesület tulajdonosa. Teljes üzleti hozzáférés: Állatok CRUD, Egészségügy CRUD, TNR CRUD, Pénzügy CRUD, Felhasználók CRUD, Beállítások CRUD.',
    isSystemRole: true,
    permissions: { ...DEFAULT_PERMISSIONS_FULL },
  },
  {
    id: 'staff',
    code: 'STAFF',
    name: '🩺 STAFF / Munkatárs',
    description: 'Gondozó / munkatárs: Állatok CRUD, Egészségügy CRUD, TNR CRUD, Pénzügy Read (korlátozott olvasás), Felhasználókezelés nélkül.',
    isSystemRole: true,
    permissions: {
      'animal.read': true,
      'animal.create': true,
      'animal.update': true,
      'animal.delete': true,

      'health.read': true,
      'health.create': true,
      'health.update': true,
      'health.delete': true,

      'tnr.read': true,
      'tnr.create': true,
      'tnr.update': true,
      'tnr.delete': true,

      'finance.read': true,
      'finance.create': false,
      'finance.update': false,
      'finance.delete': false,

      'users.read': false,
      'users.create': false,
      'users.update': false,
      'users.delete': false,

      canAddCat: true,
      canEditCat: true,
      canDeleteCat: true,
      canManageMedical: true,
      canManageExpenses: false,
      canExportData: true,
      canManageSettings: false,
      canManageUsers: false,
      canManageTnr: true,
    },
  },
  {
    id: 'foster',
    code: 'FOSTER',
    name: '🏡 FOSTER / Ideiglenes Befogadó',
    description: 'Ideiglenes befogadó: Állatok Read/Update, Egészségügy Read/Update, TNR Read, Pénzügy -, Felhasználók -.',
    isSystemRole: true,
    permissions: {
      'animal.read': true,
      'animal.create': false,
      'animal.update': true,
      'animal.delete': false,

      'health.read': true,
      'health.create': true,
      'health.update': true,
      'health.delete': false,

      'tnr.read': true,
      'tnr.create': false,
      'tnr.update': false,
      'tnr.delete': false,

      'finance.read': false,
      'finance.create': false,
      'finance.update': false,
      'finance.delete': false,

      'users.read': false,
      'users.create': false,
      'users.update': false,
      'users.delete': false,

      canAddCat: false,
      canEditCat: true,
      canDeleteCat: false,
      canManageMedical: true,
      canManageExpenses: false,
      canExportData: false,
      canManageSettings: false,
      canManageUsers: false,
      canManageTnr: false,
    },
  },
  {
    id: 'volunteer',
    code: 'VOLUNTEER',
    name: '🤝 VOLUNTEER / Önkéntes',
    description: 'Önkéntes segítő: Állatok Read/Korlátozott Update, Egészségügy Read, TNR Read/Create, Pénzügy -, Felhasználók -.',
    isSystemRole: true,
    permissions: {
      'animal.read': true,
      'animal.create': false,
      'animal.update': true,
      'animal.delete': false,

      'health.read': true,
      'health.create': false,
      'health.update': false,
      'health.delete': false,

      'tnr.read': true,
      'tnr.create': true,
      'tnr.update': false,
      'tnr.delete': false,

      'finance.read': false,
      'finance.create': false,
      'finance.update': false,
      'finance.delete': false,

      'users.read': false,
      'users.create': false,
      'users.update': false,
      'users.delete': false,

      canAddCat: false,
      canEditCat: true,
      canDeleteCat: false,
      canManageMedical: false,
      canManageExpenses: false,
      canExportData: false,
      canManageSettings: false,
      canManageUsers: false,
      canManageTnr: true,
    },
  },
  {
    id: 'guest',
    code: 'GUEST',
    name: '👁️ GUEST / Vendég (Olvasó)',
    description: 'Vendég / Látogató: Kizárólag olvasási jogosultság (Állatok R, Egészségügy R, TNR R).',
    isSystemRole: true,
    permissions: {
      'animal.read': true,
      'animal.create': false,
      'animal.update': false,
      'animal.delete': false,

      'health.read': true,
      'health.create': false,
      'health.update': false,
      'health.delete': false,

      'tnr.read': true,
      'tnr.create': false,
      'tnr.update': false,
      'tnr.delete': false,

      'finance.read': false,
      'finance.create': false,
      'finance.update': false,
      'finance.delete': false,

      'users.read': false,
      'users.create': false,
      'users.update': false,
      'users.delete': false,

      canAddCat: false,
      canEditCat: false,
      canDeleteCat: false,
      canManageMedical: false,
      canManageExpenses: false,
      canExportData: false,
      canManageSettings: false,
      canManageUsers: false,
      canManageTnr: false,
    },
  },
];

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user_root',
    name: 'Főadminisztrátor (Root)',
    roleId: 'root',
    avatarEmoji: '👑',
    pin: '1342',
    active: true,
    email: 'admin@menhely.hu',
  },
  {
    id: 'user_owner',
    name: 'Szabó Éva (Menhely Vezető)',
    roleId: 'owner',
    avatarEmoji: '🏆',
    pin: '2222',
    active: true,
    email: 'eva@menhely.hu',
  },
  {
    id: 'user_staff',
    name: 'Kovács Anna (Munkatárs)',
    roleId: 'staff',
    avatarEmoji: '🩺',
    pin: '1111',
    active: true,
    email: 'anna@menhely.hu',
  },
  {
    id: 'user_foster',
    name: 'Nagy Péter (Ideiglenes Befogadó)',
    roleId: 'foster',
    avatarEmoji: '🏡',
    pin: '3333',
    active: true,
    email: 'peter@menhely.hu',
  },
  {
    id: 'user_volunteer',
    name: 'Tóth Dániel (Önkéntes)',
    roleId: 'volunteer',
    avatarEmoji: '🤝',
    pin: '4444',
    active: true,
    email: 'daniel@menhely.hu',
  },
  {
    id: 'user_guest',
    name: 'Vendég Látogató',
    roleId: 'guest',
    avatarEmoji: '👁️',
    pin: '',
    active: true,
    email: 'guest@menhely.hu',
  },
];

export interface FosterParent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  status: 'aktiv' | 'szunetel' | 'megeltes';
  maxCapacity: number;
  notes?: string;
  housingType?: 'lakas' | 'kertes_haz' | 'karanten_szoba' | 'egyeb';
  acceptsKittens?: boolean;
  acceptsSick?: boolean;
  createdAt: string;
}

export interface FosterSupply {
  id?: number | string;
  fosterId: string;
  catId?: string;
  type: 'tap' | 'alom' | 'gyogyszer' | 'felszereles' | 'egyeb';
  item: string;
  quantity: number;
  unit: 'kg' | 'db' | 'tasak' | 'zsak' | 'doboz';
  date: string;
  status: 'igenyelve' | 'kiadva' | 'teljesitve';
  notes?: string;
  inventoryItemId?: number | string;
}

export interface FosterExpense {
  id?: number | string;
  fosterId: string;
  catId?: string;
  category: 'orvosi' | 'tap' | 'alom' | 'felszereles' | 'egyeb';
  amount: number;
  date: string;
  description: string;
  invoiceNo?: string;
  financeId?: number | string;
}

export type InventoryDirection = 'bejovo' | 'kimeno';
export type InventoryCategory =
  | 'nedves_tap'
  | 'szaraz_tap'
  | 'alom'
  | 'gyogyszer'
  | 'parazitamentesito'
  | 'felszereles'
  | 'higienia_fertotlenito'
  | 'egyeb';
export type InventoryUnit =
  | 'db'
  | 'kg'
  | 'g'
  | 'csomag'
  | 'zsak'
  | 'l'
  | 'ml'
  | 'doboz'
  | 'pipetta'
  | 'tabletta';
export type InventorySourceType = 'adomany' | 'sajat_kor' | 'egyeb';

export interface InventoryItem extends AuditInfo {
  id?: number | string;
  catId?: string; // Kapcsolódó cica ID (ha közvetlenül cicához rendelt)
  direction: InventoryDirection; // 'bejovo' (Bejövő) | 'kimeno' (Kimenő)
  itemType: InventoryCategory; // Kategória
  sourceType?: InventorySourceType; // 'adomany' (Adomány) | 'sajat_kor' (Vett saját költségén) | 'egyeb'
  brandOrName?: string; // pl. "Royal Canin Kitten", "Milprazon tabletta", "Advocate csepp"
  quantity: number; // Mennyiség
  unit: InventoryUnit; // Egység
  date: string; // YYYY-MM-DD
  expiryDate?: string; // Szavatossági / lejárati idő: YYYY-MM-DD
  batchNumber?: string; // Gyártási szám / Sarzs / Lot number
  minStockThreshold?: number; // Minimális figyelmeztetési készletszint
  targetAgeOrCondition?: string; // pl. "Kölyök (Kitten)", "Felnőtt", "Diétás / Renal", "Karantén"
  sourceOrRecipient: string; // Mikor/Honnan (Adományozó/Saját) VAGY Kinek (Kimenő)
  destination?: string; // Hova/Helyszín
  notes?: string; // Megjegyzés
  purchaseCost?: number; // Ha saját vétel volt, a beszerzési ár (Ft)
  financeId?: number | string; // Kapcsolódó pénzügyi tétel ID
  fosterSupplyId?: number | string; // Kapcsolódó befogadói kiadás ID
  syncStatus?: 'pending' | 'synced';
  createdAt?: string;
  updatedAt?: string;
}

export type FinanceType = 'bevetel' | 'kiadas';
export type FinanceCategory =
  | 'adomany'
  | 'szazalek1'
  | 'orokbefogadas'
  | 'palyazat'
  | 'orvosi'
  | 'tap_alom'
  | 'felszereles'
  | 'mukodes'
  | 'szallitas'
  | 'tnr'
  | 'egyeb';

export type PaymentMethod = 'keszpenz' | 'bankkartya' | 'banki_atutalas' | 'paypal' | 'egyeb';
export type FinanceStatus = 'teljesult' | 'fuggoben' | 'storno';
export type FinanceSourceModule = 'manual' | 'medical_event' | 'inventory_purchase' | 'foster_expense' | 'adoption';

export interface FinancialTransaction extends AuditInfo {
  id?: number | string;
  type: FinanceType; // 'bevetel' (Bevétel) | 'kiadas' (Kiadás)
  category: FinanceCategory;
  amount: number; // Ft
  date: string; // YYYY-MM-DD
  title: string; // Megnevezés / Leírás
  partnerName?: string; // Adományozó / Szállító / Partner neve
  paymentMethod: PaymentMethod;
  status: FinanceStatus; // 'teljesult' | 'fuggoben' | 'storno'
  invoiceNumber?: string; // Számlaszám / Bizonylatszám
  catId?: string; // Kapcsolódó cica ID
  fosterId?: string; // Kapcsolódó ideiglenes befogadó ID
  sourceModule?: FinanceSourceModule; // Honnan származik (kézi, orvosi esemény, készletvétel, befogadói költség, örökbefogadás)
  sourceReferenceId?: string | number; // Kapcsolódó forrásrekord ID-ja
  notes?: string;
  syncStatus?: 'pending' | 'synced';
  createdAt?: string;
  updatedAt?: string;
}


