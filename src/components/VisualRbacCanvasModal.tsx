import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { UserAccount, UserRole, UserPermissions } from '../types';
import { CustomSelect } from './CustomSelect';

interface NodePosition {
  x: number;
  y: number;
}

type NodeType = 'user' | 'role' | 'permission' | 'table';

interface CanvasNode {
  id: string;
  type: NodeType;
  label: string;
  subLabel?: string;
  icon: string;
  color: string;
  pos: NodePosition;
  dataRef: any; // UserAccount | UserRole | PermKeyInfo | TableInfo
}

interface PermKeyInfo {
  key: keyof UserPermissions;
  module: string;
  op: 'read' | 'create' | 'update' | 'delete';
  label: string;
  table: string;
}

interface TableInfo {
  name: string;
  label: string;
  icon: string;
  rlsEnabled: boolean;
}

export interface RuleConflict {
  id: string;
  type: 'WRITE_WITHOUT_READ' | 'GUEST_HIGH_PRIVILEGE' | 'USER_ASSIGNED_EMPTY_ROLE' | 'ORPHANED_DELETE';
  severity: 'error' | 'warning' | 'info';
  title: string;
  roleId?: string;
  userId?: string;
  moduleName?: string;
  permKey?: string;
  description: string;
  suggestion: string;
  affectedLinkIds: string[];
  affectedNodeIds: string[];
  autoFix: () => void;
}

const DB_TABLES: TableInfo[] = [
  { name: 'cats', label: 'Állatnyilvántartás (cats)', icon: '🐾', rlsEnabled: true },
  { name: 'events', label: 'Egészségügyi Lapok (events)', icon: '🩺', rlsEnabled: true },
  { name: 'tnr_records', label: 'TNR Műtéti Akciók (tnr_records)', icon: '✂️', rlsEnabled: true },
  { name: 'expenses', label: 'Pénzügyek & Kiadások (expenses)', icon: '💰', rlsEnabled: true },
  { name: 'app_users', label: 'Felhasználók (app_users)', icon: '🔑', rlsEnabled: true },
];

const PERMISSION_NODES: PermKeyInfo[] = [
  // Cats
  { key: 'animal.read', module: 'cats', op: 'read', label: 'Cica Olvasás', table: 'cats' },
  { key: 'animal.create', module: 'cats', op: 'create', label: 'Cica Felvitel', table: 'cats' },
  { key: 'animal.update', module: 'cats', op: 'update', label: 'Cica Módosítás', table: 'cats' },
  { key: 'animal.delete', module: 'cats', op: 'delete', label: 'Cica Törlés', table: 'cats' },
  // Events
  { key: 'health.read', module: 'events', op: 'read', label: 'Egészségügy Olvasás', table: 'events' },
  { key: 'health.create', module: 'events', op: 'create', label: 'Oltás / Kezelés Rögzítés', table: 'events' },
  { key: 'health.update', module: 'events', op: 'update', label: 'Egészségügy Szerkesztés', table: 'events' },
  { key: 'health.delete', module: 'events', op: 'delete', label: 'Egészségügy Törlés', table: 'events' },
  // TNR
  { key: 'tnr.read', module: 'tnr_records', op: 'read', label: 'TNR Akciók Olvasása', table: 'tnr_records' },
  { key: 'tnr.create', module: 'tnr_records', op: 'create', label: 'Új TNR Akció', table: 'tnr_records' },
  { key: 'tnr.update', module: 'tnr_records', op: 'update', label: 'TNR Módosítás', table: 'tnr_records' },
  { key: 'tnr.delete', module: 'tnr_records', op: 'delete', label: 'TNR Törlés', table: 'tnr_records' },
  // Expenses
  { key: 'finance.read', module: 'expenses', op: 'read', label: 'Pénzügyek Látása', table: 'expenses' },
  { key: 'finance.create', module: 'expenses', op: 'create', label: 'Új Költség', table: 'expenses' },
  { key: 'finance.update', module: 'expenses', op: 'update', label: 'Költség Módosítás', table: 'expenses' },
  { key: 'finance.delete', module: 'expenses', op: 'delete', label: 'Költség Törlés', table: 'expenses' },
  // Users
  { key: 'users.read', module: 'app_users', op: 'read', label: 'Felhasználók Látása', table: 'app_users' },
  { key: 'users.create', module: 'app_users', op: 'create', label: 'Új Felhasználó', table: 'app_users' },
  { key: 'users.update', module: 'app_users', op: 'update', label: 'Fiók/Jog Módosítás', table: 'app_users' },
  { key: 'users.delete', module: 'app_users', op: 'delete', label: 'Fiók Törlés', table: 'app_users' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const VisualRbacCanvasModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { users, roles, updateUser, updateRole, addUser, addRole, setUsers, setRoles, addDebugLog } = useAppStore();

  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [connectingStartNodeId, setConnectingStartNodeId] = useState<string | null>(null);

  // Canvas View Transform (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging Node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Modals & Panels
  const [showSqlExportModal, setShowSqlExportModal] = useState(false);
  const [showJsonExportModal, setShowJsonExportModal] = useState(false);
  const [showJsonImportModal, setShowJsonImportModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showValidationListModal, setShowValidationListModal] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<RuleConflict | null>(null);

  // JSON Import States
  const [jsonImportText, setJsonImportText] = useState('');
  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const [jsonImportSuccess, setJsonImportSuccess] = useState<string | null>(null);

  // New Node Form states
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('staff');

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize or Auto-Layout Node Positions
  const handleAutoLayout = () => {
    const newPos: Record<string, NodePosition> = {};

    // Column 1: Users (x: 80)
    const userSpacing = 90;
    users.forEach((u, idx) => {
      newPos[`user_${u.id}`] = { x: 80, y: 100 + idx * userSpacing };
    });

    // Column 2: Roles (x: 420)
    const roleSpacing = 110;
    roles.forEach((r, idx) => {
      newPos[`role_${r.id}`] = { x: 420, y: 80 + idx * roleSpacing };
    });

    // Column 3: Permissions (x: 800)
    const permSpacing = 42;
    PERMISSION_NODES.forEach((p, idx) => {
      newPos[`perm_${p.key}`] = { x: 800, y: 40 + idx * permSpacing };
    });

    // Column 4: DB Tables (x: 1200)
    const tableSpacing = 160;
    DB_TABLES.forEach((t, idx) => {
      newPos[`table_${t.name}`] = { x: 1200, y: 120 + idx * tableSpacing };
    });

    setNodePositions(newPos);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cica_rls_canvas_positions', JSON.stringify(newPos));
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('cica_rls_canvas_positions');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
              setNodePositions(parsed);
              return;
            }
          } catch (e) {
            console.warn('Hiba a vászon pozíciók betöltésekor', e);
          }
        }
      }
      handleAutoLayout();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build Canvas Node Lists
  const canvasNodes: CanvasNode[] = [];

  // 1. Users
  users.forEach((u) => {
    const id = `user_${u.id}`;
    const roleObj = roles.find((r) => r.id === u.roleId || r.code?.toLowerCase() === u.roleId.toLowerCase());
    canvasNodes.push({
      id,
      type: 'user',
      label: u.name,
      subLabel: `${u.email || 'no-email'} (${roleObj?.name || u.roleId})`,
      icon: '👤',
      color: 'blue',
      pos: nodePositions[id] || { x: 80, y: 100 },
      dataRef: u,
    });
  });

  // 2. Roles
  roles.forEach((r) => {
    const id = `role_${r.id}`;
    canvasNodes.push({
      id,
      type: 'role',
      label: r.name,
      subLabel: `ID: ${r.id} (${Object.values(r.permissions || {}).filter(Boolean).length} jog)`,
      icon: r.code === 'ROOT' ? '👑' : r.code === 'OWNER' ? '🏆' : r.code === 'STAFF' ? '🩺' : '🏡',
      color: 'purple',
      pos: nodePositions[id] || { x: 420, y: 100 },
      dataRef: r,
    });
  });

  // 3. Permissions
  PERMISSION_NODES.forEach((p) => {
    const id = `perm_${p.key}`;
    canvasNodes.push({
      id,
      type: 'permission',
      label: p.label,
      subLabel: p.key,
      icon: p.op === 'read' ? '🔍' : p.op === 'create' ? '➕' : p.op === 'update' ? '✏️' : '🗑️',
      color: p.op === 'read' ? 'blue' : p.op === 'create' ? 'emerald' : p.op === 'update' ? 'amber' : 'rose',
      pos: nodePositions[id] || { x: 800, y: 100 },
      dataRef: p,
    });
  });

  // 4. Tables
  DB_TABLES.forEach((t) => {
    const id = `table_${t.name}`;
    canvasNodes.push({
      id,
      type: 'table',
      label: t.label,
      subLabel: `RLS Protected (${t.name})`,
      icon: t.icon,
      color: 'indigo',
      pos: nodePositions[id] || { x: 1200, y: 100 },
      dataRef: t,
    });
  });

  // Build Links / Connections
  interface Link {
    id: string;
    fromId: string;
    toId: string;
    type: 'user_role' | 'role_perm' | 'perm_table';
    active: boolean;
  }

  const links: Link[] = [];

  // User -> Role Links
  users.forEach((u) => {
    const userId = `user_${u.id}`;
    const roleId = `role_${u.roleId}`;
    links.push({
      id: `${userId}-${roleId}`,
      fromId: userId,
      toId: roleId,
      type: 'user_role',
      active: true,
    });
  });

  // Role -> Permission Links
  roles.forEach((r) => {
    const roleId = `role_${r.id}`;
    PERMISSION_NODES.forEach((p) => {
      const permId = `perm_${p.key}`;
      const isAllowed = r.permissions?.[p.key] === true;
      if (isAllowed) {
        links.push({
          id: `${roleId}-${permId}`,
          fromId: roleId,
          toId: permId,
          type: 'role_perm',
          active: true,
        });
      }
    });
  });

  // Permission -> Table Links
  PERMISSION_NODES.forEach((p) => {
    const permId = `perm_${p.key}`;
    const tableId = `table_${p.table}`;
    links.push({
      id: `${permId}-${tableId}`,
      fromId: permId,
      toId: tableId,
      type: 'perm_table',
      active: true,
    });
  });

  // RLS & RBAC Validation Engine
  const computeRuleConflicts = (): RuleConflict[] => {
    const conflictsList: RuleConflict[] = [];

    const modules = [
      { name: 'Állatnyilvántartás (cats)', table: 'cats', readKey: 'animal.read', writeKeys: ['animal.create', 'animal.update', 'animal.delete'] as (keyof UserPermissions)[] },
      { name: 'Egészségügyi Lapok (events)', table: 'events', readKey: 'health.read', writeKeys: ['health.create', 'health.update', 'health.delete'] as (keyof UserPermissions)[] },
      { name: 'TNR Műtéti Akciók (tnr_records)', table: 'tnr_records', readKey: 'tnr.read', writeKeys: ['tnr.create', 'tnr.update', 'tnr.delete'] as (keyof UserPermissions)[] },
      { name: 'Pénzügyek (expenses)', table: 'expenses', readKey: 'finance.read', writeKeys: ['finance.create', 'finance.update', 'finance.delete'] as (keyof UserPermissions)[] },
      { name: 'Felhasználók (app_users)', table: 'app_users', readKey: 'users.read', writeKeys: ['users.create', 'users.update', 'users.delete'] as (keyof UserPermissions)[] },
    ];

    // 1. WRITE_WITHOUT_READ (Critical RLS Error)
    roles.forEach((r) => {
      modules.forEach((mod) => {
        const hasRead = r.permissions?.[mod.readKey as keyof UserPermissions] === true;
        const activeWriteKeys = mod.writeKeys.filter((wk) => r.permissions?.[wk] === true);

        if (!hasRead && activeWriteKeys.length > 0) {
          const affectedLinks: string[] = [];
          activeWriteKeys.forEach((wk) => {
            affectedLinks.push(`role_${r.id}-perm_${wk}`);
            affectedLinks.push(`perm_${wk}-table_${mod.table}`);
          });

          conflictsList.push({
            id: `conflict_write_no_read_${r.id}_${mod.table}`,
            type: 'WRITE_WITHOUT_READ',
            severity: 'error',
            title: `Hiányzó Olvasási Jog (${mod.name})`,
            roleId: r.id,
            moduleName: mod.name,
            description: `A(z) "${r.name}" szerepkörnek módosítási/írási joga van a(z) ${mod.table} táblán, de az olvasási (READ) joga hiányzik!`,
            suggestion: `Engedélyezze a(z) "${mod.readKey}" olvasási jogot, különben az RLS adatbázis lekérdezések nem adnak vissza rekordokat.`,
            affectedLinkIds: affectedLinks,
            affectedNodeIds: [`role_${r.id}`, `perm_${mod.readKey}`, `table_${mod.table}`, ...activeWriteKeys.map((wk) => `perm_${wk}`)],
            autoFix: () => {
              const updated = { ...r.permissions, [mod.readKey]: true };
              updateRole(r.id, { permissions: updated });
              addDebugLog(`[RLS Validation Fix] ${r.name} szerepkörhöz engedélyezve a(z) ${mod.readKey} olvasási jog.`);
            },
          });
        }
      });
    });

    // 2. GUEST / VOLUNTEER / FOSTER HIGH PRIVILEGE (Critical Admin Security Warning)
    const guestRoleIds = ['guest', 'volunteer', 'foster'];
    const sensitivePermKeys: { key: keyof UserPermissions; label: string }[] = [
      { key: 'users.delete', label: 'Felhasználó Törlése' },
      { key: 'users.update', label: 'Felhasználó Szerkesztése' },
      { key: 'finance.delete', label: 'Pénzügyi Kiadás Törlése' },
      { key: 'animal.delete', label: 'Állat Törlése' },
    ];

    roles
      .filter((r) => guestRoleIds.includes(r.id) || r.code === 'GUEST' || r.code === 'VOLUNTEER' || r.code === 'FOSTER')
      .forEach((r) => {
        sensitivePermKeys.forEach((sp) => {
          if (r.permissions?.[sp.key] === true) {
            conflictsList.push({
              id: `conflict_guest_high_priv_${r.id}_${sp.key}`,
              type: 'GUEST_HIGH_PRIVILEGE',
              severity: 'error',
              title: `Kritikus Admin Jog Vendég Szerepkörnél`,
              roleId: r.id,
              permKey: sp.key,
              description: `A(z) "${r.name}" alacsony jogosultságú/vendég szerepkörnek kritikus adminisztrátori művelete van engedélyezve: ${sp.label} (${sp.key}).`,
              suggestion: `Vond meg a(z) "${sp.key}" jogot a vendég/önkéntes szerepkörtől az illetéktelen adatváltoztatások elkerülésére.`,
              affectedLinkIds: [`role_${r.id}-perm_${sp.key}`],
              affectedNodeIds: [`role_${r.id}`, `perm_${sp.key}`],
              autoFix: () => {
                const updated = { ...r.permissions, [sp.key]: false };
                updateRole(r.id, { permissions: updated });
                addDebugLog(`[RLS Validation Fix] ${r.name} szerepkörtől megvonva a(z) ${sp.key} kritikus jog.`);
              },
            });
          }
        });
      });

    // 3. USER_ASSIGNED_EMPTY_ROLE (Warning)
    users.forEach((u) => {
      const role = roles.find((r) => r.id === u.roleId);
      if (role) {
        const activePermCount = Object.values(role.permissions || {}).filter(Boolean).length;
        if (activePermCount === 0) {
          conflictsList.push({
            id: `conflict_empty_role_user_${u.id}`,
            type: 'USER_ASSIGNED_EMPTY_ROLE',
            severity: 'warning',
            title: `Felhasználó Jogosultság Nélküli Szerepkörben`,
            userId: u.id,
            roleId: role.id,
            description: `"${u.name}" (${u.email}) a(z) "${role.name}" szerepkörbe van beosztva, de ennek a szerepkörnek 0 db engedélyezett RLS jogosultsága van.`,
            suggestion: `Rendeljen legalább alapvető olvasási jogokat a szerepkörhöz, vagy léptesse át a felhasználót a "STAFF" (Munkatárs) szerepkörbe.`,
            affectedLinkIds: [`user_${u.id}-role_${role.id}`],
            affectedNodeIds: [`user_${u.id}`, `role_${role.id}`],
            autoFix: () => {
              updateUser(u.id, { roleId: 'staff' });
              addDebugLog(`[RLS Validation Fix] ${u.name} átléptetve STAFF szerepkörbe.`);
            },
          });
        }
      }
    });

    // 4. ORPHANED_DELETE (Warning)
    roles.forEach((r) => {
      modules.forEach((mod) => {
        const prefix = mod.readKey.split('.')[0];
        const delKey = `${prefix}.delete` as keyof UserPermissions;
        const createKey = `${prefix}.create` as keyof UserPermissions;
        const updateKey = `${prefix}.update` as keyof UserPermissions;

        const hasDelete = r.permissions?.[delKey] === true;
        const hasCreate = r.permissions?.[createKey] === true;
        const hasUpdate = r.permissions?.[updateKey] === true;

        if (hasDelete && !hasCreate && !hasUpdate) {
          conflictsList.push({
            id: `conflict_orphaned_delete_${r.id}_${mod.table}`,
            type: 'ORPHANED_DELETE',
            severity: 'warning',
            title: `Inkonzisztens Törlési Jog (${mod.name})`,
            roleId: r.id,
            description: `A(z) "${r.name}" szerepkör törölhet elemeket a(z) ${mod.table} táblából, de sem létrehozni, sem módosítani nem tudja azokat.`,
            suggestion: `Engedélyezze a felviteli/módosítási jogokat is, vagy távolítsa el az izolált törlési jogot.`,
            affectedLinkIds: [`role_${r.id}-perm_${delKey}`],
            affectedNodeIds: [`role_${r.id}`, `perm_${delKey}`],
            autoFix: () => {
              const updated = { ...r.permissions, [delKey]: false };
              updateRole(r.id, { permissions: updated });
              addDebugLog(`[RLS Validation Fix] ${r.name} szerepkörtől eltávolítva a szigetszerű ${delKey} törlési jog.`);
            },
          });
        }
      });
    });

    return conflictsList;
  };

  const conflicts = computeRuleConflicts();

  // Mouse Handlers for Dragging Canvas Nodes
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingStartNodeId) {
      // Connect / Toggle action
      handleConnectNodes(connectingStartNodeId, nodeId);
      setConnectingStartNodeId(null);
      return;
    }

    const pos = nodePositions[nodeId] || { x: 0, y: 0 };
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: (e.clientX - pan.x) / zoom - pos.x,
      y: (e.clientY - pan.y) / zoom - pos.y,
    });
    setSelectedNodeId(nodeId);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (connectingStartNodeId) {
      setConnectingStartNodeId(null);
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = Math.round(((e.clientX - pan.x) / zoom - dragOffset.x) / 10) * 10;
      const newY = Math.round(((e.clientY - pan.y) / zoom - dragOffset.y) / 10) * 10;
      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: Math.max(20, newX), y: Math.max(20, newY) },
      }));
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  // Connecting logic between 2 nodes
  const handleConnectNodes = (fromId: string, toId: string) => {
    const fromNode = canvasNodes.find((n) => n.id === fromId);
    const toNode = canvasNodes.find((n) => n.id === toId);

    if (!fromNode || !toNode) return;

    // Connect User -> Role (assign role to user)
    if (fromNode.type === 'user' && toNode.type === 'role') {
      const user = fromNode.dataRef as UserAccount;
      const role = toNode.dataRef as UserRole;
      updateUser(user.id, { roleId: role.id });
      addDebugLog(`[Canvas] ${user.name} felhasználó szerepköre átállítva: ${role.name} (${role.id})`);
    } else if (fromNode.type === 'role' && toNode.type === 'user') {
      const role = fromNode.dataRef as UserRole;
      const user = toNode.dataRef as UserAccount;
      updateUser(user.id, { roleId: role.id });
      addDebugLog(`[Canvas] ${user.name} felhasználó szerepköre átállítva: ${role.name} (${role.id})`);
    }
    // Connect Role -> Permission (toggle permission for role)
    else if (fromNode.type === 'role' && toNode.type === 'permission') {
      const role = fromNode.dataRef as UserRole;
      const perm = toNode.dataRef as PermKeyInfo;
      const currentVal = role.permissions?.[perm.key] === true;
      const updatedPerms = { ...role.permissions, [perm.key]: !currentVal };
      updateRole(role.id, { permissions: updatedPerms });
      addDebugLog(`[Canvas] ${role.name} szerepkören ${perm.key} jog: ${!currentVal ? 'ENGEDÉLYEZVE' : 'TILTVA'}`);
    } else if (fromNode.type === 'permission' && toNode.type === 'role') {
      const perm = fromNode.dataRef as PermKeyInfo;
      const role = toNode.dataRef as UserRole;
      const currentVal = role.permissions?.[perm.key] === true;
      const updatedPerms = { ...role.permissions, [perm.key]: !currentVal };
      updateRole(role.id, { permissions: updatedPerms });
      addDebugLog(`[Canvas] ${role.name} szerepkören ${perm.key} jog: ${!currentVal ? 'ENGEDÉLYEZVE' : 'TILTVA'}`);
    }
  };

  // Helper to compute node edge connection points
  const getNodePoint = (id: string, side: 'left' | 'right' | 'center') => {
    const pos = nodePositions[id] || { x: 0, y: 0 };
    const width = 220; // approximate node width
    const height = 60; // approximate node height

    if (side === 'left') {
      return { x: pos.x, y: pos.y + height / 2 };
    } else if (side === 'right') {
      return { x: pos.x + width, y: pos.y + height / 2 };
    }
    return { x: pos.x + width / 2, y: pos.y + height / 2 };
  };

  // Generate Supabase RLS SQL Script from current topology
  const generateSqlScript = () => {
    let sql = `-- ==========================================================\n`;
    sql += `-- TELJES SUPABASE DDL ÉS ROW LEVEL SECURITY (RLS) SCRIPT\n`;
    sql += `-- Alkalmazás: Cica Nyilvántartó & Menhely Menedzsment\n`;
    sql += `-- Generálva: ${new Date().toLocaleString('hu-HU')} a RBAC Canvasról\n`;
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

  const handleDownloadSqlFile = () => {
    const sqlText = generateSqlScript();
    const blob = new Blob([sqlText], { type: 'text/plain;charset=utf-8' });
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

  // Generate JSON Export Object
  const getExportJsonObject = () => {
    return {
      app: 'cica-nyt-rbac-rls',
      version: '2.3.0',
      exportedAt: new Date().toISOString(),
      roles,
      users,
      canvasPositions: nodePositions,
    };
  };

  const handleDownloadJson = () => {
    const jsonString = JSON.stringify(getExportJsonObject(), null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cica-rls-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addDebugLog('[JSON Export] RLS konfiguráció JSON fájlként letöltve.');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setJsonImportText(content);
        setJsonImportError(null);
      } catch (err: any) {
        setJsonImportError('Fájl beolvasási hiba: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const processExecuteImportJson = () => {
    try {
      setJsonImportError(null);
      setJsonImportSuccess(null);

      if (!jsonImportText.trim()) {
        setJsonImportError('Kérjük adjon meg vagy töltsön fel egy érvényes JSON konfigurációt!');
        return;
      }

      const parsed = JSON.parse(jsonImportText);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Az alábbi szöveg nem érvényes JSON objektum.');
      }

      if (!Array.isArray(parsed.roles) || parsed.roles.length === 0) {
        throw new Error('A JSON struktúrának tartalmaznia kell legalább egy elemet a "roles" tömbben!');
      }

      const importedRoles: UserRole[] = parsed.roles;
      const importedUsers: UserAccount[] = Array.isArray(parsed.users) ? parsed.users : [];
      const importedPositions = parsed.canvasPositions && typeof parsed.canvasPositions === 'object' ? parsed.canvasPositions : null;

      if (importMode === 'overwrite') {
        setRoles(importedRoles);
        if (importedUsers.length > 0) {
          setUsers(importedUsers);
        }
        if (importedPositions) {
          setNodePositions(importedPositions);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('cica_rls_canvas_positions', JSON.stringify(importedPositions));
          }
        }
        addDebugLog(`[JSON Import] RLS konfiguráció sikeresen FELÜLÍRVA (${importedRoles.length} szerepkör, ${importedUsers.length} felhasználó).`);
      } else {
        // Merge Mode
        const existingRolesMap = new Map(roles.map((r) => [r.id, r]));
        importedRoles.forEach((r) => existingRolesMap.set(r.id, r));
        const mergedRoles = Array.from(existingRolesMap.values());

        const existingUsersMap = new Map(users.map((u) => [u.id, u]));
        importedUsers.forEach((u) => existingUsersMap.set(u.id, u));
        const mergedUsers = Array.from(existingUsersMap.values());

        setRoles(mergedRoles);
        setUsers(mergedUsers);

        if (importedPositions) {
          const mergedPositions = { ...nodePositions, ...importedPositions };
          setNodePositions(mergedPositions);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('cica_rls_canvas_positions', JSON.stringify(mergedPositions));
          }
        }
        addDebugLog(`[JSON Import] RLS konfiguráció ÖSSZEFÉSÜLVE (${importedRoles.length} importált szerepkör).`);
      }

      setJsonImportSuccess(`✅ Sikeresen importálva! (${importedRoles.length} szerepkör, ${importedUsers.length} felhasználó frissítve)`);
      setTimeout(() => {
        setJsonImportSuccess(null);
        setShowJsonImportModal(false);
        setJsonImportText('');
      }, 1600);

    } catch (err: any) {
      setJsonImportError('Importálási hiba: ' + err.message);
    }
  };

  // Selected Node Inspector details
  const selectedNode = canvasNodes.find((n) => n.id === selectedNodeId);

  // Forms
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const newUser: UserAccount = {
      id: `user_${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim() || `${newUserName.toLowerCase().replace(/\s+/g, '')}@shelter.hu`,
      roleId: newUserRoleId,
      active: true,
      createdAt: new Date().toISOString(),
    };

    addUser(newUser);
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    addDebugLog(`[Canvas] Új felhasználó létrehozva: ${newUser.name}`);
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !newRoleId.trim()) return;

    const newRole: UserRole = {
      id: newRoleId.toLowerCase().trim(),
      code: newRoleId.toUpperCase().trim() as any,
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || 'Egyedi vizuálisan létrehozott szerepkör',
      isSystemRole: false,
      permissions: {
        'animal.read': true,
        'health.read': true,
      },
    };

    addRole(newRole);
    setShowAddRoleModal(false);
    setNewRoleName('');
    setNewRoleId('');
    setNewRoleDesc('');
    addDebugLog(`[Canvas] Új szerepkör létrehozva: ${newRole.name} (${newRole.id})`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-7xl h-[92vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* TOP BAR / HEADER */}
        <div className="p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-lg rounded-2xl shadow-md">
              🎨
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-purple-200">
                  Vizuális Drag & Drop RBAC & RLS Szerkesztő Canvas
                </h3>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/80 font-mono font-black text-[10px] rounded-full">
                  Interactive Node Canvas
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Húzd a csomópontokat a vásznon, kösd össze a felhasználókat, szerepköröket és RLS szabályokat valós időben!
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowValidationListModal(true)}
              className={`px-3 py-1.5 font-extrabold rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer ${
                conflicts.length > 0
                  ? 'bg-gradient-to-r from-rose-900 to-amber-900 border border-rose-500 text-rose-200 animate-pulse hover:from-rose-800 hover:to-amber-800'
                  : 'bg-slate-900 border border-emerald-700/80 text-emerald-300 hover:bg-slate-800'
              }`}
              title="RLS Szabályzat Validálása és Ütközés-vizsgálat"
            >
              <span>{conflicts.length > 0 ? '⚠️' : '✅'}</span>
              <span>{conflicts.length > 0 ? `${conflicts.length} RLS Konfliktus` : '0 Konfliktus'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddUserModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
            >
              <span>👤</span>
              <span>+ Új Felhasználó</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddRoleModal(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
            >
              <span>👑</span>
              <span>+ Új Szerepkör</span>
            </button>

            <button
              type="button"
              onClick={handleAutoLayout}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition flex items-center gap-1 cursor-pointer"
              title="Csomópontok automatikus oszlopos rendezése"
            >
              <span>📐</span>
              <span>Auto Layout</span>
            </button>

            <button
              type="button"
              onClick={() => setShowJsonExportModal(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-emerald-100 font-extrabold rounded-xl text-xs shadow-md transition flex items-center gap-1 cursor-pointer"
              title="RLS & Szerepkör Konfiguráció Letöltése / Exportálása JSON fájlba"
            >
              <span>📥</span>
              <span>JSON Export</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setJsonImportError(null);
                setJsonImportSuccess(null);
                setShowJsonImportModal(true);
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition flex items-center gap-1 cursor-pointer"
              title="RLS & Szerepkör Konfiguráció Betöltése / Importálása JSON fájlból"
            >
              <span>📤</span>
              <span>JSON Import</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSqlExportModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-md transition flex items-center gap-1 cursor-pointer"
            >
              <span>📜</span>
              <span>SQL RLS Export</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white font-black rounded-xl transition cursor-pointer text-sm"
              title="Bezárás"
            >
              ✕
            </button>
          </div>
        </div>

        {/* WORKSPACE & CANVAS AREA */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden select-none">
          {/* Legend Banner */}
          <div className="absolute top-3 left-3 z-20 p-2.5 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl shadow-lg flex items-center gap-4 text-[10px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-300" />
              <span className="font-bold text-blue-200">Felhasználók</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500 border border-purple-300" />
              <span className="font-bold text-purple-200">Szerepkörök</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300" />
              <span className="font-bold text-emerald-200">RLS Jogosultságok</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-600 border border-slate-400" />
              <span className="font-bold text-slate-300">Adatbázis Táblák</span>
            </div>

            {connectingStartNodeId && (
              <span className="ml-2 px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black rounded-md animate-bounce">
                🔗 Kattints a cél csomópontra az összekötéshez / átállításhoz!
              </span>
            )}
          </div>

          {/* Canvas Zoom / Pan Controls */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-2xl shadow-lg">
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl"
            >
              +
            </button>
            <span className="text-[10px] font-mono text-slate-300 px-1 font-bold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl"
            >
              -
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-[10px] rounded-xl ml-1"
            >
              Alaphelyzet
            </button>
          </div>

          {/* SVG Canvas Backdrop & Nodes Viewport */}
          <div
            ref={containerRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
              backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          >
            {/* SVG Link Curves Container */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              <defs>
                <linearGradient id="gradUserRole" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                </linearGradient>

                <linearGradient id="gradRolePerm" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                </linearGradient>

                <linearGradient id="gradPermTable" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#64748b" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Render Connection Lines */}
              {links.map((link) => {
                const fromP = getNodePoint(link.fromId, 'right');
                const toP = getNodePoint(link.toId, 'left');

                const isConnectedToHovered = hoveredNodeId === link.fromId || hoveredNodeId === link.toId;
                const isConnectedToSelected = selectedNodeId === link.fromId || selectedNodeId === link.toId;

                const linkConflicts = conflicts.filter((c) => c.affectedLinkIds.includes(link.id));
                const hasConflict = linkConflicts.length > 0;
                const conflictSeverity = hasConflict ? (linkConflicts.some((c) => c.severity === 'error') ? 'error' : 'warning') : null;

                const dx = Math.abs(toP.x - fromP.x) * 0.5;
                const pathD = `M ${fromP.x} ${fromP.y} C ${fromP.x + dx} ${fromP.y}, ${toP.x - dx} ${toP.y}, ${toP.x} ${toP.y}`;

                const midX = (fromP.x + toP.x) / 2;
                const midY = (fromP.y + toP.y) / 2;

                const gradId = link.type === 'user_role' ? 'url(#gradUserRole)' : link.type === 'role_perm' ? 'url(#gradRolePerm)' : 'url(#gradPermTable)';

                return (
                  <g key={link.id}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={
                        hasConflict
                          ? conflictSeverity === 'error'
                            ? '#ef4444'
                            : '#f97316'
                          : isConnectedToHovered || isConnectedToSelected
                          ? '#f59e0b'
                          : gradId
                      }
                      strokeWidth={hasConflict ? 3.5 : isConnectedToHovered || isConnectedToSelected ? 3 : 1.8}
                      strokeDasharray={hasConflict ? '6,3' : link.type === 'perm_table' ? '4,4' : undefined}
                      className="transition-all duration-150"
                    />

                    {/* Animated Pulse Particle on Active Connection or Conflict */}
                    {(isConnectedToHovered || isConnectedToSelected || hasConflict) && (
                      <circle r={hasConflict ? 5 : 4} fill={hasConflict ? (conflictSeverity === 'error' ? '#f87171' : '#fb923c') : '#fbbf24'}>
                        <animateMotion path={pathD} dur={hasConflict ? '1.2s' : '2s'} repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Warning Indicator Badge on Conflicting Line */}
                    {hasConflict && (
                      <g
                        className="cursor-pointer pointer-events-auto hover:scale-125 transition-transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConflict(linkConflicts[0]);
                        }}
                      >
                        <circle
                          cx={midX}
                          cy={midY}
                          r="12"
                          fill={conflictSeverity === 'error' ? '#7f1d1d' : '#7c2d12'}
                          stroke={conflictSeverity === 'error' ? '#f87171' : '#fb923c'}
                          strokeWidth="2"
                        />
                        <text x={midX} y={midY + 4} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                          ⚠️
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* NODES LAYER */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              {canvasNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isConnectingStart = connectingStartNodeId === node.id;

                const nodeConflicts = conflicts.filter((c) => c.affectedNodeIds.includes(node.id));
                const hasNodeConflict = nodeConflicts.length > 0;
                const nodeConflictSeverity = hasNodeConflict ? (nodeConflicts.some((c) => c.severity === 'error') ? 'error' : 'warning') : null;

                const pos = node.pos;

                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      width: '220px',
                    }}
                    className={`absolute pointer-events-auto p-2.5 rounded-2xl border transition-all cursor-move shadow-md ${
                      node.type === 'user'
                        ? 'bg-slate-900/90 border-blue-600/80 hover:border-blue-400'
                        : node.type === 'role'
                        ? 'bg-slate-900/90 border-purple-600/80 hover:border-purple-400'
                        : node.type === 'permission'
                        ? 'bg-slate-900/90 border-emerald-600/80 hover:border-emerald-400'
                        : 'bg-slate-950 border-slate-700 hover:border-slate-500'
                    } ${isSelected ? 'ring-2 ring-amber-400 border-amber-400 shadow-xl scale-102 z-30' : ''} ${
                      isConnectingStart ? 'ring-2 ring-purple-400 animate-pulse' : ''
                    } ${
                      hasNodeConflict
                        ? nodeConflictSeverity === 'error'
                          ? 'ring-2 ring-rose-500/80 border-rose-500 shadow-rose-950/80'
                          : 'ring-2 ring-amber-500/80 border-amber-500 shadow-amber-950/80'
                        : ''
                    }`}
                  >
                    {/* Conflict Badge Button on Node */}
                    {hasNodeConflict && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConflict(nodeConflicts[0]);
                        }}
                        className={`absolute -top-2.5 -right-2.5 px-1.5 py-0.5 font-black text-[10px] rounded-full shadow-lg border animate-bounce cursor-pointer z-30 flex items-center gap-0.5 ${
                          nodeConflictSeverity === 'error'
                            ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-300'
                            : 'bg-amber-600 hover:bg-amber-500 text-slate-950 border-amber-300'
                        }`}
                        title="RLS Útközési / Validációs Figyelmeztetés Megtekintése"
                      >
                        <span>⚠️</span>
                        <span>{nodeConflicts.length}</span>
                      </button>
                    )}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{node.icon}</span>
                        <span className="font-extrabold text-xs text-white truncate max-w-[130px]" title={node.label}>
                          {node.label}
                        </span>
                      </div>

                      {/* Connect Handle Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (connectingStartNodeId === node.id) {
                            setConnectingStartNodeId(null);
                          } else if (connectingStartNodeId) {
                            handleConnectNodes(connectingStartNodeId, node.id);
                            setConnectingStartNodeId(null);
                          } else {
                            setConnectingStartNodeId(node.id);
                          }
                        }}
                        className={`p-1 rounded-lg text-[9px] font-bold transition cursor-pointer ${
                          isConnectingStart
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-800 hover:bg-purple-600 text-purple-200'
                        }`}
                        title="Összekötés húzása / kapcsolása"
                      >
                        🔗
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      {node.subLabel}
                    </p>

                    {/* Node Type Badge */}
                    <div className="mt-2 flex items-center justify-between text-[8px] font-mono text-slate-400">
                      <span className="uppercase tracking-wider font-extrabold">
                        {node.type}
                      </span>
                      <span className="text-slate-500">
                        ({pos.x}, {pos.y})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE INSPECTOR DRAWER */}
          {selectedNode && (
            <div className="absolute top-3 right-3 bottom-3 w-80 z-30 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-3xl p-4 shadow-2xl flex flex-col justify-between text-xs space-y-4 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedNode.icon}</span>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">
                        {selectedNode.label}
                      </h4>
                      <span className="text-[10px] font-mono text-purple-300 uppercase font-black">
                        {selectedNode.type} Node
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 text-slate-400 hover:text-white font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* USER INSPECTOR */}
                {selectedNode.type === 'user' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400">Email Cím:</div>
                      <div className="font-bold text-white font-mono break-all">{selectedNode.dataRef.email || 'Nincs megadva'}</div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">
                        Hozzárendelt Szerepkör Módosítása:
                      </label>
                      <CustomSelect
                        value={selectedNode.dataRef.roleId}
                        onChange={(val) => updateUser(selectedNode.dataRef.id, { roleId: val })}
                        options={roles.map((r) => ({
                          value: r.id,
                          label: `${r.name} (${r.id})`,
                          icon: '🛡️',
                        }))}
                        title="Szerepkör Kiválasztása"
                        colorScheme="purple"
                        buttonClassName="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-bold text-slate-100 text-xs"
                      />
                    </div>

                    <div className="p-3 bg-blue-950/60 border border-blue-800 rounded-2xl text-[10px] text-blue-200 leading-relaxed">
                      💡 A szerepkört úgy is megváltoztathatod, ha a kék felhasználói kártyán lévő 🔗 gombra kattintasz, majd a kívánt lilás szerepkör kártyára!
                    </div>
                  </div>
                )}

                {/* ROLE INSPECTOR */}
                {selectedNode.type === 'role' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400">Szerepkör Leírása:</div>
                      <div className="font-medium text-slate-200 text-[11px]">{selectedNode.dataRef.description || 'Nincs leírás'}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="font-extrabold text-[11px] text-purple-200 flex items-center justify-between">
                        <span>RLS CRUD Jogosultságok Togglere:</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({Object.values(selectedNode.dataRef.permissions || {}).filter(Boolean).length} engedélyezve)
                        </span>
                      </div>

                      <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                        {PERMISSION_NODES.map((p) => {
                          const isAllowed = selectedNode.dataRef.permissions?.[p.key] === true;

                          return (
                            <button
                              key={p.key}
                              type="button"
                              onClick={() => {
                                const current = selectedNode.dataRef.permissions || {};
                                updateRole(selectedNode.dataRef.id, {
                                  permissions: { ...current, [p.key]: !isAllowed },
                                });
                              }}
                              className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer text-[10px] ${
                                isAllowed
                                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200 font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              }`}
                            >
                              <span className="font-mono">{p.key}</span>
                              <span className={`px-1.5 py-0.2 rounded font-mono font-black text-[9px] ${
                                isAllowed ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {isAllowed ? '✓' : '✕'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* PERMISSION INSPECTOR */}
                {selectedNode.type === 'permission' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-[10px]">
                      <div>
                        <span className="text-slate-400">Művelet típusa: </span>
                        <strong className="text-emerald-300 font-mono uppercase">{selectedNode.dataRef.op} ({selectedNode.dataRef.sqlOp})</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Érintett tábla: </span>
                        <strong className="text-purple-300 font-mono">{selectedNode.dataRef.table}</strong>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-300">Engedélyezve a következő szerepkörökben:</div>
                      <div className="flex flex-wrap gap-1">
                        {roles.filter((r) => r.permissions?.[selectedNode.dataRef.key]).map((r) => (
                          <span key={r.id} className="px-2 py-0.5 bg-purple-950 text-purple-200 border border-purple-800 rounded-md font-bold text-[10px]">
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TABLE INSPECTOR */}
                {selectedNode.type === 'table' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-[10px]">
                      <div className="text-slate-300 font-bold">Supabase PostgreSQL Tábla</div>
                      <div className="font-mono text-emerald-300">public.{selectedNode.dataRef.name}</div>
                      <div className="text-slate-400">RLS Status: <span className="text-emerald-400 font-black">ENABLED</span></div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Panel Bezárása
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SQL EXPORT MODAL */}
      {showSqlExportModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <h4 className="font-extrabold text-sm text-purple-200">
                  Generált Supabase RLS SQL DDL Script
                </h4>
              </div>
              <button
                onClick={() => setShowSqlExportModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Másold ki a generált SQL kódblokkot és futtasd le a Supabase SQL Editor-ban a vásznon beállított topológia szinkronizálásához!
            </p>

            <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-2xl border border-slate-800 max-h-80 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{generateSqlScript()}</pre>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
              <span className="text-[10px] text-slate-400 font-mono">
                Tartalmazza az 5 adatbázis táblát, DDL-t, RLS-t és {roles.length} szerepkört
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generateSqlScript());
                    alert('📋 Az SQL DDL & RLS script sikeresen másolva a vágólapra!');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span>📋</span>
                  <span>SQL Másolása</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSqlFile}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>SQL Script Letöltése (.sql)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlExportModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Bezárás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON EXPORT MODAL */}
      {showJsonExportModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📥</span>
                <h4 className="font-extrabold text-sm text-emerald-200">
                  RLS & Szerepkör Konfiguráció JSON Exportálása
                </h4>
              </div>
              <button
                onClick={() => setShowJsonExportModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Az alábbi JSON fájl tartalmazza az összes mentett szerepkört, RLS jogosultságot, felhasználói fiók hozzárendelést és a vászon elrendezési koordinátáit.
            </p>

            <div className="p-3 bg-slate-950 text-emerald-300 font-mono text-[10px] rounded-2xl border border-slate-800 max-h-64 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{JSON.stringify(getExportJsonObject(), null, 2)}</pre>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
              <span className="text-[10px] text-slate-400 font-mono">
                {roles.length} szerepkör • {users.length} felhasználó
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(getExportJsonObject(), null, 2));
                    alert('📋 A JSON konfiguráció sikeresen másolva a vágólapra!');
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  📋 JSON Másolása
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>JSON Fájl Letöltése</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON IMPORT MODAL */}
      {showJsonImportModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📤</span>
                <h4 className="font-extrabold text-sm text-amber-200">
                  RLS & Szerepkör Konfiguráció JSON Importálása
                </h4>
              </div>
              <button
                onClick={() => setShowJsonImportModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  1. JSON Fájl Feltöltése (.json):
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJsonFile}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-medium text-slate-300 text-xs cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-slate-950 file:font-black hover:file:bg-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  2. Vagy Bemasolandó JSON Szöveg:
                </label>
                <textarea
                  rows={6}
                  value={jsonImportText}
                  onChange={(e) => {
                    setJsonImportText(e.target.value);
                    setJsonImportError(null);
                  }}
                  placeholder='Illeszd be ide a korábban kiexportált JSON konfigurációt {"app": "cica-nyt-rbac-rls", ...}'
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-2xl font-mono text-[11px] text-amber-200 placeholder-slate-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Importálás Módja:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('overwrite')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      importMode === 'overwrite'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-extrabold text-[11px]">🔄 Felülírás (Overwrite)</div>
                    <div className="text-[10px] text-slate-400">Lecseréli a jelenlegi szerepköröket és jogosultságokat.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      importMode === 'merge'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-extrabold text-[11px]">🔀 Összefésülés (Merge)</div>
                    <div className="text-[10px] text-slate-400">Frissíti a létezőket, megőrizve az új egyedi kiegészítéseket.</div>
                  </button>
                </div>
              </div>

              {jsonImportError && (
                <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-2xl text-rose-200 font-bold text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{jsonImportError}</span>
                </div>
              )}

              {jsonImportSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-2xl text-emerald-200 font-bold text-xs flex items-center gap-2">
                  <span>{jsonImportSuccess}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowJsonImportModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={processExecuteImportJson}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-md transition cursor-pointer text-xs"
              >
                🚀 Importálás Végrehajtása
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <form onSubmit={handleCreateUser} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-extrabold text-sm text-blue-200 flex items-center gap-2">
                <span>👤</span>
                <span>Új Felhasználó Hozzáadása a Vászonra</span>
              </h4>
              <button type="button" onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Név *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="pl. Horváth Péter"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Email Cím</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="peter@shelter.hu"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1 text-xs">Kezdő Szerepkör</label>
                <CustomSelect
                  value={newUserRoleId}
                  onChange={(val) => setNewUserRoleId(val)}
                  options={roles.map((r) => ({
                    value: r.id,
                    label: `${r.name} (${r.id})`,
                    icon: '🛡️',
                  }))}
                  title="Kezdő Szerepkör Kiválasztása"
                  colorScheme="blue"
                  buttonClassName="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-slate-100 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer text-xs"
              >
                + Létrehozás & Canvasra Helyezés
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD ROLE MODAL */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <form onSubmit={handleCreateRole} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-extrabold text-sm text-purple-200 flex items-center gap-2">
                <span>👑</span>
                <span>Új Szerepkör Létrehozása a Vászonra</span>
              </h4>
              <button type="button" onClick={() => setShowAddRoleModal(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Szerepkör Megnevezése *</label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="pl. Telephely Vezető"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-slate-100 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Azonosító ID *</label>
                <input
                  type="text"
                  required
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  placeholder="pl. manager"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 font-mono rounded-xl font-bold text-slate-100 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Leírás</label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Telephelyi adminisztratív feladatok ellátása..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl font-medium text-slate-100 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer text-xs"
              >
                + Létrehozás & Canvasra Helyezés
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SPECIFIC CONFLICT SUGGESTION MODAL */}
      {selectedConflict && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h4 className="font-extrabold text-sm text-rose-300">
                    RLS Szabályzat Ütközés Észlelve
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400">
                    Konfliktus azonosító: {selectedConflict.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConflict(null)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-white">
                  {selectedConflict.title}
                </span>
                <span
                  className={`px-2 py-0.5 font-mono font-black text-[10px] rounded-full uppercase ${
                    selectedConflict.severity === 'error'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : 'bg-amber-950 text-amber-300 border border-amber-700'
                  }`}
                >
                  {selectedConflict.severity === 'error' ? '🔴 KRITIKUS HIBÁ' : '🟠 FIGYELMEZTETÉS'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed">
                {selectedConflict.description}
              </div>

              <div className="p-3.5 bg-amber-950/60 border border-amber-600/80 rounded-2xl space-y-1.5 text-xs">
                <div className="font-bold text-amber-200 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Javasolt Helyes Megoldás:</span>
                </div>
                <p className="text-amber-100 text-[11px] leading-relaxed">
                  {selectedConflict.suggestion}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedConflict(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedConflict.autoFix();
                  setSelectedConflict(null);
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black rounded-xl shadow-lg transition cursor-pointer text-xs flex items-center gap-1.5"
              >
                <span>⚡</span>
                <span>Automatikus Javítás Alkalmazása</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VALIDATION REPORT SUMMARY MODAL */}
      {showValidationListModal && (
        <div className="fixed inset-0 z-65 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{conflicts.length > 0 ? '⚠️' : '✅'}</span>
                <div>
                  <h4 className="font-extrabold text-sm text-purple-200">
                    RLS Szabályzat Validációs Jelentés ({conflicts.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Automatizált ellenőrző modul a logikai ütközések és jogosultsági hiányosságok észlelésére
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowValidationListModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {conflicts.length === 0 ? (
                <div className="p-8 bg-emerald-950/50 border border-emerald-700 rounded-3xl text-center space-y-2">
                  <span className="text-4xl block">🎉</span>
                  <h5 className="font-extrabold text-emerald-200 text-sm">
                    Minden RLS Szabályzat Érvényes és Konzisztenst!
                  </h5>
                  <p className="text-xs text-emerald-300/80">
                    A vásznon beállított szerepkörök, felhasználók és RLS adatbázis hozzáférések között nem találhatók hiányzó olvasási vagy szigetszerű törlési engedélyek.
                  </p>
                </div>
              ) : (
                conflicts.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-2xl border space-y-2.5 transition ${
                      c.severity === 'error'
                        ? 'bg-rose-950/40 border-rose-800/80'
                        : 'bg-amber-950/40 border-amber-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{c.severity === 'error' ? '🔴' : '🟠'}</span>
                        <h5 className="font-extrabold text-xs text-white">{c.title}</h5>
                      </div>
                      <span
                        className={`px-2 py-0.5 font-mono font-black text-[9px] rounded-full uppercase ${
                          c.severity === 'error'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-700'
                        }`}
                      >
                        {c.severity === 'error' ? 'KRITIKUS' : 'FIGYELMEZTETÉS'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{c.description}</p>

                    <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-amber-200 space-y-1">
                      <span className="font-bold flex items-center gap-1">💡 Javasolt Helyes Megoldás:</span>
                      <p className="text-slate-300">{c.suggestion}</p>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          c.autoFix();
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black rounded-xl shadow-xs transition text-xs cursor-pointer flex items-center gap-1"
                      >
                        <span>⚡</span>
                        <span>Javítás Alkalmazása</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3 shrink-0">
              <span className="text-[11px] text-slate-400 font-mono">
                {conflicts.length} aktív ütközés észlelve
              </span>

              <div className="flex items-center gap-2">
                {conflicts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      conflicts.forEach((c) => c.autoFix());
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl shadow-md transition cursor-pointer text-xs flex items-center gap-1.5"
                  >
                    <span>⚡</span>
                    <span>Összes Konfliktus Automatikus Javítása</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowValidationListModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Bezárás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
