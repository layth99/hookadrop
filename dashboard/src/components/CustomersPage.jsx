import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * CustomersPage — HookaDrop admin (gestion des comptes & permissions)
 * En-tête + 4 KPI interactifs + filtres par rôle + tableau animé + pagination.
 * Aucune dépendance : SVG + CSS scopé. Même thème que Dashboard / Products / Orders.
 *
 * Props
 *  users  [{ id, name, email, phone, location, role, joinedAt, avatar? }]
 *         role: "admin" | "viewer" | "customer"
 *  currentUserId  (optionnel) : l'utilisateur connecté, protégé contre la suppression
 *  loading, pageSize (défaut 10)
 *  onAdd()  onChangeRole(user)  onDelete(user)  onRowClick(user)
 */

const ROLES = ["admin", "viewer", "customer"];
const R = {
  admin: { label: "Admin", color: "#facc15", icon: "crown" },
  viewer: { label: "Viewer (Read Only)", color: "#a78bfa", icon: "eye" },
  customer: { label: "Customer", color: "#60a5fa", icon: "user" },
};
const SORTS = [
  { v: "newest", l: "Newest first" }, { v: "oldest", l: "Oldest first" },
  { v: "name", l: "Name A–Z" },
];
const AV = ["#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#fb923c", "#facc15", "#22d3ee"];
const hashColor = (s = "") => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AV[h % AV.length];
};
const initials = (n = "") => n.trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const relDate = (d) => {
  const a = new Date(d), b = new Date();
  a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
  const n = Math.round((b - a) / 864e5);
  return n <= 0 ? "Today" : n === 1 ? "Yesterday" : n < 31 ? `${n} days ago` : "";
};

const I = {
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  crown: <><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" /></>,
  eye: <><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></>,
  shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></>,
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
        setV(Math.round(target * (1 - Math.pow(1 - p, 4))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target, delay, duration]);
  return v;
}

function Kpi({ i, label, value, icon, accent, note, ratio, active, onClick }) {
  const ref = useRef(null);
  const shown = useCountUp(value, 200 + i * 110);
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <button ref={ref} type="button" className={`pc-kpi ${active ? "on" : ""}`} onMouseMove={move}
      onClick={onClick} aria-pressed={active} style={{ "--a": accent, "--i": i }}>
      <span className="pc-kpi-top">
        <span className="pc-kpi-label">{label}</span>
        <span className="pc-kpi-icon"><Ic n={icon} s={22} /></span>
      </span>
      <span className="pc-kpi-val">{shown.toLocaleString("en-US")}</span>
      <span className="pc-kpi-foot">
        <span className="pc-meter"><i style={{ "--r": `${Math.min(ratio, 1) * 100}%` }} /></span>
        <span className="pc-kpi-note">{note}</span>
      </span>
    </button>
  );
}

const pageList = (p, n) => {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
  const out = [];
  [...new Set([1, n, p, p - 1, p + 1])].filter((x) => x >= 1 && x <= n).sort((a, b) => a - b)
    .forEach((x, i, a) => { if (i && x - a[i - 1] > 1) out.push("…"); out.push(x); });
  return out;
};

export default function CustomersPage({
  users = [], currentUserId, loading = false, pageSize = 10,
  onAdd, onChangeRole, onDelete, onRowClick,
}) {
  const uid = useId().replace(/:/g, "");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const c = { admin: 0, viewer: 0, customer: 0 };
    users.forEach((u) => { c[u.role] = (c[u.role] ?? 0) + 1; });
    return c;
  }, [users]);
  const total = users.length;
  const newThisMonth = useMemo(() => {
    const since = Date.now() - 30 * 864e5;
    return users.filter((u) => new Date(u.joinedAt).getTime() >= since).length;
  }, [users]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const r = users.filter(
      (u) =>
        (role === "all" || u.role === role) &&
        (!needle || [u.name, u.email, u.phone].some((x) => String(x ?? "").toLowerCase().includes(needle)))
    );
    const by = {
      newest: (a, b) => new Date(b.joinedAt) - new Date(a.joinedAt),
      oldest: (a, b) => new Date(a.joinedAt) - new Date(b.joinedAt),
      name: (a, b) => (a.name ?? "").localeCompare(b.name ?? ""),
    }[sort];
    return [...r].sort(by);
  }, [users, q, role, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages);
  const slice = rows.slice((cur - 1) * pageSize, cur * pageSize);
  useEffect(() => { setPage(1); }, [q, role, sort]);

  const pick = (r) => setRole((c) => (c === r ? "all" : r));
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  const sig = `${role}|${sort}|${cur}`;

  return (
    <div className={`pc-${uid}`}>
      <style>{css(uid)}</style>

      <header className="pc-head">
        <div><h1>Customers</h1><p>Manage user accounts and permissions</p></div>
        <button type="button" className="pc-add" onClick={onAdd}><Ic n="plus" s={20} w={2.4} /> Add Customer</button>
      </header>

      <div className="pc-kpis">
        <Kpi i={0} label="Total" value={total} icon="users" accent="#34d399" ratio={1}
          note={`+${newThisMonth} this month`} active={role === "all"} onClick={() => setRole("all")} />
        <Kpi i={1} label="Admins" value={counts.admin} icon="crown" accent={R.admin.color}
          ratio={total ? counts.admin / total : 0} note={`${pct(counts.admin)}% of users`}
          active={role === "admin"} onClick={() => pick("admin")} />
        <Kpi i={2} label="Viewers" value={counts.viewer} icon="eye" accent={R.viewer.color}
          ratio={total ? counts.viewer / total : 0} note={`${pct(counts.viewer)}% of users`}
          active={role === "viewer"} onClick={() => pick("viewer")} />
        <Kpi i={3} label="Customers" value={counts.customer} icon="user" accent={R.customer.color}
          ratio={total ? counts.customer / total : 0} note={`${pct(counts.customer)}% of users`}
          active={role === "customer"} onClick={() => pick("customer")} />
      </div>

      <section className="pc-bar">
        <div className="pc-bar-row">
          <label className="pc-search">
            <Ic n="search" s={19} />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users"
              placeholder="Search by name, email or phone…" />
            {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search"><Ic n="x" s={16} /></button>}
          </label>
          <select className="pc-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort users">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
        <div className="pc-pills" role="radiogroup" aria-label="Role">
          <button type="button" role="radio" aria-checked={role === "all"} className={role === "all" ? "on" : ""}
            style={{ "--c": "#facc15" }} onClick={() => setRole("all")}>All<em>{total}</em></button>
          {ROLES.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={role === r} className={role === r ? "on" : ""}
              style={{ "--c": R[r].color }} onClick={() => setRole(r)}>
              <u />{R[r].label}<em>{counts[r]}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="pc-table" role="table" aria-label="Users">
        <div className="pc-title">
          <span>User list</span>
          <span className="pc-count" key={rows.length}><b>{rows.length}</b> users</span>
        </div>
        <div className="pc-tr pc-th" role="row">
          <span>User</span><span>Role</span><span className="c-phone">Phone</span>
          <span className="c-loc">Location</span><span className="c-join">Joined</span><span className="r">Actions</span>
        </div>

        {loading && Array.from({ length: 6 }, (_, i) => (
          <div className="pc-tr pc-skel" key={i} aria-hidden="true">{Array.from({ length: 6 }, (_, k) => <span key={k} />)}</div>
        ))}

        {!loading && rows.length === 0 && (
          <div className="pc-empty">
            <span><Ic n="users" s={30} /></span>
            <h4>No users found</h4>
            <p>Try another search or clear the filters.</p>
            <button type="button" onClick={() => { setQ(""); setRole("all"); }}>Reset filters</button>
          </div>
        )}

        {!loading && slice.map((u, i) => {
          const rc = R[u.role] ?? { label: u.role, color: "#94a3b8", icon: "user" };
          const ac = hashColor(u.name);
          const me = currentUserId != null && u.id === currentUserId;
          const rel = relDate(u.joinedAt);
          return (
            <div key={`${sig}-${u.id}`} className="pc-tr pc-row" role="row" tabIndex={0}
              style={{ "--d": `${Math.min(i, 14) * 38}ms`, "--c": rc.color }}
              onClick={() => onRowClick?.(u)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onRowClick?.(u)}>
              <span className="pc-user">
                <span className="pc-av" style={{ "--av": ac }}>
                  <b>{initials(u.name)}</b>
                  {u.avatar && <img src={u.avatar} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />}
                </span>
                <span className="pc-user-t">
                  <strong>{u.name}{me && <em>You</em>}</strong>
                  <small>{u.email}</small>
                </span>
              </span>

              <span><i className="pc-role"><Ic n={rc.icon} s={14} w={2.2} />{rc.label}</i></span>
              <span className="pc-phone c-phone">{u.phone || <span className="dash">—</span>}</span>
              <span className="pc-loc c-loc">{u.location || <span className="dash">—</span>}</span>
              <span className="pc-join c-join"><strong>{fmtDate(u.joinedAt)}</strong>{rel && <small>{rel}</small>}</span>

              <span className="pc-act r">
                <button type="button" className="s" aria-label={`Change role of ${u.name}`}
                  onClick={(e) => { e.stopPropagation(); onChangeRole?.(u); }}><Ic n="shield" s={19} /></button>
                <button type="button" className="d" disabled={me} title={me ? "You can't delete your own account" : undefined}
                  aria-label={`Delete ${u.name}`}
                  onClick={(e) => { e.stopPropagation(); onDelete?.(u); }}><Ic n="trash" s={18} /></button>
              </span>
            </div>
          );
        })}

        {!loading && rows.length > pageSize && (
          <footer className="pc-pager">
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
  const p = `.pc-${uid}`;
  return `
${p}{--ink:#f8fafc;--mute:#94a3b8;--gold:#facc15;--line:rgba(255,255,255,.07);color:var(--ink);display:flex;flex-direction:column;gap:22px}
${p} *{box-sizing:border-box}${p} button{font:inherit;color:inherit}
${p} .r{text-align:right;justify-content:flex-end}
${p} button:focus-visible,${p} .pc-row:focus-visible{outline:2px solid var(--gold);outline-offset:2px}

${p} .pc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;animation:pc-up-${uid} .6s both}
${p} h1{margin:0;font-size:32px;font-weight:800;letter-spacing:-.02em}
${p} .pc-head p{margin:4px 0 0;color:var(--mute)}
${p} .pc-add{position:relative;overflow:hidden;cursor:pointer;border:0;display:inline-flex;align-items:center;gap:9px;padding:13px 22px;border-radius:14px;
  font-weight:800;color:#1a1200;background:linear-gradient(120deg,#fde047,#f59e0b 60%,#f97316);box-shadow:0 10px 26px -10px rgba(245,158,11,.7);transition:transform .25s,box-shadow .25s}
${p} .pc-add::after{content:"";position:absolute;top:0;bottom:0;width:60%;left:-80%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg)}
${p} .pc-add:hover{transform:translateY(-2px);box-shadow:0 16px 32px -10px rgba(245,158,11,.85)}
${p} .pc-add:hover::after{left:140%;transition:left .7s}
${p} .pc-add:active{transform:scale(.97)}

${p} .pc-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
${p} .pc-kpi{--mx:50%;--my:0%;all:unset;box-sizing:border-box;cursor:pointer;position:relative;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;gap:6px;
  padding:20px 24px 18px;border-radius:20px;background:linear-gradient(160deg,#0f172a,#070b15);border:1px solid rgba(250,204,21,.14);
  box-shadow:0 14px 34px -22px #000,inset 0 1px 0 rgba(255,255,255,.04);
  animation:pc-up-${uid} .7s cubic-bezier(.22,1,.36,1) backwards;animation-delay:calc(var(--i) * 110ms + 80ms);
  transition:transform .35s cubic-bezier(.22,1,.36,1),border-color .35s,box-shadow .35s}
${p} .pc-kpi::before{content:"";position:absolute;inset:0;z-index:-1;opacity:0;transition:opacity .35s;
  background:radial-gradient(260px circle at var(--mx) var(--my),color-mix(in srgb,var(--a) 20%,transparent),transparent 70%)}
${p} .pc-kpi:hover,${p} .pc-kpi.on{transform:translateY(-4px);border-color:color-mix(in srgb,var(--a) 50%,transparent);box-shadow:0 20px 40px -22px color-mix(in srgb,var(--a) 50%,#000)}
${p} .pc-kpi:hover::before,${p} .pc-kpi.on::before{opacity:1}
${p} .pc-kpi:focus-visible{outline:2px solid var(--a);outline-offset:2px}
${p} .pc-kpi-top{display:flex;justify-content:space-between;align-items:flex-start}
${p} .pc-kpi-label{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);padding-top:3px}
${p} .pc-kpi-icon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;color:var(--a);
  background:linear-gradient(145deg,color-mix(in srgb,var(--a) 20%,transparent),color-mix(in srgb,var(--a) 4%,transparent));
  border:1px solid color-mix(in srgb,var(--a) 30%,transparent);box-shadow:0 0 22px -6px var(--a);transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
${p} .pc-kpi:hover .pc-kpi-icon{transform:scale(1.1) rotate(-7deg)}
${p} .pc-kpi-val{font-size:clamp(28px,2.3vw,36px);font-weight:800;letter-spacing:-.03em;line-height:1.1;font-variant-numeric:tabular-nums}
${p} .pc-kpi-foot{display:flex;align-items:center;gap:10px;margin-top:8px}
${p} .pc-meter{flex:1;height:5px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
${p} .pc-meter i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,color-mix(in srgb,var(--a) 60%,#fff),var(--a));
  animation:pc-fill-${uid} 1.1s cubic-bezier(.22,1,.36,1) .5s forwards}
${p} .pc-kpi-note{font-size:12px;color:#64748b;white-space:nowrap}

${p} .pc-bar{padding:18px 20px;border-radius:20px;display:flex;flex-direction:column;gap:14px;background:linear-gradient(160deg,#0f172a,#080c17);
  border:1px solid rgba(250,204,21,.13);animation:pc-up-${uid} .7s .35s both}
${p} .pc-bar-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
${p} .pc-search{flex:1;min-width:220px;display:flex;align-items:center;gap:10px;padding:0 14px;height:48px;border-radius:14px;color:var(--mute);
  background:rgba(2,6,23,.55);border:1px solid var(--line);transition:border-color .25s,box-shadow .25s}
${p} .pc-search:focus-within{border-color:rgba(250,204,21,.55);box-shadow:0 0 0 4px rgba(250,204,21,.1);color:var(--gold)}
${p} .pc-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--ink);font-size:15px}
${p} .pc-search input::placeholder{color:#64748b}
${p} .pc-search button{all:unset;cursor:pointer;display:grid;place-items:center;width:26px;height:26px;border-radius:8px;color:var(--mute)}
${p} .pc-search button:hover{background:rgba(255,255,255,.08);color:var(--ink)}
${p} .pc-sort{height:48px;padding:0 14px;border-radius:14px;color:var(--ink);background:rgba(2,6,23,.55);border:1px solid var(--line);color-scheme:dark;cursor:pointer;outline:0}
${p} .pc-sort:focus{border-color:rgba(250,204,21,.55)}
${p} .pc-pills{display:flex;gap:8px;overflow-x:auto;padding:2px;scrollbar-width:none;max-width:100%}
${p} .pc-pills::-webkit-scrollbar{display:none}
${p} .pc-pills button{cursor:pointer;border:1px solid var(--line);background:rgba(255,255,255,.03);color:#cbd5e1;border-radius:999px;padding:7px 14px;font-size:13px;
  font-weight:600;white-space:nowrap;display:inline-flex;align-items:center;gap:8px;transition:all .25s}
${p} .pc-pills button u{width:7px;height:7px;border-radius:50%;background:var(--c);text-decoration:none}
${p} .pc-pills button em{font-style:normal;font-size:11px;padding:1px 7px;border-radius:99px;background:rgba(255,255,255,.08);color:var(--mute)}
${p} .pc-pills button:hover{border-color:color-mix(in srgb,var(--c) 50%,transparent);color:#fff}
${p} .pc-pills button.on{color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent);border-color:color-mix(in srgb,var(--c) 60%,transparent);box-shadow:0 0 18px -6px var(--c)}
${p} .pc-pills button.on em{background:color-mix(in srgb,var(--c) 22%,transparent);color:var(--c)}

${p} .pc-table{border-radius:20px;overflow:hidden;background:linear-gradient(160deg,#0f172a,#080c17);border:1px solid rgba(250,204,21,.13);animation:pc-up-${uid} .7s .45s both}
${p} .pc-title{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;font-size:14px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
${p} .pc-count{font-size:14px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--mute)}
${p} .pc-count b{color:var(--gold);text-shadow:0 0 14px rgba(250,204,21,.5);display:inline-block;animation:pc-pop-${uid} .35s}
${p} .pc-tr{display:grid;grid-template-columns:2.8fr 1.5fr 1.2fr 1.1fr 1.3fr 96px;align-items:center;gap:12px;padding:0 24px}
${p} .pc-th{height:52px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:rgba(2,6,23,.35);font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold)}
${p} .pc-row{position:relative;min-height:84px;cursor:pointer;border-bottom:1px solid var(--line);outline:0;
  animation:pc-row-${uid} .5s cubic-bezier(.22,1,.36,1) backwards;animation-delay:var(--d);transition:background .25s}
${p} .pc-row::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:0 3px 3px 0;background:var(--c);transform:scaleY(0);transition:transform .3s}
${p} .pc-row:hover,${p} .pc-row:focus-visible{background:linear-gradient(90deg,color-mix(in srgb,var(--c) 9%,transparent),transparent 70%)}
${p} .pc-row:hover::before,${p} .pc-row:focus-visible::before{transform:scaleY(1)}
${p} .pc-user{display:flex;align-items:center;gap:14px;min-width:0}
${p} .pc-av{position:relative;flex:none;width:50px;height:50px;border-radius:50%;overflow:hidden;display:grid;place-items:center;color:var(--av);
  background:radial-gradient(circle at 30% 25%,color-mix(in srgb,var(--av) 32%,#0b1220),#0b1220);border:2px solid color-mix(in srgb,var(--av) 55%,transparent);
  box-shadow:0 0 16px -4px var(--av);transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
${p} .pc-av b{font-size:17px}
${p} .pc-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
${p} .pc-row:hover .pc-av{transform:scale(1.1) rotate(-5deg)}
${p} .pc-user-t{display:flex;flex-direction:column;gap:2px;min-width:0}
${p} .pc-user-t strong{font-size:17px;display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
${p} .pc-user-t strong em{font-style:normal;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:99px;color:#34d399;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3)}
${p} .pc-user-t small{color:var(--mute);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
${p} .pc-role{display:inline-flex;align-items:center;gap:7px;font-style:normal;font-size:13px;font-weight:700;padding:5px 12px 5px 10px;border-radius:999px;
  color:var(--c);background:color-mix(in srgb,var(--c) 12%,transparent);border:1px solid color-mix(in srgb,var(--c) 40%,transparent)}
${p} .pc-phone{font-variant-numeric:tabular-nums;color:#e2e8f0}
${p} .pc-loc{color:#cbd5e1}${p} .dash{color:#475569}
${p} .pc-join{display:flex;flex-direction:column;gap:2px}
${p} .pc-join strong{font-weight:500;font-size:15px}${p} .pc-join small{font-size:12px;color:#64748b}
${p} .pc-act{display:flex;gap:6px}
${p} .pc-act button{cursor:pointer;width:38px;height:38px;display:grid;place-items:center;border-radius:11px;border:1px solid transparent;background:none;color:#94a3b8;transition:all .2s}
${p} .pc-act .s:hover{color:#facc15;background:rgba(250,204,21,.12);border-color:rgba(250,204,21,.3);transform:translateY(-2px)}
${p} .pc-act .d:hover:not(:disabled){color:#f87171;background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.3);transform:translateY(-2px)}
${p} .pc-act .d:disabled{opacity:.3;cursor:not-allowed}

${p} .pc-pager{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 24px;color:var(--mute);font-size:13px}
${p} .pc-pager b{color:var(--ink)}
${p} .pc-pager nav{display:flex;gap:6px;align-items:center}
${p} .pc-pager nav button{cursor:pointer;min-width:36px;height:36px;padding:0 8px;display:grid;place-items:center;border-radius:11px;font-weight:700;background:rgba(255,255,255,.03);border:1px solid var(--line);transition:all .2s}
${p} .pc-pager nav button:hover:not(:disabled){border-color:rgba(250,204,21,.5);color:var(--gold)}
${p} .pc-pager nav button.on{background:rgba(250,204,21,.14);border-color:rgba(250,204,21,.6);color:var(--gold)}
${p} .pc-pager nav button:disabled{opacity:.35;cursor:not-allowed}
${p} .pc-pager nav em{font-style:normal;padding:0 4px}

${p} .pc-skel{height:84px;border-bottom:1px solid var(--line)}
${p} .pc-skel span{height:16px;border-radius:8px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:pc-shim-${uid} 1.4s infinite}
${p} .pc-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:56px 20px;text-align:center}
${p} .pc-empty>span{width:68px;height:68px;border-radius:22px;display:grid;place-items:center;color:var(--gold);background:rgba(250,204,21,.08);border:1px solid rgba(250,204,21,.25);margin-bottom:8px;animation:pc-float-${uid} 3s ease-in-out infinite}
${p} .pc-empty h4{margin:0;font-size:18px}${p} .pc-empty p{margin:0 0 12px;color:var(--mute)}
${p} .pc-empty button{cursor:pointer;padding:9px 18px;border-radius:12px;font-weight:700;color:var(--gold);background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.4)}

@keyframes pc-up-${uid}{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes pc-row-${uid}{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
@keyframes pc-fill-${uid}{to{width:var(--r)}}
@keyframes pc-pop-${uid}{0%{transform:scale(1.4)}100%{transform:scale(1)}}
@keyframes pc-shim-${uid}{to{background-position:-200% 0}}
@keyframes pc-float-${uid}{50%{transform:translateY(-6px)}}

@media (max-width:1180px){${p} .pc-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:1100px){${p} .pc-tr{grid-template-columns:2.6fr 1.5fr 1.2fr 1.3fr 96px}${p} .c-loc{display:none}}
@media (max-width:760px){${p} .pc-tr{grid-template-columns:2.4fr 1.5fr 1.2fr 84px;padding:0 16px}${p} .c-phone{display:none}}
@media (max-width:560px){
  ${p} .pc-kpis{grid-template-columns:1fr;gap:14px}
  ${p} .pc-tr{grid-template-columns:minmax(0,1fr) auto 84px}${p} .c-join{display:none}
  ${p} .pc-add{width:100%;justify-content:center}
}
@media (prefers-reduced-motion:reduce){
  ${p} *,${p} *::before,${p} *::after{animation-duration:.01ms!important;animation-delay:0ms!important;transition:none!important}
}
`;
};
