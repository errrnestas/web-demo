import { useDesigner } from '@/lib/designer-store';
import { cn, nanoid } from '@/lib/utils';
import type { Room, FurnitureItem, Door, WindowElement } from '@/types/designer';
import {
  ROOM_TYPE_LABELS,
  WALL_MATERIAL_COLORS,
  FLOOR_MATERIAL_COLORS,
  FURNITURE_CATALOG,
} from '@/types/designer';

const ROOM_TYPES = Object.entries(ROOM_TYPE_LABELS) as [Room['type'], string][];
const WALL_MATERIALS = Object.entries(WALL_MATERIAL_COLORS) as [Room['wallMaterial'], string][];
const FLOOR_MATERIALS = Object.entries(FLOOR_MATERIAL_COLORS) as [Room['floorMaterial'], string][];
const FLOOR_MAT_LABELS: Record<Room['floorMaterial'], string> = {
  wood: 'Parketas',
  tile: 'Plytelės',
  carpet: 'Kilimas',
  concrete: 'Betonas',
  marble: 'Marmuras',
  vinyl: 'Vinilas',
};
const WALL_MAT_LABELS: Record<Room['wallMaterial'], string> = {
  white: 'Balta',
  cream: 'Kreminė',
  gray: 'Pilka',
  blue: 'Mėlyna',
  green: 'Žalia',
  brick: 'Plyta',
  'wood-panel': 'Mediena',
};

function RoomEditor({ room }: { room: Room }) {
  const { dispatch, state } = useDesigner();
  const update = (patch: Partial<Room>) => dispatch({ type: 'UPDATE_ROOM', room: { ...room, ...patch } });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-slate-400 block mb-1">Pavadinimas</label>
        <input
          value={room.name}
          onChange={e => update({ name: e.target.value })}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-2">Tipo</label>
        <div className="grid grid-cols-2 gap-1">
          {ROOM_TYPES.map(([type, label]) => (
            <button
              key={type}
              onClick={() => update({ type })}
              className={cn('text-xs py-1.5 px-2 rounded-lg border transition-all text-left',
                room.type === type ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Plotis (m)</label>
          <input
            type="number"
            step="0.1"
            min="0.5"
            value={room.width}
            onChange={e => update({ width: parseFloat(e.target.value) || 1 })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Gylis (m)</label>
          <input
            type="number"
            step="0.1"
            min="0.5"
            value={room.height}
            onChange={e => update({ height: parseFloat(e.target.value) || 1 })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">X pozicija (m)</label>
          <input
            type="number"
            step="0.1"
            value={parseFloat(room.x.toFixed(2))}
            onChange={e => update({ x: parseFloat(e.target.value) || 0 })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Y pozicija (m)</label>
          <input
            type="number"
            step="0.1"
            value={parseFloat(room.y.toFixed(2))}
            onChange={e => update({ y: parseFloat(e.target.value) || 0 })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400">Grindų danga</label>
          <input
            type="color"
            value={room.floorColor}
            onChange={e => update({ floorColor: e.target.value })}
            title="Pritaikyta spalva"
            className="w-6 h-6 rounded cursor-pointer border border-slate-600 bg-slate-800"
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {FLOOR_MATERIALS.map(([mat, color]) => (
            <button
              key={mat}
              onClick={() => update({ floorMaterial: mat, floorColor: color })}
              title={FLOOR_MAT_LABELS[mat]}
              className={cn('flex items-center gap-1.5 text-xs py-1.5 px-2 rounded-lg border transition-all',
                room.floorMaterial === mat ? 'border-blue-500 bg-slate-700' : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              )}
            >
              <span className="w-4 h-4 rounded shrink-0" style={{ background: color }} />
              <span className="text-slate-300 truncate" style={{ fontSize: '9px' }}>{FLOOR_MAT_LABELS[mat]}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400">Sienų spalva</label>
          <input
            type="color"
            value={room.wallColor}
            onChange={e => update({ wallColor: e.target.value })}
            title="Pritaikyta spalva"
            className="w-6 h-6 rounded cursor-pointer border border-slate-600 bg-slate-800"
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {WALL_MATERIALS.map(([mat, color]) => (
            <button
              key={mat}
              onClick={() => update({ wallMaterial: mat, wallColor: color })}
              title={WALL_MAT_LABELS[mat]}
              className={cn('flex items-center gap-1.5 text-xs py-1.5 px-2 rounded-lg border transition-all',
                room.wallMaterial === mat ? 'border-blue-500 bg-slate-700' : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              )}
            >
              <span className="w-4 h-4 rounded shrink-0" style={{ background: color }} />
              <span className="text-slate-300 truncate" style={{ fontSize: '9px' }}>{WALL_MAT_LABELS[mat]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-400">
        <div className="flex justify-between mb-1">
          <span>Plotas:</span>
          <span className="text-white font-medium">{(room.width * room.height).toFixed(1)} m²</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Perimetras:</span>
          <span className="text-white font-medium">{(2 * (room.width + room.height)).toFixed(1)} m</span>
        </div>
        <div className="flex justify-between">
          <span>Tūris:</span>
          <span className="text-white font-medium">{(room.width * room.height * state.plan.wallHeight).toFixed(1)} m³</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            const dup = { ...room, id: `r${nanoid()}`, x: room.x + 0.5, y: room.y + 0.5 };
            dispatch({ type: 'ADD_ROOM', room: dup });
            dispatch({ type: 'SELECT', id: dup.id });
          }}
          className="flex-1 py-2 text-xs rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          ⧉ Kopijuoti
        </button>
        <button
          onClick={() => dispatch({ type: 'DELETE_ROOM', id: room.id })}
          className="flex-1 py-2 text-xs rounded-lg border border-red-800/50 text-red-400 hover:bg-red-900/20 transition-all"
        >
          🗑 Ištrinti
        </button>
      </div>
    </div>
  );
}

function FurnitureEditor({ item }: { item: FurnitureItem }) {
  const { dispatch } = useDesigner();
  const update = (patch: Partial<FurnitureItem>) => dispatch({ type: 'UPDATE_FURNITURE', item: { ...item, ...patch } });
  const catalog = FURNITURE_CATALOG.find(f => f.type === item.type);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-slate-400 block mb-1">Pavadinimas</label>
        <p className="text-sm text-white font-medium">{item.name}</p>
        {catalog && <p className="text-xs text-slate-500 mt-0.5">{catalog.category}</p>}
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Spalva</label>
        <input
          type="color"
          value={item.color}
          onChange={e => update({ color: e.target.value })}
          className="w-full h-10 rounded-lg border border-slate-600 bg-slate-800 cursor-pointer"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Sukimas: {item.rotation}°</label>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 90, 180, 270].map(deg => (
            <button
              key={deg}
              onClick={() => update({ rotation: deg })}
              className={cn('py-1.5 text-xs rounded-lg border transition-all',
                item.rotation === deg ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              )}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Plotis (m)</label>
          <input
            type="number"
            step="0.05"
            min="0.1"
            value={parseFloat(item.width.toFixed(2))}
            onChange={e => update({ width: parseFloat(e.target.value) || item.width })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Gylis (m)</label>
          <input
            type="number"
            step="0.05"
            min="0.1"
            value={parseFloat(item.depth.toFixed(2))}
            onChange={e => update({ depth: parseFloat(e.target.value) || item.depth })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            const dup = { ...item, id: `f${nanoid()}`, x: item.x + 0.3, y: item.y + 0.3 };
            dispatch({ type: 'ADD_FURNITURE', item: dup });
            dispatch({ type: 'SELECT', id: dup.id });
          }}
          className="flex-1 py-2 text-xs rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          ⧉ Kopijuoti
        </button>
        <button
          onClick={() => dispatch({ type: 'DELETE_FURNITURE', id: item.id })}
          className="flex-1 py-2 text-xs rounded-lg border border-red-800/50 text-red-400 hover:bg-red-900/20 transition-all"
        >
          🗑 Ištrinti
        </button>
      </div>
    </div>
  );
}

const WALL_LABELS: Record<string, string> = {
  top: 'Viršus', bottom: 'Apačia', left: 'Kairė', right: 'Dešinė'
};

function DoorEditor({ door }: { door: Door }) {
  const { dispatch } = useDesigner();
  const update = (patch: Partial<Door>) => dispatch({ type: 'UPDATE_DOOR', door: { ...door, ...patch } });

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 uppercase tracking-wider">Durys</p>
      <div>
        <label className="text-xs text-slate-400 block mb-1">Plotis (m)</label>
        <input
          type="number"
          step="0.05"
          min="0.5"
          max="2.5"
          value={parseFloat(door.width.toFixed(2))}
          onChange={e => update({ width: parseFloat(e.target.value) || 0.9 })}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 block mb-1">Pozicija sienoje</label>
        <input
          type="range"
          min="0.05"
          max="0.95"
          step="0.05"
          value={door.position}
          onChange={e => update({ position: parseFloat(e.target.value) })}
          className="w-full accent-blue-500"
        />
        <span className="text-xs text-slate-500">{Math.round(door.position * 100)}%</span>
      </div>
      <div>
        <label className="text-xs text-slate-400 block mb-2">Atidarymas</label>
        <div className="flex gap-2">
          <button
            onClick={() => update({ swingIn: true })}
            className={cn('flex-1 py-1.5 text-xs rounded-lg border transition-all',
              door.swingIn ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            )}
          >
            Vidun
          </button>
          <button
            onClick={() => update({ swingIn: false })}
            className={cn('flex-1 py-1.5 text-xs rounded-lg border transition-all',
              !door.swingIn ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            )}
          >
            Laukan
          </button>
        </div>
      </div>
      <div className="bg-slate-800/60 rounded-lg p-2.5 text-xs text-slate-500">
        Siena: <span className="text-slate-300">{WALL_LABELS[door.wall]}</span>
      </div>
      <button
        onClick={() => dispatch({ type: 'DELETE_DOOR', id: door.id })}
        className="w-full py-2 text-xs rounded-lg border border-red-800/50 text-red-400 hover:bg-red-900/20 transition-all"
      >
        🗑 Ištrinti duris
      </button>
    </div>
  );
}

function WindowEditor({ win }: { win: WindowElement }) {
  const { dispatch } = useDesigner();
  const update = (patch: Partial<WindowElement>) => dispatch({ type: 'UPDATE_WINDOW', win: { ...win, ...patch } });

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 uppercase tracking-wider">Langas</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Plotis (m)</label>
          <input
            type="number"
            step="0.1"
            min="0.4"
            max="4"
            value={parseFloat(win.width.toFixed(2))}
            onChange={e => update({ width: parseFloat(e.target.value) || 1.2 })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Aukštis (m)</label>
          <input
            type="number"
            step="0.1"
            min="0.3"
            max="2.5"
            value={parseFloat(win.height.toFixed(2))}
            onChange={e => update({ height: parseFloat(e.target.value) || 1.2 })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400 block mb-1">Palangės aukštis (m)</label>
        <input
          type="number"
          step="0.05"
          min="0"
          max="2"
          value={parseFloat(win.sillHeight.toFixed(2))}
          onChange={e => update({ sillHeight: parseFloat(e.target.value) || 0.9 })}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 block mb-1">Pozicija sienoje</label>
        <input
          type="range"
          min="0.05"
          max="0.95"
          step="0.05"
          value={win.position}
          onChange={e => update({ position: parseFloat(e.target.value) })}
          className="w-full accent-blue-500"
        />
        <span className="text-xs text-slate-500">{Math.round(win.position * 100)}%</span>
      </div>
      <div className="bg-slate-800/60 rounded-lg p-2.5 text-xs text-slate-500">
        Siena: <span className="text-slate-300">{WALL_LABELS[win.wall]}</span>
      </div>
      <button
        onClick={() => dispatch({ type: 'DELETE_WINDOW', id: win.id })}
        className="w-full py-2 text-xs rounded-lg border border-red-800/50 text-red-400 hover:bg-red-900/20 transition-all"
      >
        🗑 Ištrinti langą
      </button>
    </div>
  );
}

export default function RightPanel({ embedded = false }: { embedded?: boolean }) {
  const { state, dispatch } = useDesigner();
  const { selectedId, plan } = state;

  const selectedRoom = plan.rooms.find(r => r.id === selectedId);
  const selectedDoor = plan.doors.find(d => d.id === selectedId);
  const selectedWindow = plan.windows.find(w => w.id === selectedId);
  const selectedFurniture = plan.furniture.find(f => f.id === selectedId);

  const stats = {
    rooms: plan.rooms.length,
    totalArea: plan.rooms.reduce((s, r) => s + r.width * r.height, 0),
    doors: plan.doors.length,
    windows: plan.windows.length,
    furniture: plan.furniture.length,
  };

  return (
    <div className={embedded ? "flex flex-col overflow-hidden h-full" : "w-[220px] bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden shrink-0"}>
      {/* Selected element */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedRoom && (
          <>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Kambarys</p>
            <RoomEditor room={selectedRoom} />
          </>
        )}
        {selectedFurniture && (
          <>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Baldas</p>
            <FurnitureEditor item={selectedFurniture} />
          </>
        )}
        {selectedDoor && (
          <DoorEditor door={selectedDoor} />
        )}
        {selectedWindow && (
          <WindowEditor win={selectedWindow} />
        )}
        {!selectedId && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Projekto statistika</p>
            <div className="space-y-2">
              {[
                { label: 'Kambariai', value: stats.rooms },
                { label: 'Bendras plotas', value: `${stats.totalArea.toFixed(1)} m²` },
                { label: 'Durys', value: stats.doors },
                { label: 'Langai', value: stats.windows },
                { label: 'Baldai', value: stats.furniture },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center bg-slate-800/50 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className="text-sm font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Sienų aukštis</p>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="2.2"
                  max="4.0"
                  step="0.1"
                  value={state.plan.wallHeight}
                  onChange={e => {
                    const h = parseFloat(e.target.value);
                    dispatch({ type: 'SET_PLAN', plan: { ...state.plan, wallHeight: h } });
                  }}
                  className="flex-1 h-2 accent-blue-500"
                />
                <span className="text-xs text-white w-12">{state.plan.wallHeight}m</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
