import Container from "@/components/ui/Container";

function InventoryPreview() {
  return <div className="rounded-xl border border-[#262b33] bg-[#14161a] p-4 shadow-[0_24px_70px_-40px_rgba(0,0,0,.8)] sm:p-5">
    <div className="flex items-center justify-between border-b border-[#262b33] pb-4"><div><p className="font-display text-[10px] text-[#858e99]">Your workspace / Inventory</p><h3 className="mt-1 font-display text-sm font-semibold text-[#f5f6f7]">Products <span className="ml-1 text-[#747d87]">126</span></h3></div><span className="rounded-full bg-[#2e5bff] px-3 py-1.5 font-display text-[9px] font-semibold text-white">＋ Add product</span></div>
    <div className="mt-3 flex items-center justify-between rounded-md border border-[#262b33] px-3 py-2 font-display text-[10px] text-[#747d87]">⌕ &nbsp;Search products <span>All categories⌄</span></div>
    <div className="mt-2 space-y-1.5">{[["◌", "Arabica coffee", "Grocery · SKU-1042", "24", "In stock"], ["◈", "Shea butter", "Beauty · SKU-2098", "3", "Low stock"], ["▧", "Mineral water 500ml", "Drinks · SKU-3115", "48", "In stock"]].map(([icon, name, meta, qty, status], i) => <div key={name} className="grid grid-cols-[26px_1fr_auto] items-center gap-2 rounded-md bg-[#191b20] px-2.5 py-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#22252b] text-xs text-[#aab1ba]">{icon}</span><div className="min-w-0"><p className="truncate font-display text-[10px] font-medium text-[#e6e8eb]">{name}</p><p className="mt-0.5 font-display text-[8px] text-[#747d87]">{meta}</p></div><div className="text-right"><p className="font-display text-[10px] text-[#e6e8eb]">{qty} units</p><p className={`mt-0.5 font-display text-[8px] ${i === 1 ? "text-[#f1b65c]" : "text-[#72d4a4]"}`}>● {status}</p></div></div>)}</div>
  </div>;
}

function PosPreview() {
  return <div className="grid min-h-[220px] grid-cols-[1.15fr_.85fr] overflow-hidden rounded-xl border border-[#262b33] bg-[#14161a] shadow-[0_24px_70px_-40px_rgba(0,0,0,.8)]">
    <div className="p-3 sm:p-4"><div className="flex items-center justify-between"><div><p className="font-display text-[9px] text-[#858e99]">New sale</p><p className="mt-1 font-display text-sm font-semibold text-[#f5f6f7]">Choose products</p></div><span className="rounded-full border border-[#285a47] bg-[#14251e] px-2 py-1 font-display text-[8px] text-[#72d4a4]">Offline ready</span></div><div className="mt-3 grid grid-cols-2 gap-2">{[["Coffee beans", "KSh 850"], ["Black tea", "KSh 320"], ["Honey 500g", "KSh 690"], ["Milk 1L", "KSh 160"]].map(([name, price]) => <div key={name} className="rounded-lg border border-[#262b33] bg-[#191b20] p-2"><div className="mb-2 flex h-8 items-center justify-center rounded bg-[#22252b] text-sm text-[#6e7a8a]">◇</div><p className="font-display text-[9px] text-[#d9dce0]">{name}</p><p className="mt-0.5 font-display text-[9px] text-[#858e99]">{price}</p></div>)}</div></div>
    <div className="flex flex-col border-l border-[#262b33] bg-[#17191e] p-3 sm:p-4"><div className="flex items-center justify-between border-b border-[#262b33] pb-2"><span className="font-display text-[10px] font-semibold text-[#f5f6f7]">Current sale</span><span className="font-display text-[8px] text-[#858e99]">2 items</span></div><div className="mt-3 space-y-2 font-display text-[9px]"><div className="flex justify-between text-[#aab1ba]"><span>Coffee beans × 2</span><span>KSh 1,700</span></div><div className="flex justify-between text-[#aab1ba]"><span>Black tea × 1</span><span>KSh 320</span></div></div><div className="mt-auto border-t border-[#262b33] pt-3"><div className="flex justify-between font-display text-[9px] text-[#858e99]"><span>Total</span><span className="text-sm font-semibold text-[#f5f6f7]">KSh 2,020</span></div><div className="mt-2 rounded-md bg-[#2e5bff] py-2 text-center font-display text-[9px] font-semibold text-white">Complete sale →</div></div></div>
  </div>;
}

function ReportsPreview() {
  const heights = [28, 42, 35, 62, 46, 71, 54];
  return <div className="grid gap-2 rounded-xl border border-[#262b33] bg-[#14161a] p-4 shadow-[0_24px_70px_-40px_rgba(0,0,0,.8)] sm:grid-cols-[1.3fr_.7fr] sm:p-5">
    <div className="rounded-lg border border-[#262b33] bg-[#17191e] p-3"><div className="flex justify-between"><div><p className="font-display text-[9px] text-[#858e99]">Revenue</p><p className="mt-1 font-display text-lg font-semibold text-[#f5f6f7]">KSh 128,450</p></div><span className="h-fit rounded-full bg-[#14251e] px-2 py-1 font-display text-[8px] text-[#72d4a4]">↑ 8.2%</span></div><div className="mt-4 flex h-[78px] items-end gap-2 border-b border-[#30343c] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_25px,#262b33_26px)] px-2">{heights.map((height, i) => <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${height}%`, background: i === 5 ? "#2e5bff" : "rgba(46,91,255,.45)" }} />)}</div><div className="mt-1.5 flex justify-between font-display text-[8px] text-[#747d87]"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div>
    <div className="rounded-lg border border-[#262b33] bg-[#17191e] p-3"><p className="font-display text-[9px] text-[#858e99]">Top products</p><div className="mt-3 space-y-3">{[["Coffee beans", "42 sold", "85%"], ["Black tea", "31 sold", "62%"], ["Honey 500g", "24 sold", "46%"]].map(([name, sales, width]) => <div key={name}><div className="flex justify-between font-display text-[8px]"><span className="text-[#d9dce0]">{name}</span><span className="text-[#858e99]">{sales}</span></div><div className="mt-1 h-1 rounded-full bg-[#262b33]"><div className="h-1 rounded-full bg-[#2e5bff]" style={{ width }} /></div></div>)}</div></div>
  </div>;
}

const features = [
  { number: "01", title: "Inventory that stays clear", description: "Know what is on your shelves at a glance. Organize products into categories, track quantities and get low-stock alerts before a fast mover runs out.", detail: "Products · Categories · Low-stock alerts", Preview: InventoryPreview },
  { number: "02", title: "A faster point of sale", description: "Find products, build a cart and record cash, M-Pesa or card. Every completed sale updates stock and creates a receipt, even when you are offline.", detail: "Cash · M-Pesa · Card · Receipts", Preview: PosPreview },
  { number: "03", title: "Reports you can act on", description: "Follow revenue over time, see your best-selling products and understand how customers pay. Print a report or export sales when you need to share them.", detail: "Revenue · Top products · Exports", Preview: ReportsPreview },
];

export default function Features() {
  return <section id="features" className="border-t border-rule py-14 sm:py-16 lg:py-20">
    <Container wide>
      <div className="mb-10 max-w-xl sm:mb-12"><p className="mb-4 font-display text-[10px] font-medium uppercase tracking-[.16em] text-accent">One workspace, built for the everyday</p><h2 className="font-display text-3xl font-semibold leading-tight tracking-[-.05em] text-ink sm:text-4xl">Everything to keep your business moving.</h2></div>
      <div className="space-y-14 sm:space-y-16 lg:space-y-20">{features.map(({ number, title, description, detail, Preview }, i) => <article key={number} className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${i % 2 ? "" : ""}`}>
        <div className={`${i % 2 ? "lg:order-2" : ""}`}><p className="mb-5 font-display text-[11px] font-medium tracking-[.12em] text-accent">{number} <span className="ml-2 text-[#626b76]">/ 03</span></p><h3 className="max-w-md font-display text-2xl font-semibold leading-[1.12] tracking-[-.045em] text-ink sm:text-3xl">{title}</h3><p className="mt-4 max-w-md font-reading text-sm leading-6 text-secondary sm:text-[15px]">{description}</p><p className="mt-6 border-t border-rule pt-4 font-display text-[10px] text-[#818a95]">{detail}</p></div>
        <div className={`${i % 2 ? "lg:order-1" : ""}`}><Preview /></div>
      </article>)}</div>
    </Container>
  </section>;
}
