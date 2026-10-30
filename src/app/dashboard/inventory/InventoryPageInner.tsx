"use client";

import { useState, useRef } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { formatMoney } from "@/lib/format";
import { ProductRecord } from "@/lib/db";

const CATEGORY_ABBR: Record<string, string> = {
  salon: "SA",
  shop: "SH",
  restaurant: "RE",
  grocery: "GR",
  pharmacy: "PH",
  electronics: "EL",
  clothing: "CL",
  other: "OT",
  "hair care": "HC",
  "skin care": "SC",
  "food & beverage": "FB",
  "home & garden": "HG",
};

function generateSku(categoryName: string): string {
  const abbr = CATEGORY_ABBR[categoryName.toLowerCase()] || "GEN";
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${abbr}-${digits}`;
}

async function compressImage(file: File, maxSizeBytes = 500 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;

        const maxDim = 800;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);

        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);

        while (dataUrl.length > maxSizeBytes * 1.37 && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function InventoryPage() {
  const { data: products, loading, mutate: mutateProduct, remove: removeProduct } = useProducts();
  const { data: categories } = useCategories();
  const { data: business } = useBusinessSettings();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    buyingPrice: "",
    sellingPrice: "",
    quantity: "",
    lowStock: "5",
    isService: false,
    categoryId: "",
  });
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [generatedSku, setGeneratedSku] = useState<string | null>(null);

  const allProducts = products ?? [];
  const allCategories = categories ?? [];

  const filtered = allProducts.filter((p) => {
    const matchCategory = !selectedCategory || p.categoryId === selectedCategory;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch && !p.deletedAt;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", sku: "", buyingPrice: "", sellingPrice: "", quantity: "", lowStock: "5", isService: false, categoryId: "" });
    setImageDataUrl(null);
    setGeneratedSku(null);
    setShowModal(true);
  };

  const openEdit = (p: ProductRecord) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku || "",
      buyingPrice: String(p.buyingPrice),
      sellingPrice: String(p.sellingPrice),
      quantity: String(p.quantity),
      lowStock: String(p.lowStock),
      isService: p.isService,
      categoryId: p.categoryId || "",
    });
    setImageDataUrl(p.imageUrl || null);
    setGeneratedSku(null);
    setShowModal(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await compressImage(file);
    setImageDataUrl(dataUrl);
  };

  const save = async () => {
    const now = new Date().toISOString();

    let sku = form.sku || editing?.sku || undefined;
    let skuToShow = sku;
    if (!editing && !sku) {
      const catName = allCategories.find((c) => c.id === form.categoryId)?.name || "";
      sku = generateSku(catName);
      skuToShow = sku;
      setGeneratedSku(sku);
    }

    const thumbnailUrl = imageDataUrl || undefined;

    const record: ProductRecord = {
      id: editing?.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      businessId: business?.id || "",
      name: form.name,
      sku,
      buyingPrice: parseFloat(form.buyingPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      quantity: parseInt(form.quantity) || 0,
      lowStock: parseInt(form.lowStock) || 5,
      isService: form.isService,
      isActive: true,
      categoryId: form.categoryId || undefined,
      imageUrl: imageDataUrl || undefined,
      thumbnailUrl,
      syncStatus: "pending",
      updatedAt: now,
      createdAt: editing?.createdAt || now,
    };
    await mutateProduct(record);
    if (!editing) {
      setGeneratedSku(sku || null);
    } else {
      setShowModal(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this product?")) return;
    await removeProduct(id);
  };

  return (
    <div className="space-y-8 font-reading">
      {/* Header — ruled, 3:1 split */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-ink">Inventory</h1>
          <p className="font-display text-sm text-secondary mt-1">
            {allProducts.length} products across {allCategories.length} categories
          </p>
        </div>
        <button
          onClick={openAdd}
          className="np-btn np-btn--accent font-display font-black px-5 py-2.5 flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-rule bg-ground text-ink text-sm font-display focus:outline-none focus:border-accent focus:ring-0"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 text-xs font-display font-black whitespace-nowrap border border-rule ${
              !selectedCategory ? "bg-accent text-ground" : "text-secondary hover:text-ink"
            }`}
          >
            All
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 text-xs font-display font-black whitespace-nowrap border border-rule ${
                selectedCategory === cat.id ? "bg-accent text-ground" : "text-secondary hover:text-ink"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="border border-rule overflow-hidden bg-ground">
        {loading ? (
          <div className="p-12 text-center text-secondary">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-secondary">
            <svg className="w-10 h-10 mx-auto mb-3 text-secondary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p>No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-display">
              <thead>
                <tr className="border-b border-rule">
                  <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-secondary">Product</th>
                  <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-secondary hidden md:table-cell">Category</th>
                  <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-secondary text-right">Cost</th>
                  <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-secondary text-right">Price</th>
                  <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-secondary text-center">Stock</th>
                  <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-secondary text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-rule">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {p.thumbnailUrl ? (
                          <img
                            src={p.thumbnailUrl}
                            alt={p.name}
                            className="w-9 h-9 object-cover border border-rule flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 border border-rule flex items-center justify-center flex-shrink-0 bg-ground">
                            <svg className="w-4 h-4 text-secondary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-black text-ink">{p.name}</div>
                          {p.sku && <div className="text-xs text-secondary font-mono">{p.sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-secondary hidden md:table-cell">
                      {allCategories.find((c) => c.id === p.categoryId)?.name || "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-secondary text-right whitespace-nowrap">
                      {formatMoney(p.buyingPrice)}
                    </td>
                    <td className="px-5 py-3 text-sm font-black text-ink text-right whitespace-nowrap">
                      {formatMoney(p.sellingPrice)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {p.isService ? (
                        <span className="text-xs text-secondary font-mono">SVC</span>
                      ) : p.quantity <= p.lowStock ? (
                        <span className="inline-block px-2.5 py-0.5 text-xs font-black text-error">
                          {p.quantity}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 text-xs font-black text-success">
                          {p.quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => openEdit(p)} className="text-xs font-black text-secondary hover:text-accent mr-3">
                        Edit
                      </button>
                      <button onClick={() => remove(p.id)} className="text-xs font-black text-secondary hover:text-error">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-ground/80 backdrop-blur-none flex items-center justify-center z-50 p-4 border-t border-rule">
          <div
            className="border border-rule bg-ground w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-rule pb-3 flex justify-between items-center">
              <h2 className="font-display text-lg font-black text-ink">
                {editing ? "Edit Product" : "Add Product"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="np-btn text-xs px-3 py-1"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 font-reading">
              <div>
                <label className="block text-xs font-display font-black text-secondary mb-2">Product Image</label>
                {imageDataUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={imageDataUrl}
                      alt="Product preview"
                      className="w-24 h-24 object-cover border border-rule"
                    />
                    <button
                      onClick={() => setImageDataUrl(null)}
                      className="absolute -top-2 -right-2 w-6 h-6 border border-rule bg-error text-ground flex items-center justify-center text-xs"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="np-btn text-sm px-4 py-2.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Upload
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="np-btn text-sm px-4 py-2.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Take Photo
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-black text-secondary mb-1">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-rule bg-ground text-ink font-display text-sm focus:outline-none focus:border-accent focus:ring-0"
                  placeholder="Product name"
                />
              </div>

              {editing ? (
                <div>
                  <label className="block text-xs font-display font-black text-secondary mb-1">SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2.5 border border-rule bg-ground text-ink font-mono text-sm focus:outline-none focus:border-accent focus:ring-0"
                    placeholder="SKU-001"
                  />
                </div>
              ) : generatedSku ? (
                <div>
                  <label className="block text-xs font-display font-black text-secondary mb-1">Generated SKU</label>
                  <div className="w-full px-3 py-2.5 border border-rule bg-ground text-ink font-mono text-sm">
                    {generatedSku}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-display font-black text-secondary mb-1">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-rule bg-ground text-ink font-display text-sm focus:outline-none focus:border-accent focus:ring-0"
                >
                  <option value="">None</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-display font-black text-secondary mb-1">Cost Price</label>
                  <input
                    type="number"
                    value={form.buyingPrice}
                    onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })}
                    className="w-full px-3 py-2.5 border border-rule bg-ground text-ink font-display text-sm focus:outline-none focus:border-accent focus:ring-0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-display font-black text-secondary mb-1">Selling Price *</label>
                  <input
                    type="number"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2.5 border border-rule bg-ground text-ink font-display text-sm focus:outline-none focus:border-accent focus:ring-0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-display font-black text-secondary mb-1">Quantity</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2.5 border border-rule bg-ground text-ink font-display text-sm focus:outline-none focus:border-accent focus:ring-0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-display font-black text-secondary mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    value={form.lowStock}
                    onChange={(e) => setForm({ ...form, lowStock: e.target.value })}
                    className="w-full px-3 py-2.5 border border-rule bg-ground text-ink font-display text-sm focus:outline-none focus:border-accent focus:ring-0"
                    placeholder="5"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isService}
                  onChange={(e) => setForm({ ...form, isService: e.target.checked })}
                  className="w-4 h-4 border border-rule bg-ground text-accent focus:ring-0"
                />
                <span className="text-sm font-reading text-ink">This is a service (no stock tracking)</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-rule text-secondary font-display text-sm font-black hover:text-ink"
              >
                {generatedSku ? "Close" : "Cancel"}
              </button>
              <button
                onClick={save}
                disabled={!form.name || !form.sellingPrice}
                className="flex-1 px-4 py-2.5 border border-accent bg-accent text-ground font-display text-sm font-black hover:bg-ground hover:text-accent disabled:opacity-40"
              >
                {editing ? "Update" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
