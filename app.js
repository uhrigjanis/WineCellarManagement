// ─── Übersetzungen (Dictionary) ───────────────────────────────────────────────
const T = {
  de: {
    types: { red: "Rotwein", white: "Weißwein", sparkling: "Schaumwein", rose: "Rosé" },
    sortOpts: { rating: "Bewertung", vintage: "Jahrgang", price: "Preis", qty: "Menge", name: "Name" },
    sort: "Sortieren",
    navCellar: "Mein Keller", navDiscover: "Entdecken", navStats: "Statistiken",
    addModalTitle: "Neuen Wein hinzufügen", editModalTitle: "Wein bearbeiten",
    wineName: "Weinname", producer: "Produzent / Weingut", vintage: "Jahrgang", alcohol: "Alkohol (%)",
    wineType: "Weinart", region: "Anbaugebiet", country: "Land", cellar: "Keller",
    qty: "Menge", price: "Preis (€)", drinkFrom: "Bereit ab", drinkUntil: "Trinken bis",
    grapes: "Rebsorten", add: "Hinzufügen", mainGrape: "Hauptrebsorte", otherGrape: "Weitere Rebsorte",
    cancel: "Abbrechen", addToCellar: "Zum Keller hinzufügen", saveChanges: "Änderungen speichern", mandatory: "Pflichtfeld",
    myCellar: "Mein Weinkeller", overview: "Übersicht", searchPh: "Wein oder Weingut …", addWine: "Wein hinzufügen",
    allWines: "Alle Weine", totalBottles: "Flaschen total", diffWines: "Verschiedene Weine", avgRating: "Ø Bewertung",
    wineTypesLabel: "Weinarten", topRegions: "Top Anbaugebiete", noData: "Keine Daten",
    wineCountSingle: "Wein", wineCountPlural: "Weine", emptyCellar: "Dein Keller ist noch leer.",
    addFirst: "Füge deinen ersten Wein hinzu →", noWines: "Keine Weine gefunden.",
    back: "Zurück zur Übersicht", remove: "Aus Keller entfernen", edit: "Bearbeiten", inCellar: "Im Keller", bottles: "Flaschen",
    purchasePrice: "Kaufpreis", readyFrom: "Trinkbereit ab", reviews: "Bew.", noReviews: "Noch keine Bewertungen",
    nutrition: "Nährwertinfos", sugar: "Restzucker", energy: "Energie", sulfites: "Sulfite",
    dry: "Trocken", semiDry: "Halbtrocken", sweet: "Lieblich", tastingNotes: "Verkostungsnotizen",
    ownRating: "Eigene Bewertung", clickToRate: "Klicke zum Bewerten",
    ratingRequiresCellar: "Bewertung erst möglich, wenn der Wein im Keller liegt (Menge > 0)",
    discoverTitle: "Weine entdecken", discoverDesc: "Suche neue Weine nach Region, Rebsorte oder Produzent und füge sie direkt zu deinem Keller hinzu.",
    statsTitle: "Detailstatistiken", statsDesc: "Jahrgangsentwicklung, Preisanalysen, Trinkreife-Kalender und mehr – demnächst verfügbar.",
    toastAdded: "zum Keller hinzugefügt", toastRemoved: "aus dem Keller entfernt", toastUpdated: "aktualisiert",
    confirmRemove: "wirklich aus dem Keller entfernen?"
  },
  en: {
    types: { red: "Red Wine", white: "White Wine", sparkling: "Sparkling", rose: "Rosé" },
    sortOpts: { rating: "Rating", vintage: "Vintage", price: "Price", qty: "Quantity", name: "Name" },
    sort: "Sort",
    navCellar: "My Cellar", navDiscover: "Discover", navStats: "Statistics",
    addModalTitle: "Add New Wine", editModalTitle: "Edit Wine",
    wineName: "Wine Name", producer: "Producer / Winery", vintage: "Vintage", alcohol: "Alcohol (%)",
    wineType: "Wine Type", region: "Region", country: "Country", cellar: "Cellar",
    qty: "Quantity", price: "Price (€)", drinkFrom: "Drink from", drinkUntil: "Drink until",
    grapes: "Grapes", add: "Add", mainGrape: "Main Grape", otherGrape: "Other Grape",
    cancel: "Cancel", addToCellar: "Add to Cellar", saveChanges: "Save Changes", mandatory: "Required",
    myCellar: "My Wine Cellar", overview: "Overview", searchPh: "Wine or Producer...", addWine: "Add Wine",
    allWines: "All Wines", totalBottles: "Total Bottles", diffWines: "Different Wines", avgRating: "Avg. Rating",
    wineTypesLabel: "Wine Types", topRegions: "Top Regions", noData: "No Data",
    wineCountSingle: "Wine", wineCountPlural: "Wines", emptyCellar: "Your cellar is currently empty.",
    addFirst: "Add your first wine →", noWines: "No wines found.",
    back: "Back to overview", remove: "Remove from cellar", edit: "Edit", inCellar: "In Cellar", bottles: "Bottles",
    purchasePrice: "Purchase Price", readyFrom: "Ready from", reviews: "Rev.", noReviews: "No reviews yet",
    nutrition: "Nutrition Facts", sugar: "Residual Sugar", energy: "Energy", sulfites: "Sulfites",
    dry: "Dry", semiDry: "Semi-dry", sweet: "Sweet", tastingNotes: "Tasting Notes",
    ownRating: "Own Rating", clickToRate: "Click to rate",
    ratingRequiresCellar: "Rating available once the wine is back in your cellar (qty > 0)",
    discoverTitle: "Discover Wines", discoverDesc: "Search for new wines by region, grape, or producer and add them directly to your cellar.",
    statsTitle: "Detailed Statistics", statsDesc: "Vintage development, price analysis, drinking maturity calendar and more - coming soon.",
    toastAdded: "added to cellar", toastRemoved: "removed from cellar", toastUpdated: "updated",
    confirmRemove: "really remove from cellar?"
  }
};

const TYPE = {
  red:      { color: "#B83232" },
  white:    { color: "#B8860B" },
  sparkling:{ color: "#1A8F68" },
  rose:     { color: "#B85070" },
};

const STORAGE_KEY = "weinkeller-wines-v2";

// Globaler App-Status
let state = {
  lang: "de",
  wines: [],
  selectedId: null,
  editingId: null,
  tab: 0, 
  showAdd: false,
  search: "",
  typeFilter: "",
  sort: { key: "rating", dir: "desc" }
};

// Lokaler Zwischenspeicher für dynamische Rebsorten im Modal
let modalGrapes = [{ name: "", pct: "" }];
let pieChartInstance = null;
let barChartInstance = null;

// ─── Initialisierung ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    state.wines = JSON.parse(saved);
  } else {
    state.wines = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  }
  document.getElementById("app-container").classList.remove("hidden");
  render();
});

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.wines));
}

// ─── Controller Aktionen ──────────────────────────────────────────────────────
window.app = {
  setTab(i) {
    state.tab = i;
    state.selectedId = null;
    // FIX: Add-Wein-Overlay beim Tabwechsel (z.B. Klick auf "Entdecken") schließen
    state.showAdd = false;
    state.editingId = null;
    render();
  },
  toggleLang() {
    state.lang = state.lang === "de" ? "en" : "de";
    render();
  },
  handleSearch(val) {
    state.search = val;
    renderDashboardListsAndCharts();
  },
  setTypeFilter(key) {
    state.typeFilter = key;
    renderDashboardListsAndCharts();
  },
  toggleSort(key) {
    const defaultDir = { rating:"desc", vintage:"desc", price:"desc", qty:"desc", name:"asc" };
    if (state.sort.key === key) {
      state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
    } else {
      state.sort = { key, dir: defaultDir[key] };
    }
    renderDashboardListsAndCharts();
  },
  selectWine(id) {
    state.selectedId = id;
    render();
  },
  updateQty(id, newQty) {
    state.wines = state.wines.map(w => w.id === id ? { ...w, qty: newQty } : w);
    saveToStorage();
    render();
  },
  deleteWine(id) {
    const t = T[state.lang];
    const wine = state.wines.find(w => w.id === id);
    if (confirm(`„${wine.name}" ${t.confirmRemove}`)) {
      state.wines = state.wines.filter(w => w.id !== id);
      state.selectedId = null;
      saveToStorage();
      render();
      showToast(`„${wine.name}" ${t.toastRemoved}`, "warn");
    }
  },
  toggleAddModal(show) {
    state.showAdd = show;
    state.editingId = null;
    if (show) modalGrapes = [{ name: "", pct: "" }];
    render();
  },
  openEditModal(id) {
    const wine = state.wines.find(w => w.id === id);
    if (!wine) return;
    state.editingId = id;
    state.showAdd = true;
    modalGrapes = wine.grapes.length ? JSON.parse(JSON.stringify(wine.grapes)) : [{ name: "", pct: "" }];
    render();
  },
  addModalGrape() {
    modalGrapes.push({ name: "", pct: "" });
    renderModalGrapes();
  },
  removeModalGrape(i) {
    modalGrapes = modalGrapes.filter((_, idx) => idx !== i);
    renderModalGrapes();
  },
  setRating(id, rawValue) {
    const wine = state.wines.find(w => w.id === id);
    // Bewertung nur möglich, solange der Wein tatsächlich im Keller liegt (qty > 0)
    if (!wine || wine.qty <= 0) return;

    let val = parseFloat(rawValue);
    if (isNaN(val)) val = 0;
    val = Math.max(0, Math.min(5, val));
    val = Math.round(val * 10) / 10; // eine Nachkommastelle
    state.wines = state.wines.map(w => w.id === id ? { ...w, rating: val } : w);
    saveToStorage();
    renderDetailView();
  },
  submitWine() {
    const t = T[state.lang];
    const name = document.getElementById("m-name").value.trim();
    const producer = document.getElementById("m-producer").value.trim();
    const region = document.getElementById("m-region").value.trim();
    const country = document.getElementById("m-country").value.trim();
    
    const typeEl = document.querySelector('input[name="m-type"]:checked');
    const type = typeEl ? typeEl.value : "red";
    
    let hasErrors = false;
    [["m-name", name], ["m-producer", producer], ["m-region", region], ["m-country", country]].forEach(([id, val]) => {
      const el = document.getElementById(id);
      const errEl = document.getElementById(id + "-err");
      if (!val) {
        el.style.borderColor = "#EF4444";
        errEl.classList.remove("hidden");
        hasErrors = true;
      } else {
        el.style.borderColor = "#E5E7EB";
        errEl.classList.add("hidden");
      }
    });
    if (hasErrors) return;

    // FIX: Sicheres Auslesen ohne Index-Konflikte im DOM
    const grapeData = [];
    modalGrapes.forEach((_, i) => {
      const nameEl = document.getElementById(`g-name-${i}`);
      const pctEl = document.getElementById(`g-pct-${i}`);
      if (nameEl && nameEl.value.trim()) {
        grapeData.push({
          name: nameEl.value.trim(),
          pct: pctEl ? (+pctEl.value || 100) : 100,
          primary: grapeData.length === 0
        });
      }
    });

    const fields = {
      name, producer, region, country, type,
      vintage: +document.getElementById("m-vintage").value || null,
      alcohol: parseFloat(document.getElementById("m-alcohol").value) || 0,
      qty: +document.getElementById("m-qty").value || 1,
      price: parseFloat(document.getElementById("m-price").value) || null,
      drinkFrom: +document.getElementById("m-drinkFrom").value || null,
      drinkUntil: +document.getElementById("m-drinkUntil").value || null,
      grapes: grapeData
    };

    if (state.editingId !== null) {
      state.wines = state.wines.map(w => w.id === state.editingId ? { ...w, ...fields } : w);
      showToast(`„${name}" ${t.toastUpdated}`);
    } else {
      const newWine = {
        id: Date.now(),
        ...fields,
        rating: 0,
        nutrition: { sugar: 0, kcal: 0, sulfites: 0 },
        tasting: []
      };
      state.wines.unshift(newWine);
      showToast(`„${name}" ${t.toastAdded}`);
    }

    saveToStorage();
    state.showAdd = false;
    state.editingId = null;
    render();
  }
};

// ─── Render Engine ────────────────────────────────────────────────────────────
function render() {
  const t = T[state.lang];
  
  document.getElementById("nav-zone").innerHTML = `
    <div class="flex items-center justify-between pb-4 mb-5 border-b border-gray-100 sticky top-0 bg-white z-10">
      <button onclick="window.app.setTab(0)" class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-[#B83232]">
          <i data-lucide="wine" class="text-white w-4 h-4"></i>
        </div>
        <span class="font-bold text-gray-900 tracking-tight">Weinkeller</span>
      </button>
      <nav class="flex items-center gap-1">
        ${[t.navCellar, t.navDiscover, t.navStats].map((label, i) => `
          <button onclick="window.app.setTab(${i})" class="px-3 py-1.5 rounded-lg text-sm transition-colors ${state.tab===i ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-700'}">
            ${label}
          </button>
        `).join('')}
      </nav>
      <div class="flex items-center gap-3">
        <button onclick="window.app.toggleLang()" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors">
          <i data-lucide="globe" class="w-3.5 h-3.5"></i>
          ${state.lang === 'de' ? 'EN' : 'DE'}
        </button>
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#FEE2E2] text-[#B83232]">JB</div>
      </div>
    </div>
  `;

  document.querySelectorAll(".view-pane").forEach(el => el.classList.add("hidden"));

  if (state.selectedId !== null) {
    renderDetailView();
  } else if (state.tab === 0) {
    document.getElementById("lbl-my-cellar").innerText = t.myCellar;
    document.getElementById("lbl-overview").innerText = t.overview;
    document.getElementById("search-input").placeholder = t.searchPh;
    document.getElementById("lbl-add-wine-btn").innerText = t.addWine;
    document.getElementById("lbl-chart-types").innerText = t.wineTypesLabel;
    document.getElementById("lbl-chart-regions").innerText = t.topRegions;

    document.getElementById("view-dashboard").classList.remove("hidden");
    renderDashboardListsAndCharts();
  } else if (state.tab === 1) {
    renderPlaceholder("🔍", t.discoverTitle, t.discoverDesc);
  } else {
    renderPlaceholder("📊", t.statsTitle, t.statsDesc);
  }

  renderModal();
  lucide.createIcons();
}

function renderPlaceholder(icon, title, desc) {
  document.getElementById("placeholder-icon").innerText = icon;
  document.getElementById("placeholder-title").innerText = title;
  document.getElementById("placeholder-desc").innerText = desc;
  document.getElementById("view-placeholder").classList.remove("hidden");
}

function renderDashboardListsAndCharts() {
  const t = T[state.lang];
  
  document.getElementById("filter-buttons").innerHTML = `
    <button onclick="window.app.setTypeFilter('')" class="px-3.5 py-1 rounded-full text-sm border transition-all duration-150 font-medium ${state.typeFilter==='' ? 'bg-[#111827] border-[#111827] text-white' : 'text-gray-500 border-gray-200'}">
      ${t.allWines}
    </button>
    ${Object.keys(TYPE).map(k => `
      <button onclick="window.app.setTypeFilter('${k}')" class="px-3.5 py-1 rounded-full text-sm border transition-all duration-150 font-medium ${state.typeFilter===k ? 'text-white' : 'text-gray-500 border-gray-200'}" style="${state.typeFilter===k ? `background:${TYPE[k].color}; border-color:${TYPE[k].color};` : ''}">
        ${t.types[k]}
      </button>
    `).join('')}
  `;

  const totalBottles = state.wines.reduce((s, w) => s + w.qty, 0);
  const ratedWines = state.wines.filter(w => w.rating > 0);
  const avgRating = state.wines.length ? (ratedWines.reduce((s, w) => s + w.rating, 0) / (ratedWines.length || 1)).toFixed(1) : "–";
  const grapeCount = new Set(state.wines.flatMap(w => w.grapes.map(g => g.name))).size;

  document.getElementById("stats-grid").innerHTML = `
    ${[[totalBottles, t.totalBottles], [state.wines.length, t.diffWines], [avgRating, t.avgRating], [grapeCount, t.grapes]].map(([v, l]) => `
      <div class="bg-gray-50 rounded-xl p-3.5">
        <div class="text-2xl font-bold text-gray-900">${v}</div>
        <div class="text-xs text-gray-500 mt-0.5">${l}</div>
      </div>
    `).join('')}
  `;

  const filtered = state.wines.filter(w => 
    (!state.typeFilter || w.type === state.typeFilter) &&
    (!state.search || w.name.toLowerCase().includes(state.search.toLowerCase()) || w.producer.toLowerCase().includes(state.search.toLowerCase()))
  );

  const sorted = [...filtered].sort((a, b) => {
    const m = state.sort.dir === "asc" ? 1 : -1;
    switch (state.sort.key) {
      case "rating": const d = m * (a.rating - b.rating); return d !== 0 ? d : b.id - a.id;
      case "vintage": return m * ((a.vintage ?? 0) - (b.vintage ?? 0));
      case "price": return m * ((a.price ?? 0) - (b.price ?? 0));
      case "qty": return m * (a.qty - b.qty);
      default: return m * a.name.localeCompare(b.name, state.lang);
    }
  });

  const sortKeys = ["rating", "vintage", "price", "qty", "name"];
  document.getElementById("sort-bar-zone").innerHTML = `
    <div class="flex items-center gap-1.5 flex-wrap">
      <span class="text-xs text-gray-400">${t.sort}</span>
      ${sortKeys.map(k => {
        const active = state.sort.key === k;
        return `
          <button onclick="window.app.toggleSort('${k}')" class="text-xs px-2.5 py-1 rounded-lg border transition-all duration-150 ${active ? 'bg-[#111827] text-white border-[#111827]' : 'bg-transparent text-gray-500 border-gray-200'}">
            ${t.sortOpts[k]}${active ? `<span class="ml-1 opacity-70">${state.sort.dir === "asc" ? "↑" : "↓"}</span>` : ""}
          </button>
        `;
      }).join('')}
    </div>
  `;

  document.getElementById("wines-count-info").innerText = `${sorted.length} ${sorted.length !== 1 ? t.wineCountPlural : t.wineCountSingle} ${state.typeFilter ? ` · ${t.types[state.typeFilter]}` : ""}`;

  const grid = document.getElementById("wine-grid");
  const emptyState = document.getElementById("empty-state-zone");
  grid.innerHTML = "";

  if (sorted.length === 0) {
    emptyState.classList.remove("hidden");
    emptyState.innerHTML = state.wines.length === 0 
      ? `<span>${t.emptyCellar} <button onclick="window.app.toggleAddModal(true)" class="text-[#B83232] font-semibold">${t.addFirst}</button></span>`
      : t.noWines;
  } else {
    emptyState.classList.add("hidden");
    sorted.forEach(w => {
      const card = document.createElement("div");
      card.className = "bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-300 hover:shadow-sm transition-all duration-150 flex gap-2.5 cursor-pointer";
      card.onclick = () => window.app.selectWine(w.id);
      
      const roundedStars = Math.round(w.rating);
      const starsHTML = `<span style="color:#F59E0B">${"★".repeat(roundedStars)}</span><span style="color:#D1D5DB">${"☆".repeat(5-roundedStars)}</span>`;

      card.innerHTML = `
        <div style="background:${TYPE[w.type].color}; width:3px;" class="rounded-sm self-stretch shrink-0"></div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-baseline gap-1 mb-0.5">
            <span class="text-sm font-semibold text-gray-900 truncate">${w.name}</span>
            <span class="text-xs text-gray-400 shrink-0">${w.vintage ?? "NV"}</span>
          </div>
          <div class="text-xs text-gray-500 truncate mb-2">${w.producer} · ${w.region}</div>
          <div class="flex items-center justify-between">
            <span style="color:${TYPE[w.type].color}; background:${TYPE[w.type].color}1A; border:1px solid ${TYPE[w.type].color}35;" class="text-[10px] px-1.5 py-0.5 rounded-full font-semibold">${t.types[w.type]}</span>
            <span class="text-xs text-gray-400">${w.qty} ${t.bottles}</span>
          </div>
          <div class="flex items-center gap-1.5 mt-1.5">
            ${starsHTML} <span class="text-xs text-gray-400">${w.rating > 0 ? w.rating.toFixed(1) : "–"}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  buildCharts();
}

function buildCharts() {
  const t = T[state.lang];
  const pieLabels = []; const pieValues = []; const pieColors = [];
  Object.keys(TYPE).forEach(k => {
    const val = state.wines.filter(w => w.type === k).reduce((s, w) => s + w.qty, 0);
    if (val > 0) {
      pieLabels.push(t.types[k]); pieValues.push(val); pieColors.push(TYPE[k].color);
    }
  });

  const legend = document.getElementById("pie-legend");
  if (pieValues.length === 0) {
    legend.innerHTML = `<div class="py-8 text-center text-xs text-gray-400">${t.noData}</div>`;
  } else {
    legend.innerHTML = Object.keys(TYPE).map(k => {
      const val = state.wines.filter(w => w.type === k).reduce((s, w) => s + w.qty, 0);
      if (val === 0) return "";
      return `
        <div class="flex items-center gap-2 text-xs">
          <span style="background:${TYPE[k].color}" class="w-2 h-2 rounded-sm shrink-0"></span>
          <span class="text-gray-500 flex-1">${t.types[k]}</span>
          <span class="font-semibold text-gray-700">${val} ${t.bottles}</span>
        </div>`;
    }).join('');
  }

  const ctxPie = document.getElementById("pieChartCanvas").getContext("2d");
  if (pieChartInstance) pieChartInstance.destroy();
  if (pieValues.length > 0) {
    pieChartInstance = new Chart(ctxPie, {
      type: "doughnut",
      data: {
        labels: pieLabels,
        datasets: [{ data: pieValues, backgroundColor: pieColors, borderWidth: 0 }]
      },
      options: { cutout: "65%", plugins: { legend: { display: false } } }
    });
  }

  const regionMap = state.wines.reduce((acc, w) => { acc[w.region] = (acc[w.region] || 0) + w.qty; return acc; }, {});
  const barData = Object.entries(regionMap).sort((a,b) => b[1]-a[1]).slice(0, 7);

  // FIX: stabiler Container statt Referenz auf das (evtl. bereits entfernte) Canvas
  const barContainer = document.getElementById("bar-chart-container");
  if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }

  if (barData.length === 0) {
    barContainer.innerHTML = `<div class="py-16 text-center text-xs text-gray-400">${t.noData}</div>`;
  } else {
    if (!document.getElementById("barChartCanvas")) {
      barContainer.innerHTML = '<canvas id="barChartCanvas"></canvas>';
    }
    barChartInstance = new Chart(document.getElementById("barChartCanvas").getContext("2d"), {
      type: "bar",
      data: {
        labels: barData.map(r => r[0]),
        datasets: [{ data: barData.map(r => r[1]), backgroundColor: "#7C6DC7", borderRadius: 4 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }
      }
    });
  }
}

function renderDetailView() {
  const t = T[state.lang];
  const wine = state.wines.find(w => w.id === state.selectedId);
  if (!wine) return;

  const color = TYPE[wine.type].color;
  const canRate = wine.qty > 0;
  // Interaktive Sterne: volle/leere Sterne je nach gerundetem Wert, jeder Stern klickbar (Ganzzahl-Schnellwahl)
  const roundedStars = Math.round(wine.rating);
  const clickableStarsHTML = Array.from({length: 5}, (_, i) => {
    const filled = i < roundedStars;
    return canRate
      ? `<button type="button" onclick="window.app.setRating(${wine.id}, ${i+1})" class="text-2xl leading-none transition-transform hover:scale-110" style="color:${filled ? '#F59E0B' : '#D1D5DB'}">★</button>`
      : `<span class="text-2xl leading-none opacity-40 cursor-not-allowed" style="color:${filled ? '#F59E0B' : '#D1D5DB'}">★</span>`;
  }).join('');
  
  let sugarText = t.dry, sugarColor = "#16A34A";
  if (wine.nutrition.sugar >= 4 && wine.nutrition.sugar < 12) { sugarText = t.semiDry; sugarColor = "#D97706"; }
  else if (wine.nutrition.sugar >= 12) { sugarText = t.sweet; sugarColor = "#9333EA"; }

  document.getElementById("view-detail").innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <button onclick="window.app.setTab(0)" class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <i data-lucide="arrow-left" class="w-4 h-4"></i> ${t.back}
      </button>
      <div class="flex items-center gap-4">
        <button onclick="window.app.openEditModal(${wine.id})" class="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> ${t.edit}
        </button>
        <button onclick="window.app.deleteWine(${wine.id})" class="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> ${t.remove}
        </button>
      </div>
    </div>

    <div class="grid gap-5 grid-cols-[220px_1fr]">
      <div>
        <div style="background:${color}0D; border:1px solid ${color}28;" class="aspect-[2/3] rounded-16 flex flex-col overflow-hidden rounded-xl">
          <div class="flex-1 flex justify-center items-end">
            <div style="background:${color}28; border:1px solid ${color}40;" class="w-6 rounded-t-md h-3/5"></div>
          </div>
          <div class="m-3 bg-white/95 border-t-3 rounded-lg p-2.5 text-center shadow-sm" style="border-top: 3px solid ${color}">
            <div class="text-[11px] font-bold mb-0.5" style="color:${color}">${wine.vintage ?? "NV"}</div>
            <div class="text-sm font-bold text-gray-900 line-clamp-2">${wine.name}</div>
            <div class="text-[11px] text-gray-500 mt-0.5 truncate">${wine.producer}</div>
          </div>
        </div>

        <div class="mt-3 bg-gray-50 rounded-xl p-4">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">${t.inCellar}</p>
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-600">${t.bottles}</span>
            <div class="flex items-center gap-2">
              <button onclick="window.app.updateQty(${wine.id}, Math.max(0, ${wine.qty - 1}))" class="w-7 h-7 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 text-gray-600"><i data-lucide="minus" class="w-3 h-3"></i></button>
              <span class="text-sm font-bold text-gray-900 w-4 text-center">${wine.qty}</span>
              <button onclick="window.app.updateQty(${wine.id}, ${wine.qty + 1})" class="w-7 h-7 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 text-gray-600"><i data-lucide="plus" class="w-3 h-3"></i></button>
            </div>
          </div>
          <div class="flex justify-between py-1.5 border-t border-gray-100 text-xs"><span class="text-gray-400">${t.purchasePrice}</span><span class="font-medium text-gray-700">${wine.price ? wine.price + ' €' : '–'}</span></div>
          <div class="flex justify-between py-1.5 border-t border-gray-100 text-xs"><span class="text-gray-400">${t.readyFrom}</span><span class="font-medium text-gray-700">${wine.drinkFrom ?? '–'}</span></div>
          <div class="flex justify-between py-1.5 border-t border-gray-100 text-xs"><span class="text-gray-400">${t.drinkUntil}</span><span class="font-medium text-gray-700">${wine.drinkUntil ?? '–'}</span></div>
        </div>
      </div>

      <div>
        <div class="flex items-start justify-between gap-3 mb-1">
          <h1 class="text-2xl font-bold text-gray-900">${wine.name}</h1>
          <span style="color:${color}; background:${color}1A; border:1px solid ${color}35;" class="text-xs px-2.5 py-1 rounded-full font-semibold">${t.types[wine.type]}</span>
        </div>
        <p class="text-base text-gray-500 mb-2">${wine.producer}</p>
        <div class="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-5">
          <i data-lucide="map-pin" class="w-3 h-3"></i> <span>${wine.region}, ${wine.country}</span> · <span>${wine.vintage ?? 'NV'}</span> · <span>${wine.alcohol}% Vol.</span>
        </div>

        <div class="mb-5">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">${t.grapes}</p>
          <div class="flex flex-wrap gap-1.5">
            ${wine.grapes.length ? wine.grapes.map(g => `
              <span class="text-xs px-2.5 py-1 rounded-full font-medium" style="${g.primary ? `background:${color}15; color:${color}; border:1px solid ${color}30;` : 'background:#F3F4F6; color:#4B5563;'}">
                ${g.name} ${g.pct < 100 ? g.pct + '%' : ''}
              </span>
            `).join('') : '<span class="text-xs text-gray-400">–</span>'}
          </div>
        </div>

        <div class="bg-gray-50 rounded-xl p-4 mb-5">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">${t.ownRating}</p>
          <div class="flex items-center gap-4 flex-wrap">
            <div class="text-3xl font-bold text-gray-900">${wine.rating > 0 ? wine.rating.toFixed(1) : '–'}</div>
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center gap-0.5">${clickableStarsHTML}</div>
              <div class="flex items-center gap-2">
                <input id="own-rating-input" type="number" min="0" max="5" step="0.1"
                  value="${wine.rating || 0}"
                  ${canRate ? `onchange="window.app.setRating(${wine.id}, this.value)"` : 'disabled'}
                  class="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-gray-400 ${canRate ? '' : 'opacity-40 cursor-not-allowed bg-gray-100'}">
                <span class="text-xs text-gray-400">/ 5</span>
              </div>
              ${canRate ? '' : `<span class="text-[11px] text-gray-400">${t.ratingRequiresCellar}</span>`}
              </div>
            </div>
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">${t.nutrition}</p>
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-xl p-3 text-center" style="background:${wine.nutrition.sugar > 0 ? sugarColor + '10' : '#F9FAFB'}">
              <div class="text-xs text-gray-400 mb-1">${t.sugar}</div>
              <div class="text-sm font-bold text-gray-800">${wine.nutrition.sugar > 0 ? wine.nutrition.sugar + ' g/L' : '–'}</div>
              ${wine.nutrition.sugar > 0 ? `<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block" style="color:${sugarColor}; background:${sugarColor}18">${sugarText}</span>` : ''}
            </div>
            <div class="bg-gray-50 rounded-xl p-3 text-center">
              <div class="text-xs text-gray-400 mb-1">${t.energy}</div>
              <div class="text-sm font-bold text-gray-800">${wine.nutrition.kcal > 0 ? wine.nutrition.kcal + ' kcal' : '–'}</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 text-center">
              <div class="text-xs text-gray-400 mb-1">${t.sulfites}</div>
              <div class="text-sm font-bold text-gray-800">${wine.nutrition.sulfites > 0 ? wine.nutrition.sulfites + ' mg/L' : '–'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById("view-detail").classList.remove("hidden");
  lucide.createIcons();
}

function renderModal() {
  const zone = document.getElementById("modal-zone");
  if (!state.showAdd) { zone.innerHTML = ""; return; }
  const t = T[state.lang];
  
  const isEdit = state.editingId !== null;
  const wine = isEdit ? state.wines.find(w => w.id === state.editingId) : null;

  zone.innerHTML = `
    <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white w-full max-w-[530px] max-h-[90vh] flex flex-col shadow-2xl rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 class="font-bold text-base text-gray-900">${isEdit ? t.editModalTitle : t.addModalTitle}</h2>
          <button onclick="window.app.toggleAddModal(false)" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>
        
        <div class="overflow-y-auto flex-1 p-5">
          <div class="mb-3">
            <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">${t.wineName} *</label>
            <input id="m-name" value="${wine ? wine.name : ''}" placeholder="Château Pichon Baron" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400">
            <span id="m-name-err" class="text-xs text-red-500 mt-1 hidden">${t.mandatory}</span>
          </div>
          <div class="mb-3">
            <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">${t.producer} *</label>
            <input id="m-producer" value="${wine ? wine.producer : ''}" placeholder="Château Longueville" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400">
            <span id="m-producer-err" class="text-xs text-red-500 mt-1 hidden">${t.mandatory}</span>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">${t.vintage}</label>
              <input id="m-vintage" type="number" value="${wine ? (wine.vintage ?? '') : ''}" placeholder="2020" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">${t.alcohol}</label>
              <input id="m-alcohol" type="number" step="0.1" value="${wine ? (wine.alcohol ?? '') : ''}" placeholder="13.5" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-2.5">${t.wineType} *</label>
            <div class="flex gap-4">
              ${Object.keys(TYPE).map((k, idx) => `
                <label class="flex items-center gap-1.5 text-sm cursor-pointer font-medium text-gray-700">
                  <input type="radio" name="m-type" value="${k}" ${(wine ? wine.type === k : idx===0) ? 'checked':''} class="accent-[#B83232]"> ${t.types[k]}
                </label>
              `).join('')}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">${t.region} *</label>
              <input id="m-region" value="${wine ? wine.region : ''}" placeholder="Bordeaux" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
              <span id="m-region-err" class="text-xs text-red-500 mt-1 hidden">${t.mandatory}</span>
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-1">${t.country} *</label>
              <input id="m-country" value="${wine ? wine.country : ''}" placeholder="Frankreich" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
              <span id="m-country-err" class="text-xs text-red-500 mt-1 hidden">${t.mandatory}</span>
            </div>
          </div>

          <div class="border-t border-gray-100 pt-3 mb-4">
            <p class="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">${t.cellar}</p>
            <div class="grid grid-cols-4 gap-2">
              <div><label class="block text-[10px] text-gray-400 mb-0.5">${t.qty}</label><input id="m-qty" type="number" value="${wine ? wine.qty : 1}" class="w-full border border-gray-200 rounded-lg p-1.5 text-center text-sm"></div>
              <div><label class="block text-[10px] text-gray-400 mb-0.5">${t.price}</label><input id="m-price" type="number" step="0.5" value="${wine ? (wine.price ?? '') : ''}" placeholder="0.00" class="w-full border border-gray-200 rounded-lg p-1.5 text-center text-sm"></div>
              <div><label class="block text-[10px] text-gray-400 mb-0.5">${t.drinkFrom}</label><input id="m-drinkFrom" type="number" value="${wine ? (wine.drinkFrom ?? '') : ''}" placeholder="2025" class="w-full border border-gray-200 rounded-lg p-1.5 text-center text-sm"></div>
              <div><label class="block text-[10px] text-gray-400 mb-0.5">${t.drinkUntil}</label><input id="m-drinkUntil" type="number" value="${wine ? (wine.drinkUntil ?? '') : ''}" placeholder="2035" class="w-full border border-gray-200 rounded-lg p-1.5 text-center text-sm"></div>
            </div>
          </div>

          <div class="border-t border-gray-100 pt-3">
            <div class="flex items-center justify-between mb-2">
              <p class="text-[11px] font-bold text-gray-700 uppercase tracking-wider">${t.grapes}</p>
              <button onclick="window.app.addModalGrape()" class="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"><i data-lucide="plus" class="w-3 h-3"></i> ${t.add}</button>
            </div>
            <div id="modal-grapes-box" class="space-y-2"></div>
          </div>
        </div>

        <div class="px-5 py-3 border-t border-gray-100 bg-gray-50 flex gap-2 justify-end shrink-0">
          <button onclick="window.app.toggleAddModal(false)" class="px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 bg-white">${t.cancel}</button>
          <button onclick="window.app.submitWine()" class="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#B83232] hover:opacity-90">${isEdit ? t.saveChanges : t.addToCellar}</button>
        </div>
      </div>
    </div>
  `;
  renderModalGrapes();
  lucide.createIcons();
}

function renderModalGrapes() {
  const t = T[state.lang];
  const box = document.getElementById("modal-grapes-box");
  if (!box) return;

  box.innerHTML = modalGrapes.map((g, i) => `
    <div class="flex items-center gap-2">
      <input id="g-name-${i}" value="${g.name || ''}" placeholder="${i===0 ? t.mainGrape : t.otherGrape}" class="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
      <input id="g-pct-${i}" type="number" value="${g.pct || ''}" placeholder="%" class="w-14 border border-gray-200 rounded-lg px-1 py-1.5 text-xs text-center outline-none">
      ${modalGrapes.length > 1 ? `<button onclick="window.app.removeModalGrape(${i})" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-4 h-4"></i></button>` : ''}
    </div>
  `).join('');
  lucide.createIcons();
}

// ─── Toast System ─────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const box = document.getElementById("toast-zone");
  box.className = "fixed bottom-6 right-6 z-[200] text-stone-100 px-4 py-2.5 rounded-xl text-xs font-medium max-w-[320px] flex items-center gap-2 shadow-xl animate-fadeIn";
  box.style.background = type === "warn" ? "#292524" : "#111827";
  box.style.borderLeft = `3px solid ${type === "warn" ? "#F97316" : "#4ADE80"}`;
  
  box.innerHTML = `<span>${type === 'warn' ? '🗑' : '✓'}</span> <span>${msg}</span>`;
  box.classList.remove("hidden");
  
  setTimeout(() => box.classList.add("hidden"), 2600);
}