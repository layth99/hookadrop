import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * OrdersPage — HookaDrop admin
 * En-tête + 4 KPI interactifs + filtres + tableau animé + pagination.
 * Aucune dépendance : SVG + CSS scopé. Même thème que Dashboard / Products.
 *
 * Props
 *  orders  [{ id, customerName, customerEmail, date, itemsCount, total,
 *             paymentMethod, paymentStatus, status }]
 *          status: pending | confirmed | processing | shipped | delivered | cancelled
 *          paymentStatus: paid | unpaid | pending | failed | refunded
 *  loading, pageSize (défaut 10)
 *  onRefresh()  (peut renvoyer une Promise)  onAdd()
 *  onView(order)  onUpdateStatus(order)  onRowClick(order) (défaut = onView)
 */

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"];
const S_COLOR = {
  pending: "#facc15", confirmed: "#60a5fa", processing: "#a78bfa",
  shipped: "#22d3ee", delivered: "#34d399", cancelled: "#f87171",
};
const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);
const money = (n) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const AVATARS = ["#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#fb923c", "#facc15"];
const hashColor = (s = "") => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
};
const initials = (n = "") => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const relDate = (d) => {
  const a = new Date(d), b = new Date();
  a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
  const n = Math.round((b - a) / 864e5);
  return n <= 0 ? "Today" : n === 1 ? "Yesterday" : n < 31 ? `${n} days ago` : "";
};
const PAY = {
  paid: ["#34d399", "Paid"], unpaid: ["#facc15", "Unpaid"], pending: ["#facc15", "Pending"],
  failed: ["#f87171", "Failed"], refunded: ["#a78bfa", "Refunded"],
};
const SORTS = [
  { v: "newest", l: "Newest first" }, { v: "oldest", l: "Oldest first" },
  { v: "total-desc", l: "Total ↓" }, { v: "total-asc", l: "Total ↑" },
];

const I = {
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  refresh: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>,
  eye: <><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></>,
  bag: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  done: <><path d="M21.801 10A10 10 0 1 1 17 3.335" /><path d="m9 11 3 3L22 4" /></>,
  dollar: <><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
};
const Ic = ({ n, s = 20, w = 1.8 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[n]}</svg>
);

function useCountUp(target, delay = 0, duration = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf, t0;
    const t = setTimeout(() => {
      const tick = (now) => {
        t0 ??= now;
        const p = Math.min((now - t0) / duration, 1);
        setV(target * (1 - Math.pow(1 - p, 4)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target, delay, duration]);
  return v;
}

function Kpi({ i, label, value, decimals = 0, prefix = "", icon, accent, note, ratio, active, onClick }) {
  const ref = useRef(null);
  const shown = useCountUp(value, 200 + i * 110);
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const text = shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <button ref={ref} type="button" className={`po-kpi ${active ? "on" : ""}`} onMouseMove={move}
      onClick={onClick} aria-pressed={onClick ? !!active : undefined}
      style={{ "--a": accent, "--i": i, cursor: onClick ? "pointer" : "default" }}>
      <span className="po-kpi-top">
        <span className="po-kpi-label">{label}</span>
        <span className="po-kpi-icon"><Ic n={icon} s={22} /></span>
      </span>
      <span className="po-kpi-val">{prefix}{text}</span>
      <span className="po-kpi-foot">
        <span className="po-meter"><i style={{ "--r": `${Math.min(ratio, 1) * 100}%` }} /></span>
        <span className="po-kpi-note">{note}</span>
      </span>
    </button>
  );
}

const pageList = (p, n) => {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
  const s = new Set([1, n, p, p - 1, p + 1]);
  const out = [];
  [...s].filter((x) => x >= 1 && x <= n).sort((a, b) => a - b).forEach((x, i, a) => {
    if (i && x - a[i - 1] > 1) out.push("…");
    out.push(x);
  });
  return out;
};

export default function OrdersPage({
  orders = [], loading = false, pageSize = 10,
  onRefresh, onAdd, onView, onUpdateStatus, onRowClick,
}) {
  const uid = useId().replace(/:/g, "");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [pay, setPay] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [spin, setSpin] = useState(false);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    orders.forEach((o) => { c[o.status] = (c[o.status] ?? 0) + 1; });
    return c;
  }, [orders]);

  const paid = useMemo(() => orders.filter((o) => o.paymentStatus === "paid"), [orders]);
  const revenue = useMemo(() => paid.reduce((s, o) => s + Number(o.total || 0), 0), [paid]);
  const total = orders.length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const r = orders.filter(
      (o) =>
        (status === "all" || o.status === status) &&
        (pay === "all" || (pay === "paid" ? o.paymentStatus === "paid" : o.paymentStatus !== "paid")) &&
        (!needle || [o.id, o.customerName, o.customerEmail].some((x) => String(x ?? "").toLowerCase().includes(needle)))
    );
    const by = {
      newest: (a, b) => new Date(b.date) - new Date(a.date),
      oldest: (a, b) => new Date(a.date) - new Date(b.date),
      "total-desc": (a, b) => b.total - a.total,
      "total-asc": (a, b) => a.total - b.total,
    }[sort];
    return [...r].sort(by);
  }, [orders, q, status, pay, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages);
  const slice = rows.slice((cur - 1) * pageSize, cur * pageSize);
  useEffect(() => { setPage(1); }, [q, status, pay, sort]);

  const refresh = async () => {
    setSpin(true);
    try { await onRefresh?.(); } finally { setTimeout(() => setSpin(false), 600); }
  };
  const pick = (st) => setStatus((c) => (c === st ? "all" : st));
  const open = (o) => (onRowClick ?? onView)?.(o);
  const sig = `${status}|${pay}|${sort}|${cur}`;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className={`po-${uid}`}>
      <style>{css(uid)}</style>

      <header className="po-head">
        <div><h1>Orders</h1><p>Track and manage all customer orders</p></div>
        <div className="po-head-btns">
          <button type="button" className="po-ghost" onClick={refresh} disabled={spin}>
            <span className={spin ? "spin" : ""}><Ic n="refresh" s={19} /></span> Refresh
          </button>
          <button type="button" className="po-add" onClick={onAdd}><Ic n="plus" s={20} w={2.4} /> Add Order</button>
        </div>
      </header>

      <div className="po-kpis">
        <Kpi i={0} label="Total orders" value={total} icon="bag" accent="#60a5fa" ratio={1}
          note="all time" active={status === "all"} onClick={() => setStatus("all")} />
        <Kpi i={1} label="Pending" value={counts.pending} icon="clock" accent="#facc15" ratio={total ? counts.pending / total : 0}
          note={`${pct(counts.pending)}% of orders`} active={status === "pending"} onClick={() => pick("pending")} />
        <Kpi i={2} label="Delivered" value={counts.delivered} icon="done" accent="#34d399" ratio={total ? counts.delivered / total : 0}
          note={`${pct(counts.delivered)}% of orders`} active={status === "delivered"} onClick={() => pick("delivered")} />
        <Kpi i={3} label="Revenue (paid)" value={revenue} decimals={2} prefix="$" icon="dollar" accent="#a78bfa"
          ratio={total ? paid.length / total : 0} note={`${paid.length} paid orders`}
          active={pay === "paid"} onClick={() => setPay((c) => (c === "paid" ? "all" : "paid"))} />
      </div>

      <section className="po-bar">
        <div className="po-bar-row">
          <label className="po-search">
            <Ic n="search" s={19} />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders"
              placeholder="Search by order ID, customer name or email…" />
            {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search"><Ic n="x" s={16} /></button>}
          </label>
          <select className="po-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort orders">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <span className="po-count" key={rows.length}><b>{rows.length}</b> orders</span>
        </div>
        <div className="po-filters">
          <div className="po-pills" role="radiogroup" aria-label="Order status">
            <button type="button" role="radio" aria-checked={status === "all"} className={status === "all" ? "on" : ""}
              style={{ "--c": "#facc15" }} onClick={() => setStatus("all")}>All<em>{total}</em></button>
            {STATUSES.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={status === s}
                className={status === s ? "on" : ""} style={{ "--c": S_COLOR[s] }} onClick={() => setStatus(s)}>
                <u />{cap(s)}<em>{counts[s]}</em>
              </button>
            ))}
          </div>
          <div className="po-seg" role="radiogroup" aria-label="Payment">
            {[["all", "All payments"], ["paid", "Paid"], ["unpaid", "Unpaid"]].map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={pay === v}
                className={pay === v ? "on" : ""} onClick={() => setPay(v)}>{l}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="po-table" role="table" aria-label="Orders">
        <div className="po-title">Order list</div>
        <div className="po-tr po-th" role="row">
          <span>Order ID</span><span>Customer</span><span className="c-date">Date</span>
          <span className="c-items">Items</span><span>Total</span><span className="c-pay">Payment</span>
          <span>Status</span><span className="r">Actions</span>
        </div>

        {loading && Array.from({ length: 6 }, (_, i) => (
          <div className="po-tr po-skel" key={i} aria-hidden="true">{Array.from({ length: 8 }, (_, k) => <span key={k} />)}</div>
        ))}

        {!loading && rows.length === 0 && (
          <div className="po-empty">
            <span><Ic n="bag" s={30} /></span>
            <h4>No orders found</h4>
            <p>Try another search or clear the filters.</p>
            <button type="button" onClick={() => { setQ(""); setStatus("all"); setPay("all"); }}>Reset filters</button>
          </div>
        )}

        {!loading && slice.map((o, i) => {
          const sc = S_COLOR[o.status] ?? "#94a3b8";
          const [pc, pl] = PAY[o.paymentStatus] ?? ["#94a3b8", cap(o.paymentStatus)];
          const step = FLOW.indexOf(o.status);
          const ac = hashColor(o.customerName);
          const rel = relDate(o.date);
          return (
            <div key={`${sig}-${o.id}`} className="po-tr po-row" role="row" tabIndex={0}
              style={{ "--d": `${Math.min(i, 14) * 38}ms`, "--c": sc }}
              onClick={() => open(o)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open(o)}>
              <span className="po-id">#{String(o.id).slice(-8)}</span>

              <span className="po-cust">
                <span className="po-av" style={{ "--av": ac }}>{initials(o.customerName)}</span>
                <span className="po-cust-t"><strong>{o.customerName}</strong><small>{o.customerEmail}</small></span>
              </span>

              <span className="po-date c-date"><strong>{fmtDate(o.date)}</strong>{rel && <small>{rel}</small>}</span>
              <span className="c-items po-items">{o.itemsCount} {o.itemsCount === 1 ? "item" : "items"}</span>
              <span className="po-total">{money(o.total)}</span>

              <span className="po-pay c-pay">
                <strong>{cap(o.paymentMethod)}</strong>
                <i style={{ color: pc }}>{o.paymentStatus === "paid" && <Ic n="check" s={13} w={3} />}{pl}</i>
              </span>

              <span className="po-stat">
                <i className="po-st"><u />{cap(o.status)}</i>
                {o.status === "cancelled" ? (
                  <span className="po-flow x"><b /></span>
                ) : (
                  <span className="po-flow" aria-hidden="true">
                    {FLOW.map((f, k) => <b key={f} className={k <= step ? "on" : ""} style={{ "--k": k }} />)}
                  </span>
                )}
              </span>

              <span className="po-act r">
                <button type="button" className="v" aria-label={`View order ${o.id}`}
                  onClick={(e) => { e.stopPropagation(); onView?.(o); }}><Ic n="eye" s={19} /></button>
                <button type="button" className="u" aria-label={`Update status of order ${o.id}`}
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus?.(o); }}><Ic n="refresh" s={18} /></button>
              </span>
            </div>
          );
        })}

        {!loading && rows.length > pageSize && (
          <footer className="po-pager">
            <span>Showing <b>{(cur - 1) * pageSize + 1}–{Math.min(cur * pageSize, rows.length)}</b> of <b>{rows.length}</b></span>
            <nav aria-label="Pagination">
              <button type="button" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><Ic n="left" s={17} w={2.4} /></button>
              {pageList(cur, pages).map((p, k) =>
                p === "…" ? <em key={`e${k}`}>…</em> : (
                  <button key={p} type="button" className={p === cur ? "on" : ""} aria-current={p === cur ? "page" : undefined}
                    onClick={() => setPage(p)}>{p}</button>
                ))}
              <button type="button" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><Ic n="right" s={17} w={2.4} /></button>
            </nav>
          </footer>
        )}
      </section>
    </div>
  );
}

const css = (uid) => {
  const p = `.po-${uid}`;
  return `
${p}{--ink:#f8fafc;--mute:#94a3b8;--gold:#facc15;--line:rgba(255,255,255,.07);color:var(--ink);display:flex;flex-direction:column;gap:22px}
${p} *{box-sizing:border-box}${p} button{font:inherit;color:inherit}
${p} .r{text-align:right;justify-content:flex-end}
${p} button:focus-visible,${p} .po-row:focus-visible{outline:2px solid var(--gold);outline-offset:2px}

${p} .po-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;animation:po-up-${uid} .6s both}
${p} h1{margin:0;font-size:32px;font-weight:800;letter-spacing:-.02em}
${p} .po-head p{margin:4px 0 0;color:var(--mute)}
${p} .po-head-btns{display:flex;gap:12px;flex-wrap:wrap}
${p} .po-ghost{cursor:pointer;display:inline-flex;align-items:center;gap:9px;padding:13px 20px;border-radius:14px;font-weight:700;
  background:rgba(15,23,42,.8);border:1px solid rgba(148,163,184,.25);transition:all .25s}
${p} .po-ghost:hover{border-color:rgba(250,204,21,.5);transform:translateY(-2px);box-shadow:0 10px 24px -12px rgba(250,204,21,.5)}
${p} .po-ghost:disabled{opacity:.7;cursor:progress}
${p} .po-ghost .spin{display:inline-flex;animation:po-spin-${uid} .8s linear infinite}
${p} .po-add{position:relative;overflow:hidden;cursor:pointer;border:0;display:inline-flex;align-items:center;gap:9px;padding:13px 22px;
  border-radius:14px;font-weight:800;color:#1a1200;background:linear-gradient(120deg,#fde047,#f59e0b 60%,#f97316);
  box-shadow:0 10px 26px -10px rgba(245,158,11,.7);transition:transform .25s,box-shadow .25s}
${p} .po-add::after{content:"";position:absolute;top:0;bottom:0;width:60%;left:-80%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg)}
${p} .po-add:hover{transform:translateY(-2px);box-shadow:0 16px 32px -10px rgba(245,158,11,.85)}
${p} .po-add:hover::after{left:140%;transition:left .7s}
${p} .po-add:active{transform:scale(.97)}

${p} .po-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
${p} .po-kpi{--mx:50%;--my:0%;all:unset;box-sizing:border-box;position:relative;overflow:hidden;isolation:isolate;
  display:flex;flex-direction:column;gap:6px;padding:20px 24px 18px;border-radius:20px;
  background:linear-gradient(160deg,#0f172a,#070b15);border:1px solid rgba(250,204,21,.14);
  box-shadow:0 14px 34px -22px #000,inset 0 1px 0 rgba(255,255,255,.04);
  animation:po-up-${uid} .7s cubic-bezier(.22,1,.36,1) backwards;animation-delay:calc(var(--i) * 110ms + 80ms);
  transition:transform .35s cubic-bezier(.22,1,.36,1),border-color .35s,box-shadow .35s}
${p} .po-kpi::before{content:"";position:absolute;inset:0;z-index:-1;opacity:0;transition:opacity .35s;
  background:radial-gradient(260px circle at var(--mx) var(--my),color-mix(in srgb,var(--a) 20%,transparent),transparent 70%)}
${p} .po-kpi:hover,${p} .po-kpi.on{transform:translateY(-4px);border-color:color-mix(in srgb,var(--a) 50%,transparent);box-shadow:0 20px 40px -22px color-mix(in srgb,var(--a) 50%,#000)}
${p} .po-kpi:hover::before,${p} .po-kpi.on::before{opacity:1}
${p} .po-kpi:focus-visible{outline:2px solid var(--a);outline-offset:2px}
${p} .po-kpi-top{display:flex;justify-content:space-between;align-items:flex-start}
${p} .po-kpi-label{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);padding-top:3px}
${p} .po-kpi-icon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;color:var(--a);
  background:linear-gradient(145deg,color-mix(in srgb,var(--a) 20%,transparent),color-mix(in srgb,var(--a) 4%,transparent));
  border:1px solid color-mix(in srgb,var(--a) 30%,transparent);box-shadow:0 0 22px -6px var(--a);transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
${p} .po-kpi:hover .po-kpi-icon{transform:scale(1.1) rotate(-7deg)}
${p} .po-kpi-val{font-size:clamp(28px,2.3vw,36px);font-weight:800;letter-spacing:-.03em;line-height:1.1;font-variant-numeric:tabular-nums}
${p} .po-kpi-foot{display:flex;align-items:center;gap:10px;margin-top:8px}
${p} .po-meter{flex:1;height:5px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
${p} .po-meter i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,color-mix(in srgb,var(--a) 60%,#fff),var(--a));
  animation:po-fill-${uid} 1.1s cubic-bezier(.22,1,.36,1) .5s forwards}
${p} .po-kpi-note{font-size:12px;color:#64748b;white-space:nowrap}

${p} .po-bar{padding:18px 20px;border-radius:20px;display:flex;flex-direction:column;gap:14px;background:linear-gradient(160deg,#0f172a,#080c17);
  border:1px solid rgba(250,204,21,.13);animation:po-up-${uid} .7s .35s both}
${p} .po-bar-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
${p} .po-search{flex:1;min-width:220px;display:flex;align-items:center;gap:10px;padding:0 14px;height:48px;border-radius:14px;color:var(--mute);
  background:rgba(2,6,23,.55);border:1px solid var(--line);transition:border-color .25s,box-shadow .25s}
${p} .po-search:focus-within{border-color:rgba(250,204,21,.55);box-shadow:0 0 0 4px rgba(250,204,21,.1);color:var(--gold)}
${p} .po-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--ink);font-size:15px}
${p} .po-search input::placeholder{color:#64748b}
${p} .po-search button{all:unset;cursor:pointer;display:grid;place-items:center;width:26px;height:26px;border-radius:8px;color:var(--mute)}
${p} .po-search button:hover{background:rgba(255,255,255,.08);color:var(--ink)}
${p} .po-sort{height:48px;padding:0 14px;border-radius:14px;color:var(--ink);background:rgba(2,6,23,.55);border:1px solid var(--line);color-scheme:dark;cursor:pointer;outline:0}
${p} .po-sort:focus{border-color:rgba(250,204,21,.55)}
${p} .po-count{color:var(--mute);font-size:14px;white-space:nowrap}
${p} .po-count b{color:var(--gold);text-shadow:0 0 14px rgba(250,204,21,.5);display:inline-block;animation:po-pop-${uid} .35s}
${p} .po-filters{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
${p} .po-pills{display:flex;gap:8px;overflow-x:auto;padding:2px;scrollbar-width:none;max-width:100%}
${p} .po-pills::-webkit-scrollbar{display:none}
${p} .po-pills button,${p} .po-seg button{cursor:pointer;border:1px solid var(--line);background:rgba(255,255,255,.03);color:#cbd5e1;border-radius:999px;
  padding:7px 14px;font-size:13px;font-weight:600;white-space:nowrap;display:inline-flex;align-items:center;gap:8px;transition:all .25s}
${p} .po-pills button u{width:7px;height:7px;border-radius:50%;background:var(--c);text-decoration:none}
${p} .po-pills button em{font-style:normal;font-size:11px;padding:1px 7px;border-radius:99px;background:rgba(255,255,255,.08);color:var(--mute)}
${p} .po-pills button:hover,${p} .po-seg button:hover{border-color:color-mix(in srgb,var(--c,#facc15) 50%,transparent);color:#fff}
${p} .po-pills button.on{color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent);border-color:color-mix(in srgb,var(--c) 60%,transparent);box-shadow:0 0 18px -6px var(--c)}
${p} .po-pills button.on em{background:color-mix(in srgb,var(--c) 22%,transparent);color:var(--c)}
${p} .po-seg{display:flex;gap:4px;padding:4px;border-radius:999px;background:rgba(2,6,23,.55);border:1px solid var(--line)}
${p} .po-seg button{border-color:transparent;background:none;padding:6px 14px}
${p} .po-seg button.on{background:rgba(250,204,21,.14);color:var(--gold)}

${p} .po-table{border-radius:20px;overflow:hidden;background:linear-gradient(160deg,#0f172a,#080c17);border:1px solid rgba(250,204,21,.13);animation:po-up-${uid} .7s .45s both}
${p} .po-title{padding:20px 24px;font-size:14px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
${p} .po-tr{display:grid;grid-template-columns:1.1fr 2.2fr 1.3fr .8fr 1fr 1.2fr 1.6fr 96px;align-items:center;gap:12px;padding:0 24px}
${p} .po-th{height:52px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:rgba(2,6,23,.35);font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold)}
${p} .po-row{position:relative;min-height:84px;cursor:pointer;border-bottom:1px solid var(--line);outline:0;
  animation:po-row-${uid} .5s cubic-bezier(.22,1,.36,1) backwards;animation-delay:var(--d);transition:background .25s}
${p} .po-row::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:0 3px 3px 0;background:var(--c);transform:scaleY(0);transition:transform .3s}
${p} .po-row:hover,${p} .po-row:focus-visible{background:linear-gradient(90deg,color-mix(in srgb,var(--c) 9%,transparent),transparent 70%)}
${p} .po-row:hover::before,${p} .po-row:focus-visible::before{transform:scaleY(1)}
${p} .po-id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;font-size:15px;color:var(--gold);text-shadow:0 0 14px rgba(250,204,21,.4)}
${p} .po-cust{display:flex;align-items:center;gap:12px;min-width:0}
${p} .po-av{flex:none;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:14px;font-weight:800;color:var(--av);
  background:color-mix(in srgb,var(--av) 14%,#0b1220);border:1px solid color-mix(in srgb,var(--av) 40%,transparent);transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
${p} .po-row:hover .po-av{transform:scale(1.1) rotate(-4deg)}
${p} .po-cust-t{display:flex;flex-direction:column;gap:2px;min-width:0}
${p} .po-cust-t strong{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
${p} .po-cust-t small{color:var(--mute);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
${p} .po-date{display:flex;flex-direction:column;gap:2px}
${p} .po-date strong{font-weight:500;font-size:15px}${p} .po-date small{font-size:12px;color:#64748b}
${p} .po-items{color:#cbd5e1}
${p} .po-total{font-weight:800;font-size:17px;font-variant-numeric:tabular-nums}
${p} .po-pay{display:flex;flex-direction:column;gap:3px;font-size:14px}
${p} .po-pay strong{font-weight:500;color:#cbd5e1}
${p} .po-pay i{font-style:normal;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:4px}
${p} .po-stat{display:flex;flex-direction:column;gap:9px;align-items:flex-start}
${p} .po-st{display:inline-flex;align-items:center;gap:8px;font-style:normal;font-size:13px;font-weight:700;padding:5px 12px 5px 10px;border-radius:999px;
  color:var(--c);background:color-mix(in srgb,var(--c) 11%,transparent);border:1px solid color-mix(in srgb,var(--c) 38%,transparent)}
${p} .po-st u{width:7px;height:7px;border-radius:50%;background:currentColor;text-decoration:none}
${p} .po-row[style*="#facc15"] .po-st u,${p} .po-row[style*="#a78bfa"] .po-st u{animation:po-pulse-${uid} 1.8s infinite}
${p} .po-flow{display:flex;gap:4px;padding-left:2px}
${p} .po-flow b{width:20px;height:4px;border-radius:99px;background:rgba(255,255,255,.1);transition:background .3s}
${p} .po-flow b.on{background:var(--c);box-shadow:0 0 8px -1px var(--c);animation:po-grow-${uid} .5s backwards;animation-delay:calc(var(--d) + var(--k) * 70ms + 250ms)}
${p} .po-flow.x b{width:100px;background:repeating-linear-gradient(90deg,var(--c) 0 6px,transparent 6px 10px);opacity:.6}
${p} .po-act{display:flex;gap:6px}
${p} .po-act button{cursor:pointer;width:38px;height:38px;display:grid;place-items:center;border-radius:11px;border:1px solid transparent;background:none;color:#94a3b8;transition:all .2s}
${p} .po-act .v:hover{color:#60a5fa;background:rgba(96,165,250,.12);border-color:rgba(96,165,250,.3);transform:translateY(-2px)}
${p} .po-act .u:hover{color:#facc15;background:rgba(250,204,21,.12);border-color:rgba(250,204,21,.3);transform:translateY(-2px) rotate(90deg)}

${p} .po-pager{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 24px;color:var(--mute);font-size:13px}
${p} .po-pager b{color:var(--ink)}
${p} .po-pager nav{display:flex;gap:6px;align-items:center}
${p} .po-pager nav button{cursor:pointer;min-width:36px;height:36px;padding:0 8px;display:grid;place-items:center;border-radius:11px;font-weight:700;
  background:rgba(255,255,255,.03);border:1px solid var(--line);transition:all .2s}
${p} .po-pager nav button:hover:not(:disabled){border-color:rgba(250,204,21,.5);color:var(--gold)}
${p} .po-pager nav button.on{background:rgba(250,204,21,.14);border-color:rgba(250,204,21,.6);color:var(--gold)}
${p} .po-pager nav button:disabled{opacity:.35;cursor:not-allowed}
${p} .po-pager nav em{font-style:normal;padding:0 4px}

${p} .po-skel{height:84px;border-bottom:1px solid var(--line)}
${p} .po-skel span{height:16px;border-radius:8px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:po-shim-${uid} 1.4s infinite}
${p} .po-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:56px 20px;text-align:center}
${p} .po-empty>span{width:68px;height:68px;border-radius:22px;display:grid;place-items:center;color:var(--gold);background:rgba(250,204,21,.08);border:1px solid rgba(250,204,21,.25);margin-bottom:8px;animation:po-float-${uid} 3s ease-in-out infinite}
${p} .po-empty h4{margin:0;font-size:18px}${p} .po-empty p{margin:0 0 12px;color:var(--mute)}
${p} .po-empty button{cursor:pointer;padding:9px 18px;border-radius:12px;font-weight:700;color:var(--gold);background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.4)}

@keyframes po-up-${uid}{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes po-row-${uid}{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
@keyframes po-fill-${uid}{to{width:var(--r)}}
@keyframes po-grow-${uid}{from{transform:scaleX(0);transform-origin:left}}
@keyframes po-pop-${uid}{0%{transform:scale(1.4)}100%{transform:scale(1)}}
@keyframes po-pulse-${uid}{0%{box-shadow:0 0 0 0 currentColor}70%,100%{box-shadow:0 0 0 7px transparent}}
@keyframes po-spin-${uid}{to{transform:rotate(360deg)}}
@keyframes po-shim-${uid}{to{background-position:-200% 0}}
@keyframes po-float-${uid}{50%{transform:translateY(-6px)}}

@media (max-width:1280px){${p} .po-tr{grid-template-columns:1fr 2.2fr 1.1fr 1fr 1.5fr 96px}${p} .c-items,${p} .c-pay{display:none}}
@media (max-width:1180px){${p} .po-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:760px){
  ${p} .po-tr{grid-template-columns:1fr 2fr 1.4fr 84px;padding:0 16px}
  ${p} .c-date{display:none}${p} .po-tr>:nth-child(5){display:none}
}
@media (max-width:560px){
  ${p} .po-kpis{grid-template-columns:1fr;gap:14px}
  ${p} .po-tr{grid-template-columns:1.4fr 1.6fr 76px}
  ${p} .po-tr>:nth-child(1){display:none}
  ${p} .po-head-btns{width:100%}${p} .po-head-btns button{flex:1;justify-content:center}
}
@media (prefers-reduced-motion:reduce){
  ${p} *,${p} *::before,${p} *::after{animation-duration:.01ms!important;animation-delay:0ms!important;transition:none!important}
}
`;
};
