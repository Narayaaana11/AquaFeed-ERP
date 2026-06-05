import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useDashboard(range = 'month') {
  return useQuery({
    queryKey: ['reports', 'dashboard', range],
    queryFn: async () => {
      const { data } = await api.get('/reports/dashboard', { params: { range } });
      return data.data;
    },
    staleTime: 60000,
    refetchInterval: 300000, // Refresh every 5 min
  });
}

export function useSalesTrend(range = 'year') {
  return useQuery({
    queryKey: ['reports', 'sales-trend', range],
    queryFn: async () => {
      const { data } = await api.get('/reports/sales-trend', { params: { range } });
      return data.data;
    },
    staleTime: 60000,
  });
}

export function useTopProducts(limit = 5) {
  return useQuery({
    queryKey: ['reports', 'top-products', limit],
    queryFn: async () => {
      const { data } = await api.get('/reports/top-products', { params: { limit } });
      return data.data;
    },
    staleTime: 60000,
  });
}

export function useInventoryValue() {
  return useQuery({
    queryKey: ['reports', 'inventory-value'],
    queryFn: async () => {
      const { data } = await api.get('/reports/inventory-value');
      return { breakdown: data.data, totalValue: data.totalValue };
    },
    staleTime: 60000,
  });
}

export function useExpenseBreakdown(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['reports', 'expense-breakdown', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/expense-breakdown', { params });
      return data.data;
    },
    staleTime: 60000,
  });
}

export function useCustomerOutstanding() {
  return useQuery({
    queryKey: ['reports', 'customer-outstanding'],
    queryFn: async () => {
      const { data } = await api.get('/reports/customer-outstanding');
      return data.data;
    },
    staleTime: 60000,
  });
}

export const exportCSV = async (type: string, from?: string, to?: string) => {
  const response = await api.get('/reports/export-csv', {
    params: { type, from, to },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${type}-report.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
