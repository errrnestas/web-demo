import { useCallback } from 'react';
import { useDesigner } from '@/lib/designer-store';
import { ROOM_TYPE_LABELS, FLOOR_MATERIAL_COLORS, WALL_MATERIAL_COLORS } from '@/types/designer';
import type { Room } from '@/types/designer';

const FLOOR_MAT_LABELS: Record<Room['floorMaterial'], string> = {
  wood: 'Parketas', tile: 'Plytelės', carpet: 'Kilimas', concrete: 'Betonas', marble: 'Marmuras', vinyl: 'Vinilas',
};
const WALL_MAT_LABELS: Record<Room['wallMaterial'], string> = {
  white: 'Balta', cream: 'Kreminė', gray: 'Pilka', blue: 'Mėlyna', green: 'Žalia', brick: 'Plyta', 'wood-panel': 'Mediena',
};

function generateHtmlReport(plan: ReturnType<typeof useDesigner>['state']['plan']): string {
  const totalArea = plan.rooms.reduce((s, r) => s + r.width * r.height, 0);
  const perimeter = plan.rooms.reduce((s, r) => s + 2 * (r.width + r.height), 0);

  const roomRows = plan.rooms.map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${ROOM_TYPE_LABELS[r.type]}</td>
      <td>${r.width.toFixed(1)}m × ${r.height.toFixed(1)}m</td>
      <td>${(r.width * r.height).toFixed(2)} m²</td>
      <td>${FLOOR_MAT_LABELS[r.floorMaterial]}</td>
      <td>${WALL_MAT_LABELS[r.wallMaterial]}</td>
    </tr>
  `).join('');

  const furnitureRows = plan.furniture.map(f => `
    <tr><td>${f.name}</td><td>${f.width.toFixed(1)}m × ${f.depth.toFixed(1)}m</td></tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="lt">
<head>
<meta charset="UTF-8">
<title>Namų projektas - ${plan.name}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 30px; color: #1a1a2e; }
  h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
  h2 { color: #1e3a8a; margin-top: 30px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #1e40af; color: white; padding: 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
  .stat { background: #eff6ff; border-radius: 12px; padding: 20px; text-align: center; }
  .stat-value { font-size: 2em; font-weight: bold; color: #1e40af; }
  .stat-label { color: #64748b; font-size: 0.9em; margin-top: 4px; }
  .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 0.85em; }
  @media print { body { max-width: 100%; } }
</style>
</head>
<body>
<h1>🏠 ${plan.name}</h1>
<p style="color:#64748b">Sugeneruota: ${new Date().toLocaleDateString('lt-LT')}</p>

<div class="summary">
  <div class="stat">
    <div class="stat-value">${plan.rooms.length}</div>
    <div class="stat-label">Kambariai</div>
  </div>
  <div class="stat">
    <div class="stat-value">${totalArea.toFixed(1)}</div>
    <div class="stat-label">Bendras plotas (m²)</div>
  </div>
  <div class="stat">
    <div class="stat-value">${plan.furniture.length}</div>
    <div class="stat-label">Baldų vienetai</div>
  </div>
</div>

<h2>Kambariai</h2>
<table>
  <thead>
    <tr>
      <th>Pavadinimas</th>
      <th>Tipas</th>
      <th>Matmenys</th>
      <th>Plotas</th>
      <th>Grindys</th>
      <th>Sienos</th>
    </tr>
  </thead>
  <tbody>${roomRows}</tbody>
</table>

<h2>Durys ir langai</h2>
<table>
  <thead>
    <tr><th>Tipas</th><th>Skaičius</th></tr>
  </thead>
  <tbody>
    <tr><td>Durys</td><td>${plan.doors.length} vnt.</td></tr>
    <tr><td>Langai</td><td>${plan.windows.length} vnt.</td></tr>
  </tbody>
</table>

${plan.furniture.length > 0 ? `
<h2>Baldai</h2>
<table>
  <thead><tr><th>Baldas</th><th>Matmenys</th></tr></thead>
  <tbody>${furnitureRows}</tbody>
</table>` : ''}

<h2>Techninis aprašas</h2>
<table>
  <tbody>
    <tr><td>Sienų aukštis</td><td>${plan.wallHeight} m</td></tr>
    <tr><td>Kambarių perimetras</td><td>≈${perimeter.toFixed(1)} m</td></tr>
    <tr><td>Sienų plotas</td><td>≈${(perimeter * plan.wallHeight).toFixed(1)} m²</td></tr>
    <tr><td>Durų atidarymai</td><td>${plan.doors.length} × 0.9m × 2.1m</td></tr>
    <tr><td>Langų atidarymai</td><td>${plan.windows.length} × ~1.2m × 1.2m</td></tr>
  </tbody>
</table>

<div class="footer">
  <p>Projektas sukurtas naudojant NamųDizainas 3D</p>
</div>
</body>
</html>`;
}

export function ExportButton() {
  const { state } = useDesigner();

  const exportJson = useCallback(() => {
    const data = JSON.stringify(state.plan, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.plan.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.plan]);

  const exportReport = useCallback(() => {
    const html = generateHtmlReport(state.plan);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.onload = () => { w.print(); };
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [state.plan]);

  return (
    <div className="flex gap-2">
      <button
        onClick={exportJson}
        title="Išsaugoti JSON failą"
        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
      >
        💾 JSON
      </button>
      <button
        onClick={exportReport}
        title="Generuoti spausdintiną ataskaitą"
        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-900 border border-emerald-700 text-emerald-300 hover:bg-emerald-800 transition-all"
      >
        🖨️ Ataskaita
      </button>
    </div>
  );
}
