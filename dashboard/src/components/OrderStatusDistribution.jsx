import { useEffect, useId, useMemo, useState } from "react";

/**
 * OrderStatusDistribution v2 — HookaDrop dashboard
 * Donut segmenté + anneau "taux de livraison" + légende interactive + 3 indicateurs.
 * Aucune dépendance : SVG + CSS scopé. Mêmes couleurs de statuts que la page Orders.
 *
 * Données acceptées (au choix) :
 *   data={[{ status: "pending", count: 38 }, { status: "confirmed", count: 25 }, …]}
 *   data={[{ key: "pending", label: "Pending", value: 38 }, …]}
 *   data={{ pending: 38, confirmed: 25, delivered: 3 }}
 * La casse n'a pas d'importance ("Pending" = "pending"). Les doublons sont additionnés.
 * Un statut inconnu ou vide est regroupé dans "Other".
 *
 * Props : data, title, onSelect(statusKey) (ex. ouvrir /orders filtré sur ce statut)
 */

const META = {
  pending: { label: "Pending", c: ["#facc15", "#f59e0b"], icon: "clock" },
  confirmed: { label: "Confirmed", c: ["#60a5fa", "#3b82f6"], icon: "confirm" },
  processing: { label: "Processing", c: ["#a78bfa", "#8b5cf6"], icon: "cog" },
  shipped: { label: "Shipped", c: ["#22d3ee", "#06b6d4"], icon: "truck" },
  delivered: { label: "Delivered", c: ["#34d399", "#10b981"], icon: "pkg" },
  cancelled: { label: "Cancelled", c: ["#f87171", "#ef4444"], icon: "x" },
};
const OTHER = { c: ["#94a3b8", "#64748b"], icon: "dot" };
const EXTRA = [["#f472b6", "#ec4899"], ["#fb923c", "#f97316"], ["#2dd4bf", "#14b8a6"]];
const ORDER = Object.keys(META);
const ALIAS = { canceled: "cancelled", completed: "delivered", complete: "delivered", done: "delivered", paid: "confirmed", new: "pending" };
const OPEN = ["pending", "confirmed", "processing", "shipped"];

const cap = (t = "") => t.charAt(0).toUpperCase() + t.slice(1);

const DEFAULT_DATA = [
  { status: "pending", count: 38 }, { status: "confirmed", count: 25 },
  { status: "processing", count: 2 }, { status: "shipped", count: 1 },
  { status: "delivered", count: 3 }, { status: "cancelled", count: 1 },
];

function normalize(data) {
  const entries = Array.isArray(data)
    ? data
    : Object.entries(data ?? {}).map(([k, v]) => ({ key: k, value: v }));
  const map = new Map(ORDER.map((k) => [k, { key: k, label: META[k].label, value: 0 }]));
  entries.forEach((d) => {
    const raw = String(d.key ?? d.status ?? d.name ?? d.label ?? "").trim().toLowerCase();
    const key = ALIAS[raw] ?? (raw || "other");
    const value = Number(d.value ?? d.count ?? d.total ?? 0) || 0;
    if (!map.has(key)) {
      map.set(key, { key, label: key === "other" ? "Other" : (d.label ?? d.name ?? cap(raw)), value: 0 });
    }
    map.get(key).value += value;
  });
  let extra = 0;
  return [...map.values()].map((it) => ({
    ...it,
    c: META[it.key]?.c ?? (it.key === "other" ? OTHER.c : EXTRA[extra++ % EXTRA.length]),
    icon: META[it.key]?.icon ?? OTHER.icon,
  }));
}

/* ───── icônes ───── */
const P = {
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  confirm: <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>,
  cog: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>,
  truck: <><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></>,
  pkg: <><path d="m16 16 2 2 4-4" /><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" /><path d="m7.5 4.27 9 5.15" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>,
  x: <><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>,
  dot: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="2" /></>,
};
const Ic = ({ n, s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>
);

/* ───── géométrie ───── */
const SIZE = 260, CX = SIZE / 2;
const R = 98, STROKE = 20, C = 2 * Math.PI * R;
const RI = 74, SI = 5, CI = 2 * Math.PI * RI;
const GAP = 5;

function useCountUp(target, delay = 0, duration = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf, t0;
    const t = setTimeout(() => {
      const tick = (now) => {
        t0 ??= now;
        const p = Math.min((now - t0) / duration, 1);
        setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target, delay, duration]);
  return v;
}

export default function OrderStatusDistribution({
  data = DEFAULT_DATA, title = "Order Status Distribution", onSelect,
}) {
  const uid = useId().replace(/:/g, "");
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(null);
  useEffect(() => { const r = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(r); }, []);

  const items = useMemo(() => normalize(data), [data]);
  const total = useMemo(() => items.reduce((s, d) => s + d.value, 0), [items]);
  const animTotal = useCountUp(total, 250);

  const rows = useMemo(
    () => items.map((it) => ({ ...it, frac: total ? it.value / total : 0, pct: total ? Math.round((it.value / total) * 1000) / 10 : 0 })),
    [items, total]
  );
  const segs = useMemo(() => {
    const nz = rows.filter((r) => r.value > 0);
    const solo = nz.length === 1;
    let acc = 0;
    return nz.map((r, i) => {
      const arc = r.frac * C;
      const len = solo ? C : Math.max(arc - GAP, 1.2);
      const seg = { ...r, i, len, offset: -(solo ? 0 : acc + GAP / 2) };
      acc += arc;
      return seg;
    });
  }, [rows]);

  const get = (k) => rows.find((r) => r.key === k)?.value ?? 0;
  const deliveredRate = total ? (get("delivered") / total) * 100 : 0;
  const cancelRate = total ? (get("cancelled") / total) * 100 : 0;
  const inProgress = OPEN.reduce((s, k) => s + get(k), 0);
  const cur = rows.find((r) => r.key === active);
  const glow = cur?.c[0] ?? "#facc15";
  const clickable = typeof onSelect === "function";
  const pick = (k) => clickable && onSelect(k);

  return (
    <section className={`os-${uid}`} aria-label={title}>
      <style>{css(uid)}</style>

      <header className="os-head">
        <h3>{title}</h3>
        <span className="os-live"><i />Live</span>
      </header>

      <div className="os-body">
        {/* ───── Donut ───── */}
        <div className="os-chart" style={{ "--g": glow }}>
          <span className="os-glow" />
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img"
            aria-label={`${total} orders: ${rows.filter((r) => r.value).map((r) => `${r.label} ${r.value}`).join(", ")}`}>
            <defs>
              {rows.map((r) => (
                <linearGradient key={r.key} id={`g-${uid}-${r.key}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={r.c[0]} /><stop offset="100%" stopColor={r.c[1]} />
                </linearGradient>
              ))}
              <linearGradient id={`gi-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6ee7b7" /><stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            <circle className="os-orbit" cx={CX} cy={CX} r={R + 25} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" strokeDasharray="1.5 7" />
            <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={STROKE} />

            <g transform={`rotate(-90 ${CX} ${CX})`}>
              {segs.map((s) => {
                const hot = active === s.key, dim = active && !hot;
                return (
                  <circle key={s.key} className="os-seg" cx={CX} cy={CX} r={R} fill="none"
                    stroke={`url(#g-${uid}-${s.key})`} strokeWidth={hot ? STROKE + 7 : STROKE}
                    strokeDasharray={ready ? `${s.len} ${C - s.len}` : `0 ${C}`} strokeDashoffset={s.offset}
                    style={{
                      opacity: dim ? 0.22 : 1, cursor: clickable ? "pointer" : "default",
                      filter: hot ? `drop-shadow(0 0 10px ${s.c[1]}bb)` : "none",
                      transitionDelay: ready && !active ? `${s.i * 130}ms` : "0ms",
                    }}
                    onMouseEnter={() => setActive(s.key)} onMouseLeave={() => setActive(null)}
                    onClick={() => pick(s.key)} />
                );
              })}
            </g>

            {/* anneau intérieur : taux de livraison */}
            <g transform={`rotate(-90 ${CX} ${CX})`}>
              <circle cx={CX} cy={CX} r={RI} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={SI} />
              <circle className="os-inner" cx={CX} cy={CX} r={RI} fill="none" stroke={`url(#gi-${uid})`} strokeWidth={SI}
                strokeLinecap="round"
                strokeDasharray={ready ? `${Math.max((deliveredRate / 100) * CI, deliveredRate ? 2 : 0)} ${CI}` : `0 ${CI}`} />
            </g>
          </svg>

          <div className="os-center" aria-live="polite">
            {cur ? (
              <div key={cur.key} className="os-swap">
                <strong style={{ color: cur.c[0] }}>{cur.value}</strong>
                <span>{cur.label}</span>
                <em style={{ color: cur.c[0] }}>{cur.pct}%</em>
              </div>
            ) : (
              <div key="t" className="os-swap">
                <strong>{animTotal}</strong>
                <span>Total orders</span>
              </div>
            )}
          </div>
        </div>

        {/* ───── Légende ───── */}
        <ul className="os-legend">
          {rows.map((r, i) => (
            <li key={r.key} style={{ "--i": i }}>
              <button type="button" className={`${active === r.key ? "on" : ""} ${r.value ? "" : "zero"}`}
                style={{ "--c": r.c[0], "--c2": r.c[1], cursor: clickable ? "pointer" : "default" }}
                onMouseEnter={() => setActive(r.key)} onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(r.key)} onBlur={() => setActive(null)}
                onClick={() => pick(r.key)}>
                <span className="os-chip"><Ic n={r.icon} /></span>
                <span className="os-txt"><b>{r.label}</b><small>{r.pct}% of orders</small></span>
                <span className="os-num">{r.value}</span>
                <span className="os-track"><i style={{ width: ready ? `${r.pct}%` : "0%", transitionDelay: `${350 + i * 110}ms` }} /></span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ───── Indicateurs ───── */}
      <footer className="os-ins">
        <div style={{ "--c": "#34d399" }}><span>Delivered rate</span><strong>{deliveredRate.toFixed(1)}%</strong></div>
        <div style={{ "--c": "#facc15" }}><span>In progress</span><strong>{inProgress}</strong></div>
        <div style={{ "--c": "#f87171" }}><span>Cancel rate</span><strong>{cancelRate.toFixed(1)}%</strong></div>
      </footer>
    </section>
  );
}

const css = (uid) => {
  const p = `.os-${uid}`;
  return `
${p}{--ink:#f1f5f9;--mute:#94a3b8;--line:rgba(255,255,255,.07);container-type:inline-size;
  position:relative;overflow:hidden;height:100%;padding:24px 28px;border-radius:20px;color:var(--ink);display:flex;flex-direction:column;gap:18px;
  background:radial-gradient(420px 260px at 15% 40%,rgba(250,204,21,.06),transparent 70%),radial-gradient(380px 240px at 92% 92%,rgba(96,165,250,.07),transparent 70%),linear-gradient(160deg,#0f172a 0%,#060a14 100%);
  border:1px solid rgba(250,204,21,.16);box-shadow:0 20px 50px -24px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.04)}
${p} *{box-sizing:border-box}${p} button{font:inherit;color:inherit}
${p} button:focus-visible{outline:2px solid #facc15;outline-offset:2px}
${p} .os-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
${p} h3{margin:0;font-size:20px;font-weight:700;letter-spacing:-.01em}
${p} .os-live{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--mute);padding:4px 11px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.03)}
${p} .os-live i{width:7px;height:7px;border-radius:50%;background:#34d399;animation:os-pulse-${uid} 2s infinite}

${p} .os-body{flex:1;display:grid;grid-template-columns:minmax(210px,270px) 1fr;gap:clamp(18px,4vw,44px);align-items:center}
${p} .os-chart{position:relative;width:100%;max-width:270px;aspect-ratio:1;margin:0 auto}
${p} .os-glow{position:absolute;inset:8%;border-radius:50%;pointer-events:none;filter:blur(26px);opacity:.28;background:var(--g);transition:background .4s,opacity .4s}
${p} .os-chart svg{position:relative;width:100%;height:100%;overflow:visible;display:block}
${p} .os-orbit{transform-origin:50% 50%;animation:os-spin-${uid} 50s linear infinite}
${p} .os-seg{transition:stroke-dasharray 1.1s cubic-bezier(.22,1,.36,1),stroke-width .25s,opacity .25s,filter .25s}
${p} .os-inner{transition:stroke-dasharray 1.4s cubic-bezier(.22,1,.36,1) .7s;filter:drop-shadow(0 0 5px rgba(16,185,129,.55))}
${p} .os-center{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;text-align:center}
${p} .os-swap{display:flex;flex-direction:column;align-items:center;gap:2px;animation:os-swap-${uid} .3s cubic-bezier(.22,1,.36,1)}
${p} .os-swap strong{font-size:46px;line-height:1;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
${p} .os-swap span{font-size:13px;color:var(--mute)}
${p} .os-swap em{font-style:normal;font-size:12px;font-weight:700;margin-top:4px;padding:2px 9px;border-radius:999px;background:rgba(255,255,255,.08)}

${p} .os-legend{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
${p} .os-legend li{animation:os-up-${uid} .55s cubic-bezier(.22,1,.36,1) backwards;animation-delay:calc(var(--i) * 70ms + 250ms)}
${p} .os-legend button{all:unset;box-sizing:border-box;width:100%;display:grid;grid-template-columns:38px 1fr auto;grid-template-areas:"chip txt num" "bar bar bar";
  align-items:center;column-gap:12px;row-gap:7px;padding:9px 12px;border-radius:14px;border:1px solid transparent;transition:background .25s,border-color .25s,transform .25s,opacity .25s}
${p} .os-legend button.zero{opacity:.5}
${p} .os-legend button.on,${p} .os-legend button:focus-visible{background:rgba(255,255,255,.04);border-color:color-mix(in srgb,var(--c) 45%,transparent);transform:translateX(4px);opacity:1}
${p} .os-legend button:focus-visible{outline:2px solid var(--c);outline-offset:2px}
${p} .os-chip{grid-area:chip;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:var(--c);
  background:linear-gradient(145deg,color-mix(in srgb,var(--c) 22%,transparent),color-mix(in srgb,var(--c) 5%,transparent));
  border:1px solid color-mix(in srgb,var(--c) 32%,transparent);box-shadow:0 0 16px -6px var(--c);transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
${p} .os-legend button.on .os-chip{transform:scale(1.1) rotate(-6deg)}
${p} .os-txt{grid-area:txt;display:flex;flex-direction:column;gap:1px;min-width:0}
${p} .os-txt b{font-size:15px;font-weight:700}${p} .os-txt small{font-size:12px;color:#64748b}
${p} .os-num{grid-area:num;font-size:20px;font-weight:800;font-variant-numeric:tabular-nums}
${p} .os-track{grid-area:bar;height:5px;border-radius:99px;background:rgba(255,255,255,.06);overflow:hidden}
${p} .os-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--c),var(--c2));transition:width 1s cubic-bezier(.22,1,.36,1)}

${p} .os-ins{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
${p} .os-ins div{display:flex;flex-direction:column;gap:2px;padding:11px 14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line);position:relative;overflow:hidden}
${p} .os-ins div::before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:3px;border-radius:0 3px 3px 0;background:var(--c)}
${p} .os-ins span{font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--mute)}
${p} .os-ins strong{font-size:20px;font-weight:800;color:var(--c);font-variant-numeric:tabular-nums}

@keyframes os-spin-${uid}{to{transform:rotate(360deg)}}
@keyframes os-swap-${uid}{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}
@keyframes os-up-${uid}{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}
@keyframes os-pulse-${uid}{0%{box-shadow:0 0 0 0 rgba(52,211,153,.6)}70%,100%{box-shadow:0 0 0 7px rgba(52,211,153,0)}}

@container (max-width:560px){
  ${p} .os-body{grid-template-columns:1fr}
}
@media (max-width:560px){${p}{padding:18px}${p} .os-ins{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){
  ${p} *,${p} *::before{animation:none!important;transition:none!important}
}
`;
};
