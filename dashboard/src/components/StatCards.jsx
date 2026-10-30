import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * StatCards — HookaDrop dashboard (Total Revenue / Orders / Products / Customers)
 * Aucune dépendance : SVG + CSS scopé uniquement.
 *
 * Usage :
 *   <StatCards stats={[
 *     { key: "revenue", label: "Total Revenue", value: 79160.81, prefix: "$", decimals: 2, change: 12.5, series: [...] },
 *     { key: "orders",  label: "Total Orders",  value: 64,  change: 8.2 },
 *     { key: "products", label: "Products",     value: 40,  change: -2.4 },
 *     { key: "customers",label: "Customers",    value: 20,  change: 15.3 },
 *   ]} />
 *
 * `series` (optionnel) = petite liste de nombres pour la sparkline (ex. 7 derniers jours).
 * Sans `series`, une courbe de tendance neutre est générée.
 */

const DEFAULT_STATS = [
  { key: "revenue", label: "Total Revenue", value: 79160.81, prefix: "$", decimals: 2, change: 12.5,
    series: [42, 48, 45, 58, 54, 66, 72] },
  { key: "orders", label: "Total Orders", value: 64, change: 8.2,
    series: [30, 34, 33, 41, 39, 47, 52] },
  { key: "products", label: "Products", value: 40, change: -2.4,
    series: [52, 50, 51, 47, 48, 44, 43] },
  { key: "customers", label: "Customers", value: 20, change: 15.3,
    series: [12, 13, 15, 14, 17, 18, 20] },
];

const THEME = {
  revenue: "#34d399",
  orders: "#facc15",
  products: "#a78bfa",
  customers: "#60a5fa",
};
const FALLBACK_ACCENTS = ["#f9a8d4", "#67e8f9", "#fdba74"];

/* ───────── Icônes (style lucide, inline) ───────── */
const ICONS = {
  revenue: (
    <>
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  orders: (
    <>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </>
  ),
  products: (
    <>
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
  customers: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
};
const Svg = ({ children, size = 22, sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const ArrowUp = () => <Svg size={13} sw={2.4}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></Svg>;
const ArrowDown = () => <Svg size={13} sw={2.4}><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></Svg>;

/* ───────── Count-up ───────── */
function useCountUp(target, delay = 0, duration = 1300) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let raf, start;
    const t = setTimeout(() => {
      const tick = (now) => {
        start ??= now;
        const p = Math.min((now - start) / duration, 1);
        setVal(target * (1 - Math.pow(1 - p, 4)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target, delay, duration]);
  return val;
}

/* ───────── Sparkline ───────── */
const SW = 104, SH = 40, PAD = 5;
function buildPaths(series) {
  const min = Math.min(...series), max = Math.max(...series);
  const range = max - min || 1;
  const pts = series.map((v, i) => [
    (i / (series.length - 1)) * SW,
    PAD + (1 - (v - min) / range) * (SH - PAD * 2),
  ]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const mx = x0 + (x1 - x0) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return { line: d, area: `${d} L${SW},${SH} L0,${SH} Z`, last: pts[pts.length - 1] };
}
function fallbackSeries(change = 0) {
  const slope = Math.max(Math.min(change, 30), -30) / 30;
  return Array.from({ length: 7 }, (_, i) =>
    50 + slope * i * 5 + Math.sin(i * 1.7) * 4
  );
}

/* ───────── Carte ───────── */
function StatCard({ stat, index, uid, accent }) {
  const { key, label, value, prefix = "", suffix = "", decimals = 0, change, trendLabel = "vs last month", series } = stat;
  const shown = useCountUp(value, 250 + index * 120);
  const text = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(shown),
    [shown, decimals]
  );
  const spark = useMemo(
    () => buildPaths(series?.length > 1 ? series : fallbackSeries(change)),
    [series, change]
  );
  const up = (change ?? 0) >= 0;
  const ref = useRef(null);

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const gid = `${uid}-${index}`;
  return (
    <article
      ref={ref}
      className="sc-card"
      onMouseMove={onMove}
      style={{ "--a": accent, "--i": index }}
      aria-label={`${label}: ${prefix}${text}${suffix}`}
    >
      <div className="sc-top">
        <span className="sc-label">{label}</span>
        <span className="sc-icon">
          <Svg>{ICONS[key] ?? ICONS.orders}</Svg>
        </span>
      </div>

      <div className="sc-value">
        {prefix}
        {text}
        {suffix}
      </div>

      <div className="sc-bottom">
        {change != null && (
          <div className="sc-trend">
            <span className={`sc-badge ${up ? "up" : "down"}`}>
              {up ? <ArrowUp /> : <ArrowDown />}
              {Math.abs(change)}%
            </span>
            <span className="sc-vs">{trendLabel}</span>
          </div>
        )}

        <svg className="sc-spark" viewBox={`0 0 ${SW} ${SH}`} aria-hidden="true">
          <defs>
            <linearGradient id={`f-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity=".32" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="sc-area" d={spark.area} fill={`url(#f-${gid})`} />
          <path className="sc-line" d={spark.line} pathLength="1" fill="none"
            stroke={accent} strokeWidth="2" strokeLinecap="round" />
          <circle className="sc-dot" cx={spark.last[0]} cy={spark.last[1]} r="3" fill={accent} />
          <circle className="sc-ping" cx={spark.last[0]} cy={spark.last[1]} r="3" fill="none"
            stroke={accent} strokeWidth="1.5" />
        </svg>
      </div>
    </article>
  );
}

export default function StatCards({ stats = DEFAULT_STATS }) {
  const uid = useId().replace(/:/g, "");
  return (
    <section className={`sc-${uid}`} aria-label="Key metrics">
      <style>{css(uid)}</style>
      <div className="sc-grid">
        {stats.map((s, i) => (
          <StatCard
            key={s.key ?? i}
            stat={s}
            index={i}
            uid={uid}
            accent={THEME[s.key] ?? FALLBACK_ACCENTS[i % FALLBACK_ACCENTS.length]}
          />
        ))}
      </div>
    </section>
  );
}

/* ───────── CSS scopé ───────── */
const css = (uid) => {
  const p = `.sc-${uid}`;
  return `
${p}{--ink:#f8fafc;--mute:#94a3b8}
${p} *{box-sizing:border-box}
${p} .sc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}

${p} .sc-card{
  --mx:50%;--my:0%;
  position:relative;overflow:hidden;isolation:isolate;
  padding:22px 24px 20px;border-radius:20px;color:var(--ink);
  background:linear-gradient(160deg,#0f172a 0%,#070b15 100%);
  border:1px solid rgba(250,204,21,.14);
  box-shadow:0 14px 34px -22px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.04);
  display:flex;flex-direction:column;gap:6px;
  animation:sc-in-${uid} .7s cubic-bezier(.22,1,.36,1) backwards;
  animation-delay:calc(var(--i) * 110ms);
  transition:transform .35s cubic-bezier(.22,1,.36,1),border-color .35s,box-shadow .35s;
}
/* halo qui suit la souris */
${p} .sc-card::before{
  content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:0;
  background:radial-gradient(280px circle at var(--mx) var(--my),
    color-mix(in srgb,var(--a) 20%,transparent),transparent 70%);
  transition:opacity .35s;
}
/* liseré lumineux en haut */
${p} .sc-card::after{
  content:"";position:absolute;left:24px;right:24px;top:0;height:1px;pointer-events:none;
  background:linear-gradient(90deg,transparent,var(--a),transparent);opacity:.35;
  transition:opacity .35s;
}
${p} .sc-card:hover{
  transform:translateY(-5px);
  border-color:color-mix(in srgb,var(--a) 45%,transparent);
  box-shadow:0 22px 44px -22px color-mix(in srgb,var(--a) 45%,#000),inset 0 1px 0 rgba(255,255,255,.06);
}
${p} .sc-card:hover::before{opacity:1}
${p} .sc-card:hover::after{opacity:.9}

${p} .sc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
${p} .sc-label{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);padding-top:4px}
${p} .sc-icon{
  width:46px;height:46px;border-radius:15px;display:grid;place-items:center;color:var(--a);
  background:linear-gradient(145deg,color-mix(in srgb,var(--a) 20%,transparent),color-mix(in srgb,var(--a) 5%,transparent));
  border:1px solid color-mix(in srgb,var(--a) 30%,transparent);
  box-shadow:0 0 22px -6px color-mix(in srgb,var(--a) 60%,transparent);
  transition:transform .4s cubic-bezier(.34,1.56,.64,1);
}
${p} .sc-card:hover .sc-icon{transform:scale(1.1) rotate(-7deg)}

${p} .sc-value{
  margin-top:2px;font-size:clamp(28px,2.4vw,36px);font-weight:800;line-height:1.15;
  letter-spacing:-.03em;font-variant-numeric:tabular-nums;
}

${p} .sc-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:10px}
${p} .sc-trend{display:flex;flex-direction:column;gap:6px;min-width:0}
${p} .sc-badge{
  display:inline-flex;align-items:center;gap:5px;width:fit-content;
  font-size:12px;font-weight:700;padding:3px 9px 3px 7px;border-radius:999px;font-variant-numeric:tabular-nums;
}
${p} .sc-badge.up{color:#34d399;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.25)}
${p} .sc-badge.down{color:#f87171;background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.25)}
${p} .sc-vs{font-size:12px;color:#64748b;white-space:nowrap}

${p} .sc-spark{width:104px;height:40px;flex:none;overflow:visible}
${p} .sc-line{stroke-dasharray:1;stroke-dashoffset:1;
  animation:sc-draw-${uid} 1.4s cubic-bezier(.22,1,.36,1) forwards;
  animation-delay:calc(450ms + var(--i) * 110ms);
  filter:drop-shadow(0 0 4px color-mix(in srgb,var(--a) 70%,transparent))}
${p} .sc-area{opacity:0;animation:sc-fade-${uid} .9s ease forwards;animation-delay:calc(900ms + var(--i) * 110ms)}
${p} .sc-dot{opacity:0;animation:sc-fade-${uid} .4s ease forwards;animation-delay:calc(1500ms + var(--i) * 110ms)}
${p} .sc-ping{transform-box:fill-box;transform-origin:center;opacity:0;
  animation:sc-ping-${uid} 2.4s ease-out infinite;animation-delay:calc(1700ms + var(--i) * 110ms)}

@keyframes sc-in-${uid}{from{opacity:0;transform:translateY(16px) scale(.98)}}
@keyframes sc-draw-${uid}{to{stroke-dashoffset:0}}
@keyframes sc-fade-${uid}{to{opacity:1}}
@keyframes sc-ping-${uid}{0%{opacity:.7;transform:scale(1)}80%,100%{opacity:0;transform:scale(3.2)}}

@media (max-width:1180px){${p} .sc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){${p} .sc-grid{grid-template-columns:1fr;gap:14px}}
@media (prefers-reduced-motion:reduce){
  ${p} .sc-card{opacity:1;transform:none;animation:none}
  ${p} .sc-line{stroke-dashoffset:0;animation:none}
  ${p} .sc-area,${p} .sc-dot{opacity:1;animation:none}
  ${p} .sc-ping{display:none}
  ${p} *{transition:none!important}
}
`;
};
