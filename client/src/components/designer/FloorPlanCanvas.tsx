import { useRef, useEffect, useCallback, useState } from 'react';
import { useDesigner } from '@/lib/designer-store';
import type { Room, Door, WindowElement, FurnitureItem } from '@/types/designer';
import { ROOM_COLORS, FURNITURE_CATALOG } from '@/types/designer';
import { nanoid } from '@/lib/utils';

const BASE_SCALE = 60; // pixels per meter at zoom=1

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
  const [zoom, setZoom] = useState(1.0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [drawing, setDrawing] = useState<{ startX: number; startY: number } | null>(null);
  const [dragging, setDragging] = useState<{ id: string; type: 'room' | 'furniture'; offX: number; offY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; handle: string; origRoom: Room } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);

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

  const scale = BASE_SCALE * zoom;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const worldToCanvas = useCallback((wx: number, wy: number) => ({
    x: wx * scaleRef.current + panOffset.x,
    y: wy * scaleRef.current + panOffset.y,
  }), [panOffset]);

  const canvasToWorld = useCallback((cx: number, cy: number) => ({
    x: (cx - panOffset.x) / scaleRef.current,
    y: (cy - panOffset.y) / scaleRef.current,
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
      const step = state.gridSize * scaleRef.current;
      const startX = panOffset.x % step;
      const startY = panOffset.y % step;
      for (let x = startX; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = startY; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      // Major grid every 1m
      const majorStep = scaleRef.current;
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
      const w = room.width * scaleRef.current;
      const h = room.height * scaleRef.current;
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

      // Selection handles + dimension annotations
      if (isSelected) {
        const handles = [
          { x: x - 4, y: y - 4 }, { x: x + w / 2 - 4, y: y - 4 }, { x: x + w - 4, y: y - 4 },
          { x: x - 4, y: y + h / 2 - 4 }, { x: x + w - 4, y: y + h / 2 - 4 },
          { x: x - 4, y: y + h - 4 }, { x: x + w / 2 - 4, y: y + h - 4 }, { x: x + w - 4, y: y + h - 4 },
        ];
        ctx.fillStyle = '#60a5fa';
        for (const hh of handles) ctx.fillRect(hh.x, hh.y, 8, 8);

        // Dimension lines
        const offset = 18;
        ctx.strokeStyle = '#60a5fa88';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);

        // Top dimension
        ctx.beginPath(); ctx.moveTo(x, y - offset); ctx.lineTo(x + w, y - offset); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x, y - offset - 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w, y - 2); ctx.lineTo(x + w, y - offset - 2); ctx.stroke();

        // Left dimension
        ctx.beginPath(); ctx.moveTo(x - offset, y); ctx.lineTo(x - offset, y + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x - offset - 2, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 2, y + h); ctx.lineTo(x - offset - 2, y + h); ctx.stroke();

        ctx.setLineDash([]);

        // Dimension labels
        ctx.fillStyle = '#93c5fd';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${room.width.toFixed(2)}m`, x + w / 2, y - offset);

        ctx.save();
        ctx.translate(x - offset, y + h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${room.height.toFixed(2)}m`, 0, 0);
        ctx.restore();
      }
    }

    // Draw doors
    for (const door of plan.doors) {
      const room = plan.rooms.find(r => r.id === door.roomId);
      if (!room) continue;
      const { x: rx, y: ry } = worldToCanvas(room.x, room.y);
      const rw = room.width * scaleRef.current;
      const rh = room.height * scaleRef.current;
      const doorW = door.width * scaleRef.current;
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
      const rw = room.width * scaleRef.current;
      const rh = room.height * scaleRef.current;
      const winW = win.width * scaleRef.current;
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
      const fw = item.width * scaleRef.current;
      const fd = item.depth * scaleRef.current;
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

    // Drawing preview is handled in mousemove (live update)

    // Scale indicator
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(12, canvas.height - 35, 82, 24);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`1m = ${scaleRef.current}px`, 20, canvas.height - 23);

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
      let sx = snapTo(world.x - dragging.offX, state.gridSize, state.snapToGrid);
      let sy = snapTo(world.y - dragging.offY, state.gridSize, state.snapToGrid);

      if (dragging.type === 'room') {
        const room = state.plan.rooms.find(r => r.id === dragging.id);
        if (room) {
          // Room-to-room edge snapping
          const SNAP_DIST = 0.35;
          const others = state.plan.rooms.filter(r => r.id !== dragging.id);
          let bestX = SNAP_DIST, bestY = SNAP_DIST;

          for (const o of others) {
            const edges = [
              { snap: o.x - room.width, dist: Math.abs(sx + room.width - o.x) },
              { snap: o.x + o.width, dist: Math.abs(sx - (o.x + o.width)) },
              { snap: o.x, dist: Math.abs(sx - o.x) },
              { snap: o.x + o.width - room.width, dist: Math.abs(sx + room.width - (o.x + o.width)) },
            ];
            for (const e of edges) {
              if (e.dist < bestX) { bestX = e.dist; sx = e.snap; }
            }
            const yEdges = [
              { snap: o.y - room.height, dist: Math.abs(sy + room.height - o.y) },
              { snap: o.y + o.height, dist: Math.abs(sy - (o.y + o.height)) },
              { snap: o.y, dist: Math.abs(sy - o.y) },
              { snap: o.y + o.height - room.height, dist: Math.abs(sy + room.height - (o.y + o.height)) },
            ];
            for (const e of yEdges) {
              if (e.dist < bestY) { bestY = e.dist; sy = e.snap; }
            }
          }
          dispatch({ type: 'UPDATE_ROOM', room: { ...room, x: sx, y: sy } });
        }
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
      const cw = Math.abs(ex - sw.x) * scaleRef.current;
      const ch = Math.abs(ey - sw.y) * scaleRef.current;

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
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoom(prevZoom => {
      const newZoom = Math.max(0.2, Math.min(5, prevZoom * factor));
      const scaleFactor = newZoom / prevZoom;
      setPanOffset(prev => ({
        x: mouseX - (mouseX - prev.x) * scaleFactor,
        y: mouseY - (mouseY - prev.y) * scaleFactor,
      }));
      return newZoom;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Touch events for mobile pinch-to-zoom and pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        pinchRef.current = { dist, midX, midY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.hypot(dx, dy);
        const factor = newDist / pinchRef.current.dist;
        const rect = canvas.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        setZoom(prevZoom => {
          const newZoom = Math.max(0.2, Math.min(5, prevZoom * factor));
          const sf = newZoom / prevZoom;
          setPanOffset(prev => ({
            x: midX - (midX - prev.x) * sf,
            y: midY - (midY - prev.y) * sf,
          }));
          return newZoom;
        });
        pinchRef.current = { dist: newDist, midX, midY };
      }
    };

    const onTouchEnd = () => { pinchRef.current = null; };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

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
      {/* PNG Export */}
      <button
        onClick={() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const link = document.createElement('a');
          link.download = 'floor-plan.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        }}
        className="absolute top-3 right-3 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 backdrop-blur transition-all"
        title="Eksportuoti kaip PNG"
      >
        📷 PNG
      </button>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => setZoom(z => Math.min(5, z * 1.25))}
          className="w-8 h-8 bg-slate-800/90 border border-slate-700 text-white rounded-lg flex items-center justify-center hover:bg-slate-700 text-sm font-bold backdrop-blur transition-all"
        >+</button>
        <div className="w-8 h-7 bg-slate-900/80 border border-slate-700 text-slate-400 rounded-lg flex items-center justify-center text-center backdrop-blur" style={{ fontSize: '9px' }}>
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={() => setZoom(z => Math.max(0.2, z / 1.25))}
          className="w-8 h-8 bg-slate-800/90 border border-slate-700 text-white rounded-lg flex items-center justify-center hover:bg-slate-700 text-sm font-bold backdrop-blur transition-all"
        >−</button>
        <button
          onClick={() => { setZoom(1); setPanOffset({ x: 40, y: 40 }); }}
          className="w-8 h-8 bg-slate-800/90 border border-slate-700 text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-700 backdrop-blur transition-all"
          title="Atstatyti vaizdą"
        >⊙</button>
      </div>
      {/* Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full pointer-events-none">
        {state.tool === 'room' && 'Spustelėkite ir vilkite, kad sukurtumėte kambarį'}
        {state.tool === 'door' && 'Spustelėkite ant sienos, kad pridėtumėte duris'}
        {state.tool === 'window' && 'Spustelėkite ant sienos, kad pridėtumėte langą'}
        {state.tool === 'select' && 'Spustelėkite pasirinkti · Vilkite judinti · Scroll priartinti'}
        {state.tool === 'delete' && 'Spustelėkite elementą, kad ištrintumėte'}
        {state.tool === 'furniture' && (state.pendingFurnitureType ? 'Spustelėkite, kad padėtumėte baldą' : 'Pasirinkite baldą kairėje')}
      </div>
    </div>
  );
}
