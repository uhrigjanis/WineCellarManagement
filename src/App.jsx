import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'weinkeller-wines-v2';

const TYPE_META = {
  red: { label: 'Rotwein', color: '#b83232' },
  white: { label: 'Weißwein', color: '#b8860b' },
  sparkling: { label: 'Schaumwein', color: '#1a8f68' },
  rose: { label: 'Rosé', color: '#b85070' },
};

const T = {
  de: {
    navCellar: 'Mein Keller',
    navArchive: 'Archiv',
    addWine: 'Wein hinzufügen',
    addToCellar: 'Zum Keller hinzufügen',
    saveChanges: 'Änderungen speichern',
    search: 'Wein oder Weingut …',
    wineName: 'Weinname',
    producer: 'Produzent / Weingut',
    vintage: 'Jahrgang',
    alcohol: 'Alkohol (%)',
    wineType: 'Weinart',
    region: 'Anbaugebiet',
    country: 'Land',
    qty: 'Menge',
    price: 'Preis (€)',
    drinkFrom: 'Bereit ab',
    drinkUntil: 'Trinken bis',
    grapes: 'Rebsorten',
    notes: 'Notizen',
    rating: 'Bewertung',
    sort: 'Sortieren',
    noWines: 'Keine Weine gefunden.',
    emptyCellar: 'Dein Keller ist noch leer.',
    archiveEmpty: 'Noch keine archivierten Weine.',
    totalBottles: 'Flaschen total',
    differentWines: 'Verschiedene Weine',
    averageRating: 'Ø Bewertung',
    all: 'Alle',
    bottle: 'Flasche',
    bottles: 'Flaschen',
    archiveTitle: 'Archiv',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    archive: 'Archivieren',
    close: 'Schließen',
    cancel: 'Abbrechen',
    cellar: 'Keller',
    tastingNotes: 'Verkostungsnotizen',
  },
  en: {
    navCellar: 'My Cellar',
    navArchive: 'Archive',
    addWine: 'Add wine',
    addToCellar: 'Add to cellar',
    saveChanges: 'Save changes',
    search: 'Wine or producer…',
    wineName: 'Wine name',
    producer: 'Producer / Winery',
    vintage: 'Vintage',
    alcohol: 'Alcohol (%)',
    wineType: 'Wine type',
    region: 'Region',
    country: 'Country',
    qty: 'Quantity',
    price: 'Price (€)',
    drinkFrom: 'Drink from',
    drinkUntil: 'Drink until',
    grapes: 'Grapes',
    notes: 'Notes',
    rating: 'Rating',
    sort: 'Sort',
    noWines: 'No wines found.',
    emptyCellar: 'Your cellar is empty.',
    archiveEmpty: 'No archived wines yet.',
    totalBottles: 'Total bottles',
    differentWines: 'Different wines',
    averageRating: 'Avg. rating',
    all: 'All',
    bottle: 'bottle',
    bottles: 'bottles',
    archiveTitle: 'Archive',
    edit: 'Edit',
    delete: 'Delete',
    archive: 'Archive',
    close: 'Close',
    cancel: 'Cancel',
    cellar: 'Cellar',
    tastingNotes: 'Tasting notes',
  },
};

const sortOptions = {
  rating: { de: 'Bewertung', en: 'Rating' },
  vintage: { de: 'Jahrgang', en: 'Vintage' },
  price: { de: 'Preis', en: 'Price' },
  qty: { de: 'Menge', en: 'Qty' },
  name: { de: 'Name', en: 'Name' },
};

const createId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `wine-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createDefaultWine = () => ({
  id: createId(),
  name: '',
  producer: '',
  vintage: new Date().getFullYear(),
  alcohol: '13.5',
  type: 'red',
  region: '',
  country: 'Deutschland',
  cellar: 'Keller 1',
  qty: 1,
  price: '24.90',
  drinkFrom: '',
  drinkUntil: '',
  grapes: [{ name: '', pct: '' }],
  notes: '',
  rating: 0,
  image: '',
});

function App() {
  const [lang, setLang] = useState('de');
  const [wines, setWines] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [tab, setTab] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'rating', dir: 'desc' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createDefaultWine());

  const t = T[lang];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wines));
  }, [wines]);

  const cellarWines = useMemo(() => wines.filter((wine) => wine.qty > 0), [wines]);
  const archiveWines = useMemo(() => wines.filter((wine) => wine.qty <= 0), [wines]);

  const visibleList = useMemo(() => {
    const list = (tab === 0 ? cellarWines : archiveWines).filter((wine) => {
      const matchesText = !search || `${wine.name} ${wine.producer}`.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || wine.type === typeFilter;
      return matchesText && matchesType;
    });

    return [...list].sort((a, b) => {
      const direction = sort.dir === 'asc' ? 1 : -1;
      const left = a[sort.key] ?? 0;
      const right = b[sort.key] ?? 0;

      if (sort.key === 'name') {
        return String(left).localeCompare(String(right)) * direction;
      }

      return (Number(left) - Number(right)) * direction;
    });
  }, [archiveWines, cellarWines, search, sort, tab, typeFilter]);

  const stats = useMemo(() => {
    const active = cellarWines;
    const totalBottles = active.reduce((sum, wine) => sum + Number(wine.qty || 0), 0);
    const avgRating = active.length
      ? active.reduce((sum, wine) => sum + Number(wine.rating || 0), 0) / active.length
      : 0;
    const typeCounts = active.reduce((acc, wine) => {
      acc[wine.type] = (acc[wine.type] || 0) + Number(wine.qty || 0);
      return acc;
    }, {});

    return {
      totalBottles,
      uniqueWines: active.length,
      avgRating: avgRating.toFixed(1),
      typeCounts,
    };
  }, [cellarWines]);

  const selectedWine = useMemo(
    () => wines.find((wine) => wine.id === selectedId) || visibleList[0] || null,
    [selectedId, visibleList, wines],
  );

  const handleSaveWine = () => {
    const cleaned = { ...form };
    cleaned.name = cleaned.name.trim();
    cleaned.producer = cleaned.producer.trim();
    cleaned.region = cleaned.region.trim();
    cleaned.country = cleaned.country.trim();
    cleaned.qty = Number(cleaned.qty || 0);
    cleaned.price = Number(cleaned.price || 0);
    cleaned.vintage = Number(cleaned.vintage || new Date().getFullYear());
    cleaned.rating = Number(cleaned.rating || 0);
    cleaned.grapes = Array.isArray(cleaned.grapes) && cleaned.grapes.length
      ? cleaned.grapes.filter((grape) => grape.name && grape.name.trim()).map((grape) => ({
          name: grape.name.trim(),
          pct: Number(grape.pct || 0),
        }))
      : [{ name: '', pct: 0 }];

    if (!cleaned.name || !cleaned.producer || !cleaned.region) {
      return;
    }

    if (editingId) {
      setWines((current) => current.map((wine) => (wine.id === editingId ? { ...wine, ...cleaned } : wine)));
    } else {
      setWines((current) => [{ ...cleaned, id: createId() }, ...current]);
      setTab(0);
    }

    setModalOpen(false);
    setEditingId(null);
    setForm(createDefaultWine());
  };

  const handleDeleteWine = (id) => {
    setWines((current) => current.filter((wine) => wine.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleToggleArchive = (id) => {
    setWines((current) => current.map((wine) => {
      if (wine.id !== id) return wine;
      const isArchived = Number(wine.qty || 0) <= 0;
      return { ...wine, qty: isArchived ? 1 : 0 };
    }));

    if (tab === 1) {
      setTab(0);
      setSelectedId(id);
    }
  };

  const handleDrinkOne = (id) => {
    setWines((current) => current.map((wine) => {
      if (wine.id !== id) return wine;
      const nextQty = Math.max(0, Number(wine.qty || 0) - 1);
      return { ...wine, qty: nextQty };
    }));
  };

  const handleSetRating = (id, value) => {
    setWines((current) => current.map((wine) => (wine.id === id ? { ...wine, rating: value } : wine)));
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(createDefaultWine());
    setModalOpen(true);
  };

  const openEditModal = (wine) => {
    setEditingId(wine.id);
    setForm({
      ...wine,
      grapes: wine.grapes?.length ? wine.grapes : [{ name: '', pct: '' }],
    });
    setModalOpen(true);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateGrape = (index, field, value) => {
    setForm((current) => {
      const grapes = [...(current.grapes || [{ name: '', pct: '' }])];
      grapes[index] = { ...grapes[index], [field]: value };
      return { ...current, grapes };
    });
  };

  const addGrapeRow = () => {
    setForm((current) => ({
      ...current,
      grapes: [...(current.grapes || []), { name: '', pct: '' }],
    }));
  };

  const pieSegments = Object.entries(stats.typeCounts)
    .map(([type, qty], index, all) => {
      const meta = TYPE_META[type] || { color: '#d4d4d8' };
      const total = all.reduce((sum, [, amount]) => sum + amount, 0) || 1;
      const start = all.slice(0, index).reduce((sum, [, amount]) => sum + amount, 0) / total * 100;
      const end = (all.slice(0, index + 1).reduce((sum, [, amount]) => sum + amount, 0) / total * 100);
      return { type, qty, start, end, color: meta.color };
    });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Wine Cellar Management</p>
          <h1>{tab === 0 ? t.navCellar : t.archiveTitle}</h1>
        </div>
        <div className="toolbar">
          <button className="ghost-button" onClick={() => setLang((current) => (current === 'de' ? 'en' : 'de'))}>
            {lang === 'de' ? 'EN' : 'DE'}
          </button>
          <button className="primary-button" onClick={openAddModal}>{t.addWine}</button>
        </div>
      </header>

      <nav className="tab-nav" aria-label="Main navigation">
        <button className={tab === 0 ? 'tab-button active' : 'tab-button'} onClick={() => setTab(0)}>
          {t.navCellar}
        </button>
        <button className={tab === 1 ? 'tab-button active' : 'tab-button'} onClick={() => setTab(1)}>
          {t.navArchive}
        </button>
      </nav>

      <div className="layout">
        <aside className="sidebar">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} />
          </div>

          <div className="filter-list">
            <button className={typeFilter === 'all' ? 'filter-chip active' : 'filter-chip'} onClick={() => setTypeFilter('all')}>
              {t.all}
            </button>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <button key={key} className={typeFilter === key ? 'filter-chip active' : 'filter-chip'} onClick={() => setTypeFilter(key)}>
                {meta.label}
              </button>
            ))}
          </div>

          <div className="sort-box">
            <label>{t.sort}</label>
            <select value={sort.key} onChange={(event) => setSort((current) => ({ ...current, key: event.target.value }))}>
              {Object.entries(sortOptions).map(([key, label]) => (
                <option key={key} value={key}>{label[lang]}</option>
              ))}
            </select>
            <button className="ghost-button small" onClick={() => setSort((current) => ({ ...current, dir: current.dir === 'asc' ? 'desc' : 'asc' }))}>
              {sort.dir === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <div className="stat-card">
            <div className="ring" style={{ background: pieSegments.length ? `conic-gradient(${pieSegments.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`).join(', ')})` : 'conic-gradient(#e4e4e7 0% 100%)' }}>
              <span>{stats.totalBottles}</span>
            </div>
            <div>
              <p>{t.totalBottles}</p>
              <strong>{stats.uniqueWines} wines</strong>
            </div>
          </div>
        </aside>

        <main className="content-panel">
          <div className="stats-grid">
            <div className="metric-card">
              <span>{t.totalBottles}</span>
              <strong>{stats.totalBottles}</strong>
            </div>
            <div className="metric-card">
              <span>{t.differentWines}</span>
              <strong>{stats.uniqueWines}</strong>
            </div>
            <div className="metric-card">
              <span>{t.averageRating}</span>
              <strong>{stats.avgRating}</strong>
            </div>
            <div className="metric-card">
              <span>{t.archiveTitle}</span>
              <strong>{archiveWines.length}</strong>
            </div>
          </div>

          {visibleList.length ? (
            <div className="card-grid">
              {visibleList.map((wine) => (
                <article key={wine.id} className={selectedWine?.id === wine.id ? 'wine-card selected' : 'wine-card'} onClick={() => setSelectedId(wine.id)}>
                  <div className="wine-image" style={{ background: TYPE_META[wine.type]?.color || '#cbd5e1' }}>
                    {wine.name?.slice(0, 2).toUpperCase() || 'W'}
                  </div>
                  <div className="wine-meta">
                    <div className="topline">
                      <span className="chip" style={{ backgroundColor: `${TYPE_META[wine.type]?.color || '#cbd5e1'}22`, color: TYPE_META[wine.type]?.color || '#334155' }}>
                        {TYPE_META[wine.type]?.label || wine.type}
                      </span>
                      <span className="rating">★ {Number(wine.rating || 0).toFixed(1)}</span>
                    </div>
                    <h3>{wine.name}</h3>
                    <p>{wine.producer}</p>
                    <div className="facts">
                      <span>{wine.vintage}</span>
                      <span>{wine.qty} {wine.qty === 1 ? t.bottle : t.bottles}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>{tab === 0 ? t.emptyCellar : t.archiveEmpty}</p>
            </div>
          )}

          {selectedWine && (
            <section className="detail-panel">
              <div className="detail-header">
                <div>
                  <p className="eyebrow">{TYPE_META[selectedWine.type]?.label}</p>
                  <h2>{selectedWine.name}</h2>
                </div>
                <div className="actions">
                  <button className="ghost-button" onClick={() => openEditModal(selectedWine)}>{t.edit}</button>
                  <button className="ghost-button danger" onClick={() => handleDeleteWine(selectedWine.id)}>{t.delete}</button>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span>{t.producer}</span>
                  <strong>{selectedWine.producer}</strong>
                </div>
                <div className="detail-item">
                  <span>{t.region}</span>
                  <strong>{selectedWine.region || '-'}</strong>
                </div>
                <div className="detail-item">
                  <span>{t.vintage}</span>
                  <strong>{selectedWine.vintage}</strong>
                </div>
                <div className="detail-item">
                  <span>{t.qty}</span>
                  <strong>{selectedWine.qty}</strong>
                </div>
                <div className="detail-item">
                  <span>{t.price}</span>
                  <strong>{selectedWine.price} €</strong>
                </div>
                <div className="detail-item">
                  <span>{t.alcohol}</span>
                  <strong>{selectedWine.alcohol}%</strong>
                </div>
              </div>

              <div className="notes-box">
                <h3>{t.tastingNotes}</h3>
                <p>{selectedWine.notes || t.noWines}</p>
              </div>

              <div className="rating-row">
                <span>{t.rating}</span>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} className={star <= Number(selectedWine.rating || 0) ? 'star active' : 'star'} onClick={() => handleSetRating(selectedWine.id, star)}>
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="detail-actions">
                <button className="primary-button" onClick={() => handleDrinkOne(selectedWine.id)}>{tab === 0 ? 'Drink one' : 'Restore'}</button>
                <button className="ghost-button" onClick={() => handleToggleArchive(selectedWine.id)}>{tab === 0 ? t.archive : 'Restore'}</button>
              </div>
            </section>
          )}
        </main>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Wein bearbeiten' : t.addWine}</h3>
              <button className="ghost-button small" onClick={() => setModalOpen(false)}>×</button>
            </div>

            <div className="modal-form">
              <label>
                <span>{t.wineName}</span>
                <input value={form.name || ''} onChange={(event) => updateForm('name', event.target.value)} />
              </label>
              <label>
                <span>{t.producer}</span>
                <input value={form.producer || ''} onChange={(event) => updateForm('producer', event.target.value)} />
              </label>
              <div className="two-column">
                <label>
                  <span>{t.vintage}</span>
                  <input type="number" value={form.vintage || ''} onChange={(event) => updateForm('vintage', event.target.value)} />
                </label>
                <label>
                  <span>{t.alcohol}</span>
                  <input value={form.alcohol || ''} onChange={(event) => updateForm('alcohol', event.target.value)} />
                </label>
              </div>
              <div className="two-column">
                <label>
                  <span>{t.wineType}</span>
                  <select value={form.type || 'red'} onChange={(event) => updateForm('type', event.target.value)}>
                    {Object.entries(TYPE_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t.country}</span>
                  <input value={form.country || ''} onChange={(event) => updateForm('country', event.target.value)} />
                </label>
              </div>
              <div className="two-column">
                <label>
                  <span>{t.region}</span>
                  <input value={form.region || ''} onChange={(event) => updateForm('region', event.target.value)} />
                </label>
                <label>
                  <span>{t.cellar}</span>
                  <input value={form.cellar || ''} onChange={(event) => updateForm('cellar', event.target.value)} />
                </label>
              </div>
              <div className="two-column">
                <label>
                  <span>{t.qty}</span>
                  <input type="number" min="0" value={form.qty || 0} onChange={(event) => updateForm('qty', Number(event.target.value))} />
                </label>
                <label>
                  <span>{t.price}</span>
                  <input value={form.price || ''} onChange={(event) => updateForm('price', event.target.value)} />
                </label>
              </div>
              <div className="two-column">
                <label>
                  <span>{t.drinkFrom}</span>
                  <input type="date" value={form.drinkFrom || ''} onChange={(event) => updateForm('drinkFrom', event.target.value)} />
                </label>
                <label>
                  <span>{t.drinkUntil}</span>
                  <input type="date" value={form.drinkUntil || ''} onChange={(event) => updateForm('drinkUntil', event.target.value)} />
                </label>
              </div>

              <div className="grapes-box">
                <label>{t.grapes}</label>
                {(form.grapes || [{ name: '', pct: '' }]).map((grape, index) => (
                  <div className="grape-row" key={`${grape.name || 'new'}-${index}`}>
                    <input value={grape.name || ''} placeholder={t.grapes} onChange={(event) => updateGrape(index, 'name', event.target.value)} />
                    <input value={grape.pct || ''} placeholder="%" onChange={(event) => updateGrape(index, 'pct', event.target.value)} />
                  </div>
                ))}
                <button className="ghost-button small" onClick={addGrapeRow}>+ {t.grapes}</button>
              </div>

              <label>
                <span>{t.notes}</span>
                <textarea rows="4" value={form.notes || ''} onChange={(event) => updateForm('notes', event.target.value)} />
              </label>
            </div>

            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setModalOpen(false)}>{t.cancel}</button>
              <button className="primary-button" onClick={handleSaveWine}>{editingId ? t.saveChanges : t.addToCellar}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
