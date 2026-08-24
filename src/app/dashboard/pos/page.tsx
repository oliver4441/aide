"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  sellingPrice: number;
  buyingPrice: number;
  quantity: number;
  lowStock: number;
  isService: boolean;
  category?: { name: string } | null;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  isService: boolean;
}

function formatKES(n: number) {
  return "KSh " + n.toLocaleString("en-KE");
}

export default function POSPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [showCheckout, setShowCheckout] = useState(false);
  const [paidAmount, setPaidAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then(setProducts);
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product: Product) => {
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
  const paid = parseFloat(paidAmount) || 0;
  const change = paid - total;

  const checkout = async () => {
    if (total === 0 || paid < total) return;
    setProcessing(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          paymentMethod,
          paid,
        }),
      });

      if (res.ok) {
        setCart([]);
        setShowCheckout(false);
        setPaidAmount("");
        router.push("/sales");
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-headline)]">New Sale</h1>
        <p className="text-zinc-400 text-sm mt-1">Tap products to add to cart</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-surface border border-dark-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((product) => {
              const inCart = cart.find((c) => c.productId === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    inCart
                      ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10"
                      : "bg-dark-surface border-dark-border hover:border-primary/30 hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="text-sm font-medium text-zinc-200 mb-1 truncate">{product.name}</div>
                  {product.category && (
                    <div className="text-[10px] text-zinc-500 mb-2">{product.category.name}</div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">{formatKES(product.sellingPrice)}</span>
                    {inCart && (
                      <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-bold">
                        ×{inCart.quantity}
                      </span>
                    )}
                  </div>
                  {!product.isService && (
                    <div className="text-[10px] text-zinc-600 mt-1">
                      {product.quantity <= product.lowStock ? (
                        <span className="text-red-400">⚠ {product.quantity} left</span>
                      ) : (
                        <span>{product.quantity} in stock</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden flex flex-col h-fit lg:sticky lg:top-4">
          <div className="px-5 py-4 border-b border-dark-border">
            <h2 className="text-lg font-bold text-white font-[family-name:var(--font-headline)]">
              Cart ({cart.reduce((s, c) => s + c.quantity, 0)})
            </h2>
          </div>

          {cart.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 text-sm">
              <p className="text-3xl mb-2">🛒</p>
              Tap products to add them
            </div>
          ) : (
            <>
              <div className="flex-1 max-h-[400px] overflow-y-auto divide-y divide-dark-border">
                {cart.map((item) => (
                  <div key={item.productId} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-200 truncate">{item.name}</div>
                      <div className="text-xs text-zinc-500">{formatKES(item.price)} each</div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 transition-colors text-sm"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 transition-colors text-sm"
                      >
                        +
                      </button>
                    </div>
                    <div className="ml-3 text-sm font-bold text-white whitespace-nowrap">
                      {formatKES(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dark-border p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="text-white font-bold">{formatKES(total)}</span>
                </div>

                {/* Payment Method */}
                <div className="flex gap-2">
                  {["CASH", "MOBILE_MONEY", "CARD"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        paymentMethod === m
                          ? "bg-primary text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
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
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-40 shadow-lg shadow-primary/20"
                >
                  Checkout {formatKES(total)}
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
            className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-sm p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white text-center font-[family-name:var(--font-headline)]">Confirm Payment</h2>

            <div className="text-center">
              <div className="text-3xl font-bold text-primary font-[family-name:var(--font-headline)]">{formatKES(total)}</div>
              <div className="text-xs text-zinc-500 mt-1">via {paymentMethod === "MOBILE_MONEY" ? "M-Pesa" : paymentMethod}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Amount Paid (KSh)</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-dark-border text-white text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
            </div>

            {paid >= total && (
              <div className="text-center text-sm">
                <span className="text-zinc-500">Change: </span>
                <span className="text-emerald-400 font-bold">{formatKES(change)}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-dark-border text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={checkout}
                disabled={paid < total || processing}
                className="flex-1 px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-light transition-colors disabled:opacity-40"
              >
                {processing ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
