import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

export function useCompanySettings() {
  return useQuery({
    queryKey: ['settings', 'company'],
    queryFn: async () => {
      const { data } = await api.get('/settings/company');
      return data.data;
    },
    staleTime: 300000,
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await api.put('/settings/company', body);
      return data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['settings', 'company'] });
      // Update user in localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.company) {
        user.company.name = data.name;
        user.company.gstRate = data.gstRate;
        localStorage.setItem('user', JSON.stringify(user));
      }
      toast.success('Company profile updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update company'),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['settings', 'users'],
    queryFn: async () => {
      const { data } = await api.get('/settings/users');
      return data.data;
    },
    staleTime: 60000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; email: string; password: string; role: string; phone?: string }) => {
      const { data } = await api.post('/settings/users', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'users'] });
      toast.success('User created!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create user'),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; role?: string; isActive?: boolean }) => {
      const { data } = await api.put(`/settings/users/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'users'] });
      toast.success('User updated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update user'),
  });
}

export function useLoadDemoData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/settings/load-demo');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success('Demo data loaded successfully!');
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to load demo data'),
  });
}

export function useClearCompanyData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      const { data } = await api.post('/settings/clear-data', { password });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success('Workspace data cleared successfully!');
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to clear data'),
  });
}

export function useSyncTally() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/settings/sync-tally');
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries();
      toast.success(data.message || 'Tally database synchronized successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to sync with Tally');
    },
  });
}

