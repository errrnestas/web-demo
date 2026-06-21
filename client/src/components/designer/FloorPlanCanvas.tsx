import { useRef, useEffect, useCallback, useState } from 'react';
import { useDesigner } from '@/lib/designer-store';
import type { Room, Door, WindowElement, FurnitureItem } from '@/types/designer';
import { ROOM_COLORS, FURNITURE_CATALOG } from '@/types/designer';
import { nanoid } from '@/lib/utils';

const SCALE = 60; // pixels per meter

function snapTo(value: number, grid: number, snap: boolean): number {
  if (!snap) return value;
  return Math.round(value / grid) * grid;
}

function getPointerPos(canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent) {
  const rect = canvas.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left),
    y: (clientY - rect.top),
  };
}

export default function FloorPlanCanvas() {
  const { state, dispatch } = useDesigner();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [panOffset, setPanOffset] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [drawing, setDrawing] = useState<{ startX: number; startY: number } | null>(null);
  const [dragging, setDragging] = useState<{ id: string; type: 'room' | 'furniture'; offX: number; offY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; handle: string; origRoom: Room } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);

  useEffect(() => {
    function resize() {
      if (containerRef.current) {
        setCanvasSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
      }
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const worldToCanvas = useCallback((wx: number, wy: number) => ({
    x: wx * SCALE + panOffset.x,
    y: wy * SCALE + panOffset.y,
  }), [panOffset]);

  const canvasToWorld = useCallback((cx: number, cy: number) => ({
    x: (cx - panOffset.x) / SCALE,
    y: (cy - panOffset.y) / SCALE,
  }), [panOffset]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    if (state.showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      const step = state.gridSize * SCALE;
      const startX = panOffset.x % step;
      const startY = panOffset.y % step;
      for (let x = startX; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = startY; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      // Major grid every 1m
      const majorStep = SCALE;
      const mStartX = panOffset.x % majorStep;
      const mStartY = panOffset.y % majorStep;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      for (let x = mStartX; x < canvas.width; x += majorStep) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = mStartY; y < canvas.height; y += majorStep) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    }

    const { plan, selectedId } = state;

    // Draw rooms
    for (const room of plan.rooms) {
      const { x, y } = worldToCanvas(room.x, room.y);
      const w = room.width * SCALE;
      const h = room.height * SCALE;
      const isSelected = room.id === selectedId;

      // Floor fill
      ctx.fillStyle = ROOM_COLORS[room.type] + 'cc';
      ctx.fillRect(x, y, w, h);

      // Walls (thick border)
      ctx.strokeStyle = isSelected ? '#60a5fa' : '#334155';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(x, y, w, h);

      // Room label
      ctx.font = `bold ${Math.max(10, Math.min(14, w / 8))}px Inter, sans-serif`;
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = room.name;
      ctx.fillText(label, x + w / 2, y + h / 2 - 8);
      ctx.font = `${Math.max(9, Math.min(11, w / 10))}px Inter, sans-serif`;
      ctx.fillStyle = '#475569';
      ctx.fillText(`${room.width}m × ${room.height}m`, x + w / 2, y + h / 2 + 8);

      // Selection handles
      if (isSelected) {
        const handles = [
          { x: x - 4, y: y - 4 }, { x: x + w / 2 - 4, y: y - 4 }, { x: x + w - 4, y: y - 4 },
          { x: x - 4, y: y + h / 2 - 4 }, { x: x + w - 4, y: y + h / 2 - 4 },
          { x: x - 4, y: y + h - 4 }, { x: x + w / 2 - 4, y: y + h - 4 }, { x: x + w - 4, y: y + h - 4 },
        ];
        ctx.fillStyle = '#60a5fa';
        for (const h of handles) {
          ctx.fillRect(h.x, h.y, 8, 8);
        }
      }
    }

    // Draw doors
    for (const door of plan.doors) {
      const room = plan.rooms.find(r => r.id === door.roomId);
      if (!room) continue;
      const { x: rx, y: ry } = worldToCanvas(room.x, room.y);
      const rw = room.width * SCALE;
      const rh = room.height * SCALE;
      const doorW = door.width * SCALE;
      const isSelected = door.id === selectedId;

      ctx.strokeStyle = isSelected ? '#f59e0b' : '#64748b';
      ctx.lineWidth = isSelected ? 2.5 : 2;
      ctx.fillStyle = '#1a1a2e';

      let dx = 0, dy = 0;
      switch (door.wall) {
        case 'top':
          dx = rx + (rw - doorW) * door.position + doorW / 2;
          dy = ry;
          ctx.fillRect(dx - doorW / 2, dy - 3, doorW, 6);
          ctx.strokeStyle = isSelected ? '#f59e0b' : '#94a3b8';
          ctx.beginPath();
          ctx.moveTo(dx - doorW / 2, dy);
          ctx.arc(dx - doorW / 2, dy, doorW, 0, Math.PI / 2);
          ctx.stroke();
          break;
        case 'bottom':
          dx = rx + (rw - doorW) * door.position + doorW / 2;
          dy = ry + rh;
          ctx.fillRect(dx - doorW / 2, dy - 3, doorW, 6);
          ctx.strokeStyle = isSelected ? '#f59e0b' : '#94a3b8';
          ctx.beginPath();
          ctx.moveTo(dx - doorW / 2, dy);
          ctx.arc(dx - doorW / 2, dy, doorW, 0, -Math.PI / 2, true);
          ctx.stroke();
          break;
        case 'left':
          dx = rx;
          dy = ry + (rh - doorW) * door.position + doorW / 2;
          ctx.fillRect(dx - 3, dy - doorW / 2, 6, doorW);
          ctx.strokeStyle = isSelected ? '#f59e0b' : '#94a3b8';
          ctx.beginPath();
          ctx.moveTo(dx, dy - doorW / 2);
          ctx.arc(dx, dy - doorW / 2, doorW, Math.PI / 2, Math.PI);
          ctx.stroke();
          break;
        case 'right':
          dx = rx + rw;
          dy = ry + (rh - doorW) * door.position + doorW / 2;
          ctx.fillRect(dx - 3, dy - doorW / 2, 6, doorW);
          ctx.strokeStyle = isSelected ? '#f59e0b' : '#94a3b8';
          ctx.beginPath();
          ctx.moveTo(dx, dy - doorW / 2);
          ctx.arc(dx, dy - doorW / 2, doorW, 0, Math.PI / 2);
          ctx.stroke();
          break;
      }
    }

    // Draw windows
    for (const win of plan.windows) {
      const room = plan.rooms.find(r => r.id === win.roomId);
      if (!room) continue;
      const { x: rx, y: ry } = worldToCanvas(room.x, room.y);
      const rw = room.width * SCALE;
      const rh = room.height * SCALE;
      const winW = win.width * SCALE;
      const isSelected = win.id === selectedId;

      ctx.fillStyle = isSelected ? '#bae6fd' : '#7dd3fc';

      switch (win.wall) {
        case 'top':
          ctx.fillRect(rx + rw * win.position - winW / 2, ry - 4, winW, 8);
          break;
        case 'bottom':
          ctx.fillRect(rx + rw * win.position - winW / 2, ry + rh - 4, winW, 8);
          break;
        case 'left':
          ctx.fillRect(rx - 4, ry + rh * win.position - winW / 2, 8, winW);
          break;
        case 'right':
          ctx.fillRect(rx + rw - 4, ry + rh * win.position - winW / 2, 8, winW);
          break;
      }
    }

    // Draw furniture
    for (const item of plan.furniture) {
      const { x, y } = worldToCanvas(item.x, item.y);
      const fw = item.width * SCALE;
      const fd = item.depth * SCALE;
      const isSelected = item.id === selectedId;

      ctx.save();
      ctx.translate(x + fw / 2, y + fd / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);

      ctx.fillStyle = item.color + '99';
      ctx.strokeStyle = isSelected ? '#f59e0b' : '#475569';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.fillRect(-fw / 2, -fd / 2, fw, fd);
      ctx.strokeRect(-fw / 2, -fd / 2, fw, fd);

      ctx.font = `${Math.max(8, Math.min(10, fw / 7))}px Inter, sans-serif`;
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.name, 0, 0);

      ctx.restore();
    }

    // Draw in-progress room
    if (drawing && state.tool === 'room') {
      const x = Math.min(drawing.startX, drawing.startX);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(drawing.startX, drawing.startY, 0, 0);
      ctx.setLineDash([]);
    }

    // Scale indicator
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(12, canvas.height - 35, 82, 24);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`1m = ${SCALE}px`, 20, canvas.height - 23);

  }, [state, panOffset, drawing, worldToCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, canvasSize]);

  // Live drawing on mouse move
  const liveDrawRef = useRef<{startWorld: {x: number, y: number}} | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPointerPos(canvas, e);
    const world = canvasToWorld(pos.x, pos.y);

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (state.tool === 'select') {
      // Check furniture first (on top)
      const furniture = [...state.plan.furniture].reverse().find(f => {
        const rad = (f.rotation * Math.PI) / 180;
        const dx = world.x - (f.x + f.width / 2);
        const dy = world.y - (f.y + f.depth / 2);
        const lx = dx * Math.cos(-rad) - dy * Math.sin(-rad);
        const ly = dx * Math.sin(-rad) + dy * Math.cos(-rad);
        return Math.abs(lx) <= f.width / 2 && Math.abs(ly) <= f.depth / 2;
      });
      if (furniture) {
        dispatch({ type: 'SELECT', id: furniture.id });
        setDragging({ id: furniture.id, type: 'furniture', offX: world.x - furniture.x, offY: world.y - furniture.y });
        return;
      }

      // Check rooms
      const room = [...state.plan.rooms].reverse().find(r =>
        world.x >= r.x && world.x <= r.x + r.width && world.y >= r.y && world.y <= r.y + r.height
      );
      if (room) {
        dispatch({ type: 'SELECT', id: room.id });
        setDragging({ id: room.id, type: 'room', offX: world.x - room.x, offY: world.y - room.y });
        return;
      }

      // Check doors/windows
      const door = state.plan.doors.find(d => {
        const r = state.plan.rooms.find(r => r.id === d.roomId);
        if (!r) return false;
        const dw = d.width;
        switch (d.wall) {
          case 'top': return Math.abs(world.y - r.y) < 0.3 && world.x >= r.x + (r.width - dw) * d.position - 0.1 && world.x <= r.x + (r.width - dw) * d.position + dw + 0.1;
          case 'bottom': return Math.abs(world.y - (r.y + r.height)) < 0.3 && world.x >= r.x + (r.width - dw) * d.position - 0.1 && world.x <= r.x + (r.width - dw) * d.position + dw + 0.1;
          case 'left': return Math.abs(world.x - r.x) < 0.3 && world.y >= r.y + (r.height - dw) * d.position - 0.1 && world.y <= r.y + (r.height - dw) * d.position + dw + 0.1;
          case 'right': return Math.abs(world.x - (r.x + r.width)) < 0.3 && world.y >= r.y + (r.height - dw) * d.position - 0.1 && world.y <= r.y + (r.height - dw) * d.position + dw + 0.1;
        }
        return false;
      });
      if (door) { dispatch({ type: 'SELECT', id: door.id }); return; }

      dispatch({ type: 'SELECT', id: null });

    } else if (state.tool === 'room') {
      const sx = snapTo(world.x, state.gridSize, state.snapToGrid);
      const sy = snapTo(world.y, state.gridSize, state.snapToGrid);
      liveDrawRef.current = { startWorld: { x: sx, y: sy } };
      setDrawing({ startX: pos.x, startY: pos.y });

    } else if (state.tool === 'door') {
      const room = state.plan.rooms.find(r =>
        world.x >= r.x - 0.3 && world.x <= r.x + r.width + 0.3 && world.y >= r.y - 0.3 && world.y <= r.y + r.height + 0.3
      );
      if (room) {
        const distTop = Math.abs(world.y - room.y);
        const distBottom = Math.abs(world.y - (room.y + room.height));
        const distLeft = Math.abs(world.x - room.x);
        const distRight = Math.abs(world.x - (room.x + room.width));
        const minDist = Math.min(distTop, distBottom, distLeft, distRight);
        let wall: Door['wall'] = 'top';
        let position = 0.5;
        if (minDist === distTop) { wall = 'top'; position = Math.max(0.05, Math.min(0.9, (world.x - room.x) / room.width - 0.05)); }
        else if (minDist === distBottom) { wall = 'bottom'; position = Math.max(0.05, Math.min(0.9, (world.x - room.x) / room.width - 0.05)); }
        else if (minDist === distLeft) { wall = 'left'; position = Math.max(0.05, Math.min(0.9, (world.y - room.y) / room.height - 0.05)); }
        else { wall = 'right'; position = Math.max(0.05, Math.min(0.9, (world.y - room.y) / room.height - 0.05)); }

        dispatch({
          type: 'ADD_DOOR',
          door: { id: `d${nanoid()}`, roomId: room.id, wall, position, width: 0.9, swingIn: true },
        });
      }

    } else if (state.tool === 'window') {
      const room = state.plan.rooms.find(r =>
        world.x >= r.x - 0.3 && world.x <= r.x + r.width + 0.3 && world.y >= r.y - 0.3 && world.y <= r.y + r.height + 0.3
      );
      if (room) {
        const distTop = Math.abs(world.y - room.y);
        const distBottom = Math.abs(world.y - (room.y + room.height));
        const distLeft = Math.abs(world.x - room.x);
        const distRight = Math.abs(world.x - (room.x + room.width));
        const minDist = Math.min(distTop, distBottom, distLeft, distRight);
        let wall: WindowElement['wall'] = 'top';
        let position = 0.5;
        if (minDist === distTop) { wall = 'top'; position = Math.max(0.1, Math.min(0.85, (world.x - room.x) / room.width)); }
        else if (minDist === distBottom) { wall = 'bottom'; position = Math.max(0.1, Math.min(0.85, (world.x - room.x) / room.width)); }
        else if (minDist === distLeft) { wall = 'left'; position = Math.max(0.1, Math.min(0.85, (world.y - room.y) / room.height)); }
        else { wall = 'right'; position = Math.max(0.1, Math.min(0.85, (world.y - room.y) / room.height)); }

        dispatch({
          type: 'ADD_WINDOW',
          win: { id: `w${nanoid()}`, roomId: room.id, wall, position, width: 1.2, height: 1.2, sillHeight: 0.9 },
        });
      }

    } else if (state.tool === 'furniture' && state.pendingFurnitureType) {
      const catalog = FURNITURE_CATALOG.find(f => f.type === state.pendingFurnitureType);
      if (catalog) {
        const sx = snapTo(world.x - catalog.width / 2, state.gridSize, state.snapToGrid);
        const sy = snapTo(world.y - catalog.depth / 2, state.gridSize, state.snapToGrid);
        dispatch({
          type: 'ADD_FURNITURE',
          item: {
            id: `f${nanoid()}`,
            type: catalog.type,
            name: catalog.name,
            x: sx, y: sy,
            rotation: 0,
            width: catalog.width,
            depth: catalog.depth,
            color: catalog.color,
          },
        });
      }

    } else if (state.tool === 'delete') {
      const furniture = state.plan.furniture.find(f =>
        world.x >= f.x && world.x <= f.x + f.width && world.y >= f.y && world.y <= f.y + f.depth
      );
      if (furniture) { dispatch({ type: 'DELETE_FURNITURE', id: furniture.id }); return; }
      const room = state.plan.rooms.find(r =>
        world.x >= r.x && world.x <= r.x + r.width && world.y >= r.y && world.y <= r.y + r.height
      );
      if (room) { dispatch({ type: 'DELETE_ROOM', id: room.id }); return; }
    }
  }, [state, dispatch, canvasToWorld, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const pos = getPointerPos(canvas, e);
    const world = canvasToWorld(pos.x, pos.y);

    if (dragging) {
      const sx = snapTo(world.x - dragging.offX, state.gridSize, state.snapToGrid);
      const sy = snapTo(world.y - dragging.offY, state.gridSize, state.snapToGrid);
      if (dragging.type === 'room') {
        const room = state.plan.rooms.find(r => r.id === dragging.id);
        if (room) dispatch({ type: 'UPDATE_ROOM', room: { ...room, x: sx, y: sy } });
      } else {
        const item = state.plan.furniture.find(f => f.id === dragging.id);
        if (item) dispatch({ type: 'UPDATE_FURNITURE', item: { ...item, x: sx, y: sy } });
      }
    }

    if (drawing && liveDrawRef.current && state.tool === 'room') {
      const sw = liveDrawRef.current.startWorld;
      const ex = snapTo(world.x, state.gridSize, state.snapToGrid);
      const ey = snapTo(world.y, state.gridSize, state.snapToGrid);
      const { x: cx, y: cy } = worldToCanvas(Math.min(sw.x, ex), Math.min(sw.y, ey));
      const cw = Math.abs(ex - sw.x) * SCALE;
      const ch = Math.abs(ey - sw.y) * SCALE;

      // Live draw preview
      drawCanvas();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(cx, cy, cw, ch);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(96,165,250,0.1)';
        ctx.fillRect(cx, cy, cw, ch);
        ctx.fillStyle = '#60a5fa';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.abs(ex - sw.x).toFixed(1)}m × ${Math.abs(ey - sw.y).toFixed(1)}m`, cx + cw / 2, cy + ch / 2);
      }
    }
  }, [isPanning, panStart, dragging, drawing, state, dispatch, canvasToWorld, worldToCanvas, drawCanvas]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) { setIsPanning(false); return; }
    setDragging(null);

    if (drawing && liveDrawRef.current && state.tool === 'room') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pos = getPointerPos(canvas, e);
      const world = canvasToWorld(pos.x, pos.y);
      const sw = liveDrawRef.current.startWorld;
      const ex = snapTo(world.x, state.gridSize, state.snapToGrid);
      const ey = snapTo(world.y, state.gridSize, state.snapToGrid);
      const rw = Math.abs(ex - sw.x);
      const rh = Math.abs(ey - sw.y);

      if (rw >= 0.5 && rh >= 0.5) {
        const types: Room['type'][] = ['living', 'bedroom', 'kitchen', 'bathroom', 'dining', 'office', 'hallway', 'other'];
        const type = types[state.plan.rooms.length % types.length];
        dispatch({
          type: 'ADD_ROOM',
          room: {
            id: `r${nanoid()}`,
            name: `Kambarys ${state.plan.rooms.length + 1}`,
            type,
            x: Math.min(sw.x, ex),
            y: Math.min(sw.y, ey),
            width: rw,
            height: rh,
            floorMaterial: 'wood',
            wallMaterial: 'white',
            wallColor: '#f8f8f8',
            floorColor: '#c8a26b',
          },
        });
      }
      setDrawing(null);
      liveDrawRef.current = null;
    }
  }, [isPanning, drawing, state, dispatch, canvasToWorld]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // Zoom toward mouse
    setPanOffset(prev => ({
      x: mouseX - (mouseX - prev.x) * factor,
      y: mouseY - (mouseY - prev.y) * factor,
    }));
    // Note: for real zoom we'd need a separate zoom state, but this approximates
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (dragging) return 'move';
    switch (state.tool) {
      case 'room': return 'crosshair';
      case 'door': return 'cell';
      case 'window': return 'cell';
      case 'furniture': return state.pendingFurnitureType ? 'copy' : 'default';
      case 'delete': return 'not-allowed';
      default: return 'default';
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-900 select-none">
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        style={{ cursor: getCursor(), touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setDragging(null); setIsPanning(false); }}
      />
      {/* Hint */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full pointer-events-none">
        {state.tool === 'room' && 'Spustelėkite ir vilkite, kad sukurtumėte kambarį'}
        {state.tool === 'door' && 'Spustelėkite ant sienos, kad pridėtumėte dureles'}
        {state.tool === 'window' && 'Spustelėkite ant sienos, kad pridėtumėte langą'}
        {state.tool === 'select' && 'Spustelėkite elementą, kad jį pasirinktumėte. Vilkite, kad pajudintumėte'}
        {state.tool === 'delete' && 'Spustelėkite elementą, kad ištrintumėte'}
        {state.tool === 'furniture' && (state.pendingFurnitureType ? 'Spustelėkite, kad padėtumėte baldą' : 'Pasirinkite baldą dešinėje')}
      </div>
    </div>
  );
}
