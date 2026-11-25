import Link from "next/link";
import Container from "@/components/ui/Container";

const metrics = [
  ["38%", "fewer stock-out losses"],
  ["4.8 / 5", "owner rating"],
  ["48h", "to get up and running"],
  ["100%", "offline capable"],
];

function ProductPreview() {
  const bars = [38, 55, 42, 68, 51, 78, 60, 88, 70, 96, 73, 84];
  return <div className="overflow-hidden rounded-xl border border-[#262b33] bg-[#14161a] shadow-[0_32px_100px_-35px_rgba(0,0,0,.8)]">
    <div className="flex h-11 items-center justify-between border-b border-[#262b33] px-4">
      <div className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#393e46]"/><i className="h-2 w-2 rounded-full bg-[#393e46]"/><i className="h-2 w-2 rounded-full bg-[#393e46]"/><span className="ml-3 font-display text-[10px] text-[#7e8792]">aide.app / workspace</span></div>
      <span className="rounded-full border border-[#285a47] bg-[#14251e] px-2.5 py-1 font-display text-[9px] text-[#72d4a4]">● Offline ready</span>
    </div>
    <div className="grid min-h-[290px] md:grid-cols-[142px_1fr]">
      <aside className="hidden border-r border-[#262b33] p-3 md:block">
        <div className="mb-5 px-2 font-display text-sm font-bold text-[#f5f6f7]">Aide<span className="text-[#2e5bff]">.</span></div>
        {[["▦", "Overview"], ["▣", "Point of sale"], ["◇", "Inventory"], ["◷", "Sales"], ["▤", "Reports"]].map(([icon, label], i) => <div key={label} className={`mb-1 flex items-center gap-2 rounded-md px-2.5 py-2 font-display text-[10px] ${i === 0 ? "bg-[#202329] text-[#f5f6f7]" : "text-[#88909a]"}`}><span className="text-xs">{icon}</span>{label}</div>)}
      </aside>
      <div className="p-4 sm:p-5">
        <div className="flex items-end justify-between"><div><p className="font-display text-[10px] text-[#8f98a3]">Business overview</p><h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-[#f5f6f7]">Today at a glance</h2></div><span className="rounded-md border border-[#262b33] px-2 py-1 font-display text-[9px] text-[#aab1ba]">Last 7 days⌄</span></div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["Sales", "KSh 45,230", "+12.4%"], ["Orders", "18", "Today"], ["Stock", "126", "Products"], ["Low stock", "4", "Needs attention"]].map(([label, value, meta]) => <div key={label} className="rounded-lg border border-[#262b33] bg-[#17191e] p-3"><p className="font-display text-[9px] text-[#8f98a3]">{label}</p><p className="mt-1 font-display text-base font-semibold tracking-tight text-[#f5f6f7] sm:text-lg">{value}</p><p className="mt-1 font-display text-[9px] text-[#6ed19d]">{meta}</p></div>)}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1.5fr_0.8fr]">
          <div className="rounded-lg border border-[#262b33] bg-[#17191e] p-3"><div className="mb-3 flex justify-between font-display text-[10px] text-[#aab1ba]"><span>Sales activity</span><span>KES</span></div><div className="relative flex h-[86px] items-end gap-1 border-b border-[#30343c] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,#262b33_28px)] px-1">{bars.map((height, i) => <div key={i} className="flex-1 rounded-t-[2px]" style={{height: `${height}%`, background: i === 9 ? "#2e5bff" : "rgba(46,91,255,.45)"}} />)}</div><div className="mt-1 flex justify-between font-display text-[8px] text-[#747d87]"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div>
          <div className="hidden rounded-lg border border-[#262b33] bg-[#17191e] p-3 sm:block"><p className="font-display text-[10px] text-[#aab1ba]">Quick actions</p><div className="mt-2 space-y-1.5 font-display text-[9px]"><div className="rounded-md bg-[#202329] px-2.5 py-2 text-[#f5f6f7]">＋ New sale <span className="float-right text-[#78818c]">↗</span></div><div className="px-2.5 py-1.5 text-[#aab1ba]">＋ Add product</div><div className="px-2.5 py-1.5 text-[#aab1ba]">View reports</div></div></div>
        </div>
      </div>
    </div>
  </div>;
}

export default function Hero() {
  return <section id="product" className="relative overflow-hidden pb-12 pt-28 sm:pt-32 lg:pb-14 lg:pt-36">
    <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-0 h-[620px] w-[720px] rounded-full bg-[#2e5bff]/[0.09] blur-[130px]" />
    <Container wide className="relative">
      <div className="grid items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14">
        <div className="max-w-[540px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rule bg-[#14161a] px-3 py-1.5 font-display text-[11px] text-secondary"><span className="h-1.5 w-1.5 rounded-full bg-accent"/>Offline-first point of sale</div>
          <h1 className="font-display text-[clamp(3.25rem,6.2vw,5.4rem)] font-semibold leading-[.99] tracking-[-.065em] text-ink">Run your business.<br/><span className="text-accent">Even offline.</span></h1>
          <p className="mt-6 max-w-[470px] font-reading text-base leading-7 text-secondary sm:text-[17px]">Sales, stock, receipts and reports in one simple workspace. Keep serving customers when the internet drops; Aide syncs your changes when you reconnect.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex items-center justify-center gap-3 rounded-full bg-accent px-6 py-3.5 font-display text-sm font-semibold text-white transition hover:brightness-110">Start free <span aria-hidden>↗</span></Link>
            <a href="#features" className="inline-flex items-center justify-center rounded-full border border-rule px-6 py-3.5 font-display text-sm font-medium text-ink transition hover:bg-[#181b20]">Explore the product</a>
          </div>
          <p className="mt-5 font-display text-[11px] text-[#858e99]">Built for busy shops. Works online and offline.</p>
        </div>
        <div className="relative lg:pl-2"><ProductPreview /></div>
      </div>
      <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-rule pt-6 sm:grid-cols-4 lg:mt-14">
        {metrics.map(([value, label]) => <div key={value}><p className="font-display text-[22px] font-semibold tracking-[-.04em] text-ink sm:text-2xl">{value}</p><p className="mt-1 font-reading text-xs text-secondary sm:text-[13px]">{label}</p></div>)}
      </div>
    </Container>
  </section>;
}
