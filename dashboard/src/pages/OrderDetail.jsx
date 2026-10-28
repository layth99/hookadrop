import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import { toast } from "react-hot-toast";
import Loader from "../components/Loader";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import {
  ArrowLeft, Download, Package, CreditCard, Truck, CheckCircle2, MapPin, User, Mail,
  Phone, Calendar, FileText, Save, Bike, Copy, Printer, Check, Hash, Sparkles, X, Gauge,
} from "lucide-react";

/**
 * OrderDetails — page détail commande (dashboard admin HookaDrop)
 * Design premium avec animations et composants inline
 */

const money = (n) => `$${Number(n).toFixed(2)}`;
const initials = (s = "") => s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

/* ───────── styles & keyframes (scopés .od-root) ───────── */
const CSS = `
@property --od-a{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes od-rise{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:none}}
@keyframes od-orb{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(60px,-40px,0) scale(1.15)}}
@keyframes od-spin{to{--od-a:360deg}}
@keyframes od-ping{0%{box-shadow:0 0 0 0 rgba(245,179,1,.55)}100%{box-shadow:0 0 0 16px rgba(245,179,1,0)}}
@keyframes od-draw{to{stroke-dashoffset:0}}
@keyframes od-sheen{from{transform:translateX(-120%) skewX(-20deg)}to{transform:translateX(320%) skewX(-20deg)}}
@keyframes od-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
@keyframes od-toast{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
@keyframes od-blink{0%,100%{opacity:.25}50%{opacity:1}}
.od-in{animation:od-rise .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--d,0s)}
.od-spot{position:relative;overflow:hidden;transition:border-color .3s,transform .3s}
.od-spot::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .35s;
  background:radial-gradient(380px circle at var(--mx,50%) var(--my,50%),rgba(245,179,1,.11),transparent 45%)}
.od-spot:hover{border-color:rgba(245,179,1,.28)}
.od-spot:hover::before{opacity:1}
.od-edge{padding:1px;border-radius:18px;background:conic-gradient(from var(--od-a),rgba(245,179,1,.08) 0 55%,#f5b301 80%,rgba(245,179,1,.08) 100%);animation:od-spin 5s linear infinite}
.od-sheen{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none}
.od-sheen::after{content:"";position:absolute;top:0;bottom:0;width:36%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);animation:od-sheen 2.8s ease-in-out infinite}
.od-grid{background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:46px 46px;
  mask-image:radial-gradient(ellipse at 50% 0%,#000 25%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse at 50% 0%,#000 25%,transparent 75%)}
@media (prefers-reduced-motion:reduce){.od-root *,.od-root *::before,.od-root *::after{animation:none!important;transition:none!important}}
`;

/* ───────── hooks ───────── */
function useCountUp(target, ms = 1200, delay = 350) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf, t0 = null;
    const tick = (ts) => {
      if (t0 === null) t0 = ts;
      const p = Math.min((ts - t0) / ms, 1);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(tick); }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target, ms, delay]);
  return v;
}

function useToasts() {
  const [list, setList] = useState([]);
  const push = useCallback((text, tone = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setList((l) => [...l, { id, text, tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 2800);
  }, []);
  return [list, push];
}

const spot = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

/* ───────── petits composants ───────── */
function Card({ title, icon: Icon, right, children, className = "", d = 0 }) {
  return (
    <section onMouseMove={spot} style={{ "--d": `${d}s` }}
      className={`od-in od-spot rounded-2xl border border-white/[0.07] bg-[#0b1221]/90 backdrop-blur ${className}`}>
      {title && (
        <header className="relative flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-slate-100">
            {Icon && <Icon size={14} className="text-amber-400" />} {title}
          </h2>
          {right}
        </header>
      )}
      <div className="relative px-5 pb-5">{children}</div>
    </section>
  );
}

function Tile({ icon: Icon, label, value, prefix = "", decimals = 0, text, sub, d }) {
  const n = useCountUp(typeof value === "number" ? value : 0);
  return (
    <div onMouseMove={spot} style={{ "--d": `${d}s` }}
      className="od-in od-spot group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#0b1221]/90 px-5 py-4">
      <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-400 transition group-hover:scale-110 group-hover:bg-amber-400/20">
        <Icon size={19} />
      </div>
      <div className="relative min-w-0">
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="truncate text-lg font-bold tabular-nums text-white">
          {typeof value === "number" ? `${prefix}${n.toFixed(decimals)}` : text}
        </p>
        <p className="text-[11px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function Field({ label, required, hint, icon: Icon, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
        {Icon && <Icon size={12} className="text-slate-500" />} {label}
        {required ? <span className="text-amber-400">*</span> : <span className="text-slate-600">(optional)</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10.5px] leading-snug text-slate-600">{hint}</span>}
    </label>
  );
}
const input = "w-full rounded-lg border border-white/10 bg-[#070c18] px-3 py-2.5 text-[12.5px] text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-amber-400/70 focus:shadow-[0_0_0_4px_rgba(245,179,1,.10)]";

function Ring({ pct, done }) {
  const r = 42, c = 2 * Math.PI * r;
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 500); return () => clearTimeout(t); }, []);
  return (
    <div className="relative grid h-28 w-28 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#odg)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={go ? c * (1 - pct) : c}
          style={{ transition: "stroke-dashoffset 1.8s cubic-bezier(.2,.8,.2,1)", filter: "drop-shadow(0 0 6px rgba(245,179,1,.6))" }} />
        <defs><linearGradient id="odg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d97706" /><stop offset="1" stopColor="#fcd34d" /></linearGradient></defs>
      </svg>
      <div className="text-center">
        {done ? <Check size={26} className="mx-auto text-amber-300" /> : <p className="text-xl font-bold text-white">{Math.round(pct * 100)}%</p>}
        <p className="text-[10px] text-slate-500">{done ? "Completed" : "In progress"}</p>
      </div>
    </div>
  );
}

function Tracker({ order, status }) {
  const steps = [
    { label: "Confirmed", icon: CheckCircle2, at: order.createdAt, key: 'confirmed' },
    { label: "Prepared", icon: Package, at: order.payment?.at || (order.isPaid ? order.paidAt : null), key: 'prepared' },
    { label: "Out for delivery", icon: Truck, at: order.shippedAt || "Pending", key: 'out_for_delivery' },
    { label: "Delivered", icon: CheckCircle2, at: order.delivery?.at || (order.isDelivered ? order.deliveredAt : null), key: 'delivered' },
  ];
  
  // Map status to step index (synchronized with mobile app)
  const statusToIndex = {
    'pending': 0,            // Pending (before confirmation)
    'confirmed': 0,          // Confirmed (payment received) - Step 1
    'prepared': 1,           // Prepared (items ready) - Step 2
    'out_for_delivery': 2,   // Out for delivery (courier assigned) - Step 3
    'delivered': 3,          // Delivered - Step 4
    // Legacy statuses for backward compatibility
    'processing': 1,
    'shipped': 2
  };
  
  const idx = statusToIndex[status] ?? 0;
  const pct = idx / (steps.length - 1);
  const [ready, setReady] = useState(false);
  
  // Reset animation when status changes
  useEffect(() => { 
    setReady(false);
    const t = setTimeout(() => setReady(true), 100); 
    return () => clearTimeout(t); 
  }, [status]);
  
  const ease = "1.8s cubic-bezier(.2,.8,.2,1) .4s";
  return (
    <Card d={0.1} className="p-0">
      <div className="grid items-center gap-6 px-6 py-6 xl:grid-cols-[1fr_auto]">
        <div className="relative">
          <div className="absolute left-[12.5%] right-[12.5%] top-5 h-[3px] rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300 shadow-[0_0_14px_rgba(245,179,1,.7)]"
              style={{ width: ready ? `${pct * 100}%` : "0%", transition: `width ${ease}` }} />
            <div className="absolute -top-[12px] grid h-[27px] w-[27px] place-items-center rounded-full bg-amber-300 text-black shadow-[0_0_18px_rgba(245,179,1,.8)]"
              style={{ left: ready ? `${pct * 100}%` : "0%", transform: "translateX(-50%)", opacity: ready && idx === 3 ? 0 : 1,
                transition: `left ${ease}, opacity .4s ease 2.1s` }}>
              <Truck size={14} />
            </div>
          </div>
          <ol className="relative grid grid-cols-4">
            {steps.map((s, i) => {
              const on = i <= idx, current = i === idx && idx < 3;
              return (
                <li key={s.key} className="flex flex-col items-center text-center">
                  <span className={`grid h-10 w-10 place-items-center rounded-full border-2 ${current ? "[animation:od-ping_1.8s_ease-out_infinite]" : ""}`}
                    style={{ background: ready && on ? "#f5b301" : "#0b1221", borderColor: ready && on ? "#f5b301" : "rgba(255,255,255,.14)",
                      color: ready && on ? "#111" : "#64748b", transition: `all .5s ease ${0.4 + (i / 3) * 1.8}s` }}>
                    <s.icon size={17} />
                  </span>
                  <p className={`mt-2.5 text-xs font-semibold ${on ? "text-slate-100" : "text-slate-500"}`}>{s.label}</p>
                  <p className="text-[10.5px] text-slate-600">{on && s.at ? (typeof s.at === 'string' && s.at.includes('/') ? s.at : formatDateTime(s.at)) : "Pending"}</p>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex items-center gap-4 border-white/[0.07] xl:border-l xl:pl-8">
          <Ring pct={pct} done={idx === 3} />
          <div className="text-xs text-slate-400">
            <p className="flex items-center gap-1.5 font-medium text-slate-200"><Gauge size={13} className="text-amber-400" /> Fulfilment</p>
            <p className="mt-1">{idx === 3 ? "Delivered" : "Step "}<span className="font-semibold text-white">{idx === 3 ? "complete" : `${idx + 1} of 4`}</span></p>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ───────── page ───────── */
export default function OrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState({ name: "", phone: "", vehicle: "", eta: "", notes: "" });
  const [save, setSave] = useState("idle"); // idle | saving | saved
  const [toasts, toastFn] = useToasts();
  
  // Calculate total for count-up (must be before any conditional return)
  const totalValue = order?.totalPrice || 0;
  const total = useCountUp(totalValue, 1400, 500);
  
  useEffect(() => { fetchOrder(); }, [id]);
  
  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      const orderData = data?.data ?? data;
      setOrder(orderData);
      
      // Pre-fill driver form if exists
      if (orderData.driverName || orderData.driverPhone) {
        setDriver({
          name: orderData.driverName || "",
          phone: orderData.driverPhone || "",
          vehicle: orderData.driverVehicle || "",
          eta: orderData.deliveryETA || "",
          notes: orderData.deliveryNotes || ""
        });
      }
    } catch (error) {
      toast.error("Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveDriver = async (driverData) => {
    try {
      await api.put(`/orders/${id}/driver`, driverData);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };
  
  const handleDownloadInvoice = async () => {
    try {
      const { data } = await api.get(`/orders/generateInvoice/${id}`);
      if (!data.invoice) { toast.error("Invoice not available"); return; }

      const inv = data.invoice;
      const lines = inv.items.map(i =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #333">${i.name || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #333;text-align:center">${i.qty}</td>
          <td style="padding:8px;border-bottom:1px solid #333;text-align:right">$${(i.price || 0).toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #333;text-align:right">$${(i.total || 0).toFixed(2)}</td>
        </tr>`
      ).join("");

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice #${inv.orderId}</title>
        <style>body{font-family:sans-serif;color:#111;padding:32px}table{width:100%;border-collapse:collapse}</style>
        </head><body>
        <h1>Invoice #${inv.orderId}</h1>
        <p>${inv.fullname} — ${inv.email}</p>
        <p>${inv.address || ""}</p>
        <table><thead><tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #333">Item</th>
          <th style="padding:8px;border-bottom:2px solid #333">Qty</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #333">Price</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #333">Total</th>
        </tr></thead><tbody>${lines}</tbody></table>
        <p style="text-align:right;margin-top:16px">Shipping: $${(inv.shippingPrice||0).toFixed(2)}</p>
        <p style="text-align:right">Tax: $${(inv.tax||0).toFixed(2)}</p>
        <h3 style="text-align:right">Total: $${(inv.totalPrice||0).toFixed(2)}</h3>
        <script>window.print()</script></body></html>`;

      const win = window.open("", "_blank");
      win.document.write(html);
      win.document.close();
      toast.success("Invoice opened — use Print to save as PDF");
    } catch (error) {
      toast.error("Failed to download invoice");
    }
  };
  
  const handleBack = () => navigate("/orders");
  
  const set = (k) => (e) => setDriver((d) => ({ ...d, [k]: e.target.value }));
  const copy = (txt, label) => { navigator.clipboard?.writeText(txt); toastFn(`${label} copied`); };
  
  const submit = async () => {
    const filled = [driver.name, driver.phone].filter(Boolean).length;
    if (filled < 2 || save === "saving") return;
    setSave("saving");
    try { 
      await handleSaveDriver(driver); 
      setSave("saved"); 
      toastFn("Driver info saved"); 
      setTimeout(() => setSave("idle"), 2200); 
    } catch { 
      setSave("idle"); 
      toastFn("Could not save driver info", "err"); 
    }
  };
  
  if (loading) return <Loader />;
  if (!order) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-gray-400">Order not found</p>
      <button onClick={handleBack} className="btn-secondary">Back to Orders</button>
    </div>
  );
  
  // Map order data to expected format
  const mappedOrder = {
    id: order.orderId || order._id,
    createdAt: formatDateTime(order.createdAt),
    status: order.status || "pending",
    payment: {
      status: order.isPaid ? "Paid" : "Unpaid",
      at: order.paidAt ? formatDateTime(order.paidAt) : formatDateTime(order.createdAt),
      method: order.paymentMethod || "Card",
      stripeStatus: order.stripePaymentStatus || "succeeded",
      stripeId: order.stripePaymentIntentId || "—"
    },
    shippedAt: order.shippedAt ? formatDateTime(order.shippedAt) : "Pending",
    delivery: {
      status: order.isDelivered ? "Delivered" : "Pending",
      at: order.deliveredAt ? formatDateTime(order.deliveredAt) : "Pending"
    },
    items: order.orderItems?.map(item => ({
      id: item._id || item.id,
      name: item.product?.name || "Unknown Product",
      brand: item.product?.mark || "HookaDrop",
      qty: item.qty,
      price: item.product?.price || 0,
      image: item.product?.image || null
    })) || [],
    tax: order.tax || 0,
    shipping: order.shippingPrice || 0,
    total: order.totalPrice || 0,
    customer: {
      name: order.user?.name || order.fullname || "Guest",
      email: order.user?.email || order.email || ""
    },
    address: {
      name: order.fullname || "—",
      email: order.email || order.address || "—"
    },
    isPaid: order.isPaid,
    paidAt: order.paidAt,
    isDelivered: order.isDelivered,
    deliveredAt: order.deliveredAt
  };
  
  const subtotal = mappedOrder.items.reduce((s, i) => s + i.price * i.qty, 0);
  const terminal = ["delivered", "cancelled"].includes(mappedOrder.status);
  const filled = [driver.name, driver.phone].filter(Boolean).length;

  return (
    <div className="od-root relative min-h-full w-full overflow-hidden bg-[#050813] px-6 py-6 xl:px-10">
      <style>{CSS}</style>
      {/* ambiance */}
      <div className="od-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-amber-500/10 blur-[110px]" style={{ animation: "od-orb 16s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute -right-24 top-[40%] h-[380px] w-[380px] rounded-full bg-indigo-500/10 blur-[110px]" style={{ animation: "od-orb 20s ease-in-out infinite reverse" }} />

      <div className="relative mx-auto w-full max-w-[1680px] space-y-5">
        {/* en-tête */}
        <div className="od-in flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={handleBack} aria-label="Back"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:-translate-x-0.5 hover:border-amber-400/50 hover:text-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
              <ArrowLeft size={17} />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
                Order <span className="text-amber-400">#{mappedOrder.id}</span>
                <button onClick={() => copy(mappedOrder.id, "Order ID")} aria-label="Copy order ID" className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-amber-400"><Copy size={14} /></button>
              </h1>
              <p className="text-xs text-slate-500">{mappedOrder.createdAt}</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium capitalize text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ animation: "od-blink 1.6s infinite" }} /> {mappedOrder.status}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1221] px-4 py-2.5 text-xs font-medium text-slate-200 transition hover:border-amber-400/50"><Printer size={14} /> Print</button>
            <button onClick={handleDownloadInvoice} className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/20"><Download size={14} /> Download invoice</button>
          </div>
        </div>

        <Tracker order={mappedOrder} status={mappedOrder.status} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tile d={0.2} icon={Package} label="Order total" value={mappedOrder.total} prefix="$" decimals={2} sub="Tax and shipping included" />
          <Tile d={0.26} icon={Hash} label="Items" value={mappedOrder.items.reduce((s, i) => s + i.qty, 0)} sub={`${mappedOrder.items.length} products`} />
          <Tile d={0.32} icon={CreditCard} label="Payment" text={mappedOrder.payment.status} sub={`${mappedOrder.payment.method} · ${mappedOrder.payment.stripeStatus}`} />
          <Tile d={0.38} icon={Truck} label="Delivery" text={mappedOrder.delivery.status} sub={mappedOrder.delivery.at} />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* gauche */}
          <div className="space-y-5 xl:col-span-8">
            <Card d={0.44} title="Order items" icon={Package}>
              <ul className="divide-y divide-white/[0.06]">
                {mappedOrder.items.map((it, i) => (
                  <li key={it.id} className="od-in group flex items-center gap-4 rounded-lg py-3.5 transition hover:bg-white/[0.025]" style={{ "--d": `${0.5 + i * 0.08}s` }}>
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#070c18] transition group-hover:scale-105 group-hover:border-amber-400/40">
                      {it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" /> : <Package size={22} className="text-slate-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-100">{it.name}</p>
                      <p className="text-xs text-slate-500">{it.brand}</p>
                    </div>
                    <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300">×{it.qty}</span>
                    <div className="w-24 text-right">
                      <p className="text-sm font-semibold tabular-nums text-white">{money(it.price * it.qty)}</p>
                      <p className="text-[11px] text-slate-500">{money(it.price)} each</p>
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 ml-auto max-w-sm space-y-2 border-t border-white/[0.06] pt-4 text-[13px]">
                <div className="flex justify-between text-slate-400"><dt>Subtotal</dt><dd className="tabular-nums">{money(subtotal)}</dd></div>
                <div className="flex justify-between text-slate-400"><dt>Tax</dt><dd className="tabular-nums">{money(mappedOrder.tax)}</dd></div>
                <div className="flex justify-between text-slate-400"><dt>Shipping</dt><dd className="tabular-nums">{money(mappedOrder.shipping)}</dd></div>
                <div className="flex items-baseline justify-between border-t border-white/[0.06] pt-3">
                  <dt className="text-sm font-semibold text-white">Total</dt>
                  <dd className="text-2xl font-bold tabular-nums text-amber-400 [text-shadow:0_0_22px_rgba(245,179,1,.45)]">{money(total)}</dd>
                </div>
              </dl>
            </Card>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Card d={0.6} title="Customer" icon={User}>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-black">{initials(mappedOrder.customer.name)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">{mappedOrder.customer.name}</p>
                    <p className="truncate text-xs text-slate-400">{mappedOrder.customer.email}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <a href={`mailto:${mappedOrder.customer.email}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-[11px] text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300"><Mail size={12} /> Email</a>
                  <button onClick={() => copy(mappedOrder.customer.email, "Email")} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-[11px] text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300"><Copy size={12} /> Copy</button>
                </div>
              </Card>
              <Card d={0.66} title="Shipping address" icon={MapPin}>
                <p className="text-sm font-semibold text-slate-100">{mappedOrder.address.name}</p>
                {order.address && <p className="mt-1 text-xs text-slate-400">{order.address}</p>}
                {(order.phone || order.user?.phone) && <p className="mt-1 text-xs text-slate-400">{order.phone || order.user?.phone}</p>}
                <p className="mt-1 text-xs text-slate-400">{mappedOrder.address.email}</p>
                <button onClick={() => {
                  const fullAddress = `${mappedOrder.address.name}\n${order.address || ''}\n${order.phone || order.user?.phone || ''}\n${mappedOrder.address.email}`;
                  copy(fullAddress, "Address");
                }}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-[11px] text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300"><Copy size={12} /> Copy address</button>
              </Card>
              <Card d={0.72} title="Payment method" icon={CreditCard}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-100 capitalize">{mappedOrder.payment.method}</p>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10.5px] text-emerald-400">{mappedOrder.payment.stripeStatus}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {mappedOrder.isPaid ? `Paid on ${mappedOrder.payment.at}` : "Payment pending"}
                </p>
              </Card>
            </div>
          </div>

          {/* droite : sticky */}
          <div className="space-y-5 xl:col-span-4 xl:sticky xl:top-4 xl:self-start">
            {/* Order Status Management - NOUVEAU */}
            <div className="od-in od-edge" style={{ "--d": "0.45s" }}>
              <div className="rounded-[17px] bg-[#0b1221] p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-100">
                    <Sparkles size={14} className="text-amber-400" /> Order Management
                  </p>
                  <span className="text-[10px] text-slate-600">Admin controls</span>
                </div>
                
                {/* Status Selector */}
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-[11px] font-medium text-slate-400 mb-2 block">Order Status</span>
                    <div className="grid grid-cols-2 gap-2">
                      {['pending', 'confirmed', 'prepared', 'out_for_delivery', 'delivered'].map((status) => {
                        const isActive = mappedOrder.status === status;
                        const colors = {
                          pending: 'from-slate-600 to-slate-400',
                          confirmed: 'from-yellow-600 to-yellow-400',
                          prepared: 'from-blue-600 to-blue-400',
                          out_for_delivery: 'from-cyan-600 to-cyan-400',
                          delivered: 'from-green-600 to-green-400'
                        };
                        const labels = {
                          pending: 'Pending',
                          confirmed: 'Confirmed',
                          prepared: 'Prepared',
                          out_for_delivery: 'Out for Delivery',
                          delivered: 'Delivered'
                        };
                        const icons = {
                          pending: FileText,
                          confirmed: CheckCircle2,
                          prepared: Package,
                          out_for_delivery: Truck,
                          delivered: CheckCircle2
                        };
                        const Icon = icons[status];
                        
                        return (
                          <button
                            key={status}
                            onClick={async () => {
                              if (terminal) return;
                              try {
                                await api.put(`/orders/${id}`, { status });
                                toastFn(`Status updated to ${labels[status]}`);
                                fetchOrder();
                              } catch (error) {
                                console.error('Status update error:', error);
                                toastFn("Failed to update status", "err");
                              }
                            }}
                            disabled={terminal}
                            className={`relative overflow-hidden rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                              isActive
                                ? `bg-gradient-to-r ${colors[status]} text-white border-transparent shadow-lg`
                                : 'bg-[#070c18] border-white/10 text-slate-400 hover:border-amber-400/50 hover:text-slate-200'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {isActive && <span className="od-sheen" />}
                            <span className="flex items-center justify-center gap-1.5">
                              <Icon size={13} />
                              {labels[status]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </label>
                  
                  {/* Payment Status Toggle */}
                  <label className="block">
                    <span className="text-[11px] font-medium text-slate-400 mb-2 block">Payment Status</span>
                    <button
                      onClick={async () => {
                        if (terminal) return;
                        try {
                          await api.put(`/orders/${id}`, { isPaid: !mappedOrder.isPaid });
                          toastFn(`Payment marked as ${!mappedOrder.isPaid ? 'paid' : 'unpaid'}`);
                          fetchOrder();
                        } catch (error) {
                          console.error('Payment update error:', error);
                          toastFn("Failed to update payment", "err");
                        }
                      }}
                      disabled={terminal}
                      className={`w-full relative overflow-hidden rounded-xl border px-4 py-3 text-sm font-bold transition-all ${
                        mappedOrder.isPaid
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 text-white border-transparent shadow-lg'
                          : 'bg-gradient-to-r from-red-600 to-red-400 text-white border-transparent shadow-lg'
                      } disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110`}
                    >
                      {mappedOrder.isPaid && <span className="od-sheen" />}
                      <span className="flex items-center justify-center gap-2">
                        <CreditCard size={15} />
                        {mappedOrder.isPaid ? 'Paid' : 'Mark as Paid'}
                      </span>
                    </button>
                  </label>
                  
                  {/* Delivery Status Toggle */}
                  <label className="block">
                    <span className="text-[11px] font-medium text-slate-400 mb-2 block">Delivery Status</span>
                    <button
                      onClick={async () => {
                        if (terminal) return;
                        try {
                          await api.put(`/orders/${id}`, { isDelivered: !mappedOrder.isDelivered });
                          toastFn(`Delivery marked as ${!mappedOrder.isDelivered ? 'delivered' : 'pending'}`);
                          fetchOrder();
                        } catch (error) {
                          console.error('Delivery update error:', error);
                          toastFn("Failed to update delivery", "err");
                        }
                      }}
                      disabled={terminal}
                      className={`w-full relative overflow-hidden rounded-xl border px-4 py-3 text-sm font-bold transition-all ${
                        mappedOrder.isDelivered
                          ? 'bg-gradient-to-r from-green-600 to-green-400 text-white border-transparent shadow-lg'
                          : 'bg-[#070c18] border border-white/10 text-slate-300 hover:border-amber-400/50'
                      } disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110`}
                    >
                      {mappedOrder.isDelivered && <span className="od-sheen" />}
                      <span className="flex items-center justify-center gap-2">
                        <Truck size={15} />
                        {mappedOrder.isDelivered ? 'Delivered' : 'Mark as Delivered'}
                      </span>
                    </button>
                  </label>
                  
                  {terminal && (
                    <div className="mt-3 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                      <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5">
                        <X size={12} /> Order is {mappedOrder.status}. Status locked.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* carte courier en direct (élément signature) */}
            <div className="od-in od-edge" style={{ "--d": "0.5s" }}>
              <div className="rounded-[17px] bg-[#0b1221] p-5">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[11px] font-medium text-slate-400"><Sparkles size={13} className="text-amber-400" /> Courier card · live preview</p>
                  <span className="flex gap-1">{[0, 1, 2].map((i) => <i key={i} className="h-1.5 w-1.5 rounded-full bg-amber-400" style={{ animation: `od-blink 1.4s ${i * 0.25}s infinite` }} />)}</span>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-lg font-bold text-black">
                    {driver.name ? initials(driver.name) : <Bike size={22} />}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-base font-bold ${driver.name ? "text-white" : "text-slate-600"}`}>{driver.name || "Driver name"}</p>
                    <p className={`text-xs ${driver.phone ? "text-slate-300" : "text-slate-600"}`}>{driver.phone || "+216 XX XXX XXX"}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-white/10 pt-4 text-[11px]">
                  <div><p className="text-slate-500">Vehicle</p><p className="mt-0.5 truncate text-slate-200">{driver.vehicle || "—"}</p></div>
                  <div><p className="text-slate-500">Estimated delivery</p><p className="mt-0.5 truncate text-slate-200">{driver.eta ? new Date(driver.eta).toLocaleString() : "—"}</p></div>
                </div>
              </div>
            </div>

            <Card d={0.58} title="Delivery driver" icon={Bike}
              right={<span className="text-[10.5px] text-slate-500">{filled}/2 required</span>}>
              <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${(filled / 2) * 100}%` }} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Driver name" required><input className={input} placeholder="Ahmed Ben Ali" value={driver.name} onChange={set("name")} /></Field>
                <Field label="Driver phone" required icon={Phone}><input className={input} placeholder="+216 XX XXX XXX" value={driver.phone} onChange={set("phone")} /></Field>
                <Field label="Vehicle info"><input className={input} placeholder="Motorcycle - TU 1234" value={driver.vehicle} onChange={set("vehicle")} /></Field>
                <Field label="Estimated delivery" icon={Calendar}><input type="datetime-local" className={`${input} [color-scheme:dark]`} value={driver.eta} onChange={set("eta")} /></Field>
                <Field label="Delivery instructions" icon={FileText} className="sm:col-span-2" hint="The phone number is shown to the customer to contact the driver.">
                  <textarea rows={3} className={`${input} resize-none`} placeholder="Call customer upon arrival, use back entrance, etc." value={driver.notes} onChange={set("notes")} />
                </Field>
              </div>
              <button onClick={submit} disabled={filled < 2}
                className={`relative mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-xs font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 ${save === "saved" ? "bg-emerald-500 text-white" : "bg-gradient-to-r from-amber-500 to-amber-300 text-black hover:brightness-110"}`}>
                {filled === 2 && save === "idle" && <span className="od-sheen" />}
                {save === "saving" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />}
                {save === "saved" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L19 7" strokeDasharray="24" strokeDashoffset="24" style={{ animation: "od-draw .45s ease forwards" }} /></svg>}
                {save === "idle" && <Save size={14} />}
                {save === "saving" ? "Saving…" : save === "saved" ? "Saved" : "Save driver info"}
              </button>
              {terminal && <p className="mt-3 text-center text-[10.5px] text-slate-600">This order is {mappedOrder.status}. No further status changes are available.</p>}
            </Card>
          </div>
        </div>
      </div>

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 space-y-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} style={{ animation: "od-toast .35s ease both" }}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs shadow-2xl backdrop-blur ${t.tone === "err" ? "border-red-500/40 bg-red-950/80 text-red-200" : "border-amber-400/30 bg-[#0b1221]/95 text-slate-100"}`}>
            {t.tone === "err" ? <X size={14} className="text-red-400" /> : <Check size={14} className="text-amber-400" style={{ animation: "od-pop .4s ease both" }} />} {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
