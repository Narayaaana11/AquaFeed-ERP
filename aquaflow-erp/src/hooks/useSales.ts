import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { openWhatsApp, getInvoiceMessage, getPaymentMessage } from '@/utils/whatsapp';

export interface InvoiceItem {
  product: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  lineTotal: number;
}

export interface InvoicePayment {
  amount: number;
  paymentType: string;
  date: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  customer: { _id: string; name: string; phone?: string } | string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  paidAmount: number;
  payments?: InvoicePayment[];
  paymentType: string;
  status: string;
  dueDate?: string;
  notes?: string;
  tallyGuid?: string;
  createdAt: string;
}

export function useSales(params?: { search?: string; status?: string; from?: string; to?: string; page?: number }) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: async () => {
      const { data } = await api.get('/sales', { params });
      return { data: data.data as Invoice[], total: data.total };
    },
    staleTime: 15000,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: async () => {
      const { data } = await api.get(`/sales/${id}`);
      return data.data as Invoice;
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      customerId: string;
      items: { productId: string; quantity: number; unitPrice?: number }[];
      paymentType: string;
      notes?: string;
      paidAmount?: number;
    }) => {
      const { data } = await api.post('/sales', body);
      return data.data as Invoice;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      
      const customerObj = typeof data.customer === 'object' ? data.customer : null;
      const phone = customerObj && 'phone' in customerObj ? customerObj.phone : null;
      const balance = data.total - (data.paidAmount || 0);

      if (phone) {
        toast.success(`Invoice ${data.invoiceNumber} created!`, {
          action: {
            label: 'WhatsApp',
            onClick: () => openWhatsApp(phone, getInvoiceMessage(data))
          },
          duration: 10000,
        });
      } else {
        toast.success(`Invoice ${data.invoiceNumber} created!`);
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create invoice'),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.put(`/sales/${id}/status`, { status });
      return data.data as Invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Invoice status updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update status'),
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sales/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Invoice cancelled.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to cancel invoice'),
  });
}

export function useAddInvoicePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, paymentType }: { id: string; amount: number; paymentType: string }) => {
      const { data } = await api.post(`/sales/${id}/payments`, { amount, paymentType });
      return data.data as Invoice;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      
      const customerObj = typeof data.customer === 'object' ? data.customer : null;
      const phone = customerObj && 'phone' in customerObj ? customerObj.phone : null;
      const balance = data.total - (data.paidAmount || 0);

      if (phone) {
        toast.success('Payment added successfully!', {
          action: {
            label: 'WhatsApp',
            onClick: () => openWhatsApp(phone, getPaymentMessage(data, variables.amount))
          },
          duration: 10000,
        });
      } else {
        toast.success('Payment added successfully!');
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add payment'),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: string;
      items: { productId: string; quantity: number; unitPrice?: number }[];
      notes?: string;
      paymentType?: string;
      gstRate?: number;
    }) => {
      const { data } = await api.put(`/sales/${id}`, body);
      return data.data as Invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Invoice updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update invoice'),
  });
}
