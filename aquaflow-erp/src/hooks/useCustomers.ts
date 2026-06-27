import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useCompany } from '@/context/CompanyContext';

export interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  type: string;
  creditLimit: number;
  outstandingBalance: number;
  isActive: boolean;
  notes?: string;
  tallyGuid?: string;
  createdAt: string;
}

export function useCustomers(params?: { search?: string; type?: string }) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['customers', params, activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/customers', { 
        params: { ...params, companyId: activeCompanyId } 
      });
      return data.data as Customer[];
    },
    staleTime: 30000,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Customer>) => {
      const { data } = await api.post('/customers', body);
      return data.data as Customer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer added!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add customer'),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Customer> & { id: string }) => {
      const { data } = await api.put(`/customers/${id}`, body);
      return data.data as Customer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update customer'),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete customer'),
  });
}

export function useOverdueCustomers() {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['customers', 'overdue', activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/customers/overdue', {
        params: { companyId: activeCompanyId }
      });
      return data.data as Customer[];
    },
  });
}
