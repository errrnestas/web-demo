import type { FloorPlan } from '@/types/designer';
import type { DesignerState } from './designer-store';

type Action =
  | { type: 'SET_PLAN'; plan: FloorPlan }
  | { type: 'ADD_ROOM'; room: any }
  | { type: 'UPDATE_ROOM'; room: any }
  | { type: 'DELETE_ROOM'; id: string }
  | { type: 'ADD_DOOR'; door: any }
  | { type: 'UPDATE_DOOR'; door: any }
  | { type: 'DELETE_DOOR'; id: string }
  | { type: 'ADD_WINDOW'; win: any }
  | { type: 'UPDATE_WINDOW'; win: any }
  | { type: 'DELETE_WINDOW'; id: string }
  | { type: 'ADD_FURNITURE'; item: any }
  | { type: 'UPDATE_FURNITURE'; item: any }
  | { type: 'DELETE_FURNITURE'; id: string }
  | { type: 'SELECT'; id: string | null }
  | { type: 'SET_TOOL'; tool: any }
  | { type: 'SET_VIEW'; view: '2d' | '3d' }
  | { type: 'SET_PLAN_NAME'; name: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_PENDING_FURNITURE'; furnitureType: string | null }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_SNAP' }
  | { type: 'SET_CAMERA_MODE'; mode: 'orbit' | 'firstperson' };

function savePlanToHistory(state: DesignerState, newPlan: FloorPlan) {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(newPlan);
  if (newHistory.length > 50) newHistory.shift();
  return { history: newHistory, historyIndex: newHistory.length - 1 };
}

function updatePlan(state: DesignerState, updater: (plan: FloorPlan) => FloorPlan): DesignerState {
  const newPlan = updater({ ...state.plan, updatedAt: Date.now() });
  try { localStorage.setItem('homedesigner-plan', JSON.stringify(newPlan)); } catch {}
  return { ...state, plan: newPlan, ...savePlanToHistory(state, newPlan) };
}

export function designerReducer(state: DesignerState, action: Action): DesignerState {
  switch (action.type) {
    case 'SET_PLAN':
      return { ...state, plan: action.plan, history: [action.plan], historyIndex: 0 };
    case 'ADD_ROOM':
      return updatePlan(state, p => ({ ...p, rooms: [...p.rooms, action.room] }));
    case 'UPDATE_ROOM':
      return updatePlan(state, p => ({ ...p, rooms: p.rooms.map(r => r.id === action.room.id ? action.room : r) }));
    case 'DELETE_ROOM':
      return updatePlan(state, p => ({
        ...p,
        rooms: p.rooms.filter(r => r.id !== action.id),
        doors: p.doors.filter(d => d.roomId !== action.id),
        windows: p.windows.filter(w => w.roomId !== action.id),
      }));
    case 'ADD_DOOR':
      return updatePlan(state, p => ({ ...p, doors: [...p.doors, action.door] }));
    case 'UPDATE_DOOR':
      return updatePlan(state, p => ({ ...p, doors: p.doors.map(d => d.id === action.door.id ? action.door : d) }));
    case 'DELETE_DOOR':
      return updatePlan(state, p => ({ ...p, doors: p.doors.filter(d => d.id !== action.id) }));
    case 'ADD_WINDOW':
      return updatePlan(state, p => ({ ...p, windows: [...p.windows, action.win] }));
    case 'UPDATE_WINDOW':
      return updatePlan(state, p => ({ ...p, windows: p.windows.map(w => w.id === action.win.id ? action.win : w) }));
    case 'DELETE_WINDOW':
      return updatePlan(state, p => ({ ...p, windows: p.windows.filter(w => w.id !== action.id) }));
    case 'ADD_FURNITURE':
      return updatePlan(state, p => ({ ...p, furniture: [...p.furniture, action.item] }));
    case 'UPDATE_FURNITURE':
      return updatePlan(state, p => ({ ...p, furniture: p.furniture.map(f => f.id === action.item.id ? action.item : f) }));
    case 'DELETE_FURNITURE':
      return updatePlan(state, p => ({ ...p, furniture: p.furniture.filter(f => f.id !== action.id) }));
    case 'SELECT':
      return { ...state, selectedId: action.id };
    case 'SET_TOOL':
      return { ...state, tool: action.tool, selectedId: null };
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'SET_PLAN_NAME':
      return updatePlan(state, p => ({ ...p, name: action.name }));
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      const plan = state.history[idx];
      try { localStorage.setItem('homedesigner-plan', JSON.stringify(plan)); } catch {}
      return { ...state, plan, historyIndex: idx };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      const plan = state.history[idx];
      try { localStorage.setItem('homedesigner-plan', JSON.stringify(plan)); } catch {}
      return { ...state, plan, historyIndex: idx };
    }
    case 'SET_PENDING_FURNITURE':
      return { ...state, pendingFurnitureType: action.furnitureType };
    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };
    case 'TOGGLE_SNAP':
      return { ...state, snapToGrid: !state.snapToGrid };
    case 'SET_CAMERA_MODE':
      return { ...state, cameraMode: action.mode };
    default:
      return state;
  }
}
