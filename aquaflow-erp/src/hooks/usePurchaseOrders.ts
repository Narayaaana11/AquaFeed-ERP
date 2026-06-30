import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useCompany } from '@/context/CompanyContext';

export interface POItem {
  product: string;
  productName: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier: { _id: string; name: string; phone?: string };
  supplierName: string;
  items: POItem[];
  subtotal: number;
  totalAmount: number;
  status: 'Draft' | 'Ordered' | 'Received' | 'Cancelled';
  expectedDate?: string;
  receivedDate?: string;
  notes?: string;
  warehouse: { _id: string; name: string };
  tallyGuid?: string;
  date?: string;
  createdAt: string;
}

export function usePurchaseOrders(params?: { search?: string; status?: string }) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['purchase-orders', params, activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/purchase-orders', { 
        params: { ...params, companyId: activeCompanyId } 
      });
      return { data: data.data as PurchaseOrder[], total: data.total };
    },
    staleTime: 30000,
  });
}

export function useCreatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      supplierId: string;
      warehouseId?: string;
      items: { productId: string; quantity: number; unitCost: number }[];
      expectedDate?: string;
      notes?: string;
    }) => {
      const { data } = await api.post('/purchase-orders', body);
      return data.data as PurchaseOrder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order created!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create purchase order'),
  });
}

export function useReceivePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/purchase-orders/${id}/receive`);
      return data.data as PurchaseOrder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock received and updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to receive PO'),
  });
}

export function useCancelPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/purchase-orders/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order cancelled.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to cancel PO'),
  });
}
