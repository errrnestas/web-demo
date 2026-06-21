export type RoomType = 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'office' | 'hallway' | 'garage' | 'other';
export type WallSide = 'top' | 'right' | 'bottom' | 'left';
export type FloorMaterial = 'wood' | 'tile' | 'carpet' | 'concrete' | 'marble' | 'vinyl';
export type WallMaterial = 'white' | 'cream' | 'gray' | 'blue' | 'green' | 'brick' | 'wood-panel';
export type Tool = 'select' | 'room' | 'door' | 'window' | 'furniture' | 'delete';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  x: number;
  y: number;
  width: number;
  height: number;
  floorMaterial: FloorMaterial;
  wallMaterial: WallMaterial;
  wallColor: string;
  floorColor: string;
}

export interface Door {
  id: string;
  roomId: string;
  wall: WallSide;
  position: number;
  width: number;
  swingIn: boolean;
}

export interface WindowElement {
  id: string;
  roomId: string;
  wall: WallSide;
  position: number;
  width: number;
  height: number;
  sillHeight: number;
}

export type FurnitureType =
  | 'double-bed' | 'single-bed' | 'sofa' | 'armchair'
  | 'dining-table' | 'chair' | 'coffee-table' | 'desk'
  | 'wardrobe' | 'bookshelf' | 'kitchen-counter' | 'sink'
  | 'bathtub' | 'toilet' | 'shower' | 'tv-stand' | 'plant'
  | 'stove' | 'refrigerator' | 'washing-machine' | 'office-chair'
  | 'nightstand' | 'dresser' | 'rug' | 'fireplace'
  | 'staircase' | 'column';

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  name: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  depth: number;
  color: string;
}

export interface FloorPlan {
  id: string;
  name: string;
  rooms: Room[];
  doors: Door[];
  windows: WindowElement[];
  furniture: FurnitureItem[];
  wallHeight: number;
  createdAt: number;
  updatedAt: number;
}

export const ROOM_COLORS: Record<RoomType, string> = {
  bedroom: '#d4e8f0',
  bathroom: '#cce8d4',
  kitchen: '#f0e8cc',
  living: '#e8d4f0',
  dining: '#f0d4d4',
  office: '#d4d4f0',
  hallway: '#e8e8d4',
  garage: '#d4d4d4',
  other: '#f0f0f0',
};

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  bedroom: 'Miegamasis',
  bathroom: 'Vonios kambarys',
  kitchen: 'Virtuvė',
  living: 'Svetainė',
  dining: 'Valgomasis',
  office: 'Kabinetas',
  hallway: 'Koridorius',
  garage: 'Garažas',
  other: 'Kita',
};

export const WALL_MATERIAL_COLORS: Record<WallMaterial, string> = {
  'white': '#f8f8f8',
  'cream': '#fdf6e3',
  'gray': '#9e9e9e',
  'blue': '#5c85d6',
  'green': '#5c9e6a',
  'brick': '#b55a2a',
  'wood-panel': '#8b6914',
};

export const FLOOR_MATERIAL_COLORS: Record<FloorMaterial, string> = {
  'wood': '#c8a26b',
  'tile': '#d4d4d4',
  'carpet': '#7b9eb5',
  'concrete': '#b0b0b0',
  'marble': '#e8e8e8',
  'vinyl': '#a0a0a0',
};

export const FURNITURE_CATALOG: Array<{
  type: FurnitureType;
  name: string;
  width: number;
  depth: number;
  color: string;
  category: string;
}> = [
  { type: 'double-bed', name: 'Dvigulė lova', width: 1.8, depth: 2.2, color: '#e8d5c4', category: 'Miegamasis' },
  { type: 'single-bed', name: 'Viengulė lova', width: 0.9, depth: 2.0, color: '#e8d5c4', category: 'Miegamasis' },
  { type: 'wardrobe', name: 'Spinta', width: 1.8, depth: 0.6, color: '#8b6914', category: 'Miegamasis' },
  { type: 'sofa', name: 'Sofa', width: 2.2, depth: 0.9, color: '#5a7a9e', category: 'Svetainė' },
  { type: 'armchair', name: 'Fotelis', width: 0.9, depth: 0.9, color: '#5a7a9e', category: 'Svetainė' },
  { type: 'coffee-table', name: 'Kavos staliukas', width: 1.2, depth: 0.6, color: '#8b6914', category: 'Svetainė' },
  { type: 'tv-stand', name: 'TV komoda', width: 1.6, depth: 0.4, color: '#555555', category: 'Svetainė' },
  { type: 'bookshelf', name: 'Knygų lentyna', width: 0.8, depth: 0.3, color: '#8b6914', category: 'Svetainė' },
  { type: 'dining-table', name: 'Valgomojo stalas', width: 1.6, depth: 0.9, color: '#8b6914', category: 'Valgomasis' },
  { type: 'chair', name: 'Kėdė', width: 0.5, depth: 0.5, color: '#8b6914', category: 'Valgomasis' },
  { type: 'kitchen-counter', name: 'Virtuvės stalviršis', width: 2.5, depth: 0.65, color: '#d4d4d4', category: 'Virtuvė' },
  { type: 'sink', name: 'Kriauklė', width: 0.6, depth: 0.5, color: '#c8c8c8', category: 'Virtuvė' },
  { type: 'desk', name: 'Rašomasis stalas', width: 1.4, depth: 0.7, color: '#8b6914', category: 'Kabinetas' },
  { type: 'bathtub', name: 'Vonia', width: 1.7, depth: 0.75, color: '#e8f4f8', category: 'Vonios kambarys' },
  { type: 'toilet', name: 'Unitazas', width: 0.4, depth: 0.65, color: '#f0f0f0', category: 'Vonios kambarys' },
  { type: 'shower', name: 'Dušas', width: 0.9, depth: 0.9, color: '#e8f4f8', category: 'Vonios kambarys' },
  { type: 'plant', name: 'Augalas', width: 0.4, depth: 0.4, color: '#4a7c4e', category: 'Dekoracijos' },
  { type: 'rug', name: 'Kilimas', width: 2.0, depth: 1.4, color: '#8b6560', category: 'Dekoracijos' },
  { type: 'fireplace', name: 'Židinys', width: 1.4, depth: 0.5, color: '#5a4a3a', category: 'Dekoracijos' },
  { type: 'stove', name: 'Viryklė', width: 0.6, depth: 0.65, color: '#444444', category: 'Virtuvė' },
  { type: 'refrigerator', name: 'Šaldytuvas', width: 0.7, depth: 0.75, color: '#c8c8c8', category: 'Virtuvė' },
  { type: 'washing-machine', name: 'Skalbimo mašina', width: 0.6, depth: 0.6, color: '#d8d8d8', category: 'Vonios kambarys' },
  { type: 'office-chair', name: 'Biuro kėdė', width: 0.65, depth: 0.65, color: '#2a2a2a', category: 'Kabinetas' },
  { type: 'nightstand', name: 'Naktinė spintelė', width: 0.5, depth: 0.45, color: '#8b6914', category: 'Miegamasis' },
  { type: 'dresser', name: 'Komoda', width: 1.2, depth: 0.5, color: '#8b6914', category: 'Miegamasis' },
  { type: 'staircase', name: 'Laiptai', width: 1.0, depth: 2.5, color: '#b0956a', category: 'Kita' },
  { type: 'column', name: 'Kolona', width: 0.3, depth: 0.3, color: '#9e9e9e', category: 'Kita' },
];
