import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Manager' | 'Sales Staff' | 'Accountant';
  phone?: string;
  company: {
    _id: string;
    name: string;
    gstNumber?: string;
    gstRate: number;
    invoicePrefix: string;
    address?: string;
    phone?: string;
    logoUrl?: string;
  };
}

const getStoredUser = (): AuthUser | null => {
  try {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const register = useCallback(async (formData: {
    name: string; email: string; password: string; companyName: string; phone?: string; gstNumber?: string; logo?: File;
  }) => {
    setIsLoading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('companyName', formData.companyName);
      if (formData.phone) data.append('phone', formData.phone);
      if (formData.gstNumber) data.append('gstNumber', formData.gstNumber);
      if (formData.logo) data.append('logo', formData.logo);

      const response = await api.post('/auth/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message
        || (err.code === 'ERR_NETWORK' ? 'Cannot connect to the server. Please try again later.' : 'Registration failed.');
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch {
      logout();
    }
  }, [logout]);

  return { user, isLoading, error, login, register, logout, refreshUser };
}
