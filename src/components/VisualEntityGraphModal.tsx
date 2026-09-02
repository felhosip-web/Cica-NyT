import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cat } from './CatCard';
import { TnrRecord } from '../types';

interface VisualEntityGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  cats: Cat[];
  events: any[];
  tnrRecords: TnrRecord[];
}

export interface GraphNode {
  id: string;
  type: 'cat' | 'event' | 'tnr';
  title: string;
  subtitle: string;
  detail: string;
  status: string;
  icon: string;
  colorTheme: string;
  pos: { x: number; y: number };
  raw: any;
}

export interface GraphLink {
  id: string;
  fromId: string;
  toId: string;
  type: 'cat_event' | 'cat_tnr' | 'event_tnr';
  label?: string;
}

export const VisualEntityGraphModal: React.FC<VisualEntityGraphModalProps> = ({
  isOpen,
  onClose,
  cats,
  events,
  tnrRecords,
}) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);

  // Selection & Hover
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cats' | 'events' | 'tnr' | 'connected' | 'orphaned'>('all');

  // Canvas Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging Nodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load / Compute Graph Structure
  useEffect(() => {
    if (!isOpen) return;

    // Load saved positions if any
    let savedPositions: Record<string, { x: number; y: number }> = {};
    try {
      const stored = localStorage.getItem('cica_entity_graph_positions');
      if (stored) {
        savedPositions = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse entity graph positions:', e);
    }

    const computedNodes: GraphNode[] = [];
    const computedLinks: GraphLink[] = [];

    // 1. Create Cat Nodes
    cats.forEach((cat, index) => {
      const nodeId = `cat_${cat.id}`;
      const defaultX = 100;
      const defaultY = 100 + index * 160;

      computedNodes.push({
        id: nodeId,
        type: 'cat',
        title: cat.nev,
        subtitle: `Sorszám: #${cat.sorszam || 'N/A'} • ${cat.ivar === 'bak' ? '♂ Bak' : '♀ Nőstény'}`,
        detail: `${cat.szin || 'Ismeretlen szín'} • ${cat.isSpayed ? '✂️ Ivartalanítva' : '⚠️ Nincs ivartalanítva'}`,
        status: cat.status || 'gondozasban',
        icon: cat.status === 'gazdis' ? '🟢' : cat.status === 'ideiglenes' ? '🔵' : cat.status === 'elhunyt' ? '🖤' : '🏡',
        colorTheme: 'border-pink-500 bg-pink-950/80 text-pink-200',
        pos: savedPositions[nodeId] || { x: defaultX, y: defaultY },
        raw: cat,
      });
    });

    // 2. Create Event Nodes & Links to Cats
    events.forEach((ev, index) => {
      const nodeId = `event_${ev.id}`;
      const defaultX = 550;
      const defaultY = 100 + index * 140;

      const matchedCat = cats.find(
        (c) => String(c.id) === String(ev.catId) || (ev.catName && c.nev.toLowerCase() === ev.catName.toLowerCase())
      );

      computedNodes.push({
        id: nodeId,
        type: 'event',
        title: ev.title || ev.type || 'Egészségügyi Esemény',
        subtitle: `Dátum: ${ev.date || 'N/A'} ${ev.cost ? `• ${Number(ev.cost).toLocaleString('hu-HU')} Ft` : ''}`,
        detail: ev.description || ev.type || 'Nincs leírás',
        status: ev.status || 'elvégezve',
        icon: ev.type === 'oltas' ? '💉' : ev.type === 'kezelés' || ev.type === 'kezeles' ? '🩺' : ev.type === 'műtét' || ev.type === 'mutet' ? '🏥' : '📋',
        colorTheme: 'border-emerald-500 bg-emerald-950/80 text-emerald-200',
        pos: savedPositions[nodeId] || { x: defaultX, y: defaultY },
        raw: ev,
      });

      if (matchedCat) {
        computedLinks.push({
          id: `link_cat_${matchedCat.id}-event_${ev.id}`,
          fromId: `cat_${matchedCat.id}`,
          toId: nodeId,
          type: 'cat_event',
          label: ev.type || 'Egészségügy',
        });
      }
    });

    // 3. Create TNR Nodes & Links to Cats / Events
    tnrRecords.forEach((tnr, index) => {
      const nodeId = `tnr_${tnr.id}`;
      const defaultX = 1000;
      const defaultY = 100 + index * 150;

      // Find matching cat if catNameOrTag matches cat name or sorszam or chip
      const matchedCat = cats.find(
        (c) =>
          tnr.catNameOrTag &&
          (c.nev.toLowerCase().includes(tnr.catNameOrTag.toLowerCase()) ||
            tnr.catNameOrTag.toLowerCase().includes(c.nev.toLowerCase()) ||
            (c.sorszam && String(c.sorszam) === String(tnr.catNameOrTag)))
      );

      computedNodes.push({
        id: nodeId,
        type: 'tnr',
        title: tnr.catNameOrTag ? `TNR: ${tnr.catNameOrTag}` : `TNR Műtét #${tnr.id.slice(0, 6)}`,
        subtitle: `Befogva: ${tnr.locationTrapped || 'Ismeretlen hely'} (${tnr.dateTrapped || ''})`,
        detail: `Klinika: ${tnr.clinicLocation || 'N/A'} • ${tnr.earTip ? '✂️ Fülcsipkézve' : 'Nincs fülcsipke'}`,
        status: tnr.status || 'befogva',
        icon: '✂️',
        colorTheme: 'border-cyan-500 bg-cyan-950/80 text-cyan-200',
        pos: savedPositions[nodeId] || { x: defaultX, y: defaultY },
        raw: tnr,
      });

      if (matchedCat) {
        computedLinks.push({
          id: `link_cat_${matchedCat.id}-tnr_${tnr.id}`,
          fromId: `cat_${matchedCat.id}`,
          toId: nodeId,
          type: 'cat_tnr',
          label: 'TNR Műtét',
        });
      }
    });

    setNodes(computedNodes);
    setLinks(computedLinks);
  }, [isOpen, cats, events, tnrRecords]);

  // Save node positions to local storage
  const savePositions = (updatedNodes: GraphNode[]) => {
    const posMap: Record<string, { x: number; y: number }> = {};
    updatedNodes.forEach((n) => {
      posMap[n.id] = n.pos;
    });
    localStorage.setItem('cica_entity_graph_positions', JSON.stringify(posMap));
  };

  // Auto-Layout: Column layout
  const handleAutoLayout = () => {
    const catNodes = nodes.filter((n) => n.type === 'cat');
    const eventNodes = nodes.filter((n) => n.type === 'event');
    const tnrNodes = nodes.filter((n) => n.type === 'tnr');

    const updated = nodes.map((node) => {
      if (node.type === 'cat') {
        const idx = catNodes.findIndex((n) => n.id === node.id);
        return { ...node, pos: { x: 80, y: 80 + idx * 160 } };
      }
      if (node.type === 'event') {
        const idx = eventNodes.findIndex((n) => n.id === node.id);
        return { ...node, pos: { x: 540, y: 80 + idx * 150 } };
      }
      if (node.type === 'tnr') {
        const idx = tnrNodes.findIndex((n) => n.id === node.id);
        return { ...node, pos: { x: 1000, y: 80 + idx * 160 } };
      }
      return node;
    });

    setNodes(updated);
    savePositions(updated);
  };

  // Reset Pan & Zoom
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 50, y: 50 });
  };

  // Pan Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingNodeId) {
      const updated = nodes.map((node) => {
        if (node.id === draggingNodeId) {
          return {
            ...node,
            pos: {
              x: (e.clientX - pan.x - dragOffset.x) / zoom,
              y: (e.clientY - pan.y - dragOffset.y) / zoom,
            },
          };
        }
        return node;
      });
      setNodes(updated);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggingNodeId) {
      setDraggingNodeId(null);
      savePositions(nodes);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(2.2, Math.max(0.4, prev * zoomFactor)));
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);

    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode) {
      setDragOffset({
        x: e.clientX - pan.x - targetNode.pos.x * zoom,
        y: e.clientY - pan.y - targetNode.pos.y * zoom,
      });
    }
  };

  // Filtering nodes
  const connectedNodeIds = new Set<string>();
  links.forEach((l) => {
    connectedNodeIds.add(l.fromId);
    connectedNodeIds.add(l.toId);
  });

  const filteredNodes = nodes.filter((node) => {
    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = node.title.toLowerCase().includes(q);
      const matchSubtitle = node.subtitle.toLowerCase().includes(q);
      const matchDetail = node.detail.toLowerCase().includes(q);
      if (!matchTitle && !matchSubtitle && !matchDetail) return false;
    }

    // Type Filter
    if (filterType === 'cats' && node.type !== 'cat') return false;
    if (filterType === 'events' && node.type !== 'event') return false;
    if (filterType === 'tnr' && node.type !== 'tnr') return false;
    if (filterType === 'connected' && !connectedNodeIds.has(node.id)) return false;
    if (filterType === 'orphaned' && connectedNodeIds.has(node.id)) return false;

    return true;
  });

  const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));

  const filteredLinks = links.filter((link) => {
    return visibleNodeIds.has(link.fromId) && visibleNodeIds.has(link.toId);
  });

  // Selected Node Details
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const connectedLinksForSelected = links.filter((l) => l.fromId === selectedNodeId || l.toId === selectedNodeId);
  const connectedNodeIdsForSelected = connectedLinksForSelected.map((l) => (l.fromId === selectedNodeId ? l.toId : l.fromId));
  const connectedNodesForSelected = nodes.filter((n) => connectedNodeIdsForSelected.includes(n.id));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
        <div className="w-full h-full max-w-7xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 relative">
          {/* Header Bar */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2 bg-purple-900/40 border border-purple-700/60 rounded-2xl">🌐</span>
              <div>
                <h3 className="text-base font-black text-purple-200 flex items-center gap-2">
                  <span>Állatok - Események - TNR Összefüggések Canvas</span>
                  <span className="px-2 py-0.5 bg-purple-900/80 border border-purple-600 text-purple-300 text-[10px] font-mono rounded-full uppercase">
                    Vizuális Munkaterület
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Interaktív gráf az állomány, orvosi beavatkozások és TNR műtétek kapcsolatainak áttekintésére
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono font-bold bg-slate-900/90 p-1.5 border border-slate-800 rounded-2xl">
              <span className="px-2.5 py-1 bg-pink-950 border border-pink-700 text-pink-300 rounded-xl flex items-center gap-1">
                <span>🐾</span>
                <span>{cats.length} Cica</span>
              </span>
              <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-xl flex items-center gap-1">
                <span>🩺</span>
                <span>{events.length} Esemény</span>
              </span>
              <span className="px-2.5 py-1 bg-cyan-950 border border-cyan-700 text-cyan-300 rounded-xl flex items-center gap-1">
                <span>✂️</span>
                <span>{tnrRecords.length} TNR</span>
              </span>
              <span className="px-2.5 py-1 bg-amber-950 border border-amber-700 text-amber-300 rounded-xl flex items-center gap-1">
                <span>🔗</span>
                <span>{links.length} Összeköttetés</span>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoLayout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold rounded-xl text-xs border border-purple-800/80 transition cursor-pointer flex items-center gap-1"
                title="Oszlopos automatikus elrendezés"
              >
                <span>⚡</span>
                <span className="hidden sm:inline">Auto-Layout</span>
              </button>

              <button
                type="button"
                onClick={handleResetView}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 transition cursor-pointer flex items-center gap-1"
                title="Nézet visszaállítása"
              >
                <span>🔄</span>
                <span className="hidden sm:inline">Nézet Alaphelyzetbe</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Sub-Header Toolbar (Search & Category Filters) */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <span className="text-slate-400">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés név, sorszám, helyszín, klinika vagy leírás szerint..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-slate-500 hover:text-slate-300 font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-xl font-bold text-xs transition cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                Összes
              </button>
              <button
                type="button"
                onClick={() => setFilterType('cats')}
                className={`px-2.5 py-1 rounded-xl font-bold text-xs transition cursor-pointer ${
                  filterType === 'cats'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                🐾 Állatok ({cats.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('events')}
                className={`px-2.5 py-1 rounded-xl font-bold text-xs transition cursor-pointer ${
                  filterType === 'events'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                🩺 Események ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('tnr')}
                className={`px-2.5 py-1 rounded-xl font-bold text-xs transition cursor-pointer ${
                  filterType === 'tnr'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                ✂️ TNR ({tnrRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('connected')}
                className={`px-2.5 py-1 rounded-xl font-bold text-xs transition cursor-pointer ${
                  filterType === 'connected'
                    ? 'bg-amber-600 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                🔗 Kapcsolódó
              </button>
              <button
                type="button"
                onClick={() => setFilterType('orphaned')}
                className={`px-2.5 py-1 rounded-xl font-bold text-xs transition cursor-pointer ${
                  filterType === 'orphaned'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                ⚠️ Független
              </button>
            </div>
          </div>

          {/* Interactive Canvas Stage */}
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className={`flex-1 relative overflow-hidden select-none cursor-${isPanning ? 'grabbing' : 'grab'} bg-slate-950`}
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          >
            {/* SVG Definitions for Gradients & Line Glow */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
              <defs>
                <linearGradient id="gradCatEvent" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="gradCatTnr" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="gradEventTnr" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Render Links / Bezier Curves */}
                {filteredLinks.map((link) => {
                  const fromNode = nodes.find((n) => n.id === link.fromId);
                  const toNode = nodes.find((n) => n.id === link.toId);
                  if (!fromNode || !toNode) return null;

                  const fromP = { x: fromNode.pos.x + 130, y: fromNode.pos.y + 40 };
                  const toP = { x: toNode.pos.x + 130, y: toNode.pos.y + 40 };

                  const isConnectedToSelected =
                    selectedNodeId === link.fromId || selectedNodeId === link.toId;
                  const isConnectedToHovered =
                    hoveredNodeId === link.fromId || hoveredNodeId === link.toId;

                  const dx = Math.abs(toP.x - fromP.x) * 0.5;
                  const pathD = `M ${fromP.x} ${fromP.y} C ${fromP.x + dx} ${fromP.y}, ${toP.x - dx} ${toP.y}, ${toP.x} ${toP.y}`;

                  const gradId =
                    link.type === 'cat_event'
                      ? 'url(#gradCatEvent)'
                      : link.type === 'cat_tnr'
                      ? 'url(#gradCatTnr)'
                      : 'url(#gradEventTnr)';

                  return (
                    <g key={link.id}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={
                          isConnectedToSelected || isConnectedToHovered
                            ? '#f59e0b'
                            : gradId
                        }
                        strokeWidth={isConnectedToSelected || isConnectedToHovered ? 3.5 : 2}
                        strokeDasharray={link.type === 'event_tnr' ? '5,5' : undefined}
                        className="transition-all duration-150"
                      />

                      {/* Animated Pulse Particle */}
                      {(isConnectedToSelected || isConnectedToHovered) && (
                        <circle r="4" fill="#fbbf24">
                          <animateMotion path={pathD} dur="1.8s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Nodes Stage Container */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              {filteredNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isConnectedToSelected = connectedNodeIdsForSelected.includes(node.id);

                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{
                      left: `${node.pos.x}px`,
                      top: `${node.pos.y}px`,
                      width: '260px',
                    }}
                    className={`absolute p-3 rounded-2xl border backdrop-blur-md shadow-2xl pointer-events-auto cursor-grab transition-shadow duration-150 ${
                      node.colorTheme
                    } ${
                      isSelected
                        ? 'ring-4 ring-amber-400 border-amber-300 shadow-amber-950/80 z-30 scale-102'
                        : isConnectedToSelected || isHovered
                        ? 'ring-2 ring-purple-400 border-purple-300 shadow-purple-950/80 z-20'
                        : 'z-10 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-xl">{node.icon}</span>
                        <h4 className="font-extrabold text-xs text-white truncate">{node.title}</h4>
                      </div>
                      <span className="px-1.5 py-0.5 bg-slate-900/80 border border-slate-700 font-mono text-[9px] uppercase font-bold text-slate-300 rounded-md">
                        {node.type}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] leading-tight">
                      <p className="font-semibold text-slate-200">{node.subtitle}</p>
                      <p className="text-slate-400 text-[10px] truncate">{node.detail}</p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Státusz: <strong className="text-slate-200 uppercase">{node.status}</strong></span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(node.id);
                        }}
                        className="text-purple-300 hover:text-white font-extrabold cursor-pointer hover:underline"
                      >
                        Részletek ➔
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Inspector Drawer (Node Details) */}
          {selectedNode && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="absolute top-16 right-4 bottom-4 w-80 bg-slate-900/95 border border-slate-700 rounded-3xl p-4 shadow-2xl z-40 overflow-y-auto space-y-4 backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedNode.icon}</span>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">{selectedNode.title}</h4>
                    <span className="text-[10px] font-mono text-purple-300 uppercase">
                      Típus: {selectedNode.type}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNodeId(null)}
                  className="text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Node Properties */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Megnevezés / Alfejléc</span>
                  <p className="font-bold text-slate-200">{selectedNode.subtitle}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Részletes Leírás / Bővebben</span>
                  <p className="text-slate-300 leading-relaxed">{selectedNode.detail}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Aktuális Státusz</span>
                  <p className="font-mono font-bold text-emerald-400 uppercase">{selectedNode.status}</p>
                </div>
              </div>

              {/* Connected Nodes List */}
              <div className="space-y-2">
                <h5 className="font-extrabold text-xs text-purple-200 flex items-center gap-1.5">
                  <span>🔗</span>
                  <span>Közvetlenül Kapcsolódó Elemek ({connectedNodesForSelected.length})</span>
                </h5>

                {connectedNodesForSelected.length === 0 ? (
                  <p className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-slate-500 italic text-center">
                    Ehhez az elemhez jelenleg nem tartozik közvetlen összeköttetés.
                  </p>
                ) : (
                  connectedNodesForSelected.map((cn) => (
                    <div
                      key={cn.id}
                      onClick={() => setSelectedNodeId(cn.id)}
                      className="p-2.5 bg-slate-950 border border-slate-800 hover:border-purple-500 rounded-xl cursor-pointer transition flex items-center justify-between text-xs group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-lg">{cn.icon}</span>
                        <div className="truncate">
                          <p className="font-bold text-slate-200 group-hover:text-purple-300 truncate">{cn.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{cn.subtitle}</p>
                        </div>
                      </div>
                      <span className="text-slate-500 group-hover:text-purple-300 font-bold">➔</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* Bottom Controls Bar */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span className="font-mono text-[11px]">
              💡 Egérgörgővel nagyítható (Zoom: {(zoom * 100).toFixed(0)}%) • Vonszolja a hátteret a mozgatáshoz
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md transition cursor-pointer text-xs"
            >
              Bezárás
            </button>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
