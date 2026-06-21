import { useState } from 'react';
import { useDesigner } from '@/lib/designer-store';
import { FURNITURE_CATALOG } from '@/types/designer';
import type { Tool } from '@/types/designer';
import { cn } from '@/lib/utils';

const TOOLS: { tool: Tool; icon: string; label: string }[] = [
  { tool: 'select', icon: '↖', label: 'Pasirinkti' },
  { tool: 'room', icon: '⊞', label: 'Kambarys' },
  { tool: 'door', icon: '🚪', label: 'Durys' },
  { tool: 'window', icon: '⬜', label: 'Langas' },
  { tool: 'furniture', icon: '🪑', label: 'Baldai' },
  { tool: 'delete', icon: '🗑', label: 'Ištrinti' },
];

const FURNITURE_CATEGORIES = ['Miegamasis', 'Svetainė', 'Valgomasis', 'Virtuvė', 'Kabinetas', 'Vonios kambarys', 'Dekoracijos'];

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
