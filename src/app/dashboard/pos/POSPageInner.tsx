"use client";

import { useEffect, useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { formatMoney } from "@/lib/format";
import { printReceipt } from "@/components/receipt/PrintReceipt";
import { SaleRecord, SaleItemRecord } from "@/lib/db";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  isService: boolean;
}

export default function POSPage() {
  const { data: products, loading: productsLoading } = useProducts();
  const { mutate: createSale } = useSales();
  const { data: business } = useBusinessSettings();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [showCheckout, setShowCheckout] = useState(false);
  const [paidAmount, setPaidAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState<(SaleRecord & { items: SaleItemRecord[] }) | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [initialProductHandled, setInitialProductHandled] = useState(false);

  const allProducts = products ?? [];
  const filtered = allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        if (!product.isService && existing.quantity >= product.quantity) return prev;
        return prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.sellingPrice,
          cost: product.buyingPrice,
          quantity: 1,
          isService: product.isService,
        },
      ];
    });
  };

  useEffect(() => {
    if (productsLoading || initialProductHandled || typeof window === "undefined") return;
    const productId = new URLSearchParams(window.location.search).get("product");
    if (!productId) {
      setInitialProductHandled(true);
      return;
    }
    const product = allProducts.find((item) => item.id === productId && item.isActive && !item.deletedAt);
    if (product) {
      addToCart(product);
      setInitialProductHandled(true);
    }
  }, [productsLoading, initialProductHandled, allProducts]);

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.productId !== productId));
    } else {
      setCart((prev) =>
        prev.map((c) => (c.productId === productId ? { ...c, quantity: qty } : c))
      );
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cost = cart.reduce((sum, item) => sum + item.cost * item.quantity, 0);
  const paid = parseFloat(paidAmount) || 0;
  const change = paid - total;

  const checkout = async () => {
    if (total === 0 || paid < total) return;
    setProcessing(true);

    try {
      const saleId = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const businessId = business?.id || "";
      const deviceId = typeof window !== "undefined"
        ? localStorage.getItem("aide_device_id") || "unknown"
        : "unknown";

      const sale: SaleRecord = {
        id: saleId,
        businessId,
        total,
        cost,
        profit: total - cost,
        paid,
        change: Math.max(0, change),
        tax: 0,
        taxRate: business?.taxRate || 0,
        paymentMethod,
        deviceId,
        syncStatus: "pending",
        createdAt: now,
      };

      const items: SaleItemRecord[] = cart.map((c, i) => ({
        id: `${saleId}_item_${i}`,
        saleId,
        productId: c.productId,
        name: c.name,
        quantity: c.quantity,
        price: c.price,
        cost: c.cost,
      }));

      await createSale(sale, items);

      let url: string | null = null;
      try {
        const res = await fetch(`/api/sales/${saleId}/share`);
        if (res.ok) {
          url = (await res.json()).url ?? null;
          if (url) localStorage.setItem(`aide_share_${saleId}`, url);
        }
      } catch {
        /* offline */
      }
      if (!url) {
        try {
          url = localStorage.getItem(`aide_share_${saleId}`);
        } catch {
          /* storage unavailable */
        }
      }
      setShareUrl(url);

      setLastSale({ ...sale, items });
      setCart([]);
      setShowCheckout(false);
      setPaidAmount("");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 font-reading">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-black text-ink">New Sale</h1>
        <p className="font-display text-sm text-secondary mt-1">Tap products to add to cart</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-rule bg-ground text-ink font-display text-sm focus:outline-none focus:border-accent focus:ring-0"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {productsLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-28 border border-rule bg-ground" />
              ))
            ) : (
              filtered.map((product) => {
                const inCart = cart.find((c) => c.productId === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`p-4 border text-left font-display ${
                      inCart
                        ? "border-ink bg-ground"
                        : "border-rule hover:border-ink hover:bg-ground"
                    }`}
                  >
                    <div className="text-sm font-black text-ink mb-1 truncate">{product.name}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-accent">{formatMoney(product.sellingPrice)}</span>
                      {inCart && (
                        <span className="text-[10px] border border-ink bg-ink text-ground px-1.5 py-0.5 font-black">
                          x{inCart.quantity}
                        </span>
                      )}
                    </div>
                    {!product.isService && (
                      <div className="text-[10px] text-secondary mt-1">
                        {product.quantity <= product.lowStock ? (
                          <span className="text-error flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            {product.quantity} left
                          </span>
                        ) : (
                          <span>{product.quantity} in stock</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="border border-rule bg-ground flex flex-col h-fit lg:sticky lg:top-4">
          <div className="px-5 py-4 border-b border-rule">
            <h2 className="font-display text-lg font-black text-ink">
              Cart ({cart.reduce((s, c) => s + c.quantity, 0)})
            </h2>
          </div>

          {cart.length === 0 ? (
            <div className="p-8 text-center text-secondary text-sm font-display">
              <svg className="w-10 h-10 mx-auto mb-2 text-secondary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Tap products to add them
            </div>
          ) : (
            <>
              <div className="flex-1 max-h-[400px] overflow-y-auto divide-y divide-rule">
                {cart.map((item) => (
                  <div key={item.productId} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-ink truncate">{item.name}</div>
                      <div className="text-xs text-secondary">{formatMoney(item.price)} each</div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        className="w-7 h-7 border border-rule bg-ground text-secondary flex items-center justify-center hover:text-ink font-display text-sm"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-black text-ink">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        className="w-7 h-7 border border-rule bg-ground text-secondary flex items-center justify-center hover:text-ink font-display text-sm"
                      >
                        +
                      </button>
                    </div>
                    <div className="ml-3 text-sm font-black text-ink whitespace-nowrap">
                      {formatMoney(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-rule p-5 space-y-3">
                <div className="flex justify-between text-sm font-display">
                  <span className="text-secondary">Subtotal</span>
                  <span className="text-ink font-black">{formatMoney(total)}</span>
                </div>

                <div className="flex gap-2">
                  {["CASH", "MOBILE_MONEY", "CARD"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2 text-xs font-display font-black border border-rule ${
                        paymentMethod === m
                          ? "bg-accent text-ground"
                          : "text-secondary hover:text-ink"
                      }`}
                    >
                      {m === "MOBILE_MONEY" ? "M-Pesa" : m}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setPaidAmount(String(total));
                    setShowCheckout(true);
                  }}
                  disabled={cart.length === 0}
                  className="w-full border border-ink bg-ink text-ground font-display font-black py-3 hover:bg-ground hover:text-ink disabled:opacity-40"
                >
                  Checkout {formatMoney(total)}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-ground/80 flex items-center justify-center z-50 p-4 border-t border-rule">
          <div
            className="border border-rule bg-ground w-full max-w-sm p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-black text-ink text-center">Confirm Payment</h2>

            <div className="text-center">
              <div className="font-display text-3xl font-black text-accent">{formatMoney(total)}</div>
              <div className="text-xs text-secondary mt-1">via {paymentMethod === "MOBILE_MONEY" ? "M-Pesa" : paymentMethod}</div>
            </div>

            <div>
              <label className="block text-xs font-display font-black text-secondary mb-1">Amount Paid</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full px-4 py-3 border border-rule bg-ground text-ink font-display text-lg font-black text-center focus:outline-none focus:border-accent focus:ring-0"
                autoFocus
              />
            </div>

            {paid >= total && (
              <div className="text-center text-sm font-display">
                <span className="text-secondary">Change: </span>
                <span className="text-success font-black">{formatMoney(change)}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 px-4 py-3 border border-rule text-secondary font-display text-sm font-black hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={checkout}
                disabled={paid < total || processing}
                className="flex-1 px-4 py-3 border border-accent bg-accent text-ground font-display text-sm font-black hover:bg-ground hover:text-accent disabled:opacity-40"
              >
                {processing ? "Processing…" : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-sale receipt prompt */}
      {lastSale && (
        <div className="fixed bottom-24 md:bottom-8 right-4 z-50 flex flex-col items-end gap-2">
          <button
            onClick={() => {
              printReceipt(lastSale, business || { name: "Aide Business" }, shareUrl ?? undefined);
              setLastSale(null);
            }}
            className="border border-ink bg-ink text-ground font-display font-black px-5 py-3 flex items-center gap-2 text-sm hover:bg-ground hover:text-accent"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>
          <button
            onClick={async () => {
              const url =
                shareUrl ?? `${window.location.origin}/r/${lastSale.id}`;
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: "Your Receipt",
                    text: `Receipt from ${business?.name || "our shop"} — ${formatMoney(lastSale.total)}`,
                    url,
                  });
                } catch {}
              } else {
                try {
                  await navigator.clipboard.writeText(url);
                  alert("Receipt link copied — paste it in WhatsApp or SMS to send to your customer.");
                } catch {}
              }
              setLastSale(null);
            }}
            className="border border-rule bg-ground text-ink font-display font-black px-5 py-3 hover:bg-ground/70"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Send to Customer
          </button>
          <button
            onClick={() => { setLastSale(null); setShareUrl(null); }}
            className="px-3 py-3 text-secondary font-display text-sm hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
