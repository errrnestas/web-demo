import { useState } from 'react';
import { useDesigner } from '@/lib/designer-store';
import { useDesignPlans, useSaveDesignPlan, useUpdateDesignPlan, useDeleteDesignPlan } from '@/hooks/use-design-plans';
import { cn } from '@/lib/utils';
import type { DesignPlan } from '@shared/schema';

export default function SaveLoadPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useDesigner();
  const { data: plans, isLoading } = useDesignPlans();
  const saveMutation = useSaveDesignPlan();
  const updateMutation = useUpdateDesignPlan();
  const deleteMutation = useDeleteDesignPlan();

  const [tab, setTab] = useState<'save' | 'load'>('load');
  const [saveName, setSaveName] = useState(state.plan.name);
  const [overwriteId, setOverwriteId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const planData = JSON.stringify(state.plan);
    try {
      if (overwriteId !== null) {
        await updateMutation.mutateAsync({ id: overwriteId, name: saveName, planData });
      } else {
        await saveMutation.mutateAsync({ name: saveName, planData });
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoad = (plan: DesignPlan) => {
    try {
      const parsed = JSON.parse(plan.planData);
      dispatch({ type: 'SET_PLAN', plan: parsed });
      onClose();
      setTimeout(() => window.dispatchEvent(new CustomEvent('designer:fitview')), 50);
    } catch {
      alert('Nepavyko įkelti plano');
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Ištrinti šį planą?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      if (overwriteId === id) setOverwriteId(null);
    } catch {
      alert('Nepavyko ištrinti plano');
    }
  };

  const formatDate = (d: Date | null | string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('lt-LT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 flex flex-col shadow-2xl max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="font-semibold text-white">💾 Projektai</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {(['load', 'save'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('flex-1 py-2.5 text-sm font-medium transition-all',
                tab === t ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
              )}>
              {t === 'load' ? '📂 Atidaryti' : '💾 Išsaugoti'}
            </button>
          ))}
        </div>

        {tab === 'load' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading && <p className="text-slate-500 text-sm text-center py-8">Kraunama...</p>}
            {!isLoading && (!plans || plans.length === 0) && (
              <div className="text-center py-12">
                <p className="text-slate-500 text-sm">Nėra išsaugotų projektų</p>
                <button onClick={() => setTab('save')} className="mt-3 text-xs text-blue-400 hover:underline">
                  Išsaugoti dabartinį →
                </button>
              </div>
            )}
            {plans?.map(plan => (
              <div key={plan.id}
                role="button" tabIndex={0}
                onClick={() => handleLoad(plan)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLoad(plan); } }}
                className="w-full text-left p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-blue-500 hover:bg-slate-750 transition-all group cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm truncate">{plan.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(plan.updatedAt)}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(plan.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded-lg hover:bg-red-900/20 transition-all shrink-0"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'save' && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Projekto pavadinimas</label>
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Mano namas..."
              />
            </div>

            {plans && plans.length > 0 && (
              <div>
                <label className="text-xs text-slate-400 block mb-2">Perrašyti esamą (neprivaloma)</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  <button
                    onClick={() => setOverwriteId(null)}
                    className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-all',
                      overwriteId === null ? 'bg-blue-700 border border-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
                    )}>
                    + Sukurti naują
                  </button>
                  {plans.map(p => (
                    <button key={p.id} onClick={() => { setOverwriteId(p.id); setSaveName(p.name); }}
                      className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-all',
                        overwriteId === p.id ? 'bg-blue-700 border border-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
                      )}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={!saveName.trim() || saveMutation.isPending || updateMutation.isPending}
              className={cn('w-full py-2.5 rounded-xl font-medium text-sm transition-all',
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              )}>
              {saved ? '✓ Išsaugota!' : saveMutation.isPending || updateMutation.isPending ? 'Saugojama...' : '💾 Išsaugoti'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
