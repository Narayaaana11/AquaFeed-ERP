import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface Product {
  _id: string;
  name: string;
  brand: string;
  category: string;
  pelletSize?: string;
  weight: number;
  price: number;
  purchasePrice?: number;
  stock: number;
  lowStockThreshold: number;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  stockStatus?: string;
  tallyGuid?: string;
  createdAt: string;
}

export function useProducts(params?: { search?: string; brand?: string; stockStatus?: string }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const { data } = await api.get('/products', { params });
      return data.data as Product[];
    },
    staleTime: 30000,
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: async () => {
      const { data } = await api.get('/products/low-stock');
      return data.data as Product[];
    },
    staleTime: 60000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Product>) => {
      const { data } = await api.post('/products', body);
      return data.data as Product;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product added successfully!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add product'),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Product> & { id: string }) => {
      const { data } = await api.put(`/products/${id}`, body);
      return data.data as Product;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update product'),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete product'),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, type, quantity, reason }: { id: string; type: string; quantity: number; reason?: string }) => {
      const { data } = await api.post(`/products/${id}/adjust-stock`, { type, quantity, reason });
      return data.data as Product;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock adjusted!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to adjust stock'),
  });
}
