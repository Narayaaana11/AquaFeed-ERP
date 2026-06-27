import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useCompany } from '@/context/CompanyContext';

export function useInventory(params?: { search?: string; stockStatus?: string }) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['inventory', params, activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/inventory', { 
        params: { ...params, companyId: activeCompanyId } 
      });
      return data.data;
    },
    staleTime: 15000,
  });
}

export function useStockAdjustments(params?: { productId?: string; page?: number }) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['inventory', 'adjustments', params, activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/inventory/adjustments', { 
        params: { ...params, companyId: activeCompanyId } 
      });
      return { data: data.data, total: data.total };
    },
    staleTime: 30000,
  });
}

export function useAdjustInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { productId: string; type: string; quantity: number; reason?: string; fromWarehouseId?: string; toWarehouseId?: string }) => {
      const { data } = await api.post('/inventory/adjust', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock adjusted!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to adjust stock'),
  });
}

export function useWarehouseInventory(warehouseId: string) {
  return useQuery({
    queryKey: ['inventory', 'warehouse', warehouseId],
    queryFn: async () => {
      if (!warehouseId) return [];
      const { data } = await api.get(`/inventory/warehouse/${warehouseId}`);
      return data.data;
    },
    enabled: !!warehouseId,
    staleTime: 15000,
  });
}
