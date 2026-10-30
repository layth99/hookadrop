import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * ProductsPage — HookaDrop admin
 * En-tête + 4 KPI interactifs + barre de filtres + tableau animé.
 * Aucune dépendance : SVG + CSS scopé.
 *
 * Props
 *  products   [{ id, name, brand, image, category, price, discount, stock, lowStockThreshold? }]
 *  loading    boolean
 *  onAdd()  onEdit(product)  onDelete(product)  onRowClick(product)
 */

const LOW_DEFAULT = 10;
const CAT_COLORS = ["#38bdf8", "#a78bfa", "#f472b6", "#34d399", "#fb923c", "#facc15", "#67e8f9"];
const SORTS = [
  { v: "default", l: "Default order" },
  { v: "name", l: "Name A–Z" },
  { v: "price-asc", l: "Price ↑" },
  { v: "price-desc", l: "Price ↓" },
  { v: "stock-asc", l: "Stock ↑" },
  { v: "stock-desc", l: "Stock ↓" },
];

const statusOf = (p) =>
  p.stock <= 0 ? "out" : p.stock <= (p.lowStockThreshold ?? LOW_DEFAULT) ? "low" : "in";
const STATUS_LABEL = { in: "In stock", low: "Low stock", out: "Out of stock" };
const money = (n) => `$${Number(n).toFixed(2)}`;
const hashColor = (s = "") => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CAT_COLORS[h % CAT_COLORS.length];
};

/* ───── Icônes ───── */
const I = {
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  edit: <><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></>,
  box: <><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>,
  trend: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
  warn: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  alert: <><path d="M12 16h.01" /><path d="M12 8v4" /><path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z" /></>,
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
        setV(Math.round(target * (1 - Math.pow(1 - p, 4))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target, delay, duration]);
  return v;
}

/* ───── KPI ───── */
function Kpi({ i, label, value, icon, accent, note, ratio, active, onClick }) {
  const ref = useRef(null);
  const shown = useCountUp(value, 200 + i * 110);
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <button ref={ref} type="button" className={`pp-kpi ${active ? "on" : ""}`} onMouseMove={move}
      onClick={onClick} aria-pressed={active} style={{ "--a": accent, "--i": i }}>
      <span className="pp-kpi-top">
        <span className="pp-kpi-label">{label}</span>
        <span className="pp-kpi-icon"><Ic n={icon} s={22} /></span>
      </span>
      <span className="pp-kpi-val">{shown.toLocaleString("en-US")}</span>
      <span className="pp-kpi-foot">
        <span className="pp-meter"><i style={{ "--r": `${Math.min(ratio, 1) * 100}%` }} /></span>
        <span className="pp-kpi-note">{note}</span>
      </span>
    </button>
  );
}

/* ───── Page ───── */
export default function ProductsPage({
  products = [], loading = false, onAdd, onEdit, onDelete, onRowClick,
}) {
  const uid = useId().replace(/:/g, "");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("default");

  const stats = useMemo(() => {
    const s = { total: products.length, stock: 0, low: 0, out: 0, max: 1 };
    products.forEach((p) => {
      s.stock += p.stock;
      s.max = Math.max(s.max, p.stock);
      const st = statusOf(p);
      if (st === "low") s.low++;
      if (st === "out") s.out++;
    });
    return s;
  }, [products]);

  const categories = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(p.category, (m.get(p.category) ?? 0) + 1));
    return [["All", products.length], ...m.entries()];
  }, [products]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = products.filter(
      (p) =>
        (cat === "All" || p.category === cat) &&
        (status === "all" || statusOf(p) === status) &&
        (!needle || [p.name, p.category, p.brand].some((x) => x?.toLowerCase().includes(needle)))
    );
    const by = {
      name: (a, b) => a.name.localeCompare(b.name),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      "stock-asc": (a, b) => a.stock - b.stock,
      "stock-desc": (a, b) => b.stock - a.stock,
    }[sort];
    return by ? [...r].sort(by) : r;
  }, [products, q, cat, status, sort]);

  const pick = (st) => setStatus((cur) => (cur === st ? "all" : st));
  const sig = `${cat}|${status}|${sort}`;

  return (
    <div className={`pp-${uid}`}>
      <style>{css(uid)}</style>

      {/* Header */}
      <header className="pp-head">
        <div>
          <h1>Products</h1>
          <p>Manage your product catalog</p>
        </div>
        <button type="button" className="pp-add" onClick={onAdd}>
          <Ic n="plus" s={20} w={2.4} /> Add Product
        </button>
      </header>

      {/* KPIs */}
      <div className="pp-kpis">
        <Kpi i={0} label="Total products" value={stats.total} icon="box" accent="#60a5fa"
          ratio={1} note="in catalog" active={status === "all"} onClick={() => setStatus("all")} />
        <Kpi i={1} label="Total stock" value={stats.stock} icon="trend" accent="#34d399"
          ratio={stats.total ? stats.stock / (stats.max * stats.total) : 0}
          note={`${stats.total ? Math.round(stats.stock / stats.total) : 0} avg / product`} />
        <Kpi i={2} label="Low stock" value={stats.low} icon="warn" accent="#facc15"
          ratio={stats.total ? stats.low / stats.total : 0}
          note={`${stats.total ? Math.round((stats.low / stats.total) * 100) : 0}% of catalog`}
          active={status === "low"} onClick={() => pick("low")} />
        <Kpi i={3} label="Out of stock" value={stats.out} icon="alert" accent="#f87171"
          ratio={stats.total ? stats.out / stats.total : 0}
          note={stats.out ? "needs restock" : "all good"}
          active={status === "out"} onClick={() => pick("out")} />
      </div>

      {/* Toolbar */}
      <section className="pp-bar">
        <div className="pp-bar-row">
          <label className="pp-search">
            <Ic n="search" s={19} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, category, brand…" aria-label="Search products" />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Clear search"><Ic n="x" s={16} /></button>
            )}
          </label>
          <select className="pp-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <span className="pp-count" key={rows.length}><b>{rows.length}</b> products</span>
        </div>

        <div className="pp-filters">
          <div className="pp-pills" role="radiogroup" aria-label="Category">
            {categories.map(([name, n]) => (
              <button key={name} type="button" role="radio" aria-checked={cat === name}
                className={cat === name ? "on" : ""} onClick={() => setCat(name)}>
                {name}<em>{n}</em>
              </button>
            ))}
          </div>
          <div className="pp-seg" role="radiogroup" aria-label="Stock status">
            {[["all", "All"], ["in", "In stock"], ["low", "Low"], ["out", "Out"]].map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={status === v}
                className={`${status === v ? "on" : ""} s-${v}`} onClick={() => setStatus(v)}>{l}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="pp-table" role="table" aria-label="Products">
        <div className="pp-hint">Click a row to view product details</div>
        <div className="pp-tr pp-th" role="row">
          <span>Product</span><span className="c-cat">Category</span><span>Price</span>
          <span className="c-stock">Stock</span><span>Status</span><span className="r">Actions</span>
        </div>

        {loading &&
          Array.from({ length: 5 }, (_, i) => (
            <div className="pp-tr pp-skel" key={i} aria-hidden="true">
              {Array.from({ length: 6 }, (_, k) => <span key={k} />)}
            </div>
          ))}

        {!loading && rows.length === 0 && (
          <div className="pp-empty">
            <span><Ic n="box" s={30} /></span>
            <h4>No products found</h4>
            <p>Try another search or clear the filters.</p>
            <button type="button" onClick={() => { setQ(""); setCat("All"); setStatus("all"); }}>Reset filters</button>
          </div>
        )}

        {!loading && rows.map((p, i) => {
          const st = statusOf(p);
          const color = hashColor(p.category);
          return (
            <div key={`${sig}-${p.id}`} className="pp-tr pp-row" role="row" tabIndex={0}
              style={{ "--d": `${Math.min(i, 14) * 38}ms`, "--c": color }}
              onClick={() => onRowClick?.(p)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onRowClick?.(p)}>
              <span className="pp-prod">
                <span className="pp-thumb">
                  <b>{p.name?.[0]}</b>
                  {p.image && <img src={p.image} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />}
                </span>
                <span className="pp-name"><strong>{p.name}</strong><small>{p.brand}</small></span>
              </span>

              <span className="c-cat"><i className="pp-cat">{p.category}</i></span>

              <span className="pp-price">
                <strong>{money(p.price)}</strong>
                {p.discount > 0 && <small>-{p.discount}% off</small>}
              </span>

              <span className="pp-stock c-stock">
                <strong>{p.stock}</strong>
                <span className="pp-bar-s"><i className={st} style={{ "--w": `${Math.min(p.stock / stats.max, 1) * 100}%` }} /></span>
              </span>

              <span><i className={`pp-st ${st}`}><u />{STATUS_LABEL[st]}</i></span>

              <span className="pp-act r">
                <button type="button" aria-label={`Edit ${p.name}`} className="e"
                  onClick={(e) => { e.stopPropagation(); onEdit?.(p); }}><Ic n="edit" s={18} /></button>
                <button type="button" aria-label={`Delete ${p.name}`} className="d"
                  onClick={(e) => { e.stopPropagation(); onDelete?.(p); }}><Ic n="trash" s={18} /></button>
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}

/* ───── CSS scopé ───── */
const css = (uid) => {
  const p = `.pp-${uid}`;
  return `
${p}{--ink:#f8fafc;--mute:#94a3b8;--gold:#facc15;--line:rgba(255,255,255,.07);color:var(--ink);display:flex;flex-direction:column;gap:22px}
${p} *{box-sizing:border-box}
${p} button{font:inherit;color:inherit}
${p} .r{text-align:right;justify-content:flex-end}

/* header */
${p} .pp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;animation:pp-up-${uid} .6s both}
${p} h1{margin:0;font-size:32px;font-weight:800;letter-spacing:-.02em}
${p} .pp-head p{margin:4px 0 0;color:var(--mute)}
${p} .pp-add{position:relative;overflow:hidden;cursor:pointer;border:0;display:inline-flex;align-items:center;gap:9px;
  padding:13px 22px;border-radius:14px;font-weight:800;color:#1a1200;
  background:linear-gradient(120deg,#fde047,#f59e0b 60%,#f97316);
  box-shadow:0 10px 26px -10px rgba(245,158,11,.7);transition:transform .25s,box-shadow .25s}
${p} .pp-add::after{content:"";position:absolute;top:0;bottom:0;width:60%;left:-80%;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg)}
${p} .pp-add:hover{transform:translateY(-2px);box-shadow:0 16px 32px -10px rgba(245,158,11,.85)}
${p} .pp-add:hover::after{left:140%;transition:left .7s}
${p} .pp-add:active{transform:scale(.97)}
${p} .pp-add:focus-visible,${p} button:focus-visible,${p} .pp-row:focus-visible{outline:2px solid var(--gold);outline-offset:2px}

/* kpis */
${p} .pp-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
${p} .pp-kpi{--mx:50%;--my:0%;all:unset;box-sizing:border-box;cursor:pointer;position:relative;overflow:hidden;isolation:isolate;
  display:flex;flex-direction:column;gap:6px;padding:20px 24px 18px;border-radius:20px;
  background:linear-gradient(160deg,#0f172a,#070b15);border:1px solid rgba(250,204,21,.14);
  box-shadow:0 14px 34px -22px #000,inset 0 1px 0 rgba(255,255,255,.04);
  animation:pp-up-${uid} .7s cubic-bezier(.22,1,.36,1) backwards;animation-delay:calc(var(--i) * 110ms + 80ms);
  transition:transform .35s cubic-bezier(.22,1,.36,1),border-color .35s,box-shadow .35s}
${p} .pp-kpi::before{content:"";position:absolute;inset:0;z-index:-1;opacity:0;transition:opacity .35s;
  background:radial-gradient(260px circle at var(--mx) var(--my),color-mix(in srgb,var(--a) 20%,transparent),transparent 70%)}
${p} .pp-kpi:hover,${p} .pp-kpi.on{transform:translateY(-4px);border-color:color-mix(in srgb,var(--a) 50%,transparent);
  box-shadow:0 20px 40px -22px color-mix(in srgb,var(--a) 50%,#000)}
${p} .pp-kpi:hover::before,${p} .pp-kpi.on::before{opacity:1}
${p} .pp-kpi:focus-visible{outline:2px solid var(--a);outline-offset:2px}
${p} .pp-kpi-top{display:flex;justify-content:space-between;align-items:flex-start}
${p} .pp-kpi-label{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);padding-top:3px}
${p} .pp-kpi-icon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;color:var(--a);
  background:linear-gradient(145deg,color-mix(in srgb,var(--a) 20%,transparent),color-mix(in srgb,var(--a) 4%,transparent));
  border:1px solid color-mix(in srgb,var(--a) 30%,transparent);box-shadow:0 0 22px -6px var(--a);
  transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
${p} .pp-kpi:hover .pp-kpi-icon{transform:scale(1.1) rotate(-7deg)}
${p} .pp-kpi-val{font-size:clamp(28px,2.3vw,36px);font-weight:800;letter-spacing:-.03em;line-height:1.1;font-variant-numeric:tabular-nums}
${p} .pp-kpi-foot{display:flex;align-items:center;gap:10px;margin-top:8px}
${p} .pp-meter{flex:1;height:5px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
${p} .pp-meter i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,color-mix(in srgb,var(--a) 60%,#fff),var(--a));
  animation:pp-fill-${uid} 1.1s cubic-bezier(.22,1,.36,1) .5s forwards}
${p} .pp-kpi-note{font-size:12px;color:#64748b;white-space:nowrap}

/* toolbar */
${p} .pp-bar{padding:18px 20px;border-radius:20px;display:flex;flex-direction:column;gap:14px;
  background:linear-gradient(160deg,#0f172a,#080c17);border:1px solid rgba(250,204,21,.13);animation:pp-up-${uid} .7s .35s both}
${p} .pp-bar-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
${p} .pp-search{flex:1;min-width:220px;display:flex;align-items:center;gap:10px;padding:0 14px;height:48px;border-radius:14px;
  color:var(--mute);background:rgba(2,6,23,.55);border:1px solid var(--line);transition:border-color .25s,box-shadow .25s}
${p} .pp-search:focus-within{border-color:rgba(250,204,21,.55);box-shadow:0 0 0 4px rgba(250,204,21,.1);color:var(--gold)}
${p} .pp-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--ink);font-size:15px}
${p} .pp-search input::placeholder{color:#64748b}
${p} .pp-search button{all:unset;cursor:pointer;display:grid;place-items:center;width:26px;height:26px;border-radius:8px;color:var(--mute)}
${p} .pp-search button:hover{background:rgba(255,255,255,.08);color:var(--ink)}
${p} .pp-sort{height:48px;padding:0 14px;border-radius:14px;color:var(--ink);background:rgba(2,6,23,.55);
  border:1px solid var(--line);color-scheme:dark;cursor:pointer;outline:0}
${p} .pp-sort:focus{border-color:rgba(250,204,21,.55)}
${p} .pp-count{color:var(--mute);font-size:14px;white-space:nowrap}
${p} .pp-count b{color:var(--gold);text-shadow:0 0 14px rgba(250,204,21,.5);display:inline-block;animation:pp-pop-${uid} .35s}
${p} .pp-filters{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
${p} .pp-pills{display:flex;gap:8px;overflow-x:auto;padding:2px;scrollbar-width:none;max-width:100%}
${p} .pp-pills::-webkit-scrollbar{display:none}
${p} .pp-pills button,${p} .pp-seg button{cursor:pointer;border:1px solid var(--line);background:rgba(255,255,255,.03);color:#cbd5e1;
  border-radius:999px;padding:7px 14px;font-size:13px;font-weight:600;white-space:nowrap;transition:all .25s}
${p} .pp-pills button em{font-style:normal;margin-left:8px;font-size:11px;padding:1px 7px;border-radius:99px;background:rgba(255,255,255,.08);color:var(--mute)}
${p} .pp-pills button:hover,${p} .pp-seg button:hover{border-color:rgba(250,204,21,.4);color:#fff}
${p} .pp-pills button.on{color:#facc15;background:rgba(250,204,21,.12);border-color:rgba(250,204,21,.55);box-shadow:0 0 18px -6px rgba(250,204,21,.6)}
${p} .pp-pills button.on em{background:rgba(250,204,21,.2);color:#facc15}
${p} .pp-seg{display:flex;gap:4px;padding:4px;border-radius:999px;background:rgba(2,6,23,.55);border:1px solid var(--line)}
${p} .pp-seg button{border-color:transparent;background:none;padding:6px 14px}
${p} .pp-seg button.on{background:rgba(255,255,255,.1);color:#fff}
${p} .pp-seg button.on.s-low{background:rgba(250,204,21,.15);color:#facc15}
${p} .pp-seg button.on.s-out{background:rgba(248,113,113,.15);color:#f87171}
${p} .pp-seg button.on.s-in{background:rgba(52,211,153,.15);color:#34d399}

/* table */
${p} .pp-table{border-radius:20px;overflow:hidden;background:linear-gradient(160deg,#0f172a,#080c17);
  border:1px solid rgba(250,204,21,.13);animation:pp-up-${uid} .7s .45s both}
${p} .pp-hint{padding:18px 24px;font-size:13px;color:#64748b}
${p} .pp-tr{display:grid;grid-template-columns:minmax(240px,2.6fr) 1.1fr 1fr 1.3fr 1.1fr 96px;align-items:center;gap:12px;padding:0 24px}
${p} .pp-th{height:52px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:rgba(2,6,23,.35);
  font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold)}
${p} .pp-row{position:relative;min-height:84px;cursor:pointer;border-bottom:1px solid var(--line);outline:0;
  animation:pp-row-${uid} .5s cubic-bezier(.22,1,.36,1) backwards;animation-delay:var(--d);transition:background .25s}
${p} .pp-row:last-child{border-bottom:0}
${p} .pp-row::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:0 3px 3px 0;
  background:var(--c);transform:scaleY(0);transition:transform .3s}
${p} .pp-row:hover,${p} .pp-row:focus-visible{background:linear-gradient(90deg,color-mix(in srgb,var(--c) 9%,transparent),transparent 70%)}
${p} .pp-row:hover::before,${p} .pp-row:focus-visible::before{transform:scaleY(1)}
${p} .pp-prod{display:flex;align-items:center;gap:14px;min-width:0}
${p} .pp-thumb{position:relative;flex:none;width:60px;height:60px;border-radius:16px;overflow:hidden;display:grid;place-items:center;
  background:linear-gradient(145deg,#1e293b,#0b1220);border:1px solid rgba(255,255,255,.1);transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
${p} .pp-thumb b{font-size:22px;color:var(--mute)}
${p} .pp-thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
${p} .pp-row:hover .pp-thumb{transform:scale(1.08) rotate(-3deg)}
${p} .pp-name{display:flex;flex-direction:column;gap:2px;min-width:0}
${p} .pp-name strong{font-size:17px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
${p} .pp-name small{color:var(--mute);font-size:13px}
${p} .pp-cat{font-style:normal;font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;color:var(--c);
  background:color-mix(in srgb,var(--c) 14%,transparent);border:1px solid color-mix(in srgb,var(--c) 40%,transparent)}
${p} .pp-price{display:flex;flex-direction:column;gap:2px}
${p} .pp-price strong{font-size:17px;font-variant-numeric:tabular-nums}
${p} .pp-price small{font-size:13px;color:#34d399;font-weight:600}
${p} .pp-stock{display:flex;flex-direction:column;gap:7px;align-items:flex-start}
${p} .pp-stock strong{font-size:18px;font-variant-numeric:tabular-nums;line-height:1}
${p} .pp-bar-s{width:84px;height:4px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
${p} .pp-bar-s i{display:block;height:100%;width:0;border-radius:inherit;animation:pp-w-${uid} .9s cubic-bezier(.22,1,.36,1) .25s forwards}
${p} .pp-bar-s i.in{background:#34d399}${p} .pp-bar-s i.low{background:#facc15}${p} .pp-bar-s i.out{background:#f87171}
${p} .pp-st{display:inline-flex;align-items:center;gap:8px;font-style:normal;font-size:13px;font-weight:700;padding:5px 12px 5px 10px;border-radius:999px;border:1px solid}
${p} .pp-st u{width:7px;height:7px;border-radius:50%;background:currentColor;text-decoration:none}
${p} .pp-st.in{color:#34d399;background:rgba(52,211,153,.1);border-color:rgba(52,211,153,.3)}
${p} .pp-st.low{color:#facc15;background:rgba(250,204,21,.1);border-color:rgba(250,204,21,.35)}
${p} .pp-st.out{color:#f87171;background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.35)}
${p} .pp-st.low u,${p} .pp-st.out u{animation:pp-pulse-${uid} 1.8s infinite}
${p} .pp-act{display:flex;gap:6px}
${p} .pp-act button{cursor:pointer;width:38px;height:38px;display:grid;place-items:center;border-radius:11px;border:1px solid transparent;
  background:none;color:#94a3b8;transition:all .2s}
${p} .pp-act .e:hover{color:#facc15;background:rgba(250,204,21,.12);border-color:rgba(250,204,21,.3);transform:translateY(-2px)}
${p} .pp-act .d:hover{color:#f87171;background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.3);transform:translateY(-2px)}

/* états */
${p} .pp-skel{height:84px;border-bottom:1px solid var(--line)}
${p} .pp-skel span{height:16px;border-radius:8px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.04) 75%);
  background-size:200% 100%;animation:pp-shim-${uid} 1.4s infinite}
${p} .pp-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:56px 20px;text-align:center}
${p} .pp-empty>span{width:68px;height:68px;border-radius:22px;display:grid;place-items:center;color:var(--gold);
  background:rgba(250,204,21,.08);border:1px solid rgba(250,204,21,.25);margin-bottom:8px;animation:pp-float-${uid} 3s ease-in-out infinite}
${p} .pp-empty h4{margin:0;font-size:18px}${p} .pp-empty p{margin:0 0 12px;color:var(--mute)}
${p} .pp-empty button{cursor:pointer;padding:9px 18px;border-radius:12px;font-weight:700;color:var(--gold);
  background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.4);transition:background .2s}
${p} .pp-empty button:hover{background:rgba(250,204,21,.2)}

@keyframes pp-up-${uid}{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes pp-row-${uid}{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
@keyframes pp-fill-${uid}{to{width:var(--r)}}
@keyframes pp-w-${uid}{to{width:var(--w)}}
@keyframes pp-pop-${uid}{0%{transform:scale(1.4)}100%{transform:scale(1)}}
@keyframes pp-pulse-${uid}{0%{box-shadow:0 0 0 0 currentColor}70%,100%{box-shadow:0 0 0 7px transparent}}
@keyframes pp-shim-${uid}{to{background-position:-200% 0}}
@keyframes pp-float-${uid}{50%{transform:translateY(-6px)}}

@media (max-width:1180px){${p} .pp-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:900px){
  ${p} .pp-tr{grid-template-columns:minmax(0,2fr) 1fr 1fr 84px}
  ${p} .c-cat,${p} .c-stock{display:none}
}
@media (max-width:560px){
  ${p} .pp-kpis{grid-template-columns:1fr;gap:14px}
  ${p} .pp-tr{grid-template-columns:minmax(0,1fr) 84px;padding:0 16px}
  ${p} .pp-tr>:nth-child(3),${p} .pp-th>:nth-child(5){display:none}
  ${p} .pp-th>:nth-child(3){display:none}
  ${p} .pp-add{width:100%;justify-content:center}
}
@media (prefers-reduced-motion:reduce){
  ${p} *,${p} *::before,${p} *::after{animation-duration:.01ms!important;animation-delay:0ms!important;transition:none!important}
}
`;
};
