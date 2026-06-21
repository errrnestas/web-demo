import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DesignPlan } from '@shared/schema';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useDesignPlans() {
  return useQuery<DesignPlan[]>({
    queryKey: ['design-plans'],
    queryFn: () => fetchJson('/api/design-plans'),
  });
}

export function useSaveDesignPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; planData: string; thumbnail?: string }) =>
      fetchJson<DesignPlan>('/api/design-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['design-plans'] }),
  });
}

export function useUpdateDesignPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; planData?: string; thumbnail?: string }) =>
      fetchJson<DesignPlan>(`/api/design-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['design-plans'] }),
  });
}

export function useDeleteDesignPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchJson<void>(`/api/design-plans/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['design-plans'] }),
  });
}
