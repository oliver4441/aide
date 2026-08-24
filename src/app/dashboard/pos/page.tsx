"use client";

import { useState } from "react";
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
      setLastSale({ ...sale, items });
      setCart([]);
      setShowCheckout(false);
      setPaidAmount("");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface font-headline">New Sale</h1>
        <p className="text-on-surface-variant text-sm mt-1">Tap products to add to cart</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {productsLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-28 bg-surface-container rounded-xl animate-pulse" />
              ))
            ) : (
              filtered.map((product) => {
                const inCart = cart.find((c) => c.productId === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      inCart
                        ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10"
                        : "bg-surface-container-low border-outline-variant hover:border-primary/30 hover:bg-surface-container/50"
                    }`}
                  >
                    <div className="text-sm font-medium text-on-surface mb-1 truncate">{product.name}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">{formatMoney(product.sellingPrice)}</span>
                      {inCart && (
                        <span className="text-[10px] bg-primary text-on-primary px-1.5 py-0.5 rounded-full font-bold">
                          x{inCart.quantity}
                        </span>
                      )}
                    </div>
                    {!product.isService && (
                      <div className="text-[10px] text-on-surface-variant/60 mt-1">
                        {product.quantity <= product.lowStock ? (
                          <span className="text-danger flex items-center gap-1">
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
        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden flex flex-col h-fit lg:sticky lg:top-4">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="text-lg font-bold text-on-surface font-headline">
              Cart ({cart.reduce((s, c) => s + c.quantity, 0)})
            </h2>
          </div>

          {cart.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant/60 text-sm">
              <svg className="w-10 h-10 mx-auto mb-2 text-on-surface-variant/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Tap products to add them
            </div>
          ) : (
            <>
              <div className="flex-1 max-h-[400px] overflow-y-auto divide-y divide-outline-variant">
                {cart.map((item) => (
                  <div key={item.productId} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-on-surface truncate">{item.name}</div>
                      <div className="text-xs text-on-surface-variant">{formatMoney(item.price)} each</div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-surface-container text-on-surface-variant flex items-center justify-center hover:bg-surface-container-high transition-colors text-sm"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-on-surface">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-surface-container text-on-surface-variant flex items-center justify-center hover:bg-surface-container-high transition-colors text-sm"
                      >
                        +
                      </button>
                    </div>
                    <div className="ml-3 text-sm font-bold text-on-surface whitespace-nowrap">
                      {formatMoney(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-outline-variant p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span className="text-on-surface font-bold">{formatMoney(total)}</span>
                </div>

                {/* Payment Method */}
                <div className="flex gap-2">
                  {["CASH", "MOBILE_MONEY", "CARD"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        paymentMethod === m
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface-variant hover:text-on-surface"
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
                  className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-40 shadow-lg shadow-primary/20"
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCheckout(false)}>
          <div
            className="bg-surface-container-low border border-outline-variant rounded-2xl w-full max-w-sm p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-on-surface text-center font-headline">Confirm Payment</h2>

            <div className="text-center">
              <div className="text-3xl font-bold text-primary font-headline">{formatMoney(total)}</div>
              <div className="text-xs text-on-surface-variant mt-1">via {paymentMethod === "MOBILE_MONEY" ? "M-Pesa" : paymentMethod}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Amount Paid</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
            </div>

            {paid >= total && (
              <div className="text-center text-sm">
                <span className="text-on-surface-variant">Change: </span>
                <span className="text-success font-bold">{formatMoney(change)}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={checkout}
                disabled={paid < total || processing}
                className="flex-1 px-4 py-3 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary-light transition-colors disabled:opacity-40"
              >
                {processing ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-sale receipt prompt */}
      {lastSale && (
        <div className="fixed bottom-24 md:bottom-8 right-4 z-50 flex gap-2">
          <button
            onClick={() => {
              printReceipt(lastSale, business || { name: "Aide Business" });
              setLastSale(null);
            }}
            className="bg-primary text-on-primary font-semibold px-5 py-3 rounded-xl hover:bg-primary-light transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>
          <button
            onClick={() => setLastSale(null)}
            className="bg-surface-container-high text-on-surface-variant px-3 py-3 rounded-xl hover:bg-surface-container-highest transition-colors text-sm"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
