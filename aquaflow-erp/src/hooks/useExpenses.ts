import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useCompany } from '@/context/CompanyContext';

export interface Expense {
  _id: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
  paymentMethod: string;
  reference?: string;
  status: string;
  submittedBy?: { _id: string; name: string };
  approvedBy?: { _id: string; name: string };
  createdAt: string;
}

export function useExpenses(params?: { search?: string; category?: string; status?: string; from?: string; to?: string }) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['expenses', params, activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/expenses', { 
        params: { ...params, companyId: activeCompanyId } 
      });
      return { data: data.data as Expense[], total: data.total };
    },
    staleTime: 30000,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Expense>) => {
      const { data } = await api.post('/expenses', body);
      return data.data as Expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Expense recorded!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add expense'),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Expense> & { id: string }) => {
      const { data } = await api.put(`/expenses/${id}`, body);
      return data.data as Expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update expense'),
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/expenses/${id}/approve`);
      return data.data as Expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense approved!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to approve expense'),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense deleted!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete expense'),
  });
}
