import { Suspense, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useDesigner } from '@/lib/designer-store';
import type { Room, Door, WindowElement, FurnitureItem, FloorPlan } from '@/types/designer';
import { WALL_MATERIAL_COLORS, FLOOR_MATERIAL_COLORS } from '@/types/designer';

const WALL_THICKNESS = 0.18;
const WALL_HEIGHT = 2.6;

function createFloorTexture(material: string, baseColor: string): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  if (material === 'wood') {
    const lineCount = 18;
    for (let i = 0; i < lineCount; i++) {
      const y = (i / lineCount) * size;
      const h = (size / lineCount) * 0.7;
      ctx.fillStyle = `rgba(0,0,0,${0.04 + (i % 2) * 0.06})`;
      ctx.fillRect(0, y, size, h);
      // grain lines
      ctx.strokeStyle = `rgba(0,0,0,0.04)`;
      ctx.lineWidth = 1;
      for (let j = 0; j < 6; j++) {
        const ly = y + (h / 6) * j;
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(size, ly); ctx.stroke();
      }
    }
    // subtle knot
    const grd = ctx.createRadialGradient(size * 0.7, size * 0.3, 0, size * 0.7, size * 0.3, size * 0.08);
    grd.addColorStop(0, 'rgba(0,0,0,0.12)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, size, size);
  } else if (material === 'tile') {
    const tileSize = 80;
    ctx.strokeStyle = 'rgba(180,180,180,0.7)';
    ctx.lineWidth = 3;
    for (let x = 0; x <= size; x += tileSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
    }
    for (let y = 0; y <= size; y += tileSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    }
    // subtle tile variation
    for (let tx = 0; tx < size; tx += tileSize) {
      for (let ty = 0; ty < size; ty += tileSize) {
        if ((tx / tileSize + ty / tileSize) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(tx + 3, ty + 3, tileSize - 6, tileSize - 6);
        }
      }
    }
  } else if (material === 'marble') {
    // Marble vein effect
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = `rgba(255,255,255,0.6)`;
      ctx.lineWidth = 1 + i * 0.3;
      ctx.beginPath();
      ctx.moveTo(i * 60, 0);
      ctx.bezierCurveTo(100 + i * 20, 100, 200 - i * 15, 300, 400 + i * 10, size);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (material === 'carpet') {
    // Subtle carpet texture - small dots
    for (let i = 0; i < 2000; i++) {
      const x = Math.floor((i * 137) % size);
      const y = Math.floor((i * 251) % size);
      ctx.fillStyle = `rgba(0,0,0,${0.05 + ((i * 17) % 10) * 0.005})`;
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (material === 'concrete') {
    // Concrete - subtle noise
    for (let i = 0; i < 3000; i++) {
      const x = (i * 137) % size;
      const y = (i * 251) % size;
      const a = 0.02 + ((i * 13) % 20) * 0.002;
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function createWallTexture(material: string): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (material === 'brick') {
    ctx.fillStyle = '#c45c3a'; ctx.fillRect(0, 0, size, size);
    const bw = 96, bh = 40, grout = 6;
    ctx.fillStyle = '#d4a088';
    for (let row = 0; row * (bh + grout) < size; row++) {
      const offset = row % 2 === 0 ? 0 : (bw + grout) / 2;
      for (let col = -1; col * (bw + grout) < size; col++) {
        const x = col * (bw + grout) + offset;
        const y = row * (bh + grout);
        ctx.fillStyle = `hsl(${15 + ((col * 3 + row * 7) % 10)}, ${50 + (col * 7 + row * 3) % 15}%, ${40 + (col + row * 2) % 10}%)`;
        ctx.fillRect(x + grout / 2, y + grout / 2, bw, bh);
      }
    }
    ctx.strokeStyle = '#b8a090'; ctx.lineWidth = grout;
    for (let row = 0; row * (bh + grout) < size; row++) {
      ctx.beginPath(); ctx.moveTo(0, row * (bh + grout)); ctx.lineTo(size, row * (bh + grout)); ctx.stroke();
      const offset = row % 2 === 0 ? 0 : (bw + grout) / 2;
      for (let col = -1; col * (bw + grout) < size; col++) {
        const x = col * (bw + grout) + offset + bw + grout;
        ctx.beginPath(); ctx.moveTo(x, row * (bh + grout)); ctx.lineTo(x, row * (bh + grout) + bh + grout); ctx.stroke();
      }
    }
  } else if (material === 'wood-panel') {
    ctx.fillStyle = '#c8a060'; ctx.fillRect(0, 0, size, size);
    const paneW = 64;
    for (let col = 0; col * paneW < size; col++) {
      ctx.fillStyle = col % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(col * paneW, 0, paneW - 4, size);
      // grain lines
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = 'rgba(0,0,0,0.03)';
        ctx.fillRect(col * paneW + i * 8, 0, 2, size);
      }
      // panel separator
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(col * paneW + paneW - 4, 0, 4, size);
    }
  } else {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
    // subtle stippling
    for (let i = 0; i < 1500; i++) {
      const x = (i * 137) % size;
      const y = (i * 251) % size;
      ctx.fillStyle = `rgba(0,0,0,${0.015 + ((i * 7) % 5) * 0.003})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

function RoomFloor({ room, showLabels, selectedId, onSelect }: { room: Room; showLabels: boolean; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const isSelected = selectedId === room.id;
  const color = room.floorColor || FLOOR_MATERIAL_COLORS[room.floorMaterial] || '#c8a26b';
  const roughness = room.floorMaterial === 'carpet' ? 0.95 : room.floorMaterial === 'marble' ? 0.05 : room.floorMaterial === 'vinyl' ? 0.4 : 0.7;
  const metalness = room.floorMaterial === 'marble' ? 0.1 : 0.0;
  const cx = room.x + room.width / 2;
  const cz = room.y + room.height / 2;
  const texture = useMemo(() => createFloorTexture(room.floorMaterial, color), [room.floorMaterial, color]);

  return (
    <>
      <mesh
        receiveShadow
        position={[cx, 0.01, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { if (!document.pointerLockElement) { e.stopPropagation(); onSelect(room.id); } }}
        onPointerOver={(e) => { if (!document.pointerLockElement) { e.stopPropagation(); document.body.style.cursor = 'pointer'; } }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <planeGeometry args={[room.width, room.height]} />
        <meshStandardMaterial
          color={color}
          map={texture}
          roughness={roughness}
          metalness={metalness}
          emissive={isSelected ? '#2563eb' : '#000000'}
          emissiveIntensity={isSelected ? 0.14 : 0}
        />
      </mesh>
      {isSelected && (
        <mesh position={[cx, 0.02, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[room.width, room.height]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.12} />
        </mesh>
      )}
      {showLabels && (
        <Text
          position={[cx, 0.05, cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={Math.min(room.width, room.height) * 0.18}
          color="#1e293b"
          anchorX="center"
          anchorY="middle"
          maxWidth={room.width * 0.9}
        >
          {room.name}
        </Text>
      )}
    </>
  );
}

function WallSegment({
  x, y, z, width, height, depth, color, roughness = 0.8, wallMaterial
}: {
  x: number; y: number; z: number;
  width: number; height: number; depth: number;
  color: string; roughness?: number;
  wallMaterial?: string;
}) {
  const texture = useMemo(() => {
    if (wallMaterial === 'brick' || wallMaterial === 'wood-panel') {
      return createWallTexture(wallMaterial);
    }
    return null;
  }, [wallMaterial]);

  return (
    <mesh castShadow receiveShadow position={[x, y, z]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={color}
        map={texture ?? undefined}
        roughness={roughness}
        metalness={0.02}
      />
    </mesh>
  );
}

function RoomWalls({ room, doors, windows, wallHeight, allRooms }: { room: Room; doors: Door[]; windows: WindowElement[]; wallHeight: number; allRooms: Room[] }) {
  const wc = room.wallColor || WALL_MATERIAL_COLORS[room.wallMaterial] || '#f8f8f8';
  const wh = wallHeight;
  const wt = WALL_THICKNESS;

  const roomDoors = doors.filter(d => d.roomId === room.id);
  const roomWindows = windows.filter(w => w.roomId === room.id);

  const walls = useMemo(() => {
    const result: JSX.Element[] = [];
    const EPSILON = 0.06;

    // Returns true if this wall is shared with another room and should be skipped
    // (the room with the smaller id renders the shared wall)
    const shouldSkipWall = (wall: 'top' | 'bottom' | 'left' | 'right'): boolean => {
      for (const other of allRooms) {
        if (other.id === room.id) continue;
        let shared = false;
        if (wall === 'top') {
          shared = Math.abs(other.y + other.height - room.y) < EPSILON
            && other.x < room.x + room.width - EPSILON && other.x + other.width > room.x + EPSILON;
        } else if (wall === 'bottom') {
          shared = Math.abs(other.y - (room.y + room.height)) < EPSILON
            && other.x < room.x + room.width - EPSILON && other.x + other.width > room.x + EPSILON;
        } else if (wall === 'left') {
          shared = Math.abs(other.x + other.width - room.x) < EPSILON
            && other.y < room.y + room.height - EPSILON && other.y + other.height > room.y + EPSILON;
        } else {
          shared = Math.abs(other.x - (room.x + room.width)) < EPSILON
            && other.y < room.y + room.height - EPSILON && other.y + other.height > room.y + EPSILON;
        }
        if (shared && other.id < room.id) return true;
      }
      return false;
    };

    const makeWall = (
      wall: 'top' | 'bottom' | 'left' | 'right',
      baseX: number, baseZ: number,
      wallLength: number, isHorizontal: boolean
    ) => {
      const wallDoors = roomDoors.filter(d => d.wall === wall);
      const wallWindows = roomWindows.filter(w => w.wall === wall);

      // Collect all openings and sort by position
      const openings: { start: number; end: number; type: 'door' | 'window'; topY?: number; door?: Door }[] = [];
      for (const d of wallDoors) {
        const start = d.position * (wallLength - d.width);
        openings.push({ start, end: start + d.width, type: 'door', door: d });
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

            const wff = 0.06; // window frame width
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
              result.push(
                <mesh key={`sill-${wall}-${op.start}`} position={[gx, sill + 0.025, gz]} castShadow>
                  <boxGeometry args={[segLen + 0.06, 0.05, wt + 0.1]} />
                  <meshStandardMaterial color="#ccc8c0" roughness={0.65} metalness={0.04} />
                </mesh>
              );
              // Window frame jambs + top casing
              result.push(
                <mesh key={`wframe-l-${wall}-${op.start}`} castShadow position={[gx - segLen / 2 - wff / 2, sill + winH / 2, gz]}>
                  <boxGeometry args={[wff, winH, wt + 0.04]} />
                  <meshStandardMaterial color="#e8e4de" roughness={0.65} />
                </mesh>,
                <mesh key={`wframe-r-${wall}-${op.start}`} castShadow position={[gx + segLen / 2 + wff / 2, sill + winH / 2, gz]}>
                  <boxGeometry args={[wff, winH, wt + 0.04]} />
                  <meshStandardMaterial color="#e8e4de" roughness={0.65} />
                </mesh>,
                <mesh key={`wframe-t-${wall}-${op.start}`} castShadow position={[gx, sill + winH + wff / 2, gz]}>
                  <boxGeometry args={[segLen + wff * 2, wff, wt + 0.04]} />
                  <meshStandardMaterial color="#e8e4de" roughness={0.65} />
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
              result.push(
                <mesh key={`sill-${wall}-${op.start}`} position={[gx, sill + 0.025, gz]} castShadow>
                  <boxGeometry args={[wt + 0.1, 0.05, segLen + 0.06]} />
                  <meshStandardMaterial color="#ccc8c0" roughness={0.65} metalness={0.04} />
                </mesh>
              );
              // Window frame jambs + top casing
              result.push(
                <mesh key={`wframe-l-${wall}-${op.start}`} castShadow position={[gx, sill + winH / 2, gz - segLen / 2 - wff / 2]}>
                  <boxGeometry args={[wt + 0.04, winH, wff]} />
                  <meshStandardMaterial color="#e8e4de" roughness={0.65} />
                </mesh>,
                <mesh key={`wframe-r-${wall}-${op.start}`} castShadow position={[gx, sill + winH / 2, gz + segLen / 2 + wff / 2]}>
                  <boxGeometry args={[wt + 0.04, winH, wff]} />
                  <meshStandardMaterial color="#e8e4de" roughness={0.65} />
                </mesh>,
                <mesh key={`wframe-t-${wall}-${op.start}`} castShadow position={[gx, sill + winH + wff / 2, gz]}>
                  <boxGeometry args={[wt + 0.04, wff, segLen + wff * 2]} />
                  <meshStandardMaterial color="#e8e4de" roughness={0.65} />
                </mesh>
              );
            }
          } else if (op.door) {
            // Door gap + swung-open door panel
            const d = op.door;
            const doorH = Math.min(2.1, wh * 0.88);
            const panelT = 0.04;
            const doorW = op.end - op.start;

            // Wall segment above the door opening (transom strip)
            if (doorH < wh) {
              segments.push({ from: op.start, to: op.end, fromY: doorH, toY: wh });
            }

            const fw = 0.07; // door frame width
            if (isHorizontal) {
              const wallZ = wall === 'top' ? room.y : room.y + room.height;
              const hingeX = room.x + op.start;
              const swingMult = (wall === 'top' ? -1 : 1) * (d.swingIn ? 1 : -1);
              const openAngle = swingMult * Math.PI * 0.44;
              result.push(
                <group key={`door-${wall}-${op.start}`} position={[hingeX, 0, wallZ]}>
                  <group rotation={[0, openAngle, 0]}>
                    <mesh position={[doorW / 2, doorH / 2, 0]} castShadow>
                      <boxGeometry args={[doorW, doorH, panelT]} />
                      <meshStandardMaterial color="#b88c5a" roughness={0.65} />
                    </mesh>
                    <mesh position={[doorW * 0.82, doorH * 0.46, panelT / 2 + 0.022]}>
                      <sphereGeometry args={[0.038, 8, 8]} />
                      <meshStandardMaterial color="#aaa" metalness={0.75} roughness={0.2} />
                    </mesh>
                  </group>
                </group>
              );
              // Door frame (left jamb, right jamb, top lintel)
              result.push(
                <mesh key={`frame-l-${wall}-${op.start}`} castShadow position={[hingeX - fw / 2, doorH / 2, wallZ]}>
                  <boxGeometry args={[fw, doorH, wt + 0.04]} />
                  <meshStandardMaterial color="#ede8e0" roughness={0.65} />
                </mesh>,
                <mesh key={`frame-r-${wall}-${op.start}`} castShadow position={[hingeX + doorW + fw / 2, doorH / 2, wallZ]}>
                  <boxGeometry args={[fw, doorH, wt + 0.04]} />
                  <meshStandardMaterial color="#ede8e0" roughness={0.65} />
                </mesh>,
                <mesh key={`frame-t-${wall}-${op.start}`} castShadow position={[hingeX + doorW / 2, doorH + fw / 2, wallZ]}>
                  <boxGeometry args={[doorW + fw * 2, fw, wt + 0.04]} />
                  <meshStandardMaterial color="#ede8e0" roughness={0.65} />
                </mesh>
              );
            } else {
              const wallX = wall === 'left' ? room.x : room.x + room.width;
              const hingeZ = room.y + op.start;
              const swingMult = (wall === 'left' ? 1 : -1) * (d.swingIn ? 1 : -1);
              const openAngle = swingMult * Math.PI * 0.44;
              result.push(
                <group key={`door-${wall}-${op.start}`} position={[wallX, 0, hingeZ]}>
                  <group rotation={[0, openAngle, 0]}>
                    <mesh position={[0, doorH / 2, doorW / 2]} castShadow>
                      <boxGeometry args={[panelT, doorH, doorW]} />
                      <meshStandardMaterial color="#b88c5a" roughness={0.65} />
                    </mesh>
                    <mesh position={[panelT / 2 + 0.022, doorH * 0.46, doorW * 0.82]}>
                      <sphereGeometry args={[0.038, 8, 8]} />
                      <meshStandardMaterial color="#aaa" metalness={0.75} roughness={0.2} />
                    </mesh>
                  </group>
                </group>
              );
              // Door frame (left jamb, right jamb, top lintel)
              result.push(
                <mesh key={`frame-l-${wall}-${op.start}`} castShadow position={[wallX, doorH / 2, hingeZ - fw / 2]}>
                  <boxGeometry args={[wt + 0.04, doorH, fw]} />
                  <meshStandardMaterial color="#ede8e0" roughness={0.65} />
                </mesh>,
                <mesh key={`frame-r-${wall}-${op.start}`} castShadow position={[wallX, doorH / 2, hingeZ + doorW + fw / 2]}>
                  <boxGeometry args={[wt + 0.04, doorH, fw]} />
                  <meshStandardMaterial color="#ede8e0" roughness={0.65} />
                </mesh>,
                <mesh key={`frame-t-${wall}-${op.start}`} castShadow position={[wallX, doorH + fw / 2, hingeZ + doorW / 2]}>
                  <boxGeometry args={[wt + 0.04, fw, doorW + fw * 2]} />
                  <meshStandardMaterial color="#ede8e0" roughness={0.65} />
                </mesh>
              );
            }
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

        const baseH = 0.12;
        const crownH = 0.09;
        const trimDep = wt + 0.03;
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
              wallMaterial={room.wallMaterial}
            />
          );
          if (seg.fromY === 0) {
            result.push(
              <mesh key={`base-${wall}-${seg.from}`} castShadow position={[room.x + segMid, baseH / 2, wallZ]}>
                <boxGeometry args={[segLen, baseH, trimDep]} />
                <meshStandardMaterial color="#ede8e0" roughness={0.62} />
              </mesh>
            );
          }
          if (seg.toY >= wh - 0.01) {
            result.push(
              <mesh key={`crown-${wall}-${seg.from}`} castShadow position={[room.x + segMid, wh - crownH / 2, wallZ]}>
                <boxGeometry args={[segLen, crownH, trimDep]} />
                <meshStandardMaterial color="#ede8e0" roughness={0.62} />
              </mesh>
            );
          }
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
              wallMaterial={room.wallMaterial}
            />
          );
          if (seg.fromY === 0) {
            result.push(
              <mesh key={`base-${wall}-${seg.from}`} castShadow position={[wallX, baseH / 2, room.y + segMid]}>
                <boxGeometry args={[trimDep, baseH, segLen]} />
                <meshStandardMaterial color="#ede8e0" roughness={0.62} />
              </mesh>
            );
          }
          if (seg.toY >= wh - 0.01) {
            result.push(
              <mesh key={`crown-${wall}-${seg.from}`} castShadow position={[wallX, wh - crownH / 2, room.y + segMid]}>
                <boxGeometry args={[trimDep, crownH, segLen]} />
                <meshStandardMaterial color="#ede8e0" roughness={0.62} />
              </mesh>
            );
          }
        }
      }
    };

    if (!shouldSkipWall('top'))    makeWall('top',    room.x, room.y,              room.width,  true);
    if (!shouldSkipWall('bottom')) makeWall('bottom', room.x, room.y + room.height, room.width,  true);
    if (!shouldSkipWall('left'))   makeWall('left',   room.x, room.y,              room.height, false);
    if (!shouldSkipWall('right'))  makeWall('right',  room.x + room.width, room.y, room.height, false);

    return result;
  }, [room, roomDoors, roomWindows, wc, allRooms]);

  return <>{walls}</>;
}

function FurnitureShape({ item, selectedId, onSelect }: { item: FurnitureItem; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const isSelected = selectedId === item.id;
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
    case 'stove': {
      shapes.push(<mesh key="body" castShadow receiveShadow position={[0, 0.43, 0]}>
        <boxGeometry args={[item.width, 0.86, item.depth]} />
        <meshStandardMaterial color={item.color} roughness={0.3} metalness={0.4} />
      </mesh>);
      shapes.push(<mesh key="top" position={[0, 0.87, 0]}>
        <boxGeometry args={[item.width, 0.03, item.depth]} />
        <meshStandardMaterial color="#222" roughness={0.1} metalness={0.7} />
      </mesh>);
      // Burners
      [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].forEach(([bx, bz], i) => {
        shapes.push(<mesh key={`b${i}`} position={[bx, 0.9, bz]}>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
          <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
        </mesh>);
      });
      break;
    }
    case 'refrigerator': {
      shapes.push(<mesh key="body" castShadow receiveShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[item.width, 1.8, item.depth]} />
        <meshStandardMaterial color={item.color} roughness={0.2} metalness={0.2} />
      </mesh>);
      shapes.push(<mesh key="handle" position={[item.width * 0.45, 1.2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.3, 8]} />
        <meshStandardMaterial color={metal} metalness={0.9} roughness={0.1} />
      </mesh>);
      break;
    }
    case 'washing-machine': {
      shapes.push(<mesh key="body" castShadow receiveShadow position={[0, 0.43, 0]}>
        <boxGeometry args={[item.width, 0.86, item.depth]} />
        <meshStandardMaterial color={item.color} roughness={0.3} />
      </mesh>);
      shapes.push(<mesh key="drum" position={[0, 0.5, item.depth / 2 - 0.04]}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 20]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#a8d8ea" transparent opacity={0.4} roughness={0.05} />
      </mesh>);
      break;
    }
    case 'office-chair': {
      shapes.push(<mesh key="seat" castShadow receiveShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.08, 16]} />
        <meshStandardMaterial color={item.color} roughness={0.8} />
      </mesh>);
      shapes.push(<mesh key="back" castShadow position={[0, 0.85, -0.24]}>
        <boxGeometry args={[0.48, 0.6, 0.06]} />
        <meshStandardMaterial color={item.color} roughness={0.8} />
      </mesh>);
      shapes.push(<mesh key="pole" position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
        <meshStandardMaterial color={metal} metalness={0.7} />
      </mesh>);
      break;
    }
    case 'nightstand': {
      shapes.push(<mesh key="body" castShadow receiveShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[item.width, 0.7, item.depth]} />
        <meshStandardMaterial color={item.color} roughness={0.6} />
      </mesh>);
      break;
    }
    case 'dresser': {
      shapes.push(<mesh key="body" castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[item.width, 1.0, item.depth]} />
        <meshStandardMaterial color={item.color} roughness={0.5} />
      </mesh>);
      for (let i = 0; i < 3; i++) {
        shapes.push(<mesh key={`handle${i}`} position={[0, 0.2 + i * 0.3, item.depth / 2 + 0.01]}>
          <boxGeometry args={[0.25, 0.03, 0.02]} />
          <meshStandardMaterial color={metal} metalness={0.8} roughness={0.2} />
        </mesh>);
      }
      break;
    }
    case 'rug': {
      shapes.push(<mesh key="rug" receiveShadow position={[0, 0.01, 0]}>
        <boxGeometry args={[item.width, 0.02, item.depth]} />
        <meshStandardMaterial color={item.color} roughness={0.95} />
      </mesh>);
      break;
    }
    case 'staircase': {
      const steps = 10;
      const stepH = 2.4 / steps;
      const stepD = item.depth / steps;
      for (let i = 0; i < steps; i++) {
        shapes.push(<mesh key={`step${i}`} castShadow receiveShadow position={[0, i * stepH + stepH / 2, -item.depth / 2 + i * stepD + stepD / 2]}>
          <boxGeometry args={[item.width, stepH, stepD]} />
          <meshStandardMaterial color={item.color} roughness={0.7} />
        </mesh>);
      }
      // Railing
      shapes.push(<mesh key="rail-l" castShadow position={[-item.width / 2 + 0.04, 1.2, 0]}>
        <boxGeometry args={[0.04, 2.4, item.depth]} />
        <meshStandardMaterial color="#8b6914" roughness={0.5} />
      </mesh>);
      break;
    }
    case 'column': {
      shapes.push(<mesh key="col" castShadow receiveShadow position={[0, 1.3, 0]}>
        <cylinderGeometry args={[item.width / 2, item.width / 2, 2.6, 12]} />
        <meshStandardMaterial color={item.color} roughness={0.3} />
      </mesh>);
      break;
    }
    case 'fireplace': {
      shapes.push(<mesh key="body" castShadow receiveShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[item.width, 1.2, item.depth]} />
        <meshStandardMaterial color={item.color} roughness={0.8} />
      </mesh>);
      // Opening
      shapes.push(<mesh key="opening" position={[0, 0.4, item.depth / 2 + 0.01]}>
        <boxGeometry args={[item.width * 0.65, 0.6, 0.02]} />
        <meshStandardMaterial color="#111" roughness={1} />
      </mesh>);
      // Fire glow
      shapes.push(<mesh key="fire" position={[0, 0.25, item.depth / 2 - 0.02]}>
        <boxGeometry args={[item.width * 0.5, 0.25, 0.02]} />
        <meshStandardMaterial color="#ff6b00" emissive="#ff4400" emissiveIntensity={1.5} roughness={1} />
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
    <group
      position={[cx, 0, cz]}
      rotation={[0, rotation, 0]}
      onClick={(e) => { if (!document.pointerLockElement) { e.stopPropagation(); onSelect(item.id); } }}
      onPointerOver={(e) => { if (!document.pointerLockElement) { e.stopPropagation(); document.body.style.cursor = 'pointer'; } }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {shapes}
      {isSelected && (
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[item.width + 0.1, 1.6, item.depth + 0.1]} />
          <meshBasicMaterial color="#f59e0b" wireframe />
        </mesh>
      )}
    </group>
  );
}

function Ceiling({ plan }: { plan: FloorPlan }) {
  return (
    <>
      {plan.rooms.map(room => (
        <mesh key={room.id}
          position={[room.x + room.width / 2, plan.wallHeight, room.y + room.height / 2]}
          rotation={[Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[room.width, room.height]} />
          <meshStandardMaterial color="#f8f8f5" side={THREE.BackSide} roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

function CeilingLight({ room, wallHeight }: { room: Room; wallHeight: number }) {
  const cx = room.x + room.width / 2;
  const cz = room.y + room.height / 2;
  const cordLen = 0.28;
  const bulbY = wallHeight - cordLen - 0.14;
  return (
    <group position={[cx, 0, cz]}>
      <mesh castShadow position={[0, wallHeight - 0.025, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 12]} />
        <meshStandardMaterial color="#c8c4c0" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, wallHeight - 0.05 - cordLen / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, cordLen, 4]} />
        <meshStandardMaterial color="#555" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, bulbY, 0]}>
        <sphereGeometry args={[0.13, 12, 8]} />
        <meshStandardMaterial color="#fffaf0" emissive="#ffee99" emissiveIntensity={0.7} roughness={0.05} transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, bulbY - 0.12, 0]}>
        <torusGeometry args={[0.08, 0.012, 6, 16]} />
        <meshStandardMaterial color="#c8c4c0" roughness={0.35} metalness={0.4} />
      </mesh>
    </group>
  );
}

function HouseScene({ showLabels, showCeiling, lighting }: { showLabels: boolean; showCeiling: boolean; lighting: LightingPreset }) {
  const { state, dispatch } = useDesigner();
  const { plan } = state;
  const preset = LIGHTING_PRESETS[lighting];
  const select = useCallback((id: string | null) => dispatch({ type: 'SELECT', id }), [dispatch]);

  return (
    <>
      <ambientLight intensity={preset.ambient} />
      {preset.sunIntensity > 0 && (
        <directionalLight
          castShadow
          position={preset.sunPos}
          intensity={preset.sunIntensity}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={100}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
      )}

      {/* Per-room ceiling lights — brighter at night */}
      {plan.rooms.map(room => (
        <pointLight
          key={`light-${room.id}`}
          position={[room.x + room.width / 2, plan.wallHeight - 0.2, room.y + room.height / 2]}
          intensity={lighting === 'night' ? 1.4 : 0.6}
          color="#fff8e7"
          distance={Math.max(room.width, room.height) * 2.5}
          decay={2}
        />
      ))}

      {/* Ground — click to deselect */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[5, -0.005, 5]}
        onClick={() => { if (!document.pointerLockElement) select(null); }}
      >
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={preset.ground} roughness={0.98} />
      </mesh>

      {/* Rooms */}
      {plan.rooms.map(room => (
        <group key={room.id}>
          <RoomFloor room={room} showLabels={showLabels} selectedId={state.selectedId} onSelect={select} />
          <RoomWalls room={room} doors={plan.doors} windows={plan.windows} wallHeight={plan.wallHeight} allRooms={plan.rooms} />
        </group>
      ))}

      {/* Furniture */}
      {plan.furniture.map(item => (
        <FurnitureShape key={item.id} item={item} selectedId={state.selectedId} onSelect={select} />
      ))}

      {/* Ceiling light fixtures */}
      {plan.rooms.map(room => (
        <CeilingLight key={`clf-${room.id}`} room={room} wallHeight={plan.wallHeight} />
      ))}

      {showCeiling && <Ceiling plan={plan} />}

      {/* Empty-state prompt */}
      {plan.rooms.length === 0 && (
        <Text position={[5, 1.2, 5]} rotation={[-Math.PI / 4, 0, 0]} fontSize={0.45} color="#475569" anchorX="center">
          {'Pridėkite kambarius 2D plane\narba pasirinkite šabloną'}
        </Text>
      )}
    </>
  );
}

type CameraMode = 'orbit' | 'top' | 'walk';
type LightingPreset = 'day' | 'sunset' | 'night';

const LIGHTING_PRESETS: Record<LightingPreset, { sunPos: [number, number, number]; ambient: number; sunIntensity: number; skyMie: number; skyRayleigh: number; ground: string; label: string }> = {
  day:    { sunPos: [100, 80, 100], ambient: 0.5, sunIntensity: 1.0, skyMie: 0.005, skyRayleigh: 2,   ground: '#8fa080', label: '☀️ Diena' },
  sunset: { sunPos: [30, 6, -80],   ambient: 0.3, sunIntensity: 1.4, skyMie: 0.02,  skyRayleigh: 4,   ground: '#6b7060', label: '🌅 Saulėlydis' },
  night:  { sunPos: [0, -50, 0],    ambient: 0.08, sunIntensity: 0,  skyMie: 0.01,  skyRayleigh: 0.5, ground: '#2a2f28', label: '🌙 Naktis' },
};

function WalkControls({ enabled, startX, startZ }: { enabled: boolean; startX: number; startZ: number }) {
  const { camera, gl } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});
  const pitchRef = useRef(0);
  const yawRef = useRef(0);
  const lockedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!lockedRef.current) return;
      yawRef.current -= e.movementX * 0.002;
      pitchRef.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitchRef.current - e.movementY * 0.002));
    };
    const onLockChange = () => { lockedRef.current = !!document.pointerLockElement; };
    const onClick = () => { canvas.requestPointerLock(); };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onLockChange);
    canvas.addEventListener('click', onClick);

    camera.position.set(startX, 1.7, startZ + 2);
    camera.lookAt(startX + 2, 1.7, startZ);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onLockChange);
      canvas.removeEventListener('click', onClick);
      if (document.exitPointerLock) document.exitPointerLock();
    };
  }, [enabled, camera, gl, startX, startZ]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const speed = 4 * delta;
    const k = keysRef.current;
    const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
    const dir = new THREE.Vector3();

    if (k['KeyW']) dir.z -= 1;
    if (k['KeyS']) dir.z += 1;
    if (k['KeyA']) dir.x -= 1;
    if (k['KeyD']) dir.x += 1;

    dir.normalize().applyEuler(new THREE.Euler(0, yawRef.current, 0)).multiplyScalar(speed);
    camera.position.add(dir);
    camera.position.y = 1.7;
    camera.setRotationFromEuler(euler);
  });

  return null;
}

export default function Viewer3D() {
  const { state } = useDesigner();
  const allRooms = state.plan.rooms;
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [showLabels, setShowLabels] = useState(true);
  const [showCeiling, setShowCeiling] = useState(true);
  const [lighting, setLighting] = useState<LightingPreset>('day');
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const { center, planDiag } = useMemo(() => {
    if (allRooms.length === 0) return { center: { x: 5, z: 5 }, planDiag: 15 };
    const minX = Math.min(...allRooms.map(r => r.x));
    const maxX = Math.max(...allRooms.map(r => r.x + r.width));
    const minY = Math.min(...allRooms.map(r => r.y));
    const maxY = Math.max(...allRooms.map(r => r.y + r.height));
    const diag = Math.hypot(maxX - minX, maxY - minY);
    return { center: { x: (minX + maxX) / 2, z: (minY + maxY) / 2 }, planDiag: Math.max(10, diag) };
  }, [allRooms]);

  const camDist = planDiag * 0.8;
  const orbitPos: [number, number, number] = [center.x - camDist * 0.6, camDist * 0.7, center.z + camDist * 0.9];
  const topPos: [number, number, number] = [center.x, planDiag * 2.5, center.z];

  const handleScreenshot = useCallback(() => {
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = '3d-view.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  return (
    <div className="w-full h-full relative bg-slate-900" ref={canvasContainerRef}>
      <Canvas
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
      >
        {cameraMode !== 'walk' && (
          <PerspectiveCamera
            makeDefault
            position={cameraMode === 'top' ? topPos : orbitPos}
            fov={cameraMode === 'top' ? 60 : 55}
            near={0.1}
            far={500}
          />
        )}
        {cameraMode === 'walk' && (
          <PerspectiveCamera makeDefault position={[center.x, 1.7, center.z + 3]} fov={75} near={0.05} far={200} />
        )}
        <Sky sunPosition={LIGHTING_PRESETS[lighting].sunPos} mieCoefficient={LIGHTING_PRESETS[lighting].skyMie} rayleigh={LIGHTING_PRESETS[lighting].skyRayleigh} />
        <Suspense fallback={null}>
          <HouseScene showLabels={showLabels} showCeiling={showCeiling} lighting={lighting} />
        </Suspense>
        {cameraMode === 'orbit' && (
          <OrbitControls
            target={[center.x, 1.2, center.z]}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={2}
            maxDistance={60}
            enableDamping
            dampingFactor={0.05}
          />
        )}
        {cameraMode === 'top' && (
          <OrbitControls
            target={[center.x, 0, center.z]}
            maxPolarAngle={0.1}
            minPolarAngle={0}
            minDistance={10}
            maxDistance={80}
            enableDamping
          />
        )}
        {cameraMode === 'walk' && <WalkControls enabled={true} startX={center.x} startZ={center.z} />}
      </Canvas>

      {/* Camera mode controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-slate-900/90 p-1.5 rounded-xl backdrop-blur border border-slate-700">
        {(['orbit', 'top', 'walk'] as CameraMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setCameraMode(mode)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${
              cameraMode === mode
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {mode === 'orbit' ? '🔄 Orbita' : mode === 'top' ? '🗺️ Viršus' : '🚶 Vaikščioti'}
          </button>
        ))}
      </div>

      {/* View options */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5">
        <button
          onClick={handleScreenshot}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 backdrop-blur transition-all"
          title="Išsaugoti ekrano kopiją"
        >
          📷 PNG
        </button>
        <button
          onClick={() => setShowLabels(v => !v)}
          className={`text-xs px-2.5 py-1.5 rounded-lg backdrop-blur border transition-all ${showLabels ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800/90 border-slate-700 text-slate-400 hover:text-white'}`}
        >
          🏷️ Etiketės
        </button>
        <button
          onClick={() => setShowCeiling(v => !v)}
          className={`text-xs px-2.5 py-1.5 rounded-lg backdrop-blur border transition-all ${showCeiling ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800/90 border-slate-700 text-slate-400 hover:text-white'}`}
        >
          🏠 Lubos
        </button>
        <div className="flex flex-col gap-1 bg-slate-800/70 p-1 rounded-lg border border-slate-700/50 backdrop-blur">
          {(Object.keys(LIGHTING_PRESETS) as LightingPreset[]).map(p => (
            <button
              key={p}
              onClick={() => setLighting(p)}
              className={`text-xs px-2 py-1 rounded transition-all ${lighting === p ? 'bg-blue-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              {LIGHTING_PRESETS[p].label}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 bg-slate-800/70 px-2.5 py-1.5 rounded-lg backdrop-blur border border-slate-700/50 text-center">
          {state.plan.rooms.length}k · {state.plan.furniture.length}b
        </div>
      </div>

      {cameraMode === 'walk' && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-xs text-slate-300 bg-slate-900/90 px-4 py-2.5 rounded-xl pointer-events-none backdrop-blur border border-slate-700">
          <div className="text-center mb-1 font-medium">Spustelėkite ekraną, kad užfiksuotumėte pelę</div>
          <div className="text-slate-500">W/A/S/D — judėjimas · Pelė — žiūrėjimas</div>
        </div>
      )}

      {cameraMode === 'orbit' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-400 bg-slate-800/80 px-4 py-2 rounded-full pointer-events-none backdrop-blur">
          Kairė pelė — sukimas · Scroll — priartinimas · Dešinė pelė — judėjimas
        </div>
      )}
    </div>
  );
}
