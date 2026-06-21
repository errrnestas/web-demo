import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useDesigner } from '@/lib/designer-store';
import type { Room, Door, WindowElement, FurnitureItem } from '@/types/designer';
import { WALL_MATERIAL_COLORS, FLOOR_MATERIAL_COLORS } from '@/types/designer';

const WALL_THICKNESS = 0.18;
const WALL_HEIGHT = 2.6;

function RoomFloor({ room }: { room: Room }) {
  const color = FLOOR_MATERIAL_COLORS[room.floorMaterial] || '#c8a26b';
  const roughness = room.floorMaterial === 'carpet' ? 0.95 : room.floorMaterial === 'marble' ? 0.05 : 0.7;
  return (
    <mesh receiveShadow position={[room.x + room.width / 2, 0.01, room.y + room.height / 2]}>
      <planeGeometry args={[room.width, room.height]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.05} />
      <primitive object={new THREE.Mesh()} />
    </mesh>
  );
}

function WallSegment({
  x, y, z, width, height, depth, color, roughness = 0.8
}: {
  x: number; y: number; z: number;
  width: number; height: number; depth: number;
  color: string; roughness?: number;
}) {
  return (
    <mesh castShadow receiveShadow position={[x, y, z]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.02} />
    </mesh>
  );
}

function RoomWalls({ room, doors, windows }: { room: Room; doors: Door[]; windows: WindowElement[] }) {
  const wc = WALL_MATERIAL_COLORS[room.wallMaterial] || '#f8f8f8';
  const wh = WALL_HEIGHT;
  const wt = WALL_THICKNESS;

  const roomDoors = doors.filter(d => d.roomId === room.id);
  const roomWindows = windows.filter(w => w.roomId === room.id);

  const walls = useMemo(() => {
    const result: JSX.Element[] = [];

    const makeWall = (
      wall: 'top' | 'bottom' | 'left' | 'right',
      baseX: number, baseZ: number,
      wallLength: number, isHorizontal: boolean
    ) => {
      const wallDoors = roomDoors.filter(d => d.wall === wall);
      const wallWindows = roomWindows.filter(w => w.wall === wall);

      // Collect all openings and sort by position
      const openings: { start: number; end: number; type: 'door' | 'window'; topY?: number }[] = [];
      for (const d of wallDoors) {
        const start = d.position * (wallLength - d.width);
        openings.push({ start, end: start + d.width, type: 'door' });
      }
      for (const w of wallWindows) {
        const start = w.position * wallLength - w.width / 2;
        openings.push({ start, end: start + w.width, type: 'window', topY: w.sillHeight + w.height });
      }
      openings.sort((a, b) => a.start - b.start);

      let cursor = 0;
      const segments: { from: number; to: number; fromY: number; toY: number }[] = [];

      if (openings.length === 0) {
        segments.push({ from: 0, to: wallLength, fromY: 0, toY: wh });
      } else {
        for (const op of openings) {
          if (cursor < op.start) {
            segments.push({ from: cursor, to: op.start, fromY: 0, toY: wh });
          }
          if (op.type === 'window') {
            segments.push({ from: op.start, to: op.end, fromY: 0, toY: op.type === 'window' ? (roomWindows.find(w => {
              const start = w.position * wallLength - w.width / 2;
              return Math.abs(start - op.start) < 0.01;
            })?.sillHeight ?? 0.9) : 0 });
            segments.push({ from: op.start, to: op.end, fromY: op.topY ?? (wh * 0.8), toY: wh });
            // Glass
            const winH = (op.topY ?? wh * 0.8) - (roomWindows.find(w => {
              const s = w.position * wallLength - w.width / 2;
              return Math.abs(s - op.start) < 0.01;
            })?.sillHeight ?? 0.9);
            const sill = roomWindows.find(w => {
              const s = w.position * wallLength - w.width / 2;
              return Math.abs(s - op.start) < 0.01;
            })?.sillHeight ?? 0.9;

            const segLen = op.end - op.start;
            const segMid = (op.start + op.end) / 2;
            const glassY = sill + winH / 2;

            let gx = baseX, gz = baseZ;
            if (isHorizontal) {
              gx = (wall === 'top' ? room.x : room.x) + segMid;
              gz = wall === 'top' ? room.y : room.y + room.height;
              result.push(
                <mesh key={`glass-${wall}-${op.start}`} position={[gx, glassY, gz + (wall === 'top' ? -wt / 2 : wt / 2)]}>
                  <boxGeometry args={[segLen, winH, wt * 0.3]} />
                  <meshStandardMaterial color="#a8d8ea" transparent opacity={0.4} roughness={0.05} metalness={0.1} />
                </mesh>
              );
            } else {
              gz = (wall === 'left' ? room.y : room.y) + segMid;
              gx = wall === 'left' ? room.x : room.x + room.width;
              result.push(
                <mesh key={`glass-${wall}-${op.start}`} position={[gx + (wall === 'left' ? -wt / 2 : wt / 2), glassY, gz]}>
                  <boxGeometry args={[wt * 0.3, winH, segLen]} />
                  <meshStandardMaterial color="#a8d8ea" transparent opacity={0.4} roughness={0.05} metalness={0.1} />
                </mesh>
              );
            }
          } else {
            // Door: no wall segment (gap)
          }
          cursor = op.end;
        }
        if (cursor < wallLength) {
          segments.push({ from: cursor, to: wallLength, fromY: 0, toY: wh });
        }
      }

      for (const seg of segments) {
        const segLen = seg.to - seg.from;
        const segH = seg.toY - seg.fromY;
        if (segLen <= 0 || segH <= 0) continue;
        const segMid = (seg.from + seg.to) / 2;
        const segMidY = (seg.fromY + seg.toY) / 2;

        if (isHorizontal) {
          const wallZ = wall === 'top' ? room.y : room.y + room.height;
          result.push(
            <WallSegment
              key={`${wall}-${seg.from}-${seg.fromY}`}
              x={room.x + segMid}
              y={segMidY}
              z={wallZ}
              width={segLen}
              height={segH}
              depth={wt}
              color={wc}
            />
          );
        } else {
          const wallX = wall === 'left' ? room.x : room.x + room.width;
          result.push(
            <WallSegment
              key={`${wall}-${seg.from}-${seg.fromY}`}
              x={wallX}
              y={segMidY}
              z={room.y + segMid}
              width={wt}
              height={segH}
              depth={segLen}
              color={wc}
            />
          );
        }
      }
    };

    makeWall('top', room.x, room.y, room.width, true);
    makeWall('bottom', room.x, room.y + room.height, room.width, true);
    makeWall('left', room.x, room.y, room.height, false);
    makeWall('right', room.x + room.width, room.y, room.height, false);

    return result;
  }, [room, roomDoors, roomWindows, wc]);

  return <>{walls}</>;
}

function FurnitureShape({ item }: { item: FurnitureItem }) {
  const rotation = (item.rotation * Math.PI) / 180;
  const cx = item.x + item.width / 2;
  const cz = item.y + item.depth / 2;

  const color = item.color;
  const dark = '#2a1a0a';
  const metal = '#a0a0a0';

  const shapes: JSX.Element[] = [];

  switch (item.type) {
    case 'double-bed':
    case 'single-bed': {
      // Frame
      shapes.push(<mesh key="frame" castShadow receiveShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[item.width, 0.3, item.depth]} />
        <meshStandardMaterial color={dark} roughness={0.8} />
      </mesh>);
      // Mattress
      shapes.push(<mesh key="mattress" castShadow position={[0, 0.38, 0.05]}>
        <boxGeometry args={[item.width - 0.06, 0.18, item.depth - 0.3]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>);
      // Headboard
      shapes.push(<mesh key="headboard" castShadow position={[0, 0.6, -(item.depth / 2) + 0.1]}>
        <boxGeometry args={[item.width, 0.9, 0.12]} />
        <meshStandardMaterial color={dark} roughness={0.7} />
      </mesh>);
      // Pillows
      const pillowW = item.type === 'double-bed' ? item.width / 2 - 0.15 : item.width - 0.2;
      const pillowPositions = item.type === 'double-bed' ? [-pillowW / 2 - 0.05, pillowW / 2 + 0.05] : [0];
      for (const px of pillowPositions) {
        shapes.push(<mesh key={`p${px}`} castShadow position={[px, 0.52, -(item.depth / 2) + 0.5]}>
          <boxGeometry args={[pillowW, 0.1, 0.55]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.95} />
        </mesh>);
      }
      break;
    }
    case 'sofa': {
      shapes.push(<mesh key="seat" castShadow position={[0, 0.22, 0.1]}>
        <boxGeometry args={[item.width, 0.25, item.depth - 0.18]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>);
      shapes.push(<mesh key="back" castShadow position={[0, 0.55, -(item.depth / 2) + 0.1]}>
        <boxGeometry args={[item.width, 0.55, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>);
      shapes.push(<mesh key="arm-l" castShadow position={[-(item.width / 2) + 0.09, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.35, item.depth]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>);
      shapes.push(<mesh key="arm-r" castShadow position={[item.width / 2 - 0.09, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.35, item.depth]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>);
      break;
    }
    case 'armchair': {
      shapes.push(<mesh key="seat" castShadow position={[0, 0.22, 0.05]}>
        <boxGeometry args={[item.width - 0.24, 0.22, item.depth - 0.18]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>);
      shapes.push(<mesh key="back" castShadow position={[0, 0.5, -(item.depth / 2) + 0.1]}>
        <boxGeometry args={[item.width - 0.24, 0.5, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>);
      shapes.push(<mesh key="arm-l" castShadow position={[-(item.width / 2) + 0.07, 0.38, 0]}>
        <boxGeometry args={[0.14, 0.3, item.depth]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>);
      shapes.push(<mesh key="arm-r" castShadow position={[item.width / 2 - 0.07, 0.38, 0]}>
        <boxGeometry args={[0.14, 0.3, item.depth]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>);
      break;
    }
    case 'dining-table': {
      shapes.push(<mesh key="top" castShadow receiveShadow position={[0, 0.77, 0]}>
        <boxGeometry args={[item.width, 0.05, item.depth]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>);
      const legX = item.width / 2 - 0.07;
      const legZ = item.depth / 2 - 0.07;
      [[legX, legZ], [-legX, legZ], [legX, -legZ], [-legX, -legZ]].forEach(([lx, lz], i) => {
        shapes.push(<mesh key={`leg${i}`} castShadow position={[lx, 0.38, lz]}>
          <cylinderGeometry args={[0.04, 0.04, 0.75, 8]} />
          <meshStandardMaterial color={dark} roughness={0.6} />
        </mesh>);
      });
      break;
    }
    case 'chair': {
      shapes.push(<mesh key="seat" castShadow receiveShadow position={[0, 0.46, 0]}>
        <boxGeometry args={[0.45, 0.05, 0.45]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>);
      shapes.push(<mesh key="back" castShadow position={[0, 0.7, -0.2]}>
        <boxGeometry args={[0.42, 0.5, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>);
      [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([lx, lz], i) => {
        shapes.push(<mesh key={`l${i}`} castShadow position={[lx, 0.22, lz]}>
          <cylinderGeometry args={[0.02, 0.02, 0.44, 6]} />
          <meshStandardMaterial color={dark} />
        </mesh>);
      });
      break;
    }
    case 'coffee-table': {
      shapes.push(<mesh key="top" castShadow receiveShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[item.width, 0.05, item.depth]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>);
      [[-item.width / 2 + 0.07, -item.depth / 2 + 0.07], [item.width / 2 - 0.07, -item.depth / 2 + 0.07],
       [-item.width / 2 + 0.07, item.depth / 2 - 0.07], [item.width / 2 - 0.07, item.depth / 2 - 0.07]].forEach(([lx, lz], i) => {
        shapes.push(<mesh key={`l${i}`} castShadow position={[lx, 0.2, lz]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
          <meshStandardMaterial color={dark} />
        </mesh>);
      });
      break;
    }
    case 'tv-stand': {
      shapes.push(<mesh key="body" castShadow receiveShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[item.width, 0.5, item.depth]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>);
      break;
    }
    case 'wardrobe': {
      shapes.push(<mesh key="body" castShadow receiveShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[item.width, 2.2, item.depth]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>);
      shapes.push(<mesh key="handles" position={[0.05, 1.1, item.depth / 2 + 0.01]}>
        <boxGeometry args={[0.02, 0.15, 0.02]} />
        <meshStandardMaterial color={metal} metalness={0.8} roughness={0.2} />
      </mesh>);
      break;
    }
    case 'bookshelf': {
      shapes.push(<mesh key="frame" castShadow position={[0, 1.0, 0]}>
        <boxGeometry args={[item.width, 2.0, item.depth]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>);
      for (let i = 0; i < 4; i++) {
        shapes.push(<mesh key={`shelf${i}`} position={[0, 0.2 + i * 0.5, 0]}>
          <boxGeometry args={[item.width - 0.05, 0.025, item.depth]} />
          <meshStandardMaterial color="#6b4c11" roughness={0.6} />
        </mesh>);
      }
      break;
    }
    case 'kitchen-counter': {
      shapes.push(<mesh key="base" castShadow receiveShadow position={[0, 0.43, 0]}>
        <boxGeometry args={[item.width, 0.85, item.depth]} />
        <meshStandardMaterial color="#d4d4d4" roughness={0.5} />
      </mesh>);
      shapes.push(<mesh key="top" castShadow position={[0, 0.87, 0]}>
        <boxGeometry args={[item.width + 0.05, 0.04, item.depth + 0.03]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.3} />
      </mesh>);
      break;
    }
    case 'sink': {
      shapes.push(<mesh key="basin" castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[item.width, 0.2, item.depth]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.1} metalness={0.5} />
      </mesh>);
      break;
    }
    case 'bathtub': {
      shapes.push(<mesh key="outer" castShadow receiveShadow position={[0, 0.33, 0]}>
        <boxGeometry args={[item.width, 0.6, item.depth]} />
        <meshStandardMaterial color={color} roughness={0.1} metalness={0.05} />
      </mesh>);
      shapes.push(<mesh key="inner" position={[0, 0.46, 0]}>
        <boxGeometry args={[item.width - 0.15, 0.4, item.depth - 0.12]} />
        <meshStandardMaterial color="#c8e8f8" transparent opacity={0.6} roughness={0.05} />
      </mesh>);
      break;
    }
    case 'toilet': {
      shapes.push(<mesh key="base" castShadow receiveShadow position={[0, 0.2, 0.05]}>
        <boxGeometry args={[0.4, 0.4, 0.5]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.1} />
      </mesh>);
      shapes.push(<mesh key="seat" position={[0, 0.42, 0]}>
        <boxGeometry args={[0.38, 0.04, 0.45]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.05} />
      </mesh>);
      shapes.push(<mesh key="tank" position={[0, 0.55, -0.2]}>
        <boxGeometry args={[0.3, 0.3, 0.15]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.1} />
      </mesh>);
      break;
    }
    case 'shower': {
      shapes.push(<mesh key="base" castShadow receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[item.width, 0.1, item.depth]} />
        <meshStandardMaterial color="#e8f4f8" roughness={0.1} />
      </mesh>);
      shapes.push(<mesh key="wallL" position={[-(item.width / 2) + 0.02, 1.1, 0]}>
        <boxGeometry args={[0.04, 2.2, item.depth]} />
        <meshStandardMaterial color="#a8d8ea" transparent opacity={0.35} roughness={0.05} />
      </mesh>);
      shapes.push(<mesh key="wallB" position={[0, 1.1, -(item.depth / 2) + 0.02]}>
        <boxGeometry args={[item.width, 2.2, 0.04]} />
        <meshStandardMaterial color="#a8d8ea" transparent opacity={0.35} roughness={0.05} />
      </mesh>);
      break;
    }
    case 'desk': {
      shapes.push(<mesh key="top" castShadow receiveShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[item.width, 0.04, item.depth]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>);
      [[-item.width / 2 + 0.07, -item.depth / 2 + 0.07], [item.width / 2 - 0.07, -item.depth / 2 + 0.07],
       [-item.width / 2 + 0.07, item.depth / 2 - 0.07], [item.width / 2 - 0.07, item.depth / 2 - 0.07]].forEach(([lx, lz], i) => {
        shapes.push(<mesh key={`l${i}`} castShadow position={[lx, 0.37, lz]}>
          <cylinderGeometry args={[0.03, 0.03, 0.74, 8]} />
          <meshStandardMaterial color={dark} />
        </mesh>);
      });
      break;
    }
    case 'plant': {
      shapes.push(<mesh key="pot" castShadow receiveShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.12, 0.35, 12]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>);
      shapes.push(<mesh key="soil" position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.04, 12]} />
        <meshStandardMaterial color="#3d2b1f" roughness={1} />
      </mesh>);
      shapes.push(<mesh key="plant" castShadow position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.3, 10, 10]} />
        <meshStandardMaterial color={item.color} roughness={0.9} />
      </mesh>);
      break;
    }
    default: {
      shapes.push(<mesh key="default" castShadow receiveShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[item.width, 0.6, item.depth]} />
        <meshStandardMaterial color={item.color} roughness={0.7} />
      </mesh>);
    }
  }

  return (
    <group position={[cx, 0, cz]} rotation={[0, rotation, 0]}>
      {shapes}
    </group>
  );
}

function Ceiling({ plan }: { plan: import('@/types/designer').FloorPlan }) {
  const rooms = plan.rooms;
  return (
    <>
      {rooms.map(room => (
        <mesh key={room.id} position={[room.x + room.width / 2, WALL_HEIGHT, room.y + room.height / 2]} receiveShadow>
          <planeGeometry args={[room.width, room.height]} />
          <meshStandardMaterial color="#f5f5f5" side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

function HouseScene() {
  const { state } = useDesigner();
  const { plan } = state;

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        position={[15, 20, 10]}
        intensity={1.2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <pointLight position={[5, 2.2, 5]} intensity={0.4} color="#fff8e0" />
      <pointLight position={[12, 2.2, 3]} intensity={0.3} color="#fff8e0" />

      {/* Ground */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[5, -0.005, 5]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#c8b89a" roughness={0.95} />
      </mesh>

      {/* Rooms */}
      {plan.rooms.map(room => (
        <group key={room.id}>
          <RoomFloor room={room} />
          <RoomWalls room={room} doors={plan.doors} windows={plan.windows} />
        </group>
      ))}

      {/* Furniture */}
      {plan.furniture.map(item => (
        <FurnitureShape key={item.id} item={item} />
      ))}

      <Ceiling plan={plan} />
    </>
  );
}

export default function Viewer3D() {
  const { state } = useDesigner();
  const allRooms = state.plan.rooms;

  // Calculate center of floor plan
  const center = useMemo(() => {
    if (allRooms.length === 0) return { x: 5, z: 5 };
    const minX = Math.min(...allRooms.map(r => r.x));
    const maxX = Math.max(...allRooms.map(r => r.x + r.width));
    const minY = Math.min(...allRooms.map(r => r.y));
    const maxY = Math.max(...allRooms.map(r => r.y + r.height));
    return { x: (minX + maxX) / 2, z: (minY + maxY) / 2 };
  }, [allRooms]);

  return (
    <div className="w-full h-full relative bg-slate-900">
      <Canvas
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[center.x - 8, 8, center.z + 12]} fov={55} near={0.1} far={500} />
        <Sky sunPosition={[100, 80, 100]} />
        <Suspense fallback={null}>
          <HouseScene />
        </Suspense>
        <OrbitControls
          target={[center.x, 1.2, center.z]}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={2}
          maxDistance={60}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-300 bg-slate-800/80 px-4 py-2 rounded-full pointer-events-none backdrop-blur">
        Sukite pelę — orbitavimas · Scroll — priartinimas · Dešinas mygtukas — judėjimas
      </div>

      <div className="absolute top-4 right-4 text-xs text-slate-400 bg-slate-800/70 px-3 py-1.5 rounded-lg backdrop-blur">
        {state.plan.rooms.length} kambariai · {state.plan.furniture.length} baldai
      </div>
    </div>
  );
}
