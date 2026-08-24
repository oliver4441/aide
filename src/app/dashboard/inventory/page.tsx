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
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Inventory</h1>
          <p className="text-on-surface-variant text-sm mt-1">{allProducts.length} products across {allCategories.length} categories</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-xl hover:bg-primary-light transition-colors flex items-center gap-2 text-sm shadow-lg shadow-primary/20"
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
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedCategory ? "bg-primary text-on-primary" : "bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-on-surface"
            }`}
          >
            All
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id ? "bg-primary text-on-primary" : "bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant/60">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant/60">
            <svg className="w-10 h-10 mx-auto mb-3 text-on-surface-variant/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p>No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Product</th>
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">Cost</th>
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">Price</th>
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-center">Stock</th>
                  <th className="px-5 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {p.thumbnailUrl ? (
                          <img
                            src={p.thumbnailUrl}
                            alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover border border-outline-variant flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-on-surface-variant/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-on-surface">{p.name}</div>
                          {p.sku && <div className="text-xs text-on-surface-variant font-mono">{p.sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant hidden md:table-cell">
                      {allCategories.find((c) => c.id === p.categoryId)?.name || "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant text-right whitespace-nowrap">
                      {formatMoney(p.buyingPrice)}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-on-surface text-right whitespace-nowrap">
                      {formatMoney(p.sellingPrice)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {p.isService ? (
                        <span className="text-xs text-on-surface-variant font-mono">SVC</span>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            p.quantity <= p.lowStock
                              ? "bg-danger/15 text-danger"
                              : "bg-success/15 text-success"
                          }`}
                        >
                          {p.quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => openEdit(p)} className="text-xs text-on-surface-variant hover:text-primary mr-3 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => remove(p.id)} className="text-xs text-on-surface-variant hover:text-danger transition-colors">
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-surface-container-low border border-outline-variant rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-on-surface font-headline">
              {editing ? "Edit Product" : "Add Product"}
            </h2>

            <div className="space-y-3">
              {/* Image Section */}
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-2">Product Image</label>
                {imageDataUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={imageDataUrl}
                      alt="Product preview"
                      className="w-24 h-24 rounded-xl object-cover border border-outline-variant"
                    />
                    <button
                      onClick={() => setImageDataUrl(null)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-danger text-on-primary flex items-center justify-center text-xs"
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
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant text-sm hover:bg-surface-container transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Upload
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant text-sm hover:bg-surface-container transition-colors"
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
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Product name"
                />
              </div>

              {/* SKU - auto-generated on new products */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="SKU-001"
                  />
                </div>
              ) : generatedSku ? (
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Generated SKU</label>
                  <div className="w-full px-3 py-2.5 rounded-lg bg-surface-container/50 border border-outline-variant text-on-surface text-sm font-mono">
                    {generatedSku}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">None</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Cost Price</label>
                  <input
                    type="number"
                    value={form.buyingPrice}
                    onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Selling Price *</label>
                  <input
                    type="number"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Quantity</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    value={form.lowStock}
                    onChange={(e) => setForm({ ...form, lowStock: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="5"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isService}
                  onChange={(e) => setForm({ ...form, isService: e.target.checked })}
                  className="w-4 h-4 rounded bg-surface-container border-outline-variant text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-on-surface">This is a service (no stock tracking)</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors"
              >
                {generatedSku ? "Close" : "Cancel"}
              </button>
              <button
                onClick={save}
                disabled={!form.name || !form.sellingPrice}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-40"
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
