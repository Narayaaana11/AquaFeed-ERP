import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface Warehouse {
  _id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  manager?: string;
  phone?: string;
  capacity?: number;
  status: string;
  isDefault: boolean;
  createdAt: string;
}

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data } = await api.get('/warehouses');
      return data.data as Warehouse[];
    },
    staleTime: 60000,
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Warehouse>) => {
      const { data } = await api.post('/warehouses', body);
      return data.data as Warehouse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse added!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add warehouse'),
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Warehouse> & { id: string }) => {
      const { data } = await api.put(`/warehouses/${id}`, body);
      return data.data as Warehouse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update warehouse'),
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/warehouses/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse deleted!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete warehouse'),
  });
}
