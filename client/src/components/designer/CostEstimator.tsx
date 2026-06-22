import { useMemo } from 'react';
import { useDesigner } from '@/lib/designer-store';
import type { Room } from '@/types/designer';

const FLOOR_COST_PER_M2: Record<Room['floorMaterial'], number> = {
  wood: 45, tile: 25, carpet: 20, concrete: 15, marble: 120, vinyl: 18,
};
const WALL_COST_PER_M2: Record<Room['wallMaterial'], number> = {
  white: 8, cream: 8, gray: 10, blue: 10, green: 10, brick: 35, 'wood-panel': 55,
};
const DOOR_COST = 650;
const WINDOW_COST = 420;
const WALL_STRUCTURE_PER_M2 = 280;
const FOUNDATION_PER_M2 = 180;
const ROOF_PER_M2 = 95;
const ELECTRICAL_PER_M2 = 55;
const PLUMBING_PER_M2 = 65;

const FURNITURE_COSTS: Record<string, number> = {
  'double-bed': 800, 'single-bed': 450, 'sofa': 1200, 'armchair': 550,
  'dining-table': 700, 'chair': 150, 'coffee-table': 350, 'desk': 400,
  'wardrobe': 900, 'bookshelf': 300, 'kitchen-counter': 2500, 'sink': 250,
  'bathtub': 800, 'toilet': 350, 'shower': 600, 'tv-stand': 400, 'plant': 45,
  'stove': 900, 'refrigerator': 700, 'washing-machine': 600, 'office-chair': 350,
  'nightstand': 200, 'dresser': 500, 'rug': 280, 'fireplace': 3500,
  'staircase': 4000, 'column': 800,
  'bathroom-vanity': 650, 'kitchen-island': 1800, 'floor-lamp': 180,
  'dishwasher': 550, 'side-table': 180, 'bench': 350, 'radiator': 280,
};

export default function CostEstimator() {
  const { state } = useDesigner();
  const { plan } = state;

  const estimate = useMemo(() => {
    const totalFloorArea = plan.rooms.reduce((s, r) => s + r.width * r.height, 0);
    const totalWallArea = plan.rooms.reduce((s, r) => {
      const perimeter = 2 * (r.width + r.height);
      return s + perimeter * plan.wallHeight;
    }, 0);

    const floorCost = plan.rooms.reduce((s, r) => {
      const area = r.width * r.height;
      return s + area * (FLOOR_COST_PER_M2[r.floorMaterial] || 25);
    }, 0);

    const wallCost = plan.rooms.reduce((s, r) => {
      const area = 2 * (r.width + r.height) * plan.wallHeight;
      return s + area * (WALL_COST_PER_M2[r.wallMaterial] || 10);
    }, 0);

    const doorCost = plan.doors.length * DOOR_COST;
    const windowCost = plan.windows.length * WINDOW_COST;
    const furnitureCost = plan.furniture.reduce((s, f) => s + (FURNITURE_COSTS[f.type] || 300), 0);

    const structure = totalFloorArea * WALL_STRUCTURE_PER_M2;
    const foundation = totalFloorArea * FOUNDATION_PER_M2;
    const roof = totalFloorArea * ROOF_PER_M2;
    const electrical = totalFloorArea * ELECTRICAL_PER_M2;
    const plumbing = totalFloorArea * PLUMBING_PER_M2;

    const subtotal = structure + foundation + roof + electrical + plumbing + floorCost + wallCost + doorCost + windowCost;
    const contingency = subtotal * 0.1;
    const total = subtotal + contingency + furnitureCost;

    return {
      totalFloorArea,
      totalWallArea,
      structure,
      foundation,
      roof,
      electrical,
      plumbing,
      floorCost,
      wallCost,
      doorCost,
      windowCost,
      furnitureCost,
      subtotal,
      contingency,
      total,
    };
  }, [plan]);

  const fmt = (n: number) => `€${Math.round(n).toLocaleString('lt-LT')}`;

  return (
    <div className="bg-slate-900 text-white p-4 h-full overflow-y-auto">
      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-lg">💰</span>
        Preliminari sąmata
      </h2>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-800/60 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-blue-400">{estimate.totalFloorArea.toFixed(1)}</div>
          <div className="text-xs text-slate-500">m² plotas</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-emerald-400">{fmt(estimate.total / estimate.totalFloorArea || 0)}</div>
          <div className="text-xs text-slate-500">/ m² kaina</div>
        </div>
      </div>

      <div className="space-y-1 mb-4">
        {[
          { label: 'Konstrukcija ir sienos', value: estimate.structure },
          { label: 'Pamatai', value: estimate.foundation },
          { label: 'Stogas', value: estimate.roof },
          { label: 'Elektra', value: estimate.electrical },
          { label: 'Vandentiekis', value: estimate.plumbing },
          { label: 'Grindų danga', value: estimate.floorCost },
          { label: 'Sienų apdaila', value: estimate.wallCost },
          { label: 'Durys', value: estimate.doorCost },
          { label: 'Langai', value: estimate.windowCost },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center text-xs py-1.5 px-2 rounded bg-slate-800/40">
            <span className="text-slate-400">{label}</span>
            <span className="text-slate-200 font-medium">{fmt(value)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700 pt-3 space-y-1">
        <div className="flex justify-between text-xs py-1">
          <span className="text-slate-400">Tarpinė suma</span>
          <span className="text-slate-200">{fmt(estimate.subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs py-1">
          <span className="text-slate-400">Nenumatyti išlaidos (10%)</span>
          <span className="text-slate-200">{fmt(estimate.contingency)}</span>
        </div>
        {estimate.furnitureCost > 0 && (
          <div className="flex justify-between text-xs py-1">
            <span className="text-slate-400">Baldai ({plan.furniture.length} vnt.)</span>
            <span className="text-slate-200">{fmt(estimate.furnitureCost)}</span>
          </div>
        )}
        <div className="flex justify-between items-center py-2 px-3 bg-blue-900/40 rounded-lg mt-2 border border-blue-800/50">
          <span className="text-sm font-bold text-white">VISO (apytiksliai)</span>
          <span className="text-lg font-bold text-blue-400">{fmt(estimate.total)}</span>
        </div>
      </div>

      <p className="text-xs text-slate-600 mt-3 leading-relaxed">
        * Sąmata yra preliminari ir gali skirtis priklausomai nuo regiono, statybos kokybės ir rinkos sąlygų.
      </p>
    </div>
  );
}
