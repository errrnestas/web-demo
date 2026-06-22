import { useState } from 'react';
import { useDesigner } from '@/lib/designer-store';
import { FURNITURE_CATALOG } from '@/types/designer';
import type { Tool, Room } from '@/types/designer';
import { cn } from '@/lib/utils';

const ROOM_TYPE_LABELS: Record<Room['type'], string> = {
  living: 'Svetainė', bedroom: 'Miegamasis', kitchen: 'Virtuvė', bathroom: 'Vonios',
  dining: 'Valgomasis', office: 'Kabinetas', hallway: 'Koridorius', garage: 'Garažas', other: 'Kita',
};

const TOOLS: { tool: Tool; icon: string; label: string }[] = [
  { tool: 'select', icon: '↖', label: 'Pasirinkti' },
  { tool: 'room', icon: '⊞', label: 'Kambarys' },
  { tool: 'door', icon: '🚪', label: 'Durys' },
  { tool: 'window', icon: '⬜', label: 'Langas' },
  { tool: 'furniture', icon: '🪑', label: 'Baldai' },
  { tool: 'delete', icon: '🗑', label: 'Ištrinti' },
  { tool: 'measure', icon: '📏', label: 'Matuoti' },
];

const FURNITURE_CATEGORIES = ['Miegamasis', 'Svetainė', 'Valgomasis', 'Virtuvė', 'Kabinetas', 'Vonios kambarys', 'Dekoracijos', 'Kita'];

export default function MobileBottomSheet() {
  const { state, dispatch } = useDesigner();
  const [open, setOpen] = useState(false);
  const [furnitureCat, setFurnitureCat] = useState('Svetainė');

  const filteredFurniture = FURNITURE_CATALOG.filter(f => f.category === furnitureCat);

  return (
    <>
      {/* Mobile toolbar strip */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-slate-900 border-t border-slate-700 px-2 py-2 flex items-center gap-1">
          {TOOLS.map(btn => (
            <button
              key={btn.tool}
              onClick={() => {
                dispatch({ type: 'SET_TOOL', tool: btn.tool });
                if (btn.tool === 'furniture') setOpen(true);
              }}
              className={cn(
                'flex-1 flex flex-col items-center py-2 rounded-xl text-xs transition-all',
                state.tool === btn.tool
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800'
              )}
            >
              <span className="text-base leading-none mb-0.5">{btn.icon}</span>
              <span style={{ fontSize: '9px' }}>{btn.label}</span>
            </button>
          ))}
          <button
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={state.historyIndex <= 0}
            className="flex-1 flex flex-col items-center py-2 rounded-xl text-xs text-slate-400 disabled:opacity-30"
          >
            <span className="text-base leading-none mb-0.5">↩</span>
            <span style={{ fontSize: '9px' }}>Atšaukti</span>
          </button>
        </div>
      </div>

      {/* Selection properties sheet — shown when an element is selected in select mode */}
      {state.tool === 'select' && state.selectedId && (() => {
        const room = state.plan.rooms.find(r => r.id === state.selectedId);
        const furn = state.plan.furniture.find(f => f.id === state.selectedId);
        const door = state.plan.doors.find(d => d.id === state.selectedId);
        const win = state.plan.windows.find(w => w.id === state.selectedId);
        if (!room && !furn && !door && !win) return null;
        return (
          <div className="fixed bottom-16 left-0 right-0 z-50 lg:hidden px-3 pb-1">
            <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-4">
              {room && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{room.name}</span>
                    <span className="text-xs text-slate-400">{(room.width * room.height).toFixed(1)} m² · {room.width.toFixed(1)}×{room.height.toFixed(1)}m</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(Object.keys(ROOM_TYPE_LABELS) as Room['type'][]).map(t => (
                      <button key={t}
                        onClick={() => dispatch({ type: 'UPDATE_ROOM', room: { ...room, type: t } })}
                        className={cn('text-xs py-1.5 rounded-lg transition-all',
                          room.type === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        )}
                      >{ROOM_TYPE_LABELS[t]}</button>
                    ))}
                  </div>
                  <div className="flex gap-3 items-center">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <span className="text-xs text-slate-400">Grindys</span>
                      <input type="color" value={room.floorColor || '#c8a26b'}
                        onChange={e => dispatch({ type: 'UPDATE_ROOM', room: { ...room, floorColor: e.target.value } })}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0" />
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <span className="text-xs text-slate-400">Sienos</span>
                      <input type="color" value={room.wallColor || '#f8f8f8'}
                        onChange={e => dispatch({ type: 'UPDATE_ROOM', room: { ...room, wallColor: e.target.value } })}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0" />
                    </label>
                    <button onClick={() => { dispatch({ type: 'DELETE_ROOM', id: room.id }); dispatch({ type: 'SELECT', id: null }); }}
                      className="ml-auto text-xs px-3 py-1.5 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded-xl transition-all">
                      🗑 Ištrinti
                    </button>
                  </div>
                </div>
              )}
              {furn && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{furn.name}</span>
                    <span className="text-xs text-slate-400">{furn.width}×{furn.depth}m · {furn.rotation}°</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => dispatch({ type: 'UPDATE_FURNITURE', item: { ...furn, rotation: (furn.rotation + 90) % 360 } })}
                      className="flex-1 text-xs py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all">↻ 90°</button>
                    <button onClick={() => dispatch({ type: 'UPDATE_FURNITURE', item: { ...furn, rotation: (furn.rotation + 45) % 360 } })}
                      className="flex-1 text-xs py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all">↻ 45°</button>
                    <label className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer bg-slate-700 rounded-xl px-2">
                      <span className="text-xs text-slate-300">Spalva</span>
                      <input type="color" value={furn.color}
                        onChange={e => dispatch({ type: 'UPDATE_FURNITURE', item: { ...furn, color: e.target.value } })}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" />
                    </label>
                    <button onClick={() => { dispatch({ type: 'DELETE_FURNITURE', id: furn.id }); dispatch({ type: 'SELECT', id: null }); }}
                      className="flex-1 text-xs py-2 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded-xl transition-all">🗑</button>
                  </div>
                </div>
              )}
              {door && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white flex-1">Durys ({door.width}m)</span>
                  <button onClick={() => dispatch({ type: 'UPDATE_DOOR', door: { ...door, swingIn: !door.swingIn } })}
                    className="text-xs py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all">
                    {door.swingIn ? '↔ Laukan' : '↔ Vidun'}
                  </button>
                  <button onClick={() => { dispatch({ type: 'DELETE_DOOR', id: door.id }); dispatch({ type: 'SELECT', id: null }); }}
                    className="text-xs py-2 px-3 bg-red-900/40 text-red-400 rounded-xl">🗑</button>
                </div>
              )}
              {win && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white flex-1">Langas ({win.width}m)</span>
                  <button onClick={() => { dispatch({ type: 'DELETE_WINDOW', id: win.id }); dispatch({ type: 'SELECT', id: null }); }}
                    className="text-xs py-2 px-3 bg-red-900/40 text-red-400 rounded-xl">🗑 Ištrinti</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Furniture bottom sheet */}
      {open && state.tool === 'furniture' && (
        <div className="fixed inset-0 z-60 lg:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-slate-900 rounded-t-2xl border-t border-slate-700 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h3 className="font-semibold text-white">Pasirinkite baldą</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-slate-800">
              {FURNITURE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFurnitureCat(cat)}
                  className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                    furnitureCat === cat ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto p-3 grid grid-cols-2 gap-2">
              {filteredFurniture.map(f => (
                <button
                  key={f.type}
                  onClick={() => {
                    dispatch({ type: 'SET_PENDING_FURNITURE', furnitureType: f.type });
                    setOpen(false);
                  }}
                  className={cn(
                    'text-left p-3 rounded-xl border transition-all',
                    state.pendingFurnitureType === f.type
                      ? 'bg-amber-900/50 border-amber-600 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  )}
                >
                  <div className="font-medium text-sm">{f.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{f.width}m × {f.depth}m</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
