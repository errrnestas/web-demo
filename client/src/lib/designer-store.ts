import { createContext, useContext } from 'react';
import type { FloorPlan, Room, Door, WindowElement, FurnitureItem, Tool } from '@/types/designer';

const DEFAULT_PLAN: FloorPlan = {
  id: 'default',
  name: 'Mano projektas',
  rooms: [
    {
      id: 'r1',
      name: 'Svetainė',
      type: 'living',
      x: 0, y: 0,
      width: 6, height: 5,
      floorMaterial: 'wood',
      wallMaterial: 'white',
      wallColor: '#f8f8f8',
      floorColor: '#c8a26b',
    },
    {
      id: 'r2',
      name: 'Virtuvė',
      type: 'kitchen',
      x: 6, y: 0,
      width: 4, height: 5,
      floorMaterial: 'tile',
      wallMaterial: 'cream',
      wallColor: '#fdf6e3',
      floorColor: '#d4d4d4',
    },
    {
      id: 'r3',
      name: 'Miegamasis',
      type: 'bedroom',
      x: 0, y: 5,
      width: 5, height: 4,
      floorMaterial: 'carpet',
      wallMaterial: 'blue',
      wallColor: '#5c85d6',
      floorColor: '#7b9eb5',
    },
    {
      id: 'r4',
      name: 'Vonios kambarys',
      type: 'bathroom',
      x: 5, y: 5,
      width: 3, height: 4,
      floorMaterial: 'tile',
      wallMaterial: 'white',
      wallColor: '#f8f8f8',
      floorColor: '#d4d4d4',
    },
    {
      id: 'r5',
      name: 'Koridorius',
      type: 'hallway',
      x: 8, y: 5,
      width: 2, height: 4,
      floorMaterial: 'tile',
      wallMaterial: 'cream',
      wallColor: '#fdf6e3',
      floorColor: '#d4d4d4',
    },
  ],
  doors: [
    { id: 'd1', roomId: 'r1', wall: 'right', position: 0.5, width: 0.9, swingIn: true },
    { id: 'd2', roomId: 'r3', wall: 'right', position: 0.5, width: 0.9, swingIn: true },
    { id: 'd3', roomId: 'r4', wall: 'left', position: 0.5, width: 0.8, swingIn: false },
  ],
  windows: [
    { id: 'w1', roomId: 'r1', wall: 'top', position: 0.3, width: 1.5, height: 1.2, sillHeight: 0.9 },
    { id: 'w2', roomId: 'r1', wall: 'top', position: 0.7, width: 1.5, height: 1.2, sillHeight: 0.9 },
    { id: 'w3', roomId: 'r2', wall: 'top', position: 0.5, width: 1.2, height: 1.2, sillHeight: 0.9 },
    { id: 'w4', roomId: 'r3', wall: 'bottom', position: 0.5, width: 1.4, height: 1.2, sillHeight: 0.9 },
  ],
  furniture: [
    { id: 'f1', type: 'sofa', name: 'Sofa', x: 1, y: 1.5, rotation: 0, width: 2.2, depth: 0.9, color: '#5a7a9e' },
    { id: 'f2', type: 'coffee-table', name: 'Kavos staliukas', x: 1.5, y: 2.8, rotation: 0, width: 1.2, depth: 0.6, color: '#8b6914' },
    { id: 'f3', type: 'tv-stand', name: 'TV komoda', x: 2.5, y: 0.3, rotation: 180, width: 1.6, depth: 0.4, color: '#555555' },
    { id: 'f4', type: 'double-bed', name: 'Dvigulė lova', x: 1, y: 5.8, rotation: 0, width: 1.8, depth: 2.2, color: '#e8d5c4' },
    { id: 'f5', type: 'wardrobe', name: 'Spinta', x: 0.1, y: 7.4, rotation: 0, width: 1.8, depth: 0.6, color: '#8b6914' },
    { id: 'f6', type: 'kitchen-counter', name: 'Stalviršis', x: 6.1, y: 0.1, rotation: 0, width: 2.5, depth: 0.65, color: '#d4d4d4' },
    { id: 'f7', type: 'bathtub', name: 'Vonia', x: 5.1, y: 5.3, rotation: 0, width: 1.7, depth: 0.75, color: '#e8f4f8' },
    { id: 'f8', type: 'toilet', name: 'Unitazas', x: 5.2, y: 7.5, rotation: 0, width: 0.4, depth: 0.65, color: '#f0f0f0' },
  ],
  wallHeight: 2.6,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export interface DesignerState {
  plan: FloorPlan;
  selectedId: string | null;
  tool: Tool;
  view: '2d' | '3d';
  history: FloorPlan[];
  historyIndex: number;
  pendingFurnitureType: string | null;
  pendingRoomType: Room['type'];
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  cameraMode: 'orbit' | 'firstperson';
}

type Action =
  | { type: 'SET_PLAN'; plan: FloorPlan }
  | { type: 'ADD_ROOM'; room: Room }
  | { type: 'UPDATE_ROOM'; room: Room }
  | { type: 'UPDATE_ROOM_LIVE'; room: Room }
  | { type: 'DELETE_ROOM'; id: string }
  | { type: 'ADD_DOOR'; door: Door }
  | { type: 'UPDATE_DOOR'; door: Door }
  | { type: 'UPDATE_DOOR_LIVE'; door: Door }
  | { type: 'DELETE_DOOR'; id: string }
  | { type: 'ADD_WINDOW'; win: WindowElement }
  | { type: 'UPDATE_WINDOW'; win: WindowElement }
  | { type: 'UPDATE_WINDOW_LIVE'; win: WindowElement }
  | { type: 'DELETE_WINDOW'; id: string }
  | { type: 'ADD_FURNITURE'; item: FurnitureItem }
  | { type: 'UPDATE_FURNITURE'; item: FurnitureItem }
  | { type: 'UPDATE_FURNITURE_LIVE'; item: FurnitureItem }
  | { type: 'DELETE_FURNITURE'; id: string }
  | { type: 'SELECT'; id: string | null }
  | { type: 'SET_TOOL'; tool: Tool }
  | { type: 'SET_VIEW'; view: '2d' | '3d' }
  | { type: 'SET_PLAN_NAME'; name: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_PENDING_FURNITURE'; furnitureType: string | null }
  | { type: 'SET_PENDING_ROOM_TYPE'; roomType: Room['type'] }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_SNAP' }
  | { type: 'SET_GRID_SIZE'; size: number }
  | { type: 'SET_CAMERA_MODE'; mode: 'orbit' | 'firstperson' }
  | { type: 'SET_WALL_HEIGHT'; height: number }
  | { type: 'SET_WALL_HEIGHT_LIVE'; height: number };

function savePlanToHistory(state: DesignerState, newPlan: FloorPlan): Pick<DesignerState, 'history' | 'historyIndex'> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(newPlan);
  if (newHistory.length > 50) newHistory.shift();
  return { history: newHistory, historyIndex: newHistory.length - 1 };
}

function updatePlan(state: DesignerState, updater: (plan: FloorPlan) => FloorPlan): DesignerState {
  const newPlan = updater({ ...state.plan, updatedAt: Date.now() });
  localStorage.setItem('homedesigner-plan', JSON.stringify(newPlan));
  return { ...state, plan: newPlan, ...savePlanToHistory(state, newPlan) };
}

function reducer(state: DesignerState, action: Action): DesignerState {
  switch (action.type) {
    case 'SET_PLAN':
      localStorage.setItem('homedesigner-plan', JSON.stringify(action.plan));
      return { ...state, plan: action.plan, history: [action.plan], historyIndex: 0 };
    case 'ADD_ROOM':
      return updatePlan(state, p => ({ ...p, rooms: [...p.rooms, action.room] }));
    case 'UPDATE_ROOM':
      return updatePlan(state, p => ({ ...p, rooms: p.rooms.map(r => r.id === action.room.id ? action.room : r) }));
    case 'UPDATE_ROOM_LIVE': {
      const newPlan = { ...state.plan, rooms: state.plan.rooms.map(r => r.id === action.room.id ? action.room : r), updatedAt: Date.now() };
      localStorage.setItem('homedesigner-plan', JSON.stringify(newPlan));
      return { ...state, plan: newPlan };
    }
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
    case 'UPDATE_DOOR_LIVE': {
      const newPlan = { ...state.plan, doors: state.plan.doors.map(d => d.id === action.door.id ? action.door : d), updatedAt: Date.now() };
      localStorage.setItem('homedesigner-plan', JSON.stringify(newPlan));
      return { ...state, plan: newPlan };
    }
    case 'DELETE_DOOR':
      return updatePlan(state, p => ({ ...p, doors: p.doors.filter(d => d.id !== action.id) }));
    case 'ADD_WINDOW':
      return updatePlan(state, p => ({ ...p, windows: [...p.windows, action.win] }));
    case 'UPDATE_WINDOW':
      return updatePlan(state, p => ({ ...p, windows: p.windows.map(w => w.id === action.win.id ? action.win : w) }));
    case 'UPDATE_WINDOW_LIVE': {
      const newPlan = { ...state.plan, windows: state.plan.windows.map(w => w.id === action.win.id ? action.win : w), updatedAt: Date.now() };
      localStorage.setItem('homedesigner-plan', JSON.stringify(newPlan));
      return { ...state, plan: newPlan };
    }
    case 'DELETE_WINDOW':
      return updatePlan(state, p => ({ ...p, windows: p.windows.filter(w => w.id !== action.id) }));
    case 'ADD_FURNITURE':
      return updatePlan(state, p => ({ ...p, furniture: [...p.furniture, action.item] }));
    case 'UPDATE_FURNITURE':
      return updatePlan(state, p => ({ ...p, furniture: p.furniture.map(f => f.id === action.item.id ? action.item : f) }));
    case 'UPDATE_FURNITURE_LIVE': {
      const newPlan = { ...state.plan, furniture: state.plan.furniture.map(f => f.id === action.item.id ? action.item : f), updatedAt: Date.now() };
      localStorage.setItem('homedesigner-plan', JSON.stringify(newPlan));
      return { ...state, plan: newPlan };
    }
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
      localStorage.setItem('homedesigner-plan', JSON.stringify(plan));
      return { ...state, plan, historyIndex: idx };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      const plan = state.history[idx];
      localStorage.setItem('homedesigner-plan', JSON.stringify(plan));
      return { ...state, plan, historyIndex: idx };
    }
    case 'SET_PENDING_FURNITURE':
      return { ...state, pendingFurnitureType: action.furnitureType };
    case 'SET_PENDING_ROOM_TYPE':
      return { ...state, pendingRoomType: action.roomType };
    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };
    case 'TOGGLE_SNAP':
      return { ...state, snapToGrid: !state.snapToGrid };
    case 'SET_GRID_SIZE':
      return { ...state, gridSize: action.size };
    case 'SET_CAMERA_MODE':
      return { ...state, cameraMode: action.mode };
    case 'SET_WALL_HEIGHT':
      return updatePlan(state, p => ({ ...p, wallHeight: action.height }));
    default:
      return state;
  }
}

function loadSavedPlan(): FloorPlan {
  try {
    const saved = localStorage.getItem('homedesigner-plan');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_PLAN;
}

export function createInitialState(): DesignerState {
  const plan = loadSavedPlan();
  return {
    plan,
    selectedId: null,
    tool: 'select',
    view: '2d',
    history: [plan],
    historyIndex: 0,
    pendingFurnitureType: null,
    pendingRoomType: 'living' as Room['type'],
    showGrid: true,
    snapToGrid: true,
    gridSize: 0.5,
    cameraMode: 'orbit',
  };
}

import React from 'react';

interface DesignerContextValue {
  state: DesignerState;
  dispatch: React.Dispatch<Action>;
}

export const DesignerContext = createContext<DesignerContextValue | null>(null);

export function useDesigner() {
  const ctx = useContext(DesignerContext);
  if (!ctx) throw new Error('useDesigner must be used within DesignerProvider');
  return ctx;
}

export { DEFAULT_PLAN };
