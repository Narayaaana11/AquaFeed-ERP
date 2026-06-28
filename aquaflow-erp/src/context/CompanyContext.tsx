import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Company {
  _id: string;
  name: string;
}

interface CompanyContextType {
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(() => {
    return localStorage.getItem('activeCompanyId') || null;
  });
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (activeCompanyId) {
      localStorage.setItem('activeCompanyId', activeCompanyId);
    } else {
      localStorage.removeItem('activeCompanyId');
    }
  }, [activeCompanyId]);

  return (
    <CompanyContext.Provider value={{ activeCompanyId, setActiveCompanyId, companies, setCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
