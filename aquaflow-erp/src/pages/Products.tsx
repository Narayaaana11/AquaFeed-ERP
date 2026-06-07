import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProductCatalogBrowser } from "@/components/ProductCatalogBrowser";
import { FormInput, FormSelect, FormNumber } from "@/components/forms";
import {
  Search, Plus, Pencil, Trash2, X, Package,
  BookOpen, ChevronLeft, ChevronRight, Tag,
  AlertTriangle, Weight
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { validationRules } from "@/lib/validations";
import {
  useProducts, useCreateProduct, useUpdateProduct,
  useDeleteProduct, type Product
} from "@/hooks/useProducts";
import { useProducts as useProductsWebSocket } from "@/hooks/useModuleWebSocket";
import { LOW_STOCK_THRESHOLD } from "@/lib/formatters";
import { AP_CATALOG, type CatalogProduct } from "@/data/apAquaCatalog";
import { createPortal } from "react-dom";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const brands = [
  "Avanti Feeds", "CP Aquaculture", "Cargill", "Growel Feeds",
  "ABIS (IB Group)", "Godrej Agrovet", "Waterbase", "Organica Biotech",
  "Aqua Vet", "AquaShield", "INVE Aquaculture", "Nutreco", "Nutrimix",
  "Agri Chemicals", "Other"
];

const categories = [
  "Floating Fish Feed", "Sinking Fish Feed", "Shrimp Feed (Vannamei)",
  "Scampi Feed", "Starter Pellets", "Grower Pellets", "Finisher Pellets",
  "Probiotics & Supplements", "Minerals & Chemicals", "Medicines & Veterinary", "Other"
];

interface ProductFormData {
  name: string; brand: string; category: string;
  pelletSize: string; weight: number; price: number;
  purchasePrice: number; stock: number; lowStockThreshold: number;
  description: string; imageUrl: string;
}

const categoryColors: Record<string, string> = {
  "Shrimp Feed (Vannamei)": "bg-sky-100 text-sky-700",
  "Floating Fish Feed": "bg-emerald-100 text-emerald-700",
  "Sinking Fish Feed": "bg-blue-100 text-blue-700",
  "Scampi Feed": "bg-violet-100 text-violet-700",
  "Starter Pellets": "bg-amber-100 text-amber-700",
  "Grower Pellets": "bg-lime-100 text-lime-700",
  "Finisher Pellets": "bg-orange-100 text-orange-700",
  "Probiotics & Supplements": "bg-pink-100 text-pink-700",
  "Minerals & Chemicals": "bg-slate-100 text-slate-700",
  "Medicines & Veterinary": "bg-red-100 text-red-700",
};

function getCatClass(cat: string) {
  return categoryColors[cat] || "bg-gray-100 text-gray-700";
}

function ProductSearchCombobox({ onSelect }: { onSelect: (p: CatalogProduct) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="w-full flex items-center justify-between h-10 px-3 rounded-xl border border-border bg-background text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
        >
          Search catalog to auto-fill...
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[100]" align="start">
        <Command>
          <CommandInput placeholder="Search AP catalog..." />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              {AP_CATALOG.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name + " " + product.brand}
                  onSelect={() => {
                    setOpen(false);
                    onSelect(product);
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{product.name}</span>
                    <span className="text-xs text-muted-foreground">{product.brand} · {product.category}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ProductImage({ product }: { product: Product }) {
  const [err, setErr] = useState(false);
  if (!product.imageUrl || err) {
    return (
      <div className="w-14 h-14 rounded-xl bg-brand-light/30 flex items-center justify-center shrink-0">
        <Package className="w-6 h-6 text-brand/60" />
      </div>
    );
  }
  return (
    <img
      src={product.imageUrl}
      alt={product.name}
      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border"
      onError={() => setErr(true)}
    />
  );
}

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All Brands");
  const [selectedStockFilter, setSelectedStockFilter] = useState("All Stock");
  const [page, setPage] = useState(1);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { data: allProducts = [], isLoading, refetch } = useProducts({
    search: searchQuery || undefined,
    brand: selectedBrand !== "All Brands" ? selectedBrand : undefined,
    stockStatus:
      selectedStockFilter === "Low Stock" ? "low_stock"
        : selectedStockFilter === "In Stock" ? "in_stock"
          : undefined,
  });

  // WebSocket integration for product updates
  useProductsWebSocket(
    () => {
      console.log('📦 Product list updated via WebSocket (created)');
      setLastUpdate(new Date());
      refetch();
    },
    () => {
      console.log('📦 Product list updated via WebSocket (updated)');
      setLastUpdate(new Date());
      refetch();
    },
    () => {
      console.log('📦 Product list updated via WebSocket (deleted)');
      setLastUpdate(new Date());
      refetch();
    }
  );

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const products = useMemo(
    () => allProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [allProducts, currentPage]
  );

  const lowStockCount = allProducts.filter(
    (p) => p.stock < (p.lowStockThreshold || LOW_STOCK_THRESHOLD)
  ).length;

  const { register: registerAdd, handleSubmit: handleAddSubmit, reset: resetAdd,
    setValue: setAddValue, formState: { errors: addErrors } } =
    useForm<ProductFormData>({ mode: "onBlur" });

  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit,
    formState: { errors: editErrors } } =
    useForm<ProductFormData>({ mode: "onBlur" });

  const onAddSubmit = async (data: ProductFormData) => {
    await createProduct.mutateAsync(data);
    resetAdd();
    setIsAddOpen(false);
  };

  const onEditSubmit = async (data: ProductFormData) => {
    if (!selectedProduct) return;
    await updateProduct.mutateAsync({ id: selectedProduct._id, ...data });
    resetEdit();
    setIsEditOpen(false);
    setSelectedProduct(null);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    resetEdit({
      name: product.name, brand: product.brand, category: product.category,
      pelletSize: product.pelletSize || "", weight: product.weight,
      price: product.price, purchasePrice: product.purchasePrice || 0,
      stock: product.stock, lowStockThreshold: product.lowStockThreshold,
      description: product.description || "", imageUrl: product.imageUrl || "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    await deleteProduct.mutateAsync(selectedProduct._id);
    setIsDeleteOpen(false);
    setSelectedProduct(null);
  };

  // When a product is picked from catalog → pre-fill Add form
  const handleCatalogSelect = (catalogProduct: CatalogProduct) => {
    setIsCatalogOpen(false);
    setIsAddOpen(true);
    setTimeout(() => {
      setAddValue("name", catalogProduct.name);
      setAddValue("brand", catalogProduct.brand);
      setAddValue("category", catalogProduct.category);
      setAddValue("pelletSize", catalogProduct.pelletSize || "");
      setAddValue("weight", catalogProduct.weight);
      setAddValue("price", catalogProduct.suggestedPrice || 0);
      setAddValue("purchasePrice", catalogProduct.suggestedPurchasePrice || 0);
      setAddValue("description", catalogProduct.description);
      setAddValue("imageUrl", catalogProduct.imageUrl);
    }, 50);
  };

  const handleSearchChange = (v: string) => { setSearchQuery(v); setPage(1); };
  const handleBrandChange = (v: string) => { setSelectedBrand(v); setPage(1); };
  const handleStockChange = (v: string) => { setSelectedStockFilter(v); setPage(1); };

  return (
    <AppLayout title="Products" subtitle="Manage your product catalogue">
      <PageHeader
        title="Product Catalogue"
        description={`${allProducts.length} products · ${lowStockCount} low stock`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCatalogOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-sm font-display font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              <BookOpen className="w-4 h-4 text-brand" />
              <span className="hidden sm:inline">Browse Catalog</span>
            </button>
            <button
              onClick={() => { resetAdd(); setIsAddOpen(true); }}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Product</span>
            </button>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-surface flex-1">
          <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground text-sm"
            placeholder="Search products…"
          />
          {searchQuery && (
            <button onClick={() => handleSearchChange("")}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          
      <Select value={String(selectedBrand)} onValueChange={(val) => handleBrandChange(val)}>
        <SelectTrigger className="flex-1 sm:flex-none h-10 px-3 rounded-xl border border-border bg-surface text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          
            <SelectItem value={"All Brands".toString()}>All Brands</SelectItem>
            {brands.map((b) => <SelectItem value={{b}.toString()}>{b}</SelectItem>)}
          
        </SelectContent>
      </Select>
    
          
      <Select value={String(selectedStockFilter)} onValueChange={(val) => handleStockChange(val)}>
        <SelectTrigger className="flex-1 sm:flex-none h-10 px-3 rounded-xl border border-border bg-surface text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          
            <SelectItem value={"All Stock".toString()}>All Stock</SelectItem>
            <SelectItem value={"Low Stock".toString()}>Low Stock</SelectItem>
            <SelectItem value={"In Stock".toString()}>In Stock</SelectItem>
          
        </SelectContent>
      </Select>
    
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
        </div>
      ) : allProducts.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-brand" />
          </div>
          <h3 className="font-display font-bold text-foreground text-base mb-1">No products yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-5">
            Start by browsing the AP Aquaculture catalog or add a product manually.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsCatalogOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors"
            >
              <BookOpen className="w-4 h-4 text-brand" /> Browse Catalog
            </button>
            <button
              onClick={() => { resetAdd(); setIsAddOpen(true); }}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Manually
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Card Grid */}
          <div className="sm:hidden space-y-3">
            {products.map((p) => {
              const threshold = p.lowStockThreshold || LOW_STOCK_THRESHOLD;
              const isLow = p.stock < threshold;
              const isCritical = p.stock < threshold / 2;
              return (
                <div
                  key={p._id}
                  className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-3">
                    <ProductImage product={p} />
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-sm text-foreground leading-tight line-clamp-2">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.brand}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${getCatClass(p.category)}`}>
                        {p.category}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-border/50 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <p className="text-muted-foreground text-[10px]">Sale Price</p>
                        <p className="font-display font-bold text-foreground">₹{p.price.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px]">Stock</p>
                        <div className="flex items-center gap-1">
                          <p className={`font-display font-bold ${isCritical ? "text-destructive" : isLow ? "text-warning" : "text-foreground"}`}>
                            {p.stock} bags
                          </p>
                          {isCritical && <AlertTriangle className="w-3 h-3 text-destructive" />}
                          {!isCritical && isLow && <AlertTriangle className="w-3 h-3 text-warning" />}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px]">Weight</p>
                        <p className="font-semibold text-foreground">{p.weight}kg</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(p)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-brand hover:bg-brand-light transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setSelectedProduct(p); setIsDeleteOpen(true); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-4 py-3 text-left text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Size / Wt</th>
                  <th className="px-4 py-3 text-left text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const threshold = p.lowStockThreshold || LOW_STOCK_THRESHOLD;
                  const isLow = p.stock < threshold;
                  const isCritical = p.stock < threshold / 2;
                  return (
                    <tr key={p._id} className="border-b border-border last:border-0 hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductImage product={p} />
                          <div>
                            <p className="font-medium text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getCatClass(p.category)}`}>
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.pelletSize && <span>{p.pelletSize} · </span>}{p.weight}kg
                      </td>
                      <td className="px-4 py-3 font-display font-semibold text-foreground">
                        ₹{p.price.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold ${isCritical ? "text-destructive" : isLow ? "text-warning" : "text-foreground"}`}>
                            {p.stock}
                          </span>
                          {isCritical && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive">Critical</span>
                          )}
                          {!isCritical && isLow && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning">Low</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-light transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => { setSelectedProduct(p); setIsDeleteOpen(true); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, allProducts.length)} of {allProducts.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pg: number;
                  if (totalPages <= 5) pg = i + 1;
                  else if (currentPage <= 3) pg = i + 1;
                  else if (currentPage >= totalPages - 2) pg = totalPages - 4 + i;
                  else pg = currentPage - 2 + i;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-display font-semibold transition-colors ${pg === currentPage ? "bg-brand text-white" : "border border-border text-muted-foreground hover:bg-secondary"
                        }`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Catalog Browser */}
      {isCatalogOpen && (
        <ProductCatalogBrowser
          onSelect={handleCatalogSelect}
          onClose={() => setIsCatalogOpen(false)}
        />
      )}

      {/* Add Product Modal */}
      {isAddOpen && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-border shadow-panel max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div>
                <h2 className="font-display font-bold text-lg text-foreground">Add Product</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Enter product details or browse catalog</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setIsCatalogOpen(true); }}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-display font-semibold text-brand hover:bg-brand-light transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Catalog
                </button>
                <button onClick={() => setIsAddOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="px-5 pt-4 pb-2 border-b border-border bg-muted/20">
              <label className="text-xs font-display font-semibold text-foreground mb-1.5 block">
                Quick Fill
              </label>
              <ProductSearchCombobox onSelect={handleCatalogSelect} />
            </div>

            <form onSubmit={handleAddSubmit(onAddSubmit)} className="p-5 space-y-4">
              <FormInput
                label="Product Name"
                placeholder="Avanti Manamei Vannamei Starter"
                {...registerAdd("name", validationRules.productName)}
                error={addErrors.name}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  label="Brand"
                  options={brands.map((b) => ({ value: b, label: b }))}
                  {...registerAdd("brand", { required: "Brand is required" })}
                  error={addErrors.brand}
                />
                <FormSelect
                  label="Category"
                  options={categories.map((c) => ({ value: c, label: c }))}
                  {...registerAdd("category")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Pellet Size" placeholder="2mm" {...registerAdd("pelletSize")} />
                <FormNumber
                  label="Weight (kg)"
                  placeholder="25"
                  {...registerAdd("weight", { required: "Required", min: { value: 0.1, message: "Must be > 0" } })}
                  error={addErrors.weight}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormNumber
                  label="Sale Price (₹)"
                  prefix="₹"
                  placeholder="3200"
                  {...registerAdd("price", validationRules.price)}
                  error={addErrors.price}
                />
                <FormNumber label="Purchase Price (₹)" prefix="₹" placeholder="2600" {...registerAdd("purchasePrice")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormNumber
                  label="Stock Qty"
                  placeholder="0"
                  {...registerAdd("stock", validationRules.quantity)}
                  error={addErrors.stock}
                />
                <FormNumber label="Low Stock Alert" placeholder="10" {...registerAdd("lowStockThreshold")} />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProduct.isPending}
                  className="flex-1 h-11 rounded-xl bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {createProduct.isPending ? (
                    <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Adding…</span></>
                  ) : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Product Modal */}
      {isEditOpen && selectedProduct && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-border shadow-panel max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <ProductImage product={selectedProduct} />
                <div>
                  <h2 className="font-display font-bold text-base text-foreground">Edit Product</h2>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{selectedProduct.name}</p>
                </div>
              </div>
              <button onClick={() => { setIsEditOpen(false); setSelectedProduct(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pt-4 pb-2 border-b border-border bg-muted/20">
              <label className="text-xs font-display font-semibold text-foreground mb-1.5 block">
                Update from Catalog
              </label>
              <ProductSearchCombobox onSelect={handleCatalogSelect} />
            </div>

            <form onSubmit={handleEditSubmit(onEditSubmit)} className="p-5 space-y-4">
              <FormInput label="Product Name" {...registerEdit("name", validationRules.productName)} error={editErrors.name} />
              <div className="grid grid-cols-2 gap-3">
                <FormSelect label="Brand" options={brands.map((b) => ({ value: b, label: b }))} {...registerEdit("brand", { required: "Required" })} error={editErrors.brand} />
                <FormSelect label="Category" options={categories.map((c) => ({ value: c, label: c }))} {...registerEdit("category")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Pellet Size" {...registerEdit("pelletSize")} />
                <FormNumber label="Weight (kg)" {...registerEdit("weight", { required: "Required", min: { value: 0.1, message: "Must be > 0" } })} error={editErrors.weight} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormNumber label="Sale Price (₹)" prefix="₹" {...registerEdit("price", validationRules.price)} error={editErrors.price} />
                <FormNumber label="Purchase Price (₹)" prefix="₹" {...registerEdit("purchasePrice")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormNumber label="Stock Qty" {...registerEdit("stock", validationRules.quantity)} error={editErrors.stock} />
                <FormNumber label="Low Stock Alert" {...registerEdit("lowStockThreshold")} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setIsEditOpen(false); setSelectedProduct(null); }} className="flex-1 h-11 rounded-xl border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors">Cancel</button>
                <button type="button" onClick={() => { setIsDeleteOpen(true); }} className="h-11 px-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm font-display font-semibold hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                <button type="submit" disabled={updateProduct.isPending} className="flex-1 h-11 rounded-xl bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {updateProduct.isPending ? (<><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Saving…</span></>) : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This cannot be undone.`}
        confirmText="Delete"
        isDestructive
        isLoading={deleteProduct.isPending}
        onConfirm={handleDelete}
        onCancel={() => { setIsDeleteOpen(false); setSelectedProduct(null); }}
      />
    </AppLayout>
  );
}
