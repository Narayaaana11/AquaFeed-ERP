import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from '@/context/CompanyContext';

export function useDashboard(range = 'month') {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['reports', 'dashboard', range, activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/reports/dashboard', { params: { range, companyId: activeCompanyId } });
      return data.data;
    },
    staleTime: 60000,
    refetchInterval: 300000, // Refresh every 5 min
  });
}

export function useSalesTrend(range = 'year') {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['reports', 'sales-trend', range, activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/reports/sales-trend', { params: { range, companyId: activeCompanyId } });
      return data.data;
    },
    staleTime: 60000,
  });
}

export function useTopProducts(limit = 5) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['reports', 'top-products', limit, activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/reports/top-products', { params: { limit, companyId: activeCompanyId } });
      return data.data;
    },
    staleTime: 60000,
  });
}

export function useInventoryValue() {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['reports', 'inventory-value', activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/reports/inventory-value', { params: { companyId: activeCompanyId } });
      return { breakdown: data.data, totalValue: data.totalValue };
    },
    staleTime: 60000,
  });
}

export function useExpenseBreakdown(params?: { from?: string; to?: string }) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['reports', 'expense-breakdown', params, activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/reports/expense-breakdown', { params: { ...params, companyId: activeCompanyId } });
      return data.data;
    },
    staleTime: 60000,
  });
}

export function useCustomerOutstanding() {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['reports', 'customer-outstanding', activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get('/reports/customer-outstanding', { params: { companyId: activeCompanyId } });
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
