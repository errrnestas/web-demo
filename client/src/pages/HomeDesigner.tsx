import { useReducer, useEffect, useCallback, Suspense, lazy, useState } from 'react';
import { DesignerContext, createInitialState } from '@/lib/designer-store';
import { designerReducer } from '@/lib/designer-reducer';
import LeftPanel from '@/components/designer/LeftPanel';
import RightPanel from '@/components/designer/RightPanel';
import FloorPlanCanvas from '@/components/designer/FloorPlanCanvas';
import { ExportButton } from '@/components/designer/ExportPanel';
import CostEstimator from '@/components/designer/CostEstimator';
import MobileBottomSheet from '@/components/designer/MobileBottomSheet';
import SaveLoadPanel from '@/components/designer/SaveLoadPanel';
import { cn, nanoid } from '@/lib/utils';
import { Link } from 'wouter';

const Viewer3D = lazy(() => import('@/components/designer/Viewer3D'));

const TOOL_LABELS: Record<string, string> = {
  select: 'Pasirinkti',
  room: 'Kambarys',
  door: 'Durys',
  window: 'Langas',
  furniture: 'Baldai',
  delete: 'Ištrinti',
  measure: 'Matuoti',
};

export default function HomeDesigner() {
  const [state, dispatch] = useReducer(designerReducer, null, createInitialState);
  const [nameEdit, setNameEdit] = useState(false);
  const [nameVal, setNameVal] = useState(state.plan.name);

  // Sync nameVal when plan name changes
  useEffect(() => { setNameVal(state.plan.name); }, [state.plan.name]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (document.pointerLockElement) return; // walk mode — don't intercept tool keys
      switch (e.key.toLowerCase()) {
        case 's':
          if (!e.ctrlKey && !e.metaKey) dispatch({ type: 'SET_TOOL', tool: 'select' });
          break;
        case 'r': {
          const selFurn = state.plan.furniture.find(f => f.id === state.selectedId);
          if (selFurn) {
            dispatch({ type: 'UPDATE_FURNITURE', item: { ...selFurn, rotation: (selFurn.rotation + 90) % 360 } });
          } else {
            dispatch({ type: 'SET_TOOL', tool: 'room' });
          }
          break;
        }
        case 'e': {
          const selFurnE = state.plan.furniture.find(f => f.id === state.selectedId);
          if (selFurnE) {
            dispatch({ type: 'UPDATE_FURNITURE', item: { ...selFurnE, rotation: (selFurnE.rotation + 45) % 360 } });
          }
          break;
        }
        case 'arrowleft':
        case 'arrowright':
        case 'arrowup':
        case 'arrowdown': {
          const { selectedId, plan, gridSize } = state;
          if (!selectedId) break;
          e.preventDefault();
          const step = e.shiftKey ? gridSize * 5 : gridSize;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          const nudgeRoom = plan.rooms.find(r => r.id === selectedId);
          if (nudgeRoom) { dispatch({ type: 'UPDATE_ROOM', room: { ...nudgeRoom, x: nudgeRoom.x + dx, y: nudgeRoom.y + dy } }); break; }
          const nudgeFurn = plan.furniture.find(f => f.id === selectedId);
          if (nudgeFurn) { dispatch({ type: 'UPDATE_FURNITURE', item: { ...nudgeFurn, x: nudgeFurn.x + dx, y: nudgeFurn.y + dy } }); break; }
          break;
        }
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const { selectedId: selId, plan: p } = state;
            const selRoom = p.rooms.find(r => r.id === selId);
            if (selRoom) {
              const dup = { ...selRoom, id: `r${nanoid()}`, x: selRoom.x + 0.5, y: selRoom.y + 0.5 };
              dispatch({ type: 'ADD_ROOM', room: dup });
              dispatch({ type: 'SELECT', id: dup.id });
              break;
            }
            const selFurnD = p.furniture.find(f => f.id === selId);
            if (selFurnD) {
              const dup = { ...selFurnD, id: `f${nanoid()}`, x: selFurnD.x + 0.3, y: selFurnD.y + 0.3 };
              dispatch({ type: 'ADD_FURNITURE', item: dup });
              dispatch({ type: 'SELECT', id: dup.id });
              break;
            }
          } else {
            dispatch({ type: 'SET_TOOL', tool: 'door' });
          }
          break;
        case 'w': dispatch({ type: 'SET_TOOL', tool: 'window' }); break;
        case 'f': dispatch({ type: 'SET_TOOL', tool: 'furniture' }); break;
        case 'm': dispatch({ type: 'SET_TOOL', tool: 'measure' }); break;
        case 'v':
          dispatch({ type: 'SET_VIEW', view: state.view === '2d' ? '3d' : '2d' });
          break;
        case 'delete':
        case 'backspace': {
          const { selectedId, plan } = state;
          if (!selectedId) break;
          if (plan.rooms.find(r => r.id === selectedId)) { dispatch({ type: 'DELETE_ROOM', id: selectedId }); break; }
          if (plan.furniture.find(f => f.id === selectedId)) { dispatch({ type: 'DELETE_FURNITURE', id: selectedId }); break; }
          if (plan.doors.find(d => d.id === selectedId)) { dispatch({ type: 'DELETE_DOOR', id: selectedId }); break; }
          if (plan.windows.find(w => w.id === selectedId)) { dispatch({ type: 'DELETE_WINDOW', id: selectedId }); break; }
          break;
        }
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) dispatch({ type: 'REDO' });
            else dispatch({ type: 'UNDO' });
          }
          break;
        case '?':
          setShowHelp(h => !h);
          break;
        case 'home':
        case 'g':
          window.dispatchEvent(new CustomEvent('designer:fitview'));
          break;
        case 'escape':
          dispatch({ type: 'SELECT', id: null });
          dispatch({ type: 'SET_TOOL', tool: 'select' });
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state]);

  const exportPlan = useCallback(() => {
    const data = JSON.stringify(state.plan, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.plan.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.plan]);

  const importPlan = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const plan = JSON.parse(ev.target?.result as string);
          dispatch({ type: 'SET_PLAN', plan });
        } catch { alert('Netinkamas failas'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const totalArea = state.plan.rooms.reduce((s, r) => s + r.width * r.height, 0);
  const [rightTab, setRightTab] = useState<'props' | 'cost'>('props');
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <DesignerContext.Provider value={{ state, dispatch }}>
      <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">

        {/* Top bar */}
        <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-3 shrink-0 z-10">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </Link>

          <div className="w-px h-5 bg-slate-700" />

          {nameEdit ? (
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={() => { dispatch({ type: 'SET_PLAN_NAME', name: nameVal }); setNameEdit(false); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { dispatch({ type: 'SET_PLAN_NAME', name: nameVal }); setNameEdit(false); }
                if (e.key === 'Escape') setNameEdit(false);
              }}
              className="bg-slate-800 border border-blue-500 rounded px-2 py-0.5 text-sm text-white focus:outline-none min-w-[200px]"
            />
          ) : (
            <button onClick={() => setNameEdit(true)} className="text-sm font-semibold text-white hover:text-blue-400 transition-colors truncate max-w-[200px]">
              ✏️ {state.plan.name}
            </button>
          )}

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 shrink-0">
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', view: '2d' })}
              className={cn('px-3 py-1 text-xs rounded-md transition-all font-medium',
                state.view === '2d' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              )}
            >
              📐 2D Planas
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', view: '3d' })}
              className={cn('px-3 py-1 text-xs rounded-md transition-all font-medium',
                state.view === '3d' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              )}
            >
              🏠 3D Vaizdas
            </button>
          </div>

          <div className="w-px h-5 bg-slate-700" />

          <button
            onClick={() => {
              if (confirm('Sukurti naują tuščią projektą? Dabartinis projektas bus prarastas.')) {
                dispatch({ type: 'SET_PLAN', plan: {
                  id: `plan-${Date.now()}`,
                  name: 'Naujas projektas',
                  rooms: [], doors: [], windows: [], furniture: [],
                  wallHeight: 2.6,
                  createdAt: Date.now(), updatedAt: Date.now(),
                }});
              }
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all shrink-0"
          >
            + Naujas
          </button>
          <button
            onClick={() => setShowSaveLoad(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all shrink-0"
          >
            💾 Projektai
          </button>
          <button
            onClick={importPlan}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all shrink-0"
          >
            📂 JSON
          </button>
          <ExportButton />
          <button
            onClick={() => setShowHelp(true)}
            className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all flex items-center justify-center text-xs font-bold shrink-0"
            title="Klaviatūros nuorodos"
          >
            ?
          </button>
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="hidden lg:flex">
            {state.view === '2d' && <LeftPanel />}
          </div>

          <main className="flex-1 overflow-hidden relative min-w-0">
            {state.view === '2d' ? (
              <FloorPlanCanvas />
            ) : (
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <div className="text-center">
                    <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Kraunamas 3D vaizdas...</p>
                    <p className="text-slate-600 text-xs mt-1">Tai gali užtrukti kelis sekundes</p>
                  </div>
                </div>
              }>
                <Viewer3D />
              </Suspense>
            )}
          </main>

          <div className="hidden lg:flex w-[220px] bg-slate-900 border-l border-slate-700 flex-col overflow-hidden shrink-0">
            {/* Tab bar */}
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setRightTab('props')}
                className={cn('flex-1 py-2 text-xs font-medium transition-all',
                  rightTab === 'props' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
                )}
              >
                Savybės
              </button>
              <button
                onClick={() => setRightTab('cost')}
                className={cn('flex-1 py-2 text-xs font-medium transition-all',
                  rightTab === 'cost' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
                )}
              >
                💰 Sąmata
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {rightTab === 'props' ? <RightPanel embedded /> : <CostEstimator />}
            </div>
          </div>
        </div>

        <MobileBottomSheet />
        {showSaveLoad && <SaveLoadPanel onClose={() => setShowSaveLoad(false)} />}

        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">⌨️ Klaviatūros nuorodos</h2>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ['S', 'Pasirinkimo įrankis'],
                  ['R', 'Kambarys / Sukti baldą 90°'],
                  ['E', 'Sukti pasirinktą baldą 45°'],
                  ['D', 'Durys'],
                  ['W', 'Langas'],
                  ['F', 'Baldai'],
                  ['M', 'Matuoti atstumą'],
                  ['G / Home', 'Tilpti į ekraną'],
                  ['↑↓←→', 'Judinti pasirinktą'],
                  ['Shift+↑↓←→', 'Judinti ×5'],
                  ['Ctrl+D', 'Dublikuoti pasirinktą'],
                  ['Del / Backspace', 'Ištrinti pasirinktą'],
                  ['Ctrl+Z', 'Atšaukti'],
                  ['Ctrl+Shift+Z', 'Grąžinti'],
                  ['V', 'Jungti 2D/3D vaizdą'],
                  ['Esc', 'Atšaukti / baigti veiksmą'],
                  ['Scroll', 'Priartinti/tolinti'],
                  ['Alt+vilkti', 'Slankioti'],
                  ['Dbl-click', 'Pervadinti kambarį (2D)'],
                  ['Dešinys', 'Kontekstinis meniu (2D)'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <kbd className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-300 font-mono shrink-0">{key}</kbd>
                    <span className="text-slate-400 text-right">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status bar */}
        <footer className="h-7 bg-slate-900 border-t border-slate-700 hidden lg:flex items-center px-4 gap-6 shrink-0">
          <span className="text-xs text-slate-500">
            Įrankis: <span className="text-blue-400 font-medium">{TOOL_LABELS[state.tool] ?? state.tool}</span>
          </span>
          <span className="text-xs text-slate-500">
            Kambariai: <span className="text-slate-300">{state.plan.rooms.length}</span>
          </span>
          <span className="text-xs text-slate-500">
            Plotas: <span className="text-slate-300">{totalArea.toFixed(1)} m²</span>
          </span>
          <span className="text-xs text-slate-500">
            Baldai: <span className="text-slate-300">{state.plan.furniture.length}</span>
          </span>
          <div className="flex-1" />
          <span className="text-xs text-slate-700 hidden lg:block">
            S · R · D · W · F · Del · G=Fit · Ctrl+Z/Y
          </span>
        </footer>
      </div>
    </DesignerContext.Provider>
  );
}
