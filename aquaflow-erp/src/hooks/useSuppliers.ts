import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  paymentTerms: string;
  outstandingBalance: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export function useSuppliers(params?: { search?: string }) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: async () => {
      const { data } = await api.get('/suppliers', { params });
      return data.data as Supplier[];
    },
    staleTime: 30000,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Supplier>) => {
      const { data } = await api.post('/suppliers', body);
      return data.data as Supplier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier added!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add supplier'),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Supplier> & { id: string }) => {
      const { data } = await api.put(`/suppliers/${id}`, body);
      return data.data as Supplier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update supplier'),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier removed!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to remove supplier'),
  });
}
