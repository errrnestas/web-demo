import { useDesigner } from '@/lib/designer-store';
import { FURNITURE_CATALOG, ROOM_TYPE_LABELS, ROOM_COLORS, FLOOR_MATERIAL_COLORS } from '@/types/designer';
import type { Tool, Room } from '@/types/designer';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { PLAN_TEMPLATES } from '@/lib/templates';

const TOOL_BUTTONS: { tool: Tool; icon: string; label: string; shortcut: string }[] = [
  { tool: 'select', icon: '↖', label: 'Pasirinkti', shortcut: 'S' },
  { tool: 'room', icon: '⊞', label: 'Kambarys', shortcut: 'R' },
  { tool: 'door', icon: '🚪', label: 'Durys', shortcut: 'D' },
  { tool: 'window', icon: '⬜', label: 'Langas', shortcut: 'W' },
  { tool: 'furniture', icon: '🪑', label: 'Baldai', shortcut: 'F' },
  { tool: 'delete', icon: '🗑', label: 'Ištrinti', shortcut: 'Del' },
  { tool: 'measure', icon: '📏', label: 'Matuoti', shortcut: 'M' },
];

const FURNITURE_CATEGORIES = ['Miegamasis', 'Svetainė', 'Valgomasis', 'Virtuvė', 'Kabinetas', 'Vonios kambarys', 'Dekoracijos', 'Kita'];

const ROOM_TYPE_ICONS: Record<string, string> = {
  living: '🛋️', bedroom: '🛏️', kitchen: '🍳', bathroom: '🚿', dining: '🍽️',
  office: '💻', hallway: '🚪', garage: '🚗', other: '📦',
};

export default function LeftPanel() {
  const { state, dispatch } = useDesigner();
  const [furnitureCat, setFurnitureCat] = useState('Svetainė');
  const [showTemplates, setShowTemplates] = useState(false);
  const [furnitureSearch, setFurnitureSearch] = useState('');

  const filteredFurniture = furnitureSearch.trim()
    ? FURNITURE_CATALOG.filter(f => f.name.toLowerCase().includes(furnitureSearch.toLowerCase()))
    : FURNITURE_CATALOG.filter(f => f.category === furnitureCat);

  return (
    <div className="w-[200px] bg-slate-900 border-r border-slate-700 flex flex-col overflow-hidden shrink-0">
      {/* Tools */}
      <div className="p-3 border-b border-slate-700">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Įrankiai</p>
        <div className="grid grid-cols-3 gap-1.5">
          {TOOL_BUTTONS.map(btn => (
            <button
              key={btn.tool}
              onClick={() => dispatch({ type: 'SET_TOOL', tool: btn.tool })}
              title={`${btn.label} (${btn.shortcut})`}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs transition-all border',
                state.tool === btn.tool
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              )}
            >
              <span className="text-base leading-none mb-1">{btn.icon}</span>
              <span className="leading-none font-medium" style={{ fontSize: '9px' }}>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Templates */}
      <div className="p-3 border-b border-slate-700">
        <button
          onClick={() => setShowTemplates(v => !v)}
          className="w-full text-xs px-3 py-2 rounded-lg bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 hover:bg-indigo-800/50 hover:text-indigo-200 transition-all flex items-center justify-between"
        >
          <span>📐 Šablonai</span>
          <span className="text-indigo-500">{showTemplates ? '▲' : '▼'}</span>
        </button>
        {showTemplates && (
          <div className="mt-2 space-y-1.5">
            {PLAN_TEMPLATES.map(t => (
              <button
                key={t.name}
                onClick={() => {
                  if (confirm(`Įkelti šabloną "${t.name}"? Dabartinis projektas bus prarastas.`)) {
                    dispatch({ type: 'SET_PLAN', plan: { ...t.plan, id: `tpl-${Date.now()}`, createdAt: Date.now(), updatedAt: Date.now() } });
                    setShowTemplates(false);
                    setTimeout(() => window.dispatchEvent(new CustomEvent('designer:fitview')), 50);
                  }
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-indigo-600 hover:bg-slate-750 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{t.icon}</span>
                  <div>
                    <div className="text-xs font-medium text-white">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid controls */}
      <div className="p-3 border-b border-slate-700">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Rodymas</p>
        <div className="space-y-1.5">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
            className={cn('w-full text-left text-xs px-3 py-1.5 rounded-lg border transition-all',
              state.showGrid ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400')}
          >
            {state.showGrid ? '✓' : '○'} Tinklelis
          </button>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SNAP' })}
            className={cn('w-full text-left text-xs px-3 py-1.5 rounded-lg border transition-all',
              state.snapToGrid ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400')}
          >
            {state.snapToGrid ? '✓' : '○'} Magnetizavimas
          </button>
          {state.snapToGrid && (
            <div className="flex gap-1 mt-1">
              {[0.1, 0.25, 0.5, 1.0].map(s => (
                <button
                  key={s}
                  onClick={() => dispatch({ type: 'SET_GRID_SIZE', size: s })}
                  className={cn('flex-1 py-1 rounded text-center transition-all border',
                    state.gridSize === s
                      ? 'bg-blue-700 border-blue-600 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  )}
                  style={{ fontSize: '9px' }}
                >
                  {s}m
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Room type picker — visible when room tool is active */}
      {state.tool === 'room' && (
        <div className="p-3 border-b border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Kambario tipas</p>
          <div className="grid grid-cols-2 gap-1">
            {(Object.entries(ROOM_TYPE_LABELS) as [Room['type'], string][]).map(([type, label]) => (
              <button
                key={type}
                onClick={() => dispatch({ type: 'SET_PENDING_ROOM_TYPE', roomType: type })}
                className={cn(
                  'flex items-center gap-1.5 text-left text-xs py-1.5 px-2 rounded-lg border transition-all',
                  state.pendingRoomType === type
                    ? 'bg-blue-700 border-blue-600 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                )}
              >
                <span className="shrink-0">{ROOM_TYPE_ICONS[type]}</span>
                <span className="truncate" style={{ fontSize: '9px' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Room list — visible when not in furniture mode */}
      {state.tool !== 'furniture' && state.plan.rooms.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="px-3 pt-3 pb-2 border-b border-slate-700 flex items-center justify-between">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Kambariai</p>
            <span className="text-xs text-slate-600">{state.plan.rooms.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {state.plan.rooms.map(room => (
              <button
                key={room.id}
                onClick={() => dispatch({ type: 'SELECT', id: room.id })}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all border flex items-center gap-2',
                  state.selectedId === room.id
                    ? 'bg-blue-700/40 border-blue-600/70 text-white'
                    : 'bg-slate-800/50 border-transparent text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                )}
              >
                <span className="text-sm leading-none shrink-0">{ROOM_TYPE_ICONS[room.type] ?? '📦'}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate leading-tight">{room.name}</div>
                  <div className="text-slate-500 leading-tight">{(room.width * room.height).toFixed(1)} m²</div>
                </div>
                <span
                  className="w-2 h-full min-h-[1.5rem] rounded-sm shrink-0 opacity-80"
                  style={{ background: room.floorColor || '#c8a26b' }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Furniture panel */}
      {state.tool === 'furniture' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-700">
            <input
              type="text"
              placeholder="Ieškoti baldų..."
              value={furnitureSearch}
              onChange={e => setFurnitureSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-2.5"
            />
            {!furnitureSearch && (
              <div className="flex flex-col gap-0.5">
                {FURNITURE_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFurnitureCat(cat)}
                    className={cn('text-left text-xs px-2 py-1.5 rounded-md transition-all',
                      furnitureCat === cat ? 'bg-blue-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredFurniture.map(f => (
              <button
                key={f.type}
                onClick={() => dispatch({ type: 'SET_PENDING_FURNITURE', furnitureType: f.type })}
                className={cn(
                  'w-full text-left px-2.5 py-2 rounded-lg text-xs border transition-all',
                  state.pendingFurnitureType === f.type
                    ? 'bg-amber-700 border-amber-600 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                )}
              >
                <div className="font-medium">{f.name}</div>
                <div className="text-slate-500 mt-0.5">{f.width}m × {f.depth}m</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Undo/Redo */}
      <div className="p-3 border-t border-slate-700 flex gap-2">
        <button
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={state.historyIndex <= 0}
          title={`Atšaukti (Ctrl+Z) — ${state.historyIndex} žingsniai`}
          className="flex-1 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1"
        >
          ↩ <span>Atšaukti</span>
          {state.historyIndex > 0 && <span className="text-slate-500 font-mono">({state.historyIndex})</span>}
        </button>
        <button
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={state.historyIndex >= state.history.length - 1}
          title={`Grąžinti (Ctrl+Shift+Z) — ${state.history.length - 1 - state.historyIndex} žingsniai`}
          className="flex-1 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1"
        >
          ↪ <span>Grąžinti</span>
          {state.historyIndex < state.history.length - 1 && <span className="text-slate-500 font-mono">({state.history.length - 1 - state.historyIndex})</span>}
        </button>
      </div>
    </div>
  );
}
