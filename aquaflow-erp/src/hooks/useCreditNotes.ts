import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface CreditNote {
  _id: string;
  creditNoteNumber: string;
  originalInvoice: { _id: string; invoiceNumber: string };
  originalInvoiceNumber: string;
  customer: { _id: string; name: string };
  customerName: string;
  items: {
    product: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  reason: string;
  totalAmount: number;
  status: 'Issued' | 'Applied';
  createdAt: string;
}

export function useCreditNotes(params?: { customerId?: string }) {
  return useQuery({
    queryKey: ['credit-notes', params],
    queryFn: async () => {
      const { data } = await api.get('/credit-notes', { params });
      return data.data as CreditNote[];
    },
    staleTime: 30000,
  });
}

export function useCreateCreditNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      invoiceId: string;
      items: { productId: string; quantity: number }[];
      reason?: string;
    }) => {
      const { data } = await api.post('/credit-notes', body);
      return data.data as CreditNote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-notes'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Credit note created and stock restored!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create credit note'),
  });
}
