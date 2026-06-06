import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, CheckCircle2, ChevronLeft, ChevronRight, Tag, Weight, Ruler } from "lucide-react";
import { AP_CATALOG, CATALOG_BRANDS, CATALOG_CATEGORIES, type CatalogProduct } from "@/data/apAquaCatalog";

interface ProductCatalogBrowserProps {
  onSelect: (product: CatalogProduct) => void;
  onClose: () => void;
}

const PAGE_SIZE = 10;

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

export function ProductCatalogBrowser({ onSelect, onClose }: ProductCatalogBrowserProps) {
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return AP_CATALOG.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchBrand = selectedBrand === "All" || p.brand === selectedBrand;
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      return matchSearch && matchBrand && matchCat;
    });
  }, [search, selectedBrand, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFilterChange = () => setPage(1);

  const getCategoryClass = (cat: string) =>
    categoryColors[cat] || "bg-gray-100 text-gray-700";



  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
      <div className="bg-surface w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl border border-border shadow-panel flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div>
            <h2 className="font-display font-bold text-base text-foreground">AP Aquaculture Catalog</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} products available</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="px-4 pt-3 pb-2 space-y-2 shrink-0">
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
              placeholder="Search feeds, medicines, supplements…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
            {search && (
              <button onClick={() => { setSearch(""); handleFilterChange(); }}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <select
              value={selectedBrand}
              onChange={(e) => { setSelectedBrand(e.target.value); handleFilterChange(); }}
              className="shrink-0 h-8 px-2.5 rounded-lg border border-border bg-surface text-xs text-foreground outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="All">All Brands</option>
              {CATALOG_BRANDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); handleFilterChange(); }}
              className="shrink-0 h-8 px-2.5 rounded-lg border border-border bg-surface text-xs text-foreground outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="All">All Categories</option>
              {CATALOG_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-display font-semibold text-foreground text-sm">No products found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search or filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 py-2">
              {paged.map((product) => {
                const hasImgError = imgErrors.has(product.id);
                const isHovered = hoveredId === product.id;
                return (
                  <button
                    key={product.id}
                    onClick={() => onSelect(product)}
                    onMouseEnter={() => setHoveredId(product.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`text-left rounded-xl border transition-all duration-150 overflow-hidden ${
                      isHovered
                        ? "border-brand shadow-md bg-brand-light/10 scale-[1.01]"
                        : "border-border bg-surface hover:border-brand/40"
                    }`}
                  >
                    {/* Info */}
                    <div className="relative p-3 min-h-[6rem]">
                      {isHovered && (
                        <div className="absolute top-3 right-3 bg-brand text-white rounded-full p-0.5 shadow-sm">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      <p className="font-display font-semibold text-xs text-foreground leading-tight line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </p>
                      <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${getCategoryClass(product.category)}`}>
                        {product.category}
                      </span>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Weight className="w-2.5 h-2.5" />{product.weight}kg
                        </span>
                        {product.pelletSize && (
                          <span className="flex items-center gap-0.5">
                            <Ruler className="w-2.5 h-2.5" />{product.pelletSize}
                          </span>
                        )}
                      </div>
                      {product.suggestedPrice && (
                        <p className="mt-1.5 text-xs font-display font-bold text-brand">
                          ₹{product.suggestedPrice.toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border shrink-0 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} · {filtered.length} results
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-display font-semibold transition-colors ${
                      pageNum === currentPage
                        ? "bg-brand text-white"
                        : "border border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
