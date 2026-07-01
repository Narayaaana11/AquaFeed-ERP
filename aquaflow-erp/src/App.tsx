import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { useWebSocketContext } from "@/hooks/useWebSocketContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Products from "./pages/Products.tsx";
import Inventory from "./pages/Inventory.tsx";
import Warehouses from "./pages/Warehouses.tsx";
import Sales from "./pages/Sales.tsx";
import Customers from "./pages/Customers.tsx";
import Expenses from "./pages/Expenses.tsx";
import Reports from "./pages/Reports.tsx";
import Settings from "./pages/Settings.tsx";
import Suppliers from "./pages/Suppliers.tsx";
import PurchaseOrders from "./pages/PurchaseOrders.tsx";
import InvoicePrint from "./pages/InvoicePrint.tsx";
import CreditNotes from "./pages/CreditNotes.tsx";
import Quotations from "./pages/Quotations.tsx";
import NotFound from "./pages/NotFound.tsx";
import { WebSocketProvider } from "@/hooks/useWebSocketContext";
import { AppLogo } from "@/components/AppLogo";
import api from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds cache validity
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      refetchOnWindowFocus: false, // Disable automatic refetch on window focus
      retry: 1, // Limit retries to 1 to fail fast if backend is down
    },
  },
});

import { CompanyProvider } from "@/context/CompanyContext";

const GlobalWebSocketSync = () => {
  const { on, off } = useWebSocketContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleSyncCompleted = (data: any) => {
      console.log("Global sync complete event received", data);
      queryClient.invalidateQueries();
      toast.success("Real-time data synced from Tally!");
    };

    on("TALLY_SYNC_COMPLETED", handleSyncCompleted);

    return () => {
      off("TALLY_SYNC_COMPLETED");
    };
  }, [on, off, queryClient]);

  return null;
};

const ProtectedLayout = () => {
  const isTokenValid = () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) return false;
    try {
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return false;
      const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")));
      if (decodedPayload.exp && decodedPayload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  return isTokenValid() ? (
    <CompanyProvider>
      <WebSocketProvider>
        <GlobalWebSocketSync />
        <Outlet />
      </WebSocketProvider>
    </CompanyProvider>
  ) : (
    <Navigate to="/login" replace />
  );
};

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading AquaFeed ERP...");
  const [isServerWaking, setIsServerWaking] = useState(false);

  useEffect(() => {
    // Start pre-warm wake-up call to the Render backend immediately on load
    const wakeUpTimer = setTimeout(() => {
      setIsServerWaking(true);
      setLoadingText("Waking up server (Render Free Tier cold start, this might take up to a minute)...");
    }, 1500);

    api.get("/health")
      .then(() => {
        clearTimeout(wakeUpTimer);
        setIsReady(true);
      })
      .catch((err) => {
        // Fallback to loading the app even if health check fails so the user is not blocked
        console.warn("⚠️ Health check pre-warm failed or timed out:", err);
        clearTimeout(wakeUpTimer);
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-6">
          <AppLogo size="lg" className="mx-auto mb-4" />
          <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground transition-all duration-300">{loadingText}</p>
          {isServerWaking && (
            <p className="text-[11px] text-muted-foreground/60 mt-2 italic animate-pulse">
              Services on free hosting platforms spin down after inactivity. Thank you for your patience!
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Auth Routes (public) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected App Routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/warehouses" element={<Warehouses />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/sales/:id/print" element={<InvoicePrint />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/credit-notes" element={<CreditNotes />} />
              <Route path="/quotations" element={<Quotations />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
