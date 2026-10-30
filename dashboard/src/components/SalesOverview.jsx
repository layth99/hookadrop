import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * SalesOverview v2 — HookaDrop dashboard
 * Filtre de période (7D / 30D / 90D / ce mois / mois dernier / personnalisé), 3 KPI cliquables
 * (Revenue / Orders = bascule de la courbe), comparaison à la période précédente (courbe pointillée),
 * ligne de moyenne, pic annoté, infobulle riche, états loading / vide / erreur.
 * Aucune dépendance : SVG + CSS scopé. La carte remplit toute la hauteur de sa cellule.
 *
 * Deux façons de l'alimenter (au choix) :
 *  A) orders : [{ date, total, ... }] → agrégation côté client
 *     isRevenue(order) → true si la commande compte dans le chiffre d'affaires
 *     (⚠ reprendre exactement la règle de l'ancien graphique ; mémoïser orders / isRevenue)
 *  B) fetchSales({ from, to }) → Promise<[{ date: "YYYY-MM-DD", revenue, orders }]>
 *     (un point par jour ayant des ventes ; les trous sont comblés ici)
 */

const KEY = "hookadrop.salesOverview.range";
const PRESETS = [
  ["7D", "7D"], ["30D", "30D"], ["90D", "90D"],
  ["month", "This month"], ["lastMonth", "Last month"], ["custom", "Custom"],
];
const DAY = 864e5;

/* ───────── dates ───────── */
const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const diffDays = (a, b) => Math.round((sod(b) - sod(a)) / DAY);
const p2 = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const validISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseISO(s));
const toDate = (v) => (typeof v === "string" && validISO(v) ? parseISO(v) : new Date(v));
const fShort = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const money = (n) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const int = (n) => Math.round(n).toLocaleString("en-US");

function resolveRange({ preset, from, to }) {
  const today = sod(new Date());
  switch (preset) {
    case "30D": return { from: addDays(today, -29), to: today };
    case "90D": return { from: addDays(today, -89), to: today };
    case "month": return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
    case "lastMonth": return {
      from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      to: new Date(today.getFullYear(), today.getMonth(), 0),
    };
    case "custom": return { from: parseISO(from), to: parseISO(to) };
    default: return { from: addDays(today, -6), to: today };
  }
}
const granOf = (days) => (days <= 31 ? "day" : days <= 120 ? "week" : "month");
const bucketStart = (d, g) => {
  const x = sod(d);
  if (g === "day") return x;
  if (g === "week") return addDays(x, -((x.getDay() + 6) % 7));
  return new Date(x.getFullYear(), x.getMonth(), 1);
};
const nextBucket = (d, g) =>
  g === "day" ? addDays(d, 1) : g === "week" ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1);

function aggregate(records, from, to, g) {
  const map = new Map();
  const end = addDays(to, 1);
  for (const r of records) {
    if (r.date >= from && r.date < end) {
      const k = iso(bucketStart(r.date, g));
      const b = map.get(k) ?? { revenue: 0, orders: 0 };
      b.revenue += r.total; b.orders += r.count;
      map.set(k, b);
    }
  }
  const out = [];
  for (let d = bucketStart(from, g); d <= to; d = nextBucket(d, g)) {
    const b = map.get(iso(d)) ?? { revenue: 0, orders: 0 };
    const e = addDays(nextBucket(d, g), -1);
    out.push({
      key: iso(d), start: d, rs: d < from ? from : d, re: e > to ? to : e,
      revenue: Math.round(b.revenue * 100) / 100, orders: b.orders,
    });
  }
  return out;
}
const sumRange = (records, from, to) => {
  const end = addDays(to, 1);
  let revenue = 0, orders = 0;
  for (const r of records) if (r.date >= from && r.date < end) { revenue += r.total; orders += r.count; }
  return { revenue, orders };
};

/* ───────── échelle & courbe ───────── */
function niceMax(v, integer) {
  const raw = Math.max(v, integer ? 4 : 1) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const steps = integer ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  let step = (steps.find((s) => f <= s) ?? 10) * pow;
  if (integer) step = Math.max(1, Math.ceil(step));
  return step * 4;
}
const fmtY = (v) => {
  const r = Number(v.toFixed(2));
  return r >= 1000 ? `$${Number((r / 1000).toFixed(1))}k` : `$${r}`;
};
function monotone(p) {
  const n = p.length;
  if (n < 2) return "";
  const dx = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1].x - p[i].x; m[i] = (p[i + 1].y - p[i].y) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${p[i].x + h},${p[i].y + t[i] * h} ${p[i + 1].x - h},${p[i + 1].y - t[i + 1] * h} ${p[i + 1].x},${p[i + 1].y}`;
  }
  return d;
}
const pctChange = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? "new" : 0);

/* ───────── icônes ───────── */
const Ic = ({ s = 18, w = 1.9, children }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICON = {
  revenue: <><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  orders: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  avg: <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />,
};
const Up = () => <Ic s={12} w={2.6}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></Ic>;
const Down = () => <Ic s={12} w={2.6}><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></Ic>;

function useTween(target, duration = 800) {
  const [v, setV] = useState(0);
  const cur = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { cur.current = target; setV(target); return; }
    const from = cur.current;
    let raf, t0;
    const tick = (now) => {
      t0 ??= now;
      const p = Math.min((now - t0) / duration, 1);
      cur.current = from + (target - from) * (1 - Math.pow(1 - p, 3));
      setV(cur.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

/* ───────── données ───────── */
const defaultIsRevenue = (o) => o.status !== "cancelled";
const loadSel = () => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && PRESETS.some(([k]) => k === s.preset)) {
      if (s.preset !== "custom") return { preset: s.preset };
      if (validISO(s.from) && validISO(s.to) && s.from <= s.to) return s;
    }
  } catch { /* stockage indisponible */ }
  return { preset: "7D" };
};

function useSales({ orders, fetchSales, isRevenue, range }) {
  const fetchRef = useRef(fetchSales);
  fetchRef.current = fetchSales;
  const isAsync = !!fetchSales;
  const fk = iso(range.from), tk = iso(range.to);
  const [st, setSt] = useState({ rec: [], loading: isAsync, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isAsync) return;
    let stale = false;
    const days = diffDays(range.from, range.to) + 1;
    const pTo = addDays(range.from, -1), pFrom = addDays(pTo, -(days - 1));
    const norm = (a = []) => a.map((p) => ({ date: toDate(p.date), total: Number(p.revenue) || 0, count: Number(p.orders) || 0 }));
    setSt((s) => ({ ...s, loading: true, error: null }));
    Promise.all([
      fetchRef.current({ from: range.from, to: range.to }),
      fetchRef.current({ from: pFrom, to: pTo }),
    ])
      .then(([a, b]) => { if (!stale) setSt({ rec: [...norm(a), ...norm(b)], loading: false, error: null }); })
      .catch((e) => { if (!stale) setSt((s) => ({ ...s, loading: false, error: e ?? new Error("error") })); });
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAsync, fk, tk, tick]);

  const records = useMemo(
    () => isAsync ? st.rec
      : orders.filter(isRevenue).map((o) => ({ date: toDate(o.date), total: Number(o.total) || 0, count: 1 })),
    [isAsync, st.rec, orders, isRevenue]
  );

  return useMemo(() => {
    const days = diffDays(range.from, range.to) + 1;
    const g = granOf(days);
    const pTo = addDays(range.from, -1), pFrom = addDays(pTo, -(days - 1));
    const cur = sumRange(records, range.from, range.to);
    const prv = sumRange(records, pFrom, pTo);
    return {
      g, days,
      series: aggregate(records, range.from, range.to, g),
      prevSeries: aggregate(records, pFrom, pTo, g),
      totals: { ...cur, avg: cur.orders ? cur.revenue / cur.orders : 0 },
      prev: { ...prv, avg: prv.orders ? prv.revenue / prv.orders : 0 },
      loading: isAsync && st.loading, error: isAsync ? st.error : null,
      retry: () => setTick((t) => t + 1),
    };
  }, [records, range, isAsync, st.loading, st.error]);
}

/* ───────── graphique ───────── */
const M = { l: 56, r: 22, t: 38, b: 34 };
function Chart({ series, prevSeries, metric, showPrev, showAvg, g, uid, dim }) {
  const wrap = useRef(null);
  const [size, setSize] = useState({ w: 640, h: 300 });
  const [hi, setHi] = useState(null);
  useEffect(() => {
    const el = wrap.current;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(e.contentRect.width, 220), h: Math.max(e.contentRect.height, 200) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => setHi(null), [series, metric]);

  const isRev = metric === "revenue";
  const fmt = isRev ? money : int;
  const { w, h } = size;
  const iw = w - M.l - M.r, ih = h - M.t - M.b, n = series.length;
  const vals = series.map((s) => s[metric]);
  const pv = series.map((_, i) => prevSeries[i]?.[metric]);
  const top = Math.max(0, ...vals, ...(showPrev ? pv.filter((v) => v != null) : []));
  const max = niceMax(top, !isRev);
  const X = (i) => (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const Y = (v) => ih - (v / max) * ih;
  const pts = vals.map((v, i) => ({ x: X(i), y: Y(v) }));
  const line = monotone(pts);
  const area = n > 1 ? `${line} L${X(n - 1)},${ih} L0,${ih} Z` : "";
  const pp = pv.map((v, i) => (v == null ? null : { x: X(i), y: Y(v) })).filter(Boolean);
  const prevLine = showPrev && pp.length > 1 ? monotone(pp) : "";
  const avg = n ? vals.reduce((s, v) => s + v, 0) / n : 0;
  const peak = vals.indexOf(Math.max(...vals));
  const peakTxt = `Peak ${fmt(vals[peak] ?? 0)}`;
  const multiYear = series[0]?.start.getFullYear() !== series[n - 1]?.start.getFullYear();
  const step = Math.ceil(n / Math.max(1, Math.floor(iw / 70)));
  const label = (s) =>
    g === "month" ? s.start.toLocaleDateString("en-US", { month: "short", ...(multiYear ? { year: "2-digit" } : {}) }) : fShort(g === "week" ? s.rs : s.start);
  const title = (s) =>
    g === "day" ? s.start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
      : g === "week" ? `${fShort(s.rs)} – ${fShort(s.re)}, ${s.re.getFullYear()}`
        : s.start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const sig = `${metric}|${g}|${vals.join(",")}`;
  const a = hi != null ? series[hi] : null;
  const pa = hi != null ? prevSeries[hi] : null;
  const delta = a && pa && showPrev ? pctChange(a[metric], pa[metric]) : null;
  const pw = peakTxt.length * 6.7 + 20;
  const px = Math.min(Math.max(X(peak), pw / 2), iw - pw / 2);

  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left;
    setHi(Math.max(0, Math.min(n - 1, n === 1 ? 0 : Math.round((mx / iw) * (n - 1)))));
  };

  return (
    <div className="so-chart" ref={wrap} style={{ opacity: dim ? 0.35 : 1 }}>
      <svg width={w} height={h} role="img"
        aria-label={`${isRev ? "Revenue" : "Orders"} chart, ${n} points, total ${fmt(vals.reduce((s, v) => s + v, 0))}`}>
        <defs>
          <linearGradient id={`a-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isRev ? "#facc15" : "#60a5fa"} stopOpacity=".32" />
            <stop offset="100%" stopColor={isRev ? "#facc15" : "#60a5fa"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <g transform={`translate(${M.l},${M.t})`}>
          {[0, 1, 2, 3, 4].map((k) => (
            <g key={k}>
              <line x1="0" x2={iw} y1={Y((max / 4) * k)} y2={Y((max / 4) * k)} className="so-grid" />
              <text x="-12" y={Y((max / 4) * k) + 4} textAnchor="end" className="so-tick">{isRev ? fmtY((max / 4) * k) : int((max / 4) * k)}</text>
            </g>
          ))}
          {series.map((s, i) => i % step === 0 && (
            <g key={s.key}>
              <line x1={X(i)} x2={X(i)} y1="0" y2={ih} className="so-grid v" />
              <text x={X(i)} y={ih + 22} textAnchor="middle" className="so-tick">{label(s)}</text>
            </g>
          ))}

          {showAvg && n > 1 && (
            <g className="so-avg">
              <line x1="0" x2={iw} y1={Y(avg)} y2={Y(avg)} />
              <text x={iw} y={Y(avg) - 7} textAnchor="end">avg {fmt(avg)}</text>
            </g>
          )}
          {prevLine && <path key={`pv-${sig}`} d={prevLine} className="so-prev" />}
          {n > 1 && <path key={`ar-${sig}`} d={area} fill={`url(#a-${uid})`} className="so-area" />}
          {n > 1 && <path key={`ln-${sig}`} d={line} pathLength="1" className={`so-line ${isRev ? "" : "blue"}`} />}

          {hi != null && <line x1={X(hi)} x2={X(hi)} y1="0" y2={ih} className="so-guide" />}
          {series.map((s, i) => (n <= 31 || i === hi) && (
            <circle key={`${sig}-${s.key}`} cx={X(i)} cy={Y(vals[i])} r={i === hi ? 6 : 3.5}
              className={`so-dot ${isRev ? "" : "blue"} ${i === hi ? "on" : ""}`}
              style={{ animationDelay: `${Math.min(i * 25, 600) + 500}ms` }} />
          ))}

          {n > 1 && vals[peak] > 0 && hi == null && (
            <g key={`pk-${sig}`} className="so-peak" transform={`translate(${px},${Math.max(Y(vals[peak]) - 30, -M.t + 16)})`}>
              <rect x={-pw / 2} y="-12" width={pw} height="24" rx="12" />
              <text textAnchor="middle" y="4">{peakTxt}</text>
            </g>
          )}

          <rect width={iw} height={ih} fill="transparent" onMouseMove={move} onMouseLeave={() => setHi(null)}
            onTouchMove={(e) => { const t = e.touches[0]; if (t) move({ currentTarget: e.currentTarget, clientX: t.clientX }); }} />
        </g>
      </svg>

      {a && (
        <div className="so-tip" style={{ left: Math.min(Math.max(M.l + X(hi), 100), w - 100), top: M.t + Y(vals[hi]) }}>
          <small>{title(a)}</small>
          <strong className={isRev ? "" : "blue"}>{fmt(vals[hi])}</strong>
          <span>{isRev ? `${a.orders} ${a.orders === 1 ? "order" : "orders"}` : money(a.revenue)}</span>
          {delta !== null && (
            <em className={delta === "new" ? "new" : delta >= 0 ? "up" : "down"}>
              {delta === "new" ? "New vs previous" : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}% vs ${fmt(pa[metric])}`}
            </em>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── KPI ───────── */
function Kpi({ i, label, value, format, trend, icon, accent, active, onClick }) {
  const ref = useRef(null);
  const v = useTween(value);
  const Tag = onClick ? "button" : "div";
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <Tag ref={ref} type={onClick ? "button" : undefined} className={`so-kpi ${active ? "on" : ""} ${onClick ? "click" : ""}`}
      onMouseMove={move} onClick={onClick} aria-pressed={onClick ? !!active : undefined}
      style={{ "--a": accent, "--i": i }}>
      <span className="so-kpi-icon"><Ic s={20}>{ICON[icon]}</Ic></span>
      <span className="so-kpi-body">
        <span className="so-kpi-label">{label}</span>
        <strong>{format(v)}</strong>
        <em className={trend === "new" ? "new" : trend >= 0 ? "up" : "down"}>
          {trend === "new" ? "New" : <>{trend >= 0 ? <Up /> : <Down />}{Math.abs(trend).toFixed(1)}%</>}
          <small>vs previous</small>
        </em>
      </span>
    </Tag>
  );
}

function Switch({ on, onChange, children }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`so-sw ${on ? "on" : ""}`} onClick={() => onChange(!on)}>
      <i /><span>{children}</span>
    </button>
  );
}

/* ───────── composant ───────── */
export default function SalesOverview({
  orders = [], fetchSales, isRevenue = defaultIsRevenue, title = "Sales Overview", loading = false,
}) {
  const uid = useId().replace(/:/g, "");
  const [sel, setSel] = useState(loadSel);
  const [open, setOpen] = useState(false);
  const [dFrom, setDFrom] = useState("");
  const [dTo, setDTo] = useState("");
  const [metric, setMetric] = useState("revenue");
  const [showPrev, setShowPrev] = useState(false);
  const [showAvg, setShowAvg] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch { /* ignore */ } }, [sel]);
  const range = useMemo(() => resolveRange(sel), [sel]);
  const data = useSales({ orders, fetchSales, isRevenue, range });
  const busy = loading || data.loading;

  useEffect(() => {
    if (!open) return;
    const away = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const todayISO = iso(sod(new Date()));
  const err = !dFrom || !dTo ? "" : dFrom > dTo ? "Start date must be before end date"
    : dTo > todayISO ? "End date can't be in the future"
      : diffDays(parseISO(dFrom), parseISO(dTo)) + 1 > 365 ? "Maximum range is 1 year" : "";

  const choose = (k) => {
    if (k === "custom") {
      setDFrom(iso(range.from)); setDTo(iso(range.to));
      setOpen((o) => !o);
      return;
    }
    setOpen(false);
    setSel({ preset: k });
  };
  const onKey = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const btns = [...e.currentTarget.querySelectorAll("button")];
    const i = btns.indexOf(document.activeElement);
    const nx = btns[(i + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length];
    nx.focus(); nx.click();
  };

  const { totals, prev } = data;
  const sub = `${range.from.getFullYear() === range.to.getFullYear() ? fShort(range.from) : `${fShort(range.from)}, ${range.from.getFullYear()}`} – ${fShort(range.to)}, ${range.to.getFullYear()}`;
  const empty = !busy && !data.error && totals.orders === 0 && totals.revenue === 0;

  return (
    <section className={`so-${uid}`} aria-label={title}>
      <style>{css(uid)}</style>

      <header className="so-head">
        <div>
          <h3>{title}</h3>
          <p>{sub}<span> · by {data.g}</span></p>
        </div>
        <div className="so-filter" ref={boxRef}>
          <div className="so-pills" role="radiogroup" aria-label="Period" onKeyDown={onKey}>
            {PRESETS.map(([k, l]) => {
              const on = sel.preset === k;
              return (
                <button key={k} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
                  className={on ? "on" : ""} onClick={() => choose(k)}>
                  {k === "custom" && on ? `${fShort(range.from)} – ${fShort(range.to)}` : l}
                </button>
              );
            })}
          </div>
          {open && (
            <div className="so-pop" role="dialog" aria-label="Custom date range">
              <label>From
                <input type="date" value={dFrom} max={dTo || todayISO} onChange={(e) => setDFrom(e.target.value)} />
              </label>
              <label>To
                <input type="date" value={dTo} min={dFrom} max={todayISO} onChange={(e) => setDTo(e.target.value)} />
              </label>
              {err && <p className="err" role="alert">{err}</p>}
              <div className="row">
                <button type="button" className="ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="button" className="go" disabled={!!err || !dFrom || !dTo}
                  onClick={() => { setSel({ preset: "custom", from: dFrom, to: dTo }); setOpen(false); }}>Apply</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="so-kpis">
        <Kpi i={0} label="Revenue" value={totals.revenue} format={money} icon="revenue" accent="#facc15"
          trend={pctChange(totals.revenue, prev.revenue)} active={metric === "revenue"} onClick={() => setMetric("revenue")} />
        <Kpi i={1} label="Orders" value={totals.orders} format={int} icon="orders" accent="#60a5fa"
          trend={pctChange(totals.orders, prev.orders)} active={metric === "orders"} onClick={() => setMetric("orders")} />
        <Kpi i={2} label="Avg. order" value={totals.avg} format={money} icon="avg" accent="#a78bfa"
          trend={pctChange(totals.avg, prev.avg)} />
      </div>

      <div className="so-tools">
        <span className="so-tools-t">Showing <b>{metric === "revenue" ? "revenue" : "orders"}</b></span>
        <div className="so-switches">
          <Switch on={showPrev} onChange={setShowPrev}>Compare to previous</Switch>
          <Switch on={showAvg} onChange={setShowAvg}>Average</Switch>
        </div>
      </div>

      <div className="so-area-wrap">
        <Chart series={data.series} prevSeries={data.prevSeries} metric={metric} showPrev={showPrev}
          showAvg={showAvg} g={data.g} uid={uid} dim={busy} />
        {busy && <div className="so-shim" aria-label="Loading sales" />}
        {empty && (
          <div className="so-msg">
            <strong>No sales in this period</strong>
            <span>Try a wider range.</span>
            <button type="button" onClick={() => choose("30D")}>Show last 30 days</button>
          </div>
        )}
        {data.error && (
          <div className="so-msg">
            <strong>Couldn't load sales data</strong>
            <button type="button" onClick={data.retry}>Retry</button>
          </div>
        )}
      </div>
    </section>
  );
}

const css = (uid) => {
  const p = `.so-${uid}`;
  return `
${p}{--ink:#f1f5f9;--mute:#94a3b8;--gold:#facc15;--line:rgba(255,255,255,.07);
  position:relative;height:100%;min-height:520px;padding:24px 28px;border-radius:20px;color:var(--ink);display:flex;flex-direction:column;gap:16px;
  background:radial-gradient(420px 260px at 85% 0%,rgba(250,204,21,.06),transparent 70%),radial-gradient(380px 240px at 5% 100%,rgba(96,165,250,.06),transparent 70%),linear-gradient(160deg,#0f172a 0%,#060a14 100%);
  border:1px solid rgba(250,204,21,.16);box-shadow:0 20px 50px -24px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.04)}
${p} *{box-sizing:border-box}${p} button{font:inherit;color:inherit}
${p} button:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
${p} .so-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px 20px;flex-wrap:wrap}
${p} h3{margin:0;font-size:20px;font-weight:700;letter-spacing:-.01em}
${p} .so-head p{margin:4px 0 0;font-size:13px;color:var(--mute)}${p} .so-head p span{color:#64748b}

${p} .so-filter{position:relative;max-width:100%}
${p} .so-pills{display:flex;gap:4px;padding:4px;border-radius:999px;background:rgba(2,6,23,.6);border:1px solid var(--line);overflow-x:auto;scrollbar-width:none;max-width:100%}
${p} .so-pills::-webkit-scrollbar{display:none}
${p} .so-pills button{cursor:pointer;border:1px solid transparent;background:none;color:#cbd5e1;padding:6px 13px;border-radius:999px;font-size:13px;font-weight:600;white-space:nowrap;transition:all .25s}
${p} .so-pills button:hover{color:#fff;background:rgba(255,255,255,.06)}
${p} .so-pills button.on{color:var(--gold);background:rgba(250,204,21,.13);border-color:rgba(250,204,21,.5);box-shadow:0 0 16px -6px rgba(250,204,21,.6)}
${p} .so-pop{position:absolute;right:0;top:calc(100% + 10px);z-index:20;width:min(300px,86vw);padding:16px;border-radius:16px;display:flex;flex-direction:column;gap:12px;
  background:linear-gradient(160deg,#111b30,#0a1020);border:1px solid rgba(250,204,21,.3);box-shadow:0 24px 50px -16px #000;animation:so-pop-${uid} .22s cubic-bezier(.22,1,.36,1)}
${p} .so-pop label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
${p} .so-pop input{height:42px;padding:0 12px;border-radius:12px;background:rgba(2,6,23,.7);border:1px solid var(--line);color:var(--ink);color-scheme:dark;font:inherit;outline:0}
${p} .so-pop input:focus{border-color:rgba(250,204,21,.6);box-shadow:0 0 0 3px rgba(250,204,21,.12)}
${p} .so-pop .err{margin:0;font-size:12px;color:#f87171}
${p} .so-pop .row{display:flex;gap:8px;justify-content:flex-end}
${p} .so-pop .row button{cursor:pointer;padding:8px 16px;border-radius:11px;font-weight:700;font-size:13px;border:1px solid var(--line);background:rgba(255,255,255,.04)}
${p} .so-pop .row .go{color:#1a1200;border:0;background:linear-gradient(120deg,#fde047,#f59e0b)}
${p} .so-pop .row .go:disabled{opacity:.4;cursor:not-allowed}

${p} .so-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
${p} .so-kpi{--mx:50%;--my:0%;all:unset;box-sizing:border-box;position:relative;overflow:visible;isolation:isolate;display:flex;align-items:center;gap:14px;
  padding:14px 18px;border-radius:16px;background:linear-gradient(160deg,#0f172a,#070b15);border:1px solid rgba(255,255,255,.08);
  animation:so-up-${uid} .6s cubic-bezier(.22,1,.36,1) backwards;animation-delay:calc(var(--i) * 90ms + 100ms);
  transition:transform .3s cubic-bezier(.22,1,.36,1),border-color .3s,box-shadow .3s}
${p} .so-kpi::before{content:"";position:absolute;inset:0;z-index:-1;opacity:0;transition:opacity .3s;border-radius:16px;
  background:radial-gradient(220px circle at var(--mx) var(--my),color-mix(in srgb,var(--a) 20%,transparent),transparent 70%)}
${p} .so-kpi.click{cursor:pointer}
${p} .so-kpi:hover,${p} .so-kpi.on{transform:translateY(-3px);border-color:color-mix(in srgb,var(--a) 55%,transparent);box-shadow:0 16px 34px -20px color-mix(in srgb,var(--a) 55%,#000)}
${p} .so-kpi:hover::before,${p} .so-kpi.on::before{opacity:1}
${p} .so-kpi.on::after{content:"";position:absolute;left:18px;right:18px;bottom:0;height:2px;border-radius:2px 2px 0 0;background:var(--a);box-shadow:0 0 10px var(--a)}
${p} .so-kpi:focus-visible{outline:2px solid var(--a);outline-offset:2px}
${p} .so-kpi-icon{flex:none;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:var(--a);
  background:linear-gradient(145deg,color-mix(in srgb,var(--a) 22%,transparent),color-mix(in srgb,var(--a) 5%,transparent));
  border:1px solid color-mix(in srgb,var(--a) 32%,transparent);box-shadow:0 0 20px -6px var(--a);transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
${p} .so-kpi:hover .so-kpi-icon{transform:scale(1.1) rotate(-7deg)}
${p} .so-kpi-body{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
${p} .so-kpi-label{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}
${p} .so-kpi strong{font-size:clamp(18px,1.6vw,24px);font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;overflow:visible}
${p} .so-kpi em{display:inline-flex;align-items:center;gap:4px;font-style:normal;font-size:12px;font-weight:700;width:fit-content}
${p} .so-kpi em small{font-size:11px;font-weight:400;color:#64748b;margin-left:3px}
${p} em.up{color:#34d399}${p} em.down{color:#f87171}${p} em.new{color:#60a5fa}

${p} .so-tools{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
${p} .so-tools-t{font-size:13px;color:var(--mute)}${p} .so-tools-t b{color:var(--ink)}
${p} .so-switches{display:flex;gap:8px;flex-wrap:wrap}
${p} .so-sw{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:9px;padding:5px 13px 5px 6px;border-radius:999px;font-size:12.5px;font-weight:600;color:#cbd5e1;
  background:rgba(255,255,255,.03);border:1px solid var(--line);transition:all .25s}
${p} .so-sw:hover{border-color:rgba(250,204,21,.4)}
${p} .so-sw:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
${p} .so-sw i{width:30px;height:18px;border-radius:99px;background:rgba(255,255,255,.12);position:relative;transition:background .25s}
${p} .so-sw i::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
${p} .so-sw.on{color:var(--gold);border-color:rgba(250,204,21,.5);background:rgba(250,204,21,.08)}
${p} .so-sw.on i{background:var(--gold)}${p} .so-sw.on i::after{transform:translateX(12px);background:#1a1200}

${p} .so-area-wrap{position:relative;flex:1;min-height:260px;display:flex}
${p} .so-chart{position:relative;flex:1;min-width:0;transition:opacity .3s}
${p} .so-chart svg{position:absolute;inset:0;overflow:visible}
${p} .so-grid{stroke:rgba(148,163,184,.18);stroke-dasharray:4 5}${p} .so-grid.v{stroke:rgba(148,163,184,.1)}
${p} .so-tick{fill:#94a3b8;font-size:11.5px}
${p} .so-line{fill:none;stroke:#facc15;stroke-width:2.8;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;
  filter:drop-shadow(0 0 7px rgba(250,204,21,.5));animation:so-draw-${uid} 1.2s cubic-bezier(.22,1,.36,1) forwards}
${p} .so-line.blue{stroke:#60a5fa;filter:drop-shadow(0 0 7px rgba(96,165,250,.5))}
${p} .so-area{opacity:0;animation:so-fade-${uid} .9s ease .5s forwards}
${p} .so-prev{fill:none;stroke:#94a3b8;stroke-width:2;stroke-dasharray:6 6;opacity:0;animation:so-fade-${uid} .6s ease .3s forwards}
${p} .so-avg line{stroke:rgba(167,139,250,.75);stroke-dasharray:2 6;stroke-linecap:round;stroke-width:1.6}
${p} .so-avg text{fill:#c4b5fd;font-size:11px;font-weight:600}
${p} .so-dot{fill:#facc15;stroke:#0b1220;stroke-width:1.5;opacity:0;animation:so-fade-${uid} .35s ease forwards}
${p} .so-dot.blue{fill:#60a5fa}
${p} .so-dot.on{fill:#fff;stroke:#facc15;stroke-width:3;opacity:1;animation:none}
${p} .so-dot.blue.on{stroke:#60a5fa}
${p} .so-guide{stroke:rgba(255,255,255,.28);stroke-dasharray:3 4}
${p} .so-peak{opacity:0;animation:so-fade-${uid} .5s ease 1.1s forwards}
${p} .so-peak rect{fill:rgba(250,204,21,.14);stroke:rgba(250,204,21,.5)}
${p} .so-peak text{fill:#fde68a;font-size:11.5px;font-weight:700}
${p} .so-tip{position:absolute;z-index:5;transform:translate(-50%,calc(-100% - 14px));pointer-events:none;display:flex;flex-direction:column;gap:2px;min-width:160px;
  padding:10px 14px;border-radius:12px;background:rgba(8,13,28,.94);backdrop-filter:blur(8px);border:1px solid rgba(250,204,21,.35);box-shadow:0 14px 30px -10px #000}
${p} .so-tip small{font-size:11px;color:var(--mute)}
${p} .so-tip strong{font-size:19px;color:var(--gold);font-variant-numeric:tabular-nums}${p} .so-tip strong.blue{color:#60a5fa}
${p} .so-tip span{font-size:12px;color:#cbd5e1}${p} .so-tip em{font-style:normal;font-size:11.5px;font-weight:700;margin-top:3px}

${p} .so-shim{position:absolute;inset:0;border-radius:14px;pointer-events:none;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.07) 50%,transparent 70%);background-size:220% 100%;animation:so-shim-${uid} 1.3s infinite}
${p} .so-msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center}
${p} .so-msg strong{font-size:16px}${p} .so-msg span{font-size:13px;color:var(--mute)}
${p} .so-msg button{margin-top:8px;cursor:pointer;padding:8px 16px;border-radius:11px;font-weight:700;font-size:13px;color:var(--gold);background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.4)}
${p} .so-msg button:hover{background:rgba(250,204,21,.2)}

@keyframes so-draw-${uid}{to{stroke-dashoffset:0}}
@keyframes so-fade-${uid}{to{opacity:1}}
@keyframes so-up-${uid}{from{opacity:0;transform:translateY(10px)}}
@keyframes so-pop-${uid}{from{opacity:0;transform:translateY(-6px) scale(.97)}}
@keyframes so-shim-${uid}{from{background-position:120% 0}to{background-position:-120% 0}}

@media (max-width:760px){${p} .so-kpis{grid-template-columns:1fr}}
@media (max-width:640px){${p}{padding:18px}${p} .so-filter{width:100%}}
@media (prefers-reduced-motion:reduce){
  ${p} *{animation-duration:.01ms!important;animation-delay:0ms!important;transition:none!important}
  ${p} .so-line{stroke-dashoffset:0}${p} .so-area,${p} .so-dot,${p} .so-prev,${p} .so-peak{opacity:1}
}
`;
};
