import { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts";
import { Wine, MapPin, ArrowLeft, Plus, Minus, Search, X, Trash2 } from "lucide-react";

// ─── Typ-Metadaten ────────────────────────────────────────────────────────────
const TYPE = {
  red:      { label: "Rotwein",    color: "#B83232" },
  white:    { label: "Weißwein",   color: "#B8860B" },
  sparkling:{ label: "Schaumwein", color: "#1A8F68" },
  rose:     { label: "Rosé",       color: "#B85070" },
};

// ─── Persistenz-Key ───────────────────────────────────────────────────────────
const STORAGE_KEY = "weinkeller-wines";

// ─── Initialdaten ─────────────────────────────────────────────────────────────
const WINES_INITIAL = [];

// ─── UI-Primitive ─────────────────────────────────────────────────────────────
function Stars({ rating, size = 13 }) {
  const f = Math.round(rating);
  return (
    <span style={{ fontSize: size, letterSpacing: "0.5px", lineHeight: 1 }}>
      <span style={{ color: "#F59E0B" }}>{"★".repeat(f)}</span>
      <span style={{ color: "#D1D5DB" }}>{"☆".repeat(5 - f)}</span>
    </span>
  );
}

function Badge({ type, small = false }) {
  const { label, color } = TYPE[type];
  return (
    <span style={{
      color, background: color + "1A", border: `1px solid ${color}35`,
      fontSize: small ? 10 : 11, padding: small ? "1px 6px" : "3px 10px",
      borderRadius: 999, fontWeight: 600, display: "inline-block", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ─── Sortierleiste ────────────────────────────────────────────────────────────
const SORT_OPTS = [
  { key: "rating",  label: "Bewertung" },
  { key: "vintage", label: "Jahrgang"  },
  { key: "price",   label: "Preis"     },
  { key: "qty",     label: "Menge"     },
  { key: "name",    label: "Name"      },
];
const DEFAULT_DIR = { rating:"desc", vintage:"desc", price:"desc", qty:"desc", name:"asc" };

function SortBar({ sort, setSort }) {
  const toggle = (key) =>
    setSort((p) =>
      p.key === key
        ? { ...p, dir: p.dir === "asc" ? "desc" : "asc" }
        : { key, dir: DEFAULT_DIR[key] }
    );
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-gray-400">Sortieren</span>
      {SORT_OPTS.map(({ key, label }) => {
        const active = sort.key === key;
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="text-xs px-2.5 py-1 rounded-lg border transition-all duration-150"
            style={
              active
                ? { background: "#111827", color: "#fff", borderColor: "#111827" }
                : { background: "transparent", color: "#6B7280", borderColor: "#E5E7EB" }
            }
          >
            {label}{active && <span className="ml-1 opacity-70">{sort.dir === "asc" ? "↑" : "↓"}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Wein-hinzufügen-Modal ────────────────────────────────────────────────────
function AddWineModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name:"", producer:"", vintage:"", type:"red",
    region:"", country:"", alcohol:"",
    qty:"1", price:"", drinkFrom:"", drinkUntil:"",
  });
  const [grapes, setGrapes] = useState([{ name:"", pct:"" }]);
  const [errors, setErrors] = useState({});
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const set = (f, v) => {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: false }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name = true;
    if (!form.producer.trim()) e.producer = true;
    if (!form.region.trim())   e.region = true;
    if (!form.country.trim())  e.country = true;
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleAdd = () => {
    if (!validate()) return;
    onAdd({
      id: Date.now(),
      name: form.name.trim(),
      producer: form.producer.trim(),
      vintage: form.vintage ? +form.vintage : null,
      type: form.type,
      region: form.region.trim(),
      country: form.country.trim(),
      alcohol: parseFloat(form.alcohol) || 0,
      grapes: grapes
        .filter((g) => g.name.trim())
        .map((g, i) => ({ name: g.name.trim(), pct: +g.pct || 100, primary: i === 0 })),
      rating: 0, reviews: 0,
      qty: +form.qty || 1,
      price: form.price ? parseFloat(form.price) : null,
      drinkFrom: form.drinkFrom ? +form.drinkFrom : null,
      drinkUntil: form.drinkUntil ? +form.drinkUntil : null,
      nutrition: { sugar:0, kcal:0, sulfites:0 },
      tasting: [],
    });
    onClose();
  };

  const IS = (err) => ({
    style: {
      width:"100%", borderRadius:8, padding:"7px 10px", fontSize:13,
      color:"#111827", outline:"none", background:"white", boxSizing:"border-box",
      border:`1px solid ${err ? "#EF4444" : "#E5E7EB"}`,
    },
  });

  const Lbl = ({ t, req }) => (
    <div style={{ fontSize:11, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>
      {t}{req && <span style={{ color:"#EF4444" }}> *</span>}
    </div>
  );

  const { color: typeColor } = TYPE[form.type];

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:"white", borderRadius:16, width:"100%", maxWidth:530, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ fontWeight:700, fontSize:16, color:"#111827", margin:0 }}>Neuen Wein hinzufügen</h2>
          <button onClick={onClose} style={{ color:"#9CA3AF", lineHeight:0 }}><X size={18} /></button>
        </div>

        {/* Scrollbarer Body */}
        <div style={{ overflowY:"auto", flex:1, padding:"16px 20px" }}>

          {/* Weinname */}
          <div style={{ marginBottom:12 }}>
            <Lbl t="Weinname" req />
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="z.B. Château Pichon Baron" {...IS(errors.name)} />
            {errors.name && <div style={{ fontSize:11, color:"#EF4444", marginTop:2 }}>Pflichtfeld</div>}
          </div>

          {/* Produzent */}
          <div style={{ marginBottom:12 }}>
            <Lbl t="Produzent / Weingut" req />
            <input value={form.producer} onChange={(e) => set("producer", e.target.value)} placeholder="z.B. Château Pichon Baron Longueville" {...IS(errors.producer)} />
            {errors.producer && <div style={{ fontSize:11, color:"#EF4444", marginTop:2 }}>Pflichtfeld</div>}
          </div>

          {/* Jahrgang + Alkohol */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            <div>
              <Lbl t="Jahrgang" />
              <input type="number" value={form.vintage} onChange={(e) => set("vintage", e.target.value)} placeholder="z.B. 2019" min={1900} max={2030} {...IS(false)} />
            </div>
            <div>
              <Lbl t="Alkohol (%)" />
              <input type="number" value={form.alcohol} onChange={(e) => set("alcohol", e.target.value)} placeholder="z.B. 13.5" step={0.1} min={0} max={22} {...IS(false)} />
            </div>
          </div>

          {/* Weinart */}
          <div style={{ marginBottom:12 }}>
            <Lbl t="Weinart" req />
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {Object.entries(TYPE).map(([k, { label, color }]) => (
                <button
                  key={k}
                  onClick={() => set("type", k)}
                  style={{
                    padding:"5px 14px", borderRadius:999, fontSize:12, fontWeight:600,
                    cursor:"pointer", transition:"all .15s",
                    border:`1px solid ${form.type===k ? color : "#E5E7EB"}`,
                    background: form.type===k ? color+"18" : "transparent",
                    color: form.type===k ? color : "#6B7280",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Region + Land */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            <div>
              <Lbl t="Anbaugebiet" req />
              <input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="z.B. Bordeaux" {...IS(errors.region)} />
              {errors.region && <div style={{ fontSize:11, color:"#EF4444", marginTop:2 }}>Pflichtfeld</div>}
            </div>
            <div>
              <Lbl t="Land" req />
              <input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="z.B. Frankreich" {...IS(errors.country)} />
              {errors.country && <div style={{ fontSize:11, color:"#EF4444", marginTop:2 }}>Pflichtfeld</div>}
            </div>
          </div>

          {/* Keller-Infos */}
          <div style={{ borderTop:"1px solid #F3F4F6", paddingTop:12, marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>Keller</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
              {[
                { f:"qty",        l:"Menge",         ph:"1",    t:"number" },
                { f:"price",      l:"Preis (€)",      ph:"0.00", t:"number" },
                { f:"drinkFrom",  l:"Bereit ab",      ph:"2025", t:"number" },
                { f:"drinkUntil", l:"Trinken bis",    ph:"2035", t:"number" },
              ].map(({ f, l, ph, t }) => (
                <div key={f}>
                  <Lbl t={l} />
                  <input type={t} value={form[f]} onChange={(e) => set(f, e.target.value)} placeholder={ph} {...IS(false)} />
                </div>
              ))}
            </div>
          </div>

          {/* Rebsorten */}
          <div style={{ borderTop:"1px solid #F3F4F6", paddingTop:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.05em" }}>Rebsorten</div>
              <button
                onClick={() => setGrapes((p) => [...p, { name:"", pct:"" }])}
                style={{ fontSize:11, color:"#6B7280", display:"flex", alignItems:"center", gap:3, cursor:"pointer" }}
              >
                <Plus size={11} /> Hinzufügen
              </button>
            </div>
            {grapes.map((g, i) => (
              <div key={i} style={{ display:"flex", gap:6, marginBottom:6, alignItems:"center" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background: i===0 ? typeColor : "#D1D5DB", flexShrink:0 }} />
                <input
                  value={g.name}
                  onChange={(e) => setGrapes((p) => p.map((x, idx) => idx===i ? {...x, name:e.target.value} : x))}
                  placeholder={i===0 ? "Hauptrebsorte" : "Weitere Rebsorte"}
                  style={{ flex:1, border:"1px solid #E5E7EB", borderRadius:8, padding:"6px 10px", fontSize:12, outline:"none", color:"#111827" }}
                />
                <input
                  type="number"
                  value={g.pct}
                  onChange={(e) => setGrapes((p) => p.map((x, idx) => idx===i ? {...x, pct:e.target.value} : x))}
                  placeholder="%"
                  min={1} max={100}
                  style={{ width:52, border:"1px solid #E5E7EB", borderRadius:8, padding:"6px 8px", fontSize:12, outline:"none", textAlign:"center", color:"#111827" }}
                />
                {grapes.length > 1 && (
                  <button onClick={() => setGrapes((p) => p.filter((_, idx) => idx!==i))} style={{ color:"#9CA3AF", lineHeight:0 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"12px 20px", borderTop:"1px solid #F3F4F6", display:"flex", gap:8, justifyContent:"flex-end", flexShrink:0 }}>
          <button
            onClick={onClose}
            style={{ padding:"7px 16px", borderRadius:8, fontSize:13, fontWeight:500, border:"1px solid #E5E7EB", background:"transparent", color:"#6B7280", cursor:"pointer" }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleAdd}
            style={{ padding:"7px 18px", borderRadius:8, fontSize:13, fontWeight:600, border:"none", background:typeColor, color:"white", cursor:"pointer" }}
          >
            Zum Keller hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Flaschen-Visual ──────────────────────────────────────────────────────────
function BottleVisual({ wine }) {
  const { color } = TYPE[wine.type];
  return (
    <div style={{ aspectRatio:"2/3", background:`${color}0D`, border:`1px solid ${color}28`, borderRadius:16, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"flex-end" }}>
        <div style={{ width:22, background:`${color}28`, border:`1px solid ${color}40`, borderRadius:"5px 5px 0 0", height:"60%" }} />
      </div>
      <div style={{ margin:"0 12px 12px", background:"rgba(255,255,255,0.97)", borderTop:`3px solid ${color}`, borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
        <div style={{ fontSize:11, fontWeight:700, color, marginBottom:2 }}>{wine.vintage ?? "NV"}</div>
        <div style={{ fontSize:13, fontWeight:700, color:"#111827", lineHeight:1.35 }}>{wine.name}</div>
        <div style={{ fontSize:11, color:"#6B7280", marginTop:2 }}>{wine.producer}</div>
        <div style={{ fontSize:10, color:"#9CA3AF", marginTop:4 }}>{wine.region} · {wine.country}</div>
      </div>
    </div>
  );
}

// ─── WeinCard ─────────────────────────────────────────────────────────────────
function WineCard({ wine, onClick }) {
  const { color } = TYPE[wine.type];
  return (
    <div
      onClick={onClick}
      role="button" tabIndex={0}
      onKeyDown={(e) => e.key==="Enter" && onClick()}
      style={{ cursor:"pointer" }}
      className="bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-300 hover:shadow-sm transition-all duration-150 flex gap-2.5"
    >
      <div style={{ background:color, width:3, borderRadius:2, flexShrink:0, alignSelf:"stretch" }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-1 mb-0.5">
          <span className="text-sm font-semibold text-gray-900 truncate">{wine.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{wine.vintage ?? "NV"}</span>
        </div>
        <div className="text-xs text-gray-500 truncate mb-2">{wine.producer} · {wine.region}</div>
        <div className="flex items-center justify-between">
          <Badge type={wine.type} small />
          <span className="text-xs text-gray-400">{wine.qty} Fl.</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Stars rating={wine.rating} size={11} />
          <span className="text-xs text-gray-400">{wine.rating > 0 ? wine.rating.toFixed(1) : "–"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ wines, onSelect, onOpenAdd }) {
  const [typeFilter, setTypeFilter] = useState("");
  const [search,     setSearch]     = useState("");
  const [sort,       setSort]       = useState({ key:"rating", dir:"desc" });

  const filtered = wines.filter(
    (w) =>
      (!typeFilter || w.type === typeFilter) &&
      (!search ||
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.producer.toLowerCase().includes(search.toLowerCase()))
  );

  const sorted = [...filtered].sort((a, b) => {
    const m = sort.dir === "asc" ? 1 : -1;
    switch (sort.key) {
      case "rating":  { const d = m*(a.rating - b.rating); return d!==0 ? d : b.id-a.id; }
      case "vintage": return m*((a.vintage ?? 0)-(b.vintage ?? 0));
      case "price":   return m*((a.price ?? 0)-(b.price ?? 0));
      case "qty":     return m*(a.qty - b.qty);
      default:        return m*a.name.localeCompare(b.name, "de");
    }
  });

  const totalBottles  = wines.reduce((s, w) => s + w.qty, 0);
  const avgRating     = wines.length
    ? (wines.filter(w=>w.rating>0).reduce((s,w)=>s+w.rating,0) / (wines.filter(w=>w.rating>0).length||1)).toFixed(1)
    : "–";
  const grapeCount    = new Set(wines.flatMap((w) => w.grapes.map((g) => g.name))).size;

  const pieData = Object.entries(TYPE)
    .map(([k, { label, color }]) => ({
      name: label,
      value: wines.filter((w) => w.type===k).reduce((s,w)=>s+w.qty,0),
      color,
    }))
    .filter((d) => d.value > 0);

  const regionMap = wines.reduce((acc, w) => {
    acc[w.region] = (acc[w.region]||0) + w.qty;
    return acc;
  }, {});
  const barData = Object.entries(regionMap)
    .sort((a, b) => b[1]-a[1]).slice(0, 7)
    .map(([name, value]) => ({ name, value }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Mein Weinkeller</p>
          <h1 className="text-xl font-bold text-gray-900">Übersicht</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Search size={13} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Wein oder Weingut …"
              className="text-sm bg-transparent outline-none text-gray-700 w-40"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 leading-none">
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={onOpenAdd}
            className="flex items-center gap-1.5 text-sm font-semibold text-white px-3.5 py-1.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ background:"#B83232" }}
          >
            <Plus size={14} /> Wein hinzufügen
          </button>
        </div>
      </div>

      {/* Filter-Chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[["","Alle Weine"], ...Object.entries(TYPE).map(([k,{label}])=>[k,label])].map(([key, label]) => {
          const active = typeFilter===key;
          const c = key ? TYPE[key].color : "#111827";
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className="px-3.5 py-1 rounded-full text-sm border transition-all duration-150 font-medium"
              style={ active ? {color:"#fff", background:c, borderColor:c} : {color:"#6B7280", borderColor:"#E5E7EB", background:"transparent"} }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          { v:totalBottles,  l:"Flaschen total"       },
          { v:wines.length,  l:"Verschiedene Weine"   },
          { v:avgRating,     l:"Ø Bewertung"           },
          { v:grapeCount,    l:"Rebsorten"             },
        ].map((s) => (
          <div key={s.l} className="bg-gray-50 rounded-xl p-3.5">
            <div className="text-2xl font-bold text-gray-900">{s.v}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns:"210px 1fr" }}>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Weinarten</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={58} paddingAngle={2} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} Fl.`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {pieData.map((t) => (
                  <div key={t.name} className="flex items-center gap-2 text-xs">
                    <span style={{ background:t.color }} className="w-2 h-2 rounded-sm flex-shrink-0" />
                    <span className="text-gray-500 flex-1">{t.name}</span>
                    <span className="font-semibold text-gray-700">{t.value} Fl.</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">Keine Daten</div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Anbaugebiete</p>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={195}>
              <BarChart data={barData} layout="vertical" margin={{ top:0, right:24, left:0, bottom:0 }}>
                <XAxis type="number" tick={{ fontSize:11, fill:"#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:"#6B7280" }} width={130} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v} Fl.`, "Flaschen"]} />
                <Bar dataKey="value" fill="#7C6DC7" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">Keine Daten</div>
          )}
        </div>
      </div>

      {/* Sortierung + Weinraster */}
      <div className="flex items-center justify-between mb-2.5 gap-3 flex-wrap">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
          {sorted.length} Wein{sorted.length!==1?"e":""}
          {typeFilter ? ` · ${TYPE[typeFilter].label}` : ""}
          {search ? ` · „${search}"` : ""}
        </p>
        <SortBar sort={sort} setSort={setSort} />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {sorted.map((w) => (
          <WineCard key={w.id} wine={w} onClick={() => onSelect(w.id)} />
        ))}
      </div>
      {sorted.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">
          {wines.length === 0
            ? <span>Dein Keller ist noch leer. <button onClick={onOpenAdd} style={{ color:"#B83232", fontWeight:600 }}>Füge deinen ersten Wein hinzu →</button></span>
            : "Keine Weine gefunden."
          }
        </div>
      )}
    </div>
  );
}

// ─── Weindetail ───────────────────────────────────────────────────────────────
function WineDetail({ wine, onBack, onUpdateQty, onDelete }) {
  const { color } = TYPE[wine.type];

  const sugarClass =
    wine.nutrition.sugar > 0
      ? wine.nutrition.sugar < 4
        ? { text:"Trocken",     c:"#16A34A" }
        : wine.nutrition.sugar < 12
        ? { text:"Halbtrocken", c:"#D97706" }
        : { text:"Lieblich",    c:"#9333EA" }
      : null;

  const ratingDist = [
    { s:5, pct:44 }, { s:4, pct:30 },
    { s:3, pct:14 }, { s:2, pct:7  }, { s:1, pct:5  },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={15} /> Zurück zur Übersicht
        </button>
        <button
          onClick={() => { if (window.confirm(`„${wine.name}" wirklich aus dem Keller entfernen?`)) onDelete(wine.id); }}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={13} /> Aus Keller entfernen
        </button>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns:"220px 1fr" }}>
        {/* Linke Spalte */}
        <div>
          <BottleVisual wine={wine} />
          <div className="mt-3 bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Im Keller</p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Flaschen</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQty(wine.id, Math.max(0, wine.qty - 1))}
                  className="w-7 h-7 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
                >
                  <Minus size={12} />
                </button>
                <span className="text-sm font-bold text-gray-900 w-4 text-center">{wine.qty}</span>
                <button
                  onClick={() => onUpdateQty(wine.id, wine.qty + 1)}
                  className="w-7 h-7 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
            {[
              ["Kaufpreis",      wine.price     ? `${wine.price} €`  : "–" ],
              ["Trinkbereit ab", wine.drinkFrom  ?? "–"                    ],
              ["Trinken bis",    wine.drinkUntil ?? "–"                    ],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5 border-t border-gray-100 text-xs">
                <span className="text-gray-400">{l}</span>
                <span className="font-medium text-gray-700">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rechte Spalte */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{wine.name}</h1>
            <Badge type={wine.type} />
          </div>
          <p className="text-base text-gray-500 mb-2">{wine.producer}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-5">
            <MapPin size={12} />
            <span>{wine.region}, {wine.country}</span>
            {wine.vintage && (<><span>·</span><span>{wine.vintage}</span></>)}
            <span>·</span><span>{wine.alcohol}% Vol.</span>
            {wine.reviews > 0 && (<><span>·</span><span>{wine.reviews.toLocaleString()} Bew.</span></>)}
          </div>

          {/* Rebsorten */}
          {wine.grapes.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Rebsorten</p>
              <div className="flex flex-wrap gap-1.5">
                {wine.grapes.map((g) => (
                  <span key={g.name} className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={ g.primary
                      ? { background:`${color}15`, color, border:`1px solid ${color}30` }
                      : { background:"#F3F4F6", color:"#4B5563" }
                    }
                  >
                    {g.name}{g.pct < 100 ? ` ${g.pct}%` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Community-Bewertung */}
          {wine.rating > 0 ? (
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Community-Bewertung</p>
              <div className="flex items-center gap-5">
                <div className="text-center flex-shrink-0">
                  <div className="text-4xl font-bold text-gray-900">{wine.rating.toFixed(1)}</div>
                  <Stars rating={wine.rating} size={18} />
                  <div className="text-xs text-gray-400 mt-1.5">{wine.reviews.toLocaleString()} Bew.</div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {ratingDist.map(({ s, pct }) => (
                    <div key={s} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 w-3 text-right">{s}</span>
                      <span style={{ fontSize:10, color:"#F59E0B" }}>★</span>
                      <div className="flex-1 bg-gray-200 rounded-full" style={{ height:5 }}>
                        <div style={{ width:`${pct}%`, background:color, height:5, borderRadius:3 }} />
                      </div>
                      <span className="text-gray-400 w-7 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-center">
              <div className="text-gray-400 text-sm mb-1">Noch keine Bewertungen</div>
              <Stars rating={0} size={16} />
            </div>
          )}

          {/* Nährwerte */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nährwertinfos</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl p-3 text-center"
                style={{ background: sugarClass ? `${sugarClass.c}10` : "#F9FAFB" }}>
                <div className="text-xs text-gray-400 mb-1">Restzucker</div>
                <div className="text-sm font-bold text-gray-800">
                  {wine.nutrition.sugar > 0 ? `${wine.nutrition.sugar} g/L` : "–"}
                </div>
                {sugarClass && (
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded mt-1 inline-block"
                    style={{ color:sugarClass.c, background:`${sugarClass.c}18` }}>
                    {sugarClass.text}
                  </span>
                )}
              </div>
              {[
                ["Energie",  wine.nutrition.kcal    > 0 ? `${wine.nutrition.kcal} kcal`    : "–"],
                ["Sulfite",  wine.nutrition.sulfites > 0 ? `${wine.nutrition.sulfites} mg/L` : "–"],
              ].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-gray-400 mb-1">{l}</div>
                  <div className="text-sm font-bold text-gray-800">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Verkostungsnotizen */}
          {wine.tasting.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Verkostungsnotizen</p>
              <div className="space-y-2.5">
                {wine.tasting.map((t, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div style={{ width:28, height:28, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:11, fontWeight:700, flexShrink:0 }}>
                          {t.user[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-800">{t.user}</div>
                          <div className="text-xs text-gray-400">{t.date}</div>
                        </div>
                      </div>
                      <Stars rating={t.r} size={12} />
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{t.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function Nav({ tab, setTab, onHome }) {
  return (
    <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100"
      style={{ position:"sticky", top:0, background:"white", zIndex:10 }}>
      <button onClick={onHome} className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"#B83232" }}>
          <Wine size={16} color="white" />
        </div>
        <span className="font-bold text-gray-900 tracking-tight">Weinkeller</span>
      </button>
      <nav className="flex items-center gap-1">
        {["Mein Keller","Entdecken","Statistiken"].map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tab===i ? "bg-gray-100 text-gray-900 font-semibold" : "text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </nav>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background:"#FEE2E2", color:"#B83232" }}>JB</div>
    </div>
  );
}

function Placeholder({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <div className="text-4xl">{icon}</div>
      <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
      <p className="text-sm text-gray-400 max-w-xs">{desc}</p>
    </div>
  );
}

// ─── App-Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [wines, setWines]           = useState(WINES_INITIAL);
  const [selectedId, setSelectedId] = useState(null);
  const [tab,  setTab]              = useState(0);
  const [showAdd, setShowAdd]       = useState(false);
  const [toast,  setToast]          = useState(null);   // { msg, type }
  const saveReady                   = useRef(false);

  // Keller beim Start aus persistentem Speicher laden
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) setWines(JSON.parse(r.value));
      } catch {
        // Noch kein gespeicherter Keller – Standarddaten einmalig ablegen
        try { await window.storage.set(STORAGE_KEY, JSON.stringify(WINES_INITIAL)); } catch {}
      } finally {
        saveReady.current = true;
      }
    })();
  }, []);

  // Keller bei jeder Änderung speichern (erst nach erfolgtem Ladevorgang)
  useEffect(() => {
    if (!saveReady.current) return;
    (async () => {
      try { await window.storage.set(STORAGE_KEY, JSON.stringify(wines)); } catch {}
    })();
  }, [wines]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const selected = wines.find((w) => w.id === selectedId) ?? null;

  const addWine = (w) => {
    setWines((p) => [w, ...p]);
    showToast(`„${w.name}" zum Keller hinzugefügt`);
  };
  const updateQty  = (id, qty) => setWines((p) => p.map((w) => w.id===id ? {...w, qty} : w));
  const deleteWine = (id) => {
    const name = wines.find((w) => w.id === id)?.name ?? "Wein";
    setWines((p) => p.filter((w) => w.id !== id));
    setSelectedId(null);
    showToast(`„${name}" aus dem Keller entfernt`, "warn");
  };

  const handleSetTab = (i) => { setTab(i); setSelectedId(null); };
  const handleHome   = ()  => { setTab(0); setSelectedId(null); };

  return (
    <div className="bg-white min-h-screen px-5 pt-4 pb-10"
      style={{ fontFamily:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", maxWidth:920, margin:"0 auto" }}>
      <Nav tab={tab} setTab={handleSetTab} onHome={handleHome} />

      {selected ? (
        <WineDetail
          wine={selected}
          onBack={() => setSelectedId(null)}
          onUpdateQty={updateQty}
          onDelete={deleteWine}
        />
      ) : tab===0 ? (
        <Dashboard
          wines={wines}
          onSelect={setSelectedId}
          onOpenAdd={() => setShowAdd(true)}
        />
      ) : tab===1 ? (
        <Placeholder icon="🔍" title="Weine entdecken"
          desc="Suche neue Weine nach Region, Rebsorte oder Produzent und füge sie direkt zu deinem Keller hinzu." />
      ) : (
        <Placeholder icon="📊" title="Detailstatistiken"
          desc="Jahrgangsentwicklung, Preisanalysen, Trinkreife-Kalender und mehr – demnächst verfügbar." />
      )}

      {showAdd && (
        <AddWineModal
          onClose={() => setShowAdd(false)}
          onAdd={addWine}
        />
      )}

      {/* Toast-Benachrichtigung */}
      {toast && (
        <div style={{
          position:"fixed", bottom:24, right:24, zIndex:200,
          background: toast.type === "warn" ? "#292524" : "#111827",
          color:"#F9FAFB", padding:"10px 16px", borderRadius:10,
          fontSize:13, fontWeight:500, maxWidth:320,
          display:"flex", alignItems:"center", gap:8,
          boxShadow:"0 8px 24px rgba(0,0,0,0.18)",
          borderLeft: `3px solid ${toast.type === "warn" ? "#F97316" : "#4ADE80"}`,
        }}>
          <span style={{ fontSize:15, flexShrink:0 }}>
            {toast.type === "warn" ? "🗑" : "✓"}
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
