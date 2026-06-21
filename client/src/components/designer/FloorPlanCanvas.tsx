import { useRef, useEffect, useCallback, useState } from 'react';
import { useDesigner } from '@/lib/designer-store';
import type { Room, Door, WindowElement, FurnitureItem, FloorPlan } from '@/types/designer';
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

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c] ?? c));
}

function exportPlanToSVG(plan: FloorPlan): void {
  if (plan.rooms.length === 0) return;
  const S = 80, M = 52, WW = 7, EPSILON = 0.06;
  const minX = Math.min(...plan.rooms.map(r => r.x));
  const maxX = Math.max(...plan.rooms.map(r => r.x + r.width));
  const minY = Math.min(...plan.rooms.map(r => r.y));
  const maxY = Math.max(...plan.rooms.map(r => r.y + r.height));
  const planW = (maxX - minX) * S, planH = (maxY - minY) * S;
  const svgW = planW + M * 2, svgH = planH + M * 2 + 44;
  const tx = (x: number) => (x - minX) * S + M;
  const ty = (y: number) => (y - minY) * S + M;
  const skip = (room: Room, side: 'top'|'right'|'bottom'|'left'): boolean => {
    for (const o of plan.rooms) {
      if (o.id >= room.id) continue;
      let sh = false;
      if (side === 'top') sh = Math.abs(o.y + o.height - room.y) < EPSILON && o.x < room.x + room.width - EPSILON && o.x + o.width > room.x + EPSILON;
      else if (side === 'bottom') sh = Math.abs(o.y - (room.y + room.height)) < EPSILON && o.x < room.x + room.width - EPSILON && o.x + o.width > room.x + EPSILON;
      else if (side === 'left') sh = Math.abs(o.x + o.width - room.x) < EPSILON && o.y < room.y + room.height - EPSILON && o.y + o.height > room.y + EPSILON;
      else sh = Math.abs(o.x - (room.x + room.width)) < EPSILON && o.y < room.y + room.height - EPSILON && o.y + o.height > room.y + EPSILON;
      if (sh) return true;
    }
    return false;
  };
  const pts = (r: Room, s: string): [number,number,number,number] => {
    const x=tx(r.x),y=ty(r.y),w=r.width*S,h=r.height*S;
    const m: Record<string,[number,number,number,number]> = {top:[x,y,x+w,y],right:[x+w,y,x+w,y+h],bottom:[x,y+h,x+w,y+h],left:[x,y,x,y+h]};
    return m[s];
  };
  const p: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`,
    `<rect width="${svgW}" height="${svgH}" fill="white"/>`,
    ...plan.rooms.map(r => `<rect x="${tx(r.x)}" y="${ty(r.y)}" width="${r.width*S}" height="${r.height*S}" fill="${(r.floorColor||ROOM_COLORS[r.type])}44" stroke="none"/>`),
    ...plan.rooms.flatMap(r => (['top','right','bottom','left'] as const).filter(s => !skip(r,s)).map(s => { const [x1,y1,x2,y2]=pts(r,s); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1e293b" stroke-width="${WW}" stroke-linecap="square"/>`; })),
    ...plan.doors.flatMap(d => {
      const r = plan.rooms.find(ro => ro.id === d.roomId); if (!r) return [];
      const rx=tx(r.x),ry=ty(r.y),rw=r.width*S,rh=r.height*S,dw=d.width*S;
      switch(d.wall) {
        case 'top': { const gx=rx+(rw-dw)*d.position; return [`<line x1="${gx}" y1="${ry}" x2="${gx+dw}" y2="${ry}" stroke="white" stroke-width="${WW+2}"/>`,`<path d="M ${gx} ${ry} L ${gx+dw} ${ry} A ${dw} ${dw} 0 0 0 ${gx} ${ry+dw}" fill="none" stroke="#64748b" stroke-width="1.2" stroke-dasharray="4,2"/>`]; }
        case 'bottom': { const gx=rx+(rw-dw)*d.position,gy=ry+rh; return [`<line x1="${gx}" y1="${gy}" x2="${gx+dw}" y2="${gy}" stroke="white" stroke-width="${WW+2}"/>`,`<path d="M ${gx} ${gy} L ${gx+dw} ${gy} A ${dw} ${dw} 0 0 1 ${gx} ${gy-dw}" fill="none" stroke="#64748b" stroke-width="1.2" stroke-dasharray="4,2"/>`]; }
        case 'left': { const gy=ry+(rh-dw)*d.position; return [`<line x1="${rx}" y1="${gy}" x2="${rx}" y2="${gy+dw}" stroke="white" stroke-width="${WW+2}"/>`,`<path d="M ${rx} ${gy} L ${rx} ${gy+dw} A ${dw} ${dw} 0 0 1 ${rx+dw} ${gy}" fill="none" stroke="#64748b" stroke-width="1.2" stroke-dasharray="4,2"/>`]; }
        case 'right': { const gx=rx+rw,gy=ry+(rh-dw)*d.position; return [`<line x1="${gx}" y1="${gy}" x2="${gx}" y2="${gy+dw}" stroke="white" stroke-width="${WW+2}"/>`,`<path d="M ${gx} ${gy} L ${gx} ${gy+dw} A ${dw} ${dw} 0 0 0 ${gx-dw} ${gy}" fill="none" stroke="#64748b" stroke-width="1.2" stroke-dasharray="4,2"/>`]; }
        default: return [];
      }
    }),
    ...plan.windows.flatMap(w => {
      const r = plan.rooms.find(ro => ro.id === w.roomId); if (!r) return [];
      const rx=tx(r.x),ry=ty(r.y),rw=r.width*S,rh=r.height*S,ww=w.width*S,wt=8;
      const gl = (x:number,y:number,wid:number,hgt:number,vert:boolean) => [
        `<rect x="${x}" y="${y}" width="${wid}" height="${hgt}" fill="white"/>`,
        `<rect x="${x}" y="${y}" width="${wid}" height="${hgt}" fill="#bae6fd" fill-opacity="0.7" stroke="#38bdf8" stroke-width="1.5"/>`,
        vert ? `<line x1="${x}" y1="${y+hgt/2}" x2="${x+wid}" y2="${y+hgt/2}" stroke="#38bdf8" stroke-width="1"/>` : `<line x1="${x+wid/2}" y1="${y}" x2="${x+wid/2}" y2="${y+hgt}" stroke="#38bdf8" stroke-width="1"/>`,
      ];
      switch(w.wall) {
        case 'top': return gl(rx+rw*w.position-ww/2,ry-wt/2,ww,wt,false);
        case 'bottom': return gl(rx+rw*w.position-ww/2,ry+rh-wt/2,ww,wt,false);
        case 'left': return gl(rx-wt/2,ry+rh*w.position-ww/2,wt,ww,true);
        case 'right': return gl(rx+rw-wt/2,ry+rh*w.position-ww/2,wt,ww,true);
        default: return [];
      }
    }),
    ...plan.furniture.flatMap(f => {
      const fx=tx(f.x),fy=ty(f.y),fw=f.width*S,fd=f.depth*S,cx2=fx+fw/2,cy2=fy+fd/2;
      return [`<g transform="translate(${cx2},${cy2}) rotate(${f.rotation})">`,`<rect x="${-fw/2}" y="${-fd/2}" width="${fw}" height="${fd}" fill="${f.color}55" stroke="#374151" stroke-width="1"/>`,(fw>30&&fd>20)?`<text x="0" y="${fd/2-3}" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#1e293b">${escapeXml(f.name)}</text>`:'','</g>'].filter(Boolean);
    }),
    ...plan.rooms.flatMap(r => {
      const cx2=tx(r.x)+r.width*S/2,cy2=ty(r.y)+r.height*S/2;
      return [`<text x="${cx2}" y="${cy2-5}" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="bold" fill="#0f172a">${escapeXml(r.name)}</text>`,`<text x="${cx2}" y="${cy2+9}" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="#475569">${(r.width*r.height).toFixed(1)} m²</text>`];
    }),
    `<line x1="${M}" y1="${M-20}" x2="${M+planW}" y2="${M-20}" stroke="#94a3b8" stroke-width="0.8"/>`,
    `<line x1="${M}" y1="${M-24}" x2="${M}" y2="${M-16}" stroke="#94a3b8" stroke-width="0.8"/>`,
    `<line x1="${M+planW}" y1="${M-24}" x2="${M+planW}" y2="${M-16}" stroke="#94a3b8" stroke-width="0.8"/>`,
    `<text x="${M+planW/2}" y="${M-25}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#475569">${(maxX-minX).toFixed(1)} m</text>`,
    `<line x1="${M-20}" y1="${M}" x2="${M-20}" y2="${M+planH}" stroke="#94a3b8" stroke-width="0.8"/>`,
    `<line x1="${M-24}" y1="${M}" x2="${M-16}" y2="${M}" stroke="#94a3b8" stroke-width="0.8"/>`,
    `<line x1="${M-24}" y1="${M+planH}" x2="${M-16}" y2="${M+planH}" stroke="#94a3b8" stroke-width="0.8"/>`,
    `<text x="${M-26}" y="${M+planH/2}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#475569" transform="rotate(-90,${M-26},${M+planH/2})">${(maxY-minY).toFixed(1)} m</text>`,
    `<line x1="${M}" y1="${M+planH+8}" x2="${svgW-M}" y2="${M+planH+8}" stroke="#e2e8f0" stroke-width="1"/>`,
    `<text x="${M}" y="${M+planH+24}" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="#0f172a">${escapeXml(plan.name)}</text>`,
    `<text x="${svgW-M}" y="${M+planH+24}" text-anchor="end" font-family="Arial,sans-serif" font-size="9" fill="#64748b">${new Date().toLocaleDateString('lt-LT')} · Plotas: ${plan.rooms.reduce((s,r)=>s+r.width*r.height,0).toFixed(1)} m²</text>`,
    `<rect x="${M}" y="${M+planH+34}" width="${5*S}" height="5" fill="none" stroke="#475569" stroke-width="1"/>`,
    `<rect x="${M}" y="${M+planH+34}" width="${2.5*S}" height="5" fill="#475569"/>`,
    `<text x="${M}" y="${M+planH+32}" font-family="Arial,sans-serif" font-size="8" fill="#475569">0</text>`,
    `<text x="${M+5*S}" y="${M+planH+32}" font-family="Arial,sans-serif" font-size="8" fill="#475569">5m</text>`,
    `</svg>`,
  ];
  const blob = new Blob([p.join('\n')], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${plan.name.replace(/\s+/g, '_')}-planas.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

type DragState =
  | { id: string; type: 'room' | 'furniture'; offX: number; offY: number }
  | { id: string; type: 'door' | 'window'; room: Room };

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
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [resizing, setResizing] = useState<{ id: string; handle: string; origRoom: Room } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
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

    const ROOM_ICONS: Record<string, string> = {
      living: '🛋️', bedroom: '🛏️', kitchen: '🍳', bathroom: '🚿', dining: '🍽️',
      office: '💻', hallway: '🚪', garage: '🚗', other: '📦',
    };

    // Draw rooms — floor fills first, then walls/outlines
    for (const room of plan.rooms) {
      const { x, y } = worldToCanvas(room.x, room.y);
      const w = room.width * scaleRef.current;
      const h = room.height * scaleRef.current;

      // Floor fill
      const roomFillColor = room.floorColor || ROOM_COLORS[room.type];
      ctx.fillStyle = roomFillColor + 'cc';
      ctx.fillRect(x, y, w, h);
    }

    // Detect whether a wall side of a room is shared with an adjacent room that has a smaller ID.
    // The room with the smaller ID "owns" drawing that shared wall.
    const shouldSkipWallSide = (room: Room, side: 'top' | 'right' | 'bottom' | 'left'): boolean => {
      const EPSILON = 0.06;
      for (const other of plan.rooms) {
        if (other.id >= room.id) continue;
        let shared = false;
        if (side === 'top') {
          shared = Math.abs(other.y + other.height - room.y) < EPSILON
            && other.x < room.x + room.width - EPSILON && other.x + other.width > room.x + EPSILON;
        } else if (side === 'bottom') {
          shared = Math.abs(other.y - (room.y + room.height)) < EPSILON
            && other.x < room.x + room.width - EPSILON && other.x + other.width > room.x + EPSILON;
        } else if (side === 'left') {
          shared = Math.abs(other.x + other.width - room.x) < EPSILON
            && other.y < room.y + room.height - EPSILON && other.y + other.height > room.y + EPSILON;
        } else {
          shared = Math.abs(other.x - (room.x + room.width)) < EPSILON
            && other.y < room.y + room.height - EPSILON && other.y + other.height > room.y + EPSILON;
        }
        if (shared) return true;
      }
      return false;
    };

    // Draw room walls as strokes over fills (prevents double-wall visual artifact)
    for (const room of plan.rooms) {
      const { x, y } = worldToCanvas(room.x, room.y);
      const w = room.width * scaleRef.current;
      const h = room.height * scaleRef.current;
      const isSelected = room.id === selectedId;
      const wallPx = Math.max(3, Math.min(7, scaleRef.current * 0.1));

      // Draw each wall side individually; skip shared sides to avoid double-wall artifact
      ctx.lineWidth = wallPx;
      ctx.lineCap = 'square';
      const wallColor = isSelected ? '#3b82f6' : '#1e293b';
      const wallSides = [
        { side: 'top' as const,    x1: x,     y1: y,     x2: x + w, y2: y     },
        { side: 'right' as const,  x1: x + w, y1: y,     x2: x + w, y2: y + h },
        { side: 'bottom' as const, x1: x,     y1: y + h, x2: x + w, y2: y + h },
        { side: 'left' as const,   x1: x,     y1: y,     x2: x,     y2: y + h },
      ];
      for (const { side, x1, y1, x2, y2 } of wallSides) {
        if (!isSelected && shouldSkipWallSide(room, side)) continue;
        ctx.strokeStyle = wallColor;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Selection glow
      if (isSelected) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
      }

      // Room labels - only if room is large enough
      if (w > 60 && h > 40) {
        const icon = ROOM_ICONS[room.type] || '📦';
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        // Icon
        if (w > 80 && h > 60) {
          ctx.font = `${Math.min(18, h * 0.25)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(icon, centerX, centerY - 12);
        }

        // Name
        ctx.font = `bold ${Math.max(9, Math.min(13, w / 9))}px Inter, sans-serif`;
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.name, centerX, centerY + (w > 80 && h > 60 ? 6 : 0));

        // Area
        if (h > 80) {
          ctx.font = `${Math.max(8, Math.min(10, w / 11))}px Inter, sans-serif`;
          ctx.fillStyle = '#334155';
          ctx.fillText(`${(room.width * room.height).toFixed(1)} m²`, centerX, centerY + (w > 80 ? 20 : 12));
        }
      }

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
      const frameColor = isSelected ? '#38bdf8' : '#94d2f0';
      const glassColor = isSelected ? 'rgba(186,230,253,0.8)' : 'rgba(125,211,252,0.5)';

      const drawWindow = (wx: number, wy: number, ww: number, wh: number) => {
        // Frame
        ctx.fillStyle = frameColor;
        ctx.fillRect(wx, wy, ww, wh);
        // Glass pane
        ctx.fillStyle = glassColor;
        const inset = 2;
        ctx.fillRect(wx + inset, wy + inset, ww - inset * 2, wh - inset * 2);
        // Center divider
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 1;
        if (ww > wh) {
          // Horizontal window: vertical divider
          ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
        }
      };

      switch (win.wall) {
        case 'top':
          drawWindow(rx + rw * win.position - winW / 2, ry - 4, winW, 8);
          break;
        case 'bottom':
          drawWindow(rx + rw * win.position - winW / 2, ry + rh - 4, winW, 8);
          break;
        case 'left':
          drawWindow(rx - 4, ry + rh * win.position - winW / 2, 8, winW);
          break;
        case 'right':
          drawWindow(rx + rw - 4, ry + rh * win.position - winW / 2, 8, winW);
          break;
      }
    }

    // Draw furniture with architectural symbols
    for (const item of plan.furniture) {
      const { x, y } = worldToCanvas(item.x, item.y);
      const fw = item.width * scaleRef.current;
      const fd = item.depth * scaleRef.current;
      const isSelected = item.id === selectedId;

      ctx.save();
      ctx.translate(x + fw / 2, y + fd / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);

      const stroke = isSelected ? '#f59e0b' : '#374151';
      const fill = item.color + 'cc';
      const lw = isSelected ? 2 : 1;

      // Base shape
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.fillRect(-fw / 2, -fd / 2, fw, fd);
      ctx.strokeRect(-fw / 2, -fd / 2, fw, fd);

      // Type-specific symbols
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';

      switch (item.type) {
        case 'double-bed':
        case 'single-bed': {
          // Headboard line
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(-fw / 2, -fd / 2, fw, Math.min(fd * 0.25, 12));
          // Pillow(s)
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.strokeStyle = stroke; ctx.lineWidth = 0.5;
          const pw = item.type === 'double-bed' ? fw * 0.38 : fw * 0.65;
          const ph = fd * 0.28;
          const py = -fd / 2 + fd * 0.32;
          if (item.type === 'double-bed') {
            ctx.fillRect(-fw * 0.46, py, pw, ph); ctx.strokeRect(-fw * 0.46, py, pw, ph);
            ctx.fillRect(fw * 0.08, py, pw, ph); ctx.strokeRect(fw * 0.08, py, pw, ph);
          } else {
            ctx.fillRect(-pw / 2, py, pw, ph); ctx.strokeRect(-pw / 2, py, pw, ph);
          }
          break;
        }
        case 'sofa': {
          // Back
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(-fw / 2, -fd / 2, fw, fd * 0.22);
          // Armrests
          ctx.fillRect(-fw / 2, -fd / 2, fw * 0.12, fd);
          ctx.fillRect(fw / 2 - fw * 0.12, -fd / 2, fw * 0.12, fd);
          break;
        }
        case 'armchair': {
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(-fw / 2, -fd / 2, fw, fd * 0.25);
          ctx.fillRect(-fw / 2, -fd / 2, fw * 0.18, fd);
          ctx.fillRect(fw / 2 - fw * 0.18, -fd / 2, fw * 0.18, fd);
          break;
        }
        case 'dining-table':
        case 'desk': {
          // Cross lines
          ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-fw / 2, -fd / 2); ctx.lineTo(fw / 2, fd / 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(fw / 2, -fd / 2); ctx.lineTo(-fw / 2, fd / 2); ctx.stroke();
          break;
        }
        case 'toilet': {
          // Oval bowl
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.ellipse(0, fd * 0.1, fw * 0.38, fd * 0.32, 0, 0, Math.PI * 2);
          ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 0.5; ctx.stroke();
          // Tank
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(-fw * 0.42, -fd / 2, fw * 0.84, fd * 0.22);
          break;
        }
        case 'bathtub': {
          // Inner oval
          ctx.fillStyle = 'rgba(173,216,230,0.5)';
          ctx.beginPath();
          ctx.ellipse(0, fd * 0.1, fw * 0.38, fd * 0.34, 0, 0, Math.PI * 2);
          ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 0.5; ctx.stroke();
          // Tap area
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(-fw * 0.25, -fd / 2, fw * 0.5, fd * 0.12);
          break;
        }
        case 'shower': {
          // Diagonal hatch
          ctx.strokeStyle = 'rgba(135,206,235,0.5)'; ctx.lineWidth = 1.5;
          const step = Math.min(fw, fd) * 0.25;
          for (let i = -fw; i < fw + fd; i += step) {
            ctx.beginPath(); ctx.moveTo(-fw / 2, -fd / 2 + i); ctx.lineTo(-fw / 2 + i, -fd / 2); ctx.stroke();
          }
          break;
        }
        case 'sink': {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath();
          ctx.ellipse(0, 0, fw * 0.38, fd * 0.38, 0, 0, Math.PI * 2);
          ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 0.5; ctx.stroke();
          // Drain
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath(); ctx.arc(0, 0, fw * 0.07, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'kitchen-counter': {
          // Lines indicating counter sections
          ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5;
          for (let i = 1; i < 3; i++) {
            const lx = -fw / 2 + (fw / 3) * i;
            ctx.beginPath(); ctx.moveTo(lx, -fd / 2); ctx.lineTo(lx, fd / 2); ctx.stroke();
          }
          break;
        }
        case 'plant': {
          // Circle with leaf pattern
          ctx.fillStyle = item.color + 'ee';
          ctx.beginPath(); ctx.arc(0, 0, Math.min(fw, fd) * 0.45, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,80,0,0.4)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, -fd * 0.42); ctx.lineTo(0, fd * 0.42); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-fw * 0.42, 0); ctx.lineTo(fw * 0.42, 0); ctx.stroke();
          break;
        }
        case 'wardrobe': {
          // Hinge lines on doors
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(0, -fd / 2); ctx.lineTo(0, fd / 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-fw / 2, -fd / 2); ctx.arc(-fw / 2, fd / 2, fd, -Math.PI / 2, 0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(fw / 2, -fd / 2); ctx.arc(fw / 2, fd / 2, fd, Math.PI + Math.PI / 2, Math.PI); ctx.stroke();
          break;
        }
        case 'bookshelf': {
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.5;
          for (let i = 1; i < 4; i++) {
            const ly = -fd / 2 + (fd / 4) * i;
            ctx.beginPath(); ctx.moveTo(-fw / 2, ly); ctx.lineTo(fw / 2, ly); ctx.stroke();
          }
          break;
        }
        case 'stove': {
          // Burners
          [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].forEach(([bx, by]) => {
            ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(fw * bx, fd * by, Math.min(fw, fd) * 0.18, 0, Math.PI * 2); ctx.stroke();
          });
          break;
        }
        case 'refrigerator': {
          ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(-fw / 2, 0); ctx.lineTo(fw / 2, 0); ctx.stroke();
          break;
        }
        case 'rug': {
          ctx.strokeStyle = item.color; ctx.lineWidth = 2;
          ctx.strokeRect(-fw / 2 + 4, -fd / 2 + 4, fw - 8, fd - 8);
          break;
        }
        case 'fireplace': {
          ctx.fillStyle = '#222';
          ctx.fillRect(-fw * 0.35, -fd / 2, fw * 0.7, fd * 0.7);
          ctx.fillStyle = 'rgba(255,100,0,0.5)';
          ctx.fillRect(-fw * 0.25, -fd / 2 + 2, fw * 0.5, fd * 0.5);
          break;
        }
        case 'washing-machine': {
          ctx.fillStyle = 'rgba(173,216,230,0.4)';
          ctx.beginPath(); ctx.arc(0, 0, Math.min(fw, fd) * 0.38, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.5; ctx.stroke();
          break;
        }
        case 'office-chair': {
          ctx.strokeStyle = stroke; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(0, 0, Math.min(fw, fd) * 0.42, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, -fd / 2 + 2); ctx.lineTo(0, -fd * 0.08); ctx.stroke();
          break;
        }
        case 'nightstand':
        case 'dresser': {
          ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(-fw / 2, 0); ctx.lineTo(fw / 2, 0); ctx.stroke();
          break;
        }
        case 'staircase': {
          // Step lines
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
          const steps = 8;
          for (let i = 0; i <= steps; i++) {
            const ly = -fd / 2 + (fd / steps) * i;
            ctx.beginPath(); ctx.moveTo(-fw / 2, ly); ctx.lineTo(fw / 2, ly); ctx.stroke();
          }
          // Direction arrow
          ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -fd / 2 + 4);
          ctx.lineTo(0, fd / 2 - 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-4, fd / 2 - 10);
          ctx.lineTo(0, fd / 2 - 4);
          ctx.lineTo(4, fd / 2 - 10);
          ctx.stroke();
          break;
        }
        case 'column': {
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(0, 0, Math.min(fw, fd) / 2 - 2, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, Math.min(fw, fd) / 4, 0, Math.PI * 2); ctx.stroke();
          break;
        }
      }

      // Name label (small, only if large enough)
      if (fw > 40 && fd > 20) {
        ctx.fillStyle = '#0f172a';
        ctx.font = `${Math.max(7, Math.min(9, fw / 10))}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(item.name, 0, fd / 2 - 2);
      }

      ctx.restore();
    }

    // Drawing preview is handled in mousemove (live update)

    // Scale bar
    const barMeters = 5;
    const barPx = barMeters * scaleRef.current;
    const bx = 16, by = canvas.height - 28;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bx - 4, by - 4, barPx + 8, 20);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(bx, by + 2, barPx, 8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx, by + 2, barPx / 2, 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${barMeters}m`, bx + barPx / 2, by - 12);

    // Compass rose (top-right corner)
    const cx2 = canvas.width - 36, cy2 = 36;
    const cr = 22;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(cx2, cy2, cr + 4, 0, Math.PI * 2); ctx.fill();
    // N arrow (up)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(cx2, cy2 - cr); ctx.lineTo(cx2 - 7, cy2); ctx.lineTo(cx2, cy2 - 4); ctx.closePath(); ctx.fill();
    // S arrow (down)
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(cx2, cy2 + cr); ctx.lineTo(cx2 + 7, cy2); ctx.lineTo(cx2, cy2 + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx2, cy2 - cr - 8);
    ctx.restore();

    // Overall house dimensions (if there are rooms)
    if (plan.rooms.length > 0) {
      const minX = Math.min(...plan.rooms.map(r => r.x));
      const maxX = Math.max(...plan.rooms.map(r => r.x + r.width));
      const minY = Math.min(...plan.rooms.map(r => r.y));
      const maxY = Math.max(...plan.rooms.map(r => r.y + r.height));
      const totalW = maxX - minX;
      const totalH = maxY - minY;
      const { x: pMinX, y: pMinY } = worldToCanvas(minX, minY);
      const { x: pMaxX, y: pMaxY } = worldToCanvas(maxX, maxY);

      ctx.strokeStyle = 'rgba(96,165,250,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(pMinX - 30, pMinY - 30, pMaxX - pMinX + 60, pMaxY - pMinY + 60);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(96,165,250,0.85)';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${totalW.toFixed(1)}m`, (pMinX + pMaxX) / 2, pMinY - 32);
      ctx.save();
      ctx.translate(pMinX - 32, (pMinY + pMaxY) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${totalH.toFixed(1)}m`, 0, 0);
      ctx.restore();
    }

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
      // Check resize handles on selected room first
      if (state.selectedId) {
        const selRoom = state.plan.rooms.find(r => r.id === state.selectedId);
        if (selRoom) {
          const { x: rx, y: ry } = worldToCanvas(selRoom.x, selRoom.y);
          const rw = selRoom.width * scaleRef.current;
          const rh = selRoom.height * scaleRef.current;
          const handles: { name: string; cx: number; cy: number }[] = [
            { name: 'tl', cx: rx,          cy: ry },
            { name: 'tm', cx: rx + rw / 2, cy: ry },
            { name: 'tr', cx: rx + rw,     cy: ry },
            { name: 'ml', cx: rx,          cy: ry + rh / 2 },
            { name: 'mr', cx: rx + rw,     cy: ry + rh / 2 },
            { name: 'bl', cx: rx,          cy: ry + rh },
            { name: 'bm', cx: rx + rw / 2, cy: ry + rh },
            { name: 'br', cx: rx + rw,     cy: ry + rh },
          ];
          for (const h of handles) {
            if (Math.abs(pos.x - h.cx) < 8 && Math.abs(pos.y - h.cy) < 8) {
              setResizing({ id: selRoom.id, handle: h.name, origRoom: { ...selRoom } });
              return;
            }
          }
        }
      }

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
      if (door) {
        dispatch({ type: 'SELECT', id: door.id });
        const doorRoom = state.plan.rooms.find(r => r.id === door.roomId);
        if (doorRoom) setDragging({ id: door.id, type: 'door', room: doorRoom });
        return;
      }

      const win = state.plan.windows.find(w => {
        const r = state.plan.rooms.find(r => r.id === w.roomId);
        if (!r) return false;
        const hw = w.width / 2 + 0.15;
        switch (w.wall) {
          case 'top':    return Math.abs(world.y - r.y) < 0.3 && Math.abs(world.x - (r.x + r.width * w.position)) < hw;
          case 'bottom': return Math.abs(world.y - (r.y + r.height)) < 0.3 && Math.abs(world.x - (r.x + r.width * w.position)) < hw;
          case 'left':   return Math.abs(world.x - r.x) < 0.3 && Math.abs(world.y - (r.y + r.height * w.position)) < hw;
          case 'right':  return Math.abs(world.x - (r.x + r.width)) < 0.3 && Math.abs(world.y - (r.y + r.height * w.position)) < hw;
          default: return false;
        }
      });
      if (win) {
        dispatch({ type: 'SELECT', id: win.id });
        const winRoom = state.plan.rooms.find(r => r.id === win.roomId);
        if (winRoom) setDragging({ id: win.id, type: 'window', room: winRoom });
        return;
      }

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

    if (resizing) {
      const room = state.plan.rooms.find(r => r.id === resizing.id);
      if (room) {
        const orig = resizing.origRoom;
        const wx = snapTo(world.x, state.gridSize, state.snapToGrid);
        const wy = snapTo(world.y, state.gridSize, state.snapToGrid);
        let { x, y, width, height } = orig;
        const minSize = 0.5;
        const r2x = orig.x + orig.width;
        const r2y = orig.y + orig.height;

        switch (resizing.handle) {
          case 'tl': x = Math.min(wx, r2x - minSize); y = Math.min(wy, r2y - minSize); width = r2x - x; height = r2y - y; break;
          case 'tm': y = Math.min(wy, r2y - minSize); height = r2y - y; break;
          case 'tr': y = Math.min(wy, r2y - minSize); height = r2y - y; width = Math.max(minSize, wx - orig.x); break;
          case 'ml': x = Math.min(wx, r2x - minSize); width = r2x - x; break;
          case 'mr': width = Math.max(minSize, wx - orig.x); break;
          case 'bl': x = Math.min(wx, r2x - minSize); width = r2x - x; height = Math.max(minSize, wy - orig.y); break;
          case 'bm': height = Math.max(minSize, wy - orig.y); break;
          case 'br': width = Math.max(minSize, wx - orig.x); height = Math.max(minSize, wy - orig.y); break;
        }
        dispatch({ type: 'UPDATE_ROOM', room: { ...room, x, y, width, height } });
      }
      return;
    }

    if (dragging?.type === 'door') {
      const d = state.plan.doors.find(dd => dd.id === dragging.id);
      if (d) {
        const r = dragging.room;
        let pos: number;
        if (d.wall === 'top' || d.wall === 'bottom') {
          pos = (world.x - r.x - d.width / 2) / Math.max(0.1, r.width - d.width);
        } else {
          pos = (world.y - r.y - d.width / 2) / Math.max(0.1, r.height - d.width);
        }
        dispatch({ type: 'UPDATE_DOOR', door: { ...d, position: Math.max(0, Math.min(1, pos)) } });
      }
    }

    if (dragging?.type === 'window') {
      const w = state.plan.windows.find(ww => ww.id === dragging.id);
      if (w) {
        const r = dragging.room;
        let pos: number;
        if (w.wall === 'top' || w.wall === 'bottom') {
          pos = (world.x - r.x) / r.width;
        } else {
          pos = (world.y - r.y) / r.height;
        }
        dispatch({ type: 'UPDATE_WINDOW', win: { ...w, position: Math.max(0.05, Math.min(0.95, pos)) } });
      }
    }

    if (dragging && (dragging.type === 'room' || dragging.type === 'furniture')) {
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

    // Hover tooltip — direct DOM manipulation to avoid re-render at 60fps
    const tt = tooltipRef.current;
    if (tt) {
      if (!dragging && !resizing && !drawing && state.tool === 'select') {
        const hf = [...state.plan.furniture].reverse().find(f => {
          const rad = (f.rotation * Math.PI) / 180;
          const dx = world.x - (f.x + f.width / 2);
          const dy = world.y - (f.y + f.depth / 2);
          const lx = dx * Math.cos(-rad) - dy * Math.sin(-rad);
          const ly = dx * Math.sin(-rad) + dy * Math.cos(-rad);
          return Math.abs(lx) <= f.width / 2 && Math.abs(ly) <= f.depth / 2;
        });
        if (hf) {
          tt.style.display = 'block';
          tt.style.left = `${pos.x + 14}px`;
          tt.style.top = `${pos.y - 30}px`;
          tt.textContent = `${hf.name} · ${hf.width}×${hf.depth}m`;
        } else {
          const hr = state.plan.rooms.find(r =>
            world.x >= r.x && world.x <= r.x + r.width && world.y >= r.y && world.y <= r.y + r.height
          );
          if (hr) {
            tt.style.display = 'block';
            tt.style.left = `${pos.x + 14}px`;
            tt.style.top = `${pos.y - 30}px`;
            tt.textContent = `${hr.name} · ${(hr.width * hr.height).toFixed(1)} m²`;
          } else {
            tt.style.display = 'none';
          }
        }
      } else {
        tt.style.display = 'none';
      }
    }
  }, [isPanning, panStart, resizing, dragging, drawing, state, dispatch, canvasToWorld, worldToCanvas, drawCanvas]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) { setIsPanning(false); return; }
    if (resizing) { setResizing(null); return; }
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

  const fitToView = useCallback(() => {
    if (state.plan.rooms.length === 0) { setZoom(1); setPanOffset({ x: 40, y: 40 }); return; }
    const minX = Math.min(...state.plan.rooms.map(r => r.x));
    const maxX = Math.max(...state.plan.rooms.map(r => r.x + r.width));
    const minY = Math.min(...state.plan.rooms.map(r => r.y));
    const maxY = Math.max(...state.plan.rooms.map(r => r.y + r.height));
    const pw = canvasSize.w - 80;
    const ph = canvasSize.h - 80;
    const bw = maxX - minX;
    const bh = maxY - minY;
    if (bw <= 0 || bh <= 0) return;
    const newZoom = Math.max(0.2, Math.min(3, Math.min(pw / bw, ph / bh) / BASE_SCALE));
    const s = BASE_SCALE * newZoom;
    setPanOffset({
      x: (canvasSize.w - bw * s) / 2 - minX * s,
      y: (canvasSize.h - bh * s) / 2 - minY * s,
    });
    setZoom(newZoom);
  }, [state.plan.rooms, canvasSize]);

  // Fit-to-view via custom event from keyboard shortcut
  useEffect(() => {
    const handler = () => fitToView();
    window.addEventListener('designer:fitview', handler);
    return () => window.removeEventListener('designer:fitview', handler);
  }, [fitToView]);

  // Auto fit when plan changes significantly (room count changes)
  const prevRoomCount = useRef(state.plan.rooms.length);
  useEffect(() => {
    if (Math.abs(state.plan.rooms.length - prevRoomCount.current) > 2) {
      fitToView();
    }
    prevRoomCount.current = state.plan.rooms.length;
  }, [state.plan.rooms.length, fitToView]);

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

    const singleTouchRef = { x: 0, y: 0, active: false };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        singleTouchRef.active = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        pinchRef.current = { dist, midX, midY };
      } else if (e.touches.length === 1) {
        singleTouchRef.active = true;
        singleTouchRef.x = e.touches[0].clientX;
        singleTouchRef.y = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        singleTouchRef.active = false;
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
      } else if (e.touches.length === 1 && singleTouchRef.active) {
        e.preventDefault();
        const ddx = e.touches[0].clientX - singleTouchRef.x;
        const ddy = e.touches[0].clientY - singleTouchRef.y;
        setPanOffset(prev => ({ x: prev.x + ddx, y: prev.y + ddy }));
        singleTouchRef.x = e.touches[0].clientX;
        singleTouchRef.y = e.touches[0].clientY;
      }
    };

    const onTouchEnd = () => {
      pinchRef.current = null;
      singleTouchRef.active = false;
    };

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
    if (resizing) {
      const h = resizing.handle;
      if (h === 'tl' || h === 'br') return 'nwse-resize';
      if (h === 'tr' || h === 'bl') return 'nesw-resize';
      if (h === 'tm' || h === 'bm') return 'ns-resize';
      return 'ew-resize';
    }
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
        onMouseLeave={() => { setDragging(null); setIsPanning(false); if (tooltipRef.current) tooltipRef.current.style.display = 'none'; }}
      />
      {/* Hover tooltip */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none z-10 bg-slate-900/95 text-white text-xs px-2 py-1 rounded-lg shadow-lg border border-slate-700 whitespace-nowrap"
        style={{ display: 'none' }}
      />
      {/* Export buttons */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        <button
          onClick={() => exportPlanToSVG(state.plan)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 backdrop-blur transition-all"
          title="Eksportuoti kaip SVG (vektorinius)"
        >
          📐 SVG
        </button>
        <button
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const link = document.createElement('a');
            link.download = `${state.plan.name.replace(/\s+/g, '_')}-planas.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
          }}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 backdrop-blur transition-all"
          title="Eksportuoti kaip PNG"
        >
          📷 PNG
        </button>
        <button
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const dataUrl = canvas.toDataURL('image/png');
            const win = window.open('', '_blank');
            if (!win) return;
            win.document.write(`<html><head><title>${state.plan.name} - Planas</title><style>
              body{margin:0;background:#1a1a2e;display:flex;align-items:center;justify-content:center;min-height:100vh;}
              img{max-width:100%;max-height:100vh;object-fit:contain;}
              @media print{body{background:#fff;}img{max-width:100%;}}
            </style></head><body><img src="${dataUrl}" /></body></html>`);
            win.document.close();
            setTimeout(() => win.print(), 500);
          }}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 backdrop-blur transition-all"
          title="Spausdinti"
        >
          🖨️ Spausd.
        </button>
      </div>

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
          onClick={fitToView}
          className="w-8 h-8 bg-slate-800/90 border border-slate-700 text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-700 backdrop-blur transition-all"
          title="Rodyti visą projektą (G)"
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
