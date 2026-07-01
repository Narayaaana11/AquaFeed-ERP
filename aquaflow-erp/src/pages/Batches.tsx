import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatNumber } from "@/lib/utils";
import api from "@/lib/api";
import { Layers, Search } from "lucide-react";
import { useState } from "react";

interface Batch {
  _id: string;
  name: string;
  product?: { name: string; sku: string };
  productName?: string;
  warehouse?: { name: string; code: string };
  warehouseName?: string;
  quantity: number;
  rate: number;
  value: number;
  manufacturedOn?: string;
}

export default function Batches() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const response = await api.get("/batches");
      return response.data.data as Batch[];
    },
  });

  const batches = data || [];
  
  const filteredBatches = batches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.warehouseName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Batch Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time batch allocations synced from Tally
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border">
        <div className="relative w-full sm:w-72 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search batches, products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/50 text-muted-foreground font-display">
              <tr>
                <th className="px-6 py-4 font-semibold">Batch Name</th>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold">Warehouse (Godown)</th>
                <th className="px-6 py-4 font-semibold text-right">Quantity</th>
                <th className="px-6 py-4 font-semibold text-right">Rate</th>
                <th className="px-6 py-4 font-semibold text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-16 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-16 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-secondary rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                        <Layers className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <p className="font-medium text-foreground">No batches found</p>
                      <p className="text-sm mt-1">Try adjusting your search</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch._id} className="hover:bg-secondary/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">{batch.name}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {batch.productName || batch.product?.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {batch.warehouseName || batch.warehouse?.name || "Main Location"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                        batch.quantity > 0 ? "bg-success/10 text-success" : 
                        batch.quantity < 0 ? "bg-destructive/10 text-destructive" : 
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {formatNumber(batch.quantity)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      {formatCurrency(batch.rate)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-foreground">
                      {formatCurrency(batch.value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
