import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useCompany } from '@/context/CompanyContext';

export interface QuotationItem {
  product: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  lineTotal: number;
  hsnCode?: string;
}

export interface Quotation {
  _id: string;
  quotationNumber: string;
  customer: { _id: string; name: string; phone?: string } | string;
  customerName: string;
  items: QuotationItem[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Converted';
  validUntil?: string;
  notes?: string;
  createdAt: string;
}

export function useQuotations(params?: { search?: string; status?: string; from?: string; to?: string; page?: number }) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['quotations', params, activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/quotations', { 
        params: { ...params, companyId: activeCompanyId } 
      });
      return { data: data.data as Quotation[], total: data.total };
    },
    staleTime: 15000,
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: ['quotations', id],
    queryFn: async () => {
      const { data } = await api.get(`/quotations/${id}`);
      return data.data as Quotation;
    },
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      customerId: string;
      items: { productId: string; quantity: number; unitPrice?: number }[];
      notes?: string;
      validUntil?: string;
    }) => {
      const { data } = await api.post('/quotations', body);
      return data.data as Quotation;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Quotation ${data.quotationNumber} created!`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create quotation'),
  });
}

export function useUpdateQuotationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.put(`/quotations/${id}/status`, { status });
      return data.data as Quotation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation status updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update status'),
  });
}

export function useCancelQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/quotations/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation deleted.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete quotation'),
  });
}
