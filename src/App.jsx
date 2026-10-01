import { useEffect, useMemo, useRef, useState } from 'react';
import { decodeCsvFile, detectCsvDelimiter, importWinesFromCsv, suggestCsvMapping } from './csvImport.js';
import { importWinesFromJson } from './wineImport.js';
import { downloadWineExport, selectWinesForExport } from './wineExport.js';
import { getWineFormError } from './wineForm.js';
import { readImageFile } from './wineImage.js';
import { getCountryFlagEmoji } from './countryFlag.js';
import { transitionImportExportMenu } from './importExportMenu.js';
import { filterWines, getWineFilterOptions } from './wineFilters.js';

const STORAGE_KEY = 'weinkeller-wines-v2';

const TYPE_META = {
  red: { color: '#b83232' },
  white: { color: '#b8860b' },
  sparkling: { color: '#1a8f68' },
  rose: { color: '#b85070' },
};

const T = {
  de: {
    wineTypes: {
      red: 'Rotwein',
      white: 'Weißwein',
      sparkling: 'Schaumwein',
      rose: 'Rosé',
    },
    navCellar: 'Mein Keller',
    navArchive: 'Archiv',
    addWine: 'Wein hinzufügen',
    importExport: 'Import / Export',
    importAction: 'Importieren',
    exportAction: 'Exportieren',
    backToImportExport: 'Zurück',
    exportWines: 'Exportieren',
    exportScope: 'Umfang',
    exportAll: 'Alle Weine',
    exportVisible: 'Sichtbare Weine',
    exportSelected: 'Ausgewählte Weine',
    exportFormat: 'Format',
    exportJson: 'JSON',
    exportCsv: 'CSV',
    exportSelection: 'Für Export auswählen',
    importSuccess: 'Import erfolgreich',
    importError: 'Import fehlgeschlagen',
    importHelp: 'Wähle eine JSON-Datei mit Wein-Daten aus.',
    csvImportTitle: 'CSV-Import prüfen',
    csvDelimiter: 'Trennzeichen',
    csvColumnMapping: 'Spalten zuordnen',
    csvPreview: 'Vorschau',
    csvConfirm: 'Gültige Weine importieren',
    csvReady: 'Bereit',
    csvDuplicate: 'Duplikat',
    csvStatus: 'Prüfung',
    csvNoRows: 'Keine gültigen Zeilen zur Vorschau.',
    csvFields: {
      producer: 'Weingut / Produzent',
      name: 'Weinname',
      vintage: 'Jahrgang',
      region: 'Anbaugebiet',
      country: 'Land',
      type: 'Weinart',
      qty: 'Kellerbestand',
      price: 'Preis',
      rating: 'Bewertung',
      alcohol: 'Alkohol (%)',
      notes: 'Notizen',
      grapes: 'Rebsorten',
      drinkFrom: 'Bereit ab',
      drinkUntil: 'Trinken bis',
    },
    addToCellar: 'Zum Keller hinzufügen',
    saveChanges: 'Änderungen speichern',
    search: 'Wein oder Weingut …',
    filterCountry: 'Land',
    filterProducer: 'Produzent / Weingut',
    filterGrape: 'Rebsorte',
    filterRegion: 'Anbaugebiet',
    filterVintage: 'Jahrgang',
    clearFilters: 'Filter zurücksetzen',
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
    close: 'Schließen',
    cancel: 'Abbrechen',
    cellar: 'Keller',
    tastingNotes: 'Verkostungsnotizen',
    picture: 'Bild',
    choosePicture: 'Bild auswählen',
    removePicture: 'Bild entfernen',
    pictureHelp: 'JPG, PNG oder WebP, maximal 5 MB.',
    pictureError: 'Das Bild konnte nicht gespeichert werden.',
    requiredFieldsError: 'Bitte Pflichtfelder ausfüllen.',
  },
  en: {
    wineTypes: {
      red: 'Red wine',
      white: 'White wine',
      sparkling: 'Bubbles',
      rose: 'Rosé',
    },
    navCellar: 'My Cellar',
    navArchive: 'Archive',
    addWine: 'Add wine',
    importExport: 'Import / Export',
    importAction: 'Import',
    exportAction: 'Export',
    backToImportExport: 'Back',
    exportWines: 'Export',
    exportScope: 'Scope',
    exportAll: 'All wines',
    exportVisible: 'Visible wines',
    exportSelected: 'Selected wines',
    exportFormat: 'Format',
    exportJson: 'JSON',
    exportCsv: 'CSV',
    exportSelection: 'Select for export',
    importSuccess: 'Import successful',
    importError: 'Import failed',
    importHelp: 'Choose a JSON file containing wine data.',
    csvImportTitle: 'Review CSV import',
    csvDelimiter: 'Delimiter',
    csvColumnMapping: 'Map columns',
    csvPreview: 'Preview',
    csvConfirm: 'Import valid wines',
    csvReady: 'Ready',
    csvDuplicate: 'Duplicate',
    csvStatus: 'Validation',
    csvNoRows: 'No rows available to preview.',
    csvFields: {
      producer: 'Winery / producer',
      name: 'Wine name',
      vintage: 'Vintage',
      region: 'Region',
      country: 'Country',
      type: 'Wine type',
      qty: 'Cellar count',
      price: 'Price',
      rating: 'Rating',
      alcohol: 'Alcohol (%)',
      notes: 'Notes',
      grapes: 'Grapes',
      drinkFrom: 'Drink from',
      drinkUntil: 'Drink until',
    },
    addToCellar: 'Add to cellar',
    saveChanges: 'Save changes',
    search: 'Wine or producer…',
    filterCountry: 'Country',
    filterProducer: 'Producer / Winery',
    filterGrape: 'Grape variety',
    filterRegion: 'Region',
    filterVintage: 'Vintage',
    clearFilters: 'Clear filters',
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
    close: 'Close',
    cancel: 'Cancel',
    cellar: 'Cellar',
    tastingNotes: 'Tasting notes',
    picture: 'Picture',
    choosePicture: 'Choose picture',
    removePicture: 'Remove picture',
    pictureHelp: 'JPG, PNG, or WebP, up to 5 MB.',
    pictureError: 'The picture could not be saved.',
    requiredFieldsError: 'Please fill in the required fields.',
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

const createGrape = () => ({ id: createId(), name: '', pct: '' });

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
  grapes: [createGrape()],
  notes: '',
  rating: 0,
  image: '',
});

function CountryFlag({ country }) {
  const flag = getCountryFlagEmoji(country);
  if (!flag) return null;

  return (
    <span className="country-flag" role="img" aria-label={`${country} flag`} title={country}>
      {flag}
    </span>
  );
}

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
  const [selectedExportIds, setSelectedExportIds] = useState([]);
  const [exportScope, setExportScope] = useState('all');
  const [exportFormat, setExportFormat] = useState('json');
  const [importExportMenu, setImportExportMenu] = useState('closed');
  const importExportRef = useRef(null);
  const importExportTriggerRef = useRef(null);
  const importActionRef = useRef(null);
  const exportScopeRef = useRef(null);
  const importFileInputRef = useRef(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [metadataFilters, setMetadataFilters] = useState({
    country: '',
    producer: '',
    grape: '',
    region: '',
    vintage: '',
  });
  const [sort, setSort] = useState({ key: 'rating', dir: 'desc' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createDefaultWine());
  const [importFeedback, setImportFeedback] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [csvDraft, setCsvDraft] = useState(null);
  const [imageError, setImageError] = useState('');
  const [formError, setFormError] = useState('');

  const t = T[lang];

  useEffect(() => {
    if (importExportMenu === 'main') importActionRef.current?.focus();
    if (importExportMenu === 'export') exportScopeRef.current?.focus();
  }, [importExportMenu]);

  useEffect(() => {
    if (importExportMenu === 'closed') return undefined;

    const handlePointerDown = (event) => {
      if (!importExportRef.current?.contains(event.target)) {
        setImportExportMenu((current) => transitionImportExportMenu(current, { type: 'outside-click' }));
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setImportExportMenu((current) => transitionImportExportMenu(current, { type: 'escape' }));
        importExportTriggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [importExportMenu]);
  const csvPreview = useMemo(() => (
    csvDraft
      ? importWinesFromCsv(csvDraft.text, wines, () => 'csv-preview', {
        delimiter: csvDraft.delimiter,
        mapping: csvDraft.mapping,
        corrections: csvDraft.corrections,
      })
      : null
  ), [csvDraft, wines]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wines));
  }, [wines]);

  const cellarWines = useMemo(() => wines.filter((wine) => wine.qty > 0), [wines]);
  const archiveWines = useMemo(() => wines.filter((wine) => wine.qty <= 0), [wines]);
  const filterOptions = useMemo(() => getWineFilterOptions(wines), [wines]);

  const visibleList = useMemo(() => {
    const list = filterWines(tab === 0 ? cellarWines : archiveWines, {
      search,
      type: typeFilter,
      ...metadataFilters,
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
  }, [archiveWines, cellarWines, metadataFilters, search, sort, tab, typeFilter]);

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

    const validationError = getWineFormError(cleaned);
    if (validationError) {
      setFormError(`${t.requiredFieldsError} ${validationError}`);
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
    setImageError('');
    setFormError('');
    setForm(createDefaultWine());
  };

  const handleDeleteWine = (id) => {
    setWines((current) => current.filter((wine) => wine.id !== id));
    setSelectedExportIds((current) => current.filter((selectedId) => selectedId !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleExport = () => {
    const exportWines = selectWinesForExport(
      wines,
      exportScope,
      visibleList.map((wine) => wine.id),
      selectedExportIds,
    );
    downloadWineExport(exportWines, exportFormat);
  };

  const toggleExportSelection = (id) => {
    setSelectedExportIds((current) => (
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    ));
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
    setImageError('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (wine) => {
    setEditingId(wine.id);
    setImageError('');
    setFormError('');
    setForm({
      ...wine,
      grapes: wine.grapes?.length
        ? wine.grapes.map((grape) => ({ ...grape, id: grape.id || createId() }))
        : [createGrape()],
    });
    setModalOpen(true);
  };

  const handleImageChange = async (event) => {
    const [file] = event.target.files || [];
    event.target.value = '';
    if (!file) return;

    try {
      updateForm('image', await readImageFile(file));
      setImageError('');
    } catch (error) {
      setImageError(error.message || t.pictureError);
    }
  };

  const handleImport = async (event) => {
    const [file] = event.target.files || [];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      const result = importWinesFromJson(await file.text(), wines, createId);
      if (result.wines.length) {
        setWines((current) => [...result.wines, ...current]);
        setTab(0);
      }
      const details = [...result.errors, ...result.messages];
      const summary = `${result.wines.length} ${result.wines.length === 1 ? t.bottle : t.bottles} imported.`;
      setImportFeedback({
        kind: result.errors.length && !result.wines.length ? 'error' : 'success',
        text: result.errors.length
          ? `${result.wines.length ? summary : t.importError}: ${details.join(' ')}`
          : `${t.importSuccess}: ${summary}${result.messages.length ? ` ${result.messages.join(' ')}` : ''}`,
      });
    } catch {
      setImportFeedback({ kind: 'error', text: `${t.importError}: ${t.importHelp}` });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCsvSelect = async (event) => {
    const [file] = event.target.files || [];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      const text = decodeCsvFile(await file.arrayBuffer());
      setCsvDraft({
        fileName: file.name,
        text,
        delimiter: detectCsvDelimiter(text),
        mapping: {},
      });
      setImportFeedback(null);
    } catch (error) {
      setImportFeedback({
        kind: 'error',
        text: `${t.importError}: ${error.message || 'The CSV file could not be read.'}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportSelection = (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
      handleCsvSelect(event);
    } else {
      handleImport(event);
    }
  };

  const confirmCsvImport = () => {
    if (!csvDraft || !csvPreview) return;
    const result = importWinesFromCsv(csvDraft.text, wines, createId, {
      delimiter: csvDraft.delimiter,
      mapping: csvDraft.mapping,
      corrections: csvDraft.corrections,
    });
    if (result.wines.length) {
      setWines((current) => [...result.wines, ...current]);
      setTab(0);
    }
    const summary = `${result.wines.length} ${result.wines.length === 1 ? t.bottle : t.bottles} imported.`;
    const details = [...result.errors, ...result.messages];
    setImportFeedback({
      kind: result.errors.length && !result.wines.length ? 'error' : 'success',
      text: result.errors.length && !result.wines.length
        ? `${t.importError}: ${details.join(' ') || 'No valid wines were found.'}`
        : `${t.importSuccess}: ${summary}${details.length ? ` ${details.join(' ')}` : ''}`,
    });
    setCsvDraft(null);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateGrape = (index, field, value) => {
    setForm((current) => {
      const grapes = [...(current.grapes || [createGrape()])];
      grapes[index] = { ...grapes[index], [field]: value };
      return { ...current, grapes };
    });
  };

  const addGrapeRow = () => {
    setForm((current) => ({
      ...current,
      grapes: [...(current.grapes || []), createGrape()],
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
          <div className="import-export" ref={importExportRef}>
            <button
              className="ghost-button"
              type="button"
              ref={importExportTriggerRef}
              aria-expanded={importExportMenu !== 'closed'}
              aria-controls="import-export-panel"
              onClick={() => setImportExportMenu((current) => transitionImportExportMenu(current, { type: 'toggle-main' }))}
            >
              {t.importExport}
            </button>
            {importExportMenu !== 'closed' && (
              <div className="import-export-panel" id="import-export-panel">
                {importExportMenu === 'main' ? (
                  <div className="import-export-actions" aria-label={t.importExport}>
                    <button
                      className="ghost-button"
                      type="button"
                      ref={importActionRef}
                      disabled={isImporting}
                      onClick={() => {
                        setImportExportMenu('closed');
                        importFileInputRef.current?.click();
                      }}
                    >
                      {isImporting ? '…' : t.importAction}
                    </button>
                    <input
                      className="visually-hidden"
                      ref={importFileInputRef}
                      type="file"
                      accept="application/json,.json,text/csv,.csv"
                      onChange={handleImportSelection}
                      disabled={isImporting}
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => setImportExportMenu((current) => transitionImportExportMenu(current, { type: 'open-export' }))}
                    >
                      {t.exportAction}
                    </button>
                  </div>
                ) : (
                  <div className="export-menu">
                    <button
                      className="export-menu-back"
                      type="button"
                      onClick={() => setImportExportMenu((current) => transitionImportExportMenu(current, { type: 'back-to-main' }))}
                    >
                      ← {t.backToImportExport}
                    </button>
                    <label>
                      <span>{t.exportScope}</span>
                      <select ref={exportScopeRef} value={exportScope} onChange={(event) => setExportScope(event.target.value)}>
                        <option value="all">{t.exportAll}</option>
                        <option value="visible">{t.exportVisible}</option>
                        <option value="selected">{t.exportSelected}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t.exportFormat}</span>
                      <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}>
                        <option value="json">{t.exportJson}</option>
                        <option value="csv">{t.exportCsv}</option>
                      </select>
                    </label>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => {
                        handleExport();
                        setImportExportMenu('closed');
                        importExportTriggerRef.current?.focus();
                      }}
                      disabled={exportScope === 'selected' && !selectedExportIds.length}
                    >
                      {t.exportWines}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button className="primary-button" onClick={openAddModal}>{t.addWine}</button>
        </div>
      </header>

      {importFeedback && (
        <div className={`import-feedback ${importFeedback.kind}`} role="status">
          <span>{importFeedback.text}</span>
          <button className="feedback-close" onClick={() => setImportFeedback(null)} aria-label={t.close}>×</button>
        </div>
      )}

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
            {Object.entries(TYPE_META).map(([key]) => (
              <button key={key} className={typeFilter === key ? 'filter-chip active' : 'filter-chip'} onClick={() => setTypeFilter(key)}>
                {t.wineTypes[key]}
              </button>
            ))}
          </div>

          <div className="metadata-filters">
            {[
              ['country', t.filterCountry],
              ['producer', t.filterProducer],
              ['grape', t.filterGrape],
              ['region', t.filterRegion],
              ['vintage', t.filterVintage],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <select
                  aria-label={label}
                  value={metadataFilters[key]}
                  onChange={(event) => setMetadataFilters((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))}
                >
                  <option value="">{t.all}</option>
                  {filterOptions[key].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
            ))}
            {Object.values(metadataFilters).some(Boolean) && (
              <button
                className="ghost-button small"
                onClick={() => setMetadataFilters({
                  country: '',
                  producer: '',
                  grape: '',
                  region: '',
                  vintage: '',
                })}
              >
                {t.clearFilters}
              </button>
            )}
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
                <input
                  className="wine-export-checkbox"
                  type="checkbox"
                  aria-label={`${t.exportSelection}: ${wine.name}`}
                  checked={selectedExportIds.includes(wine.id)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => toggleExportSelection(wine.id)}
                />
                {wine.image ? (
                  <img className="wine-image" src={wine.image} alt={wine.name} />
                ) : (
                  <div className="wine-image" style={{ background: TYPE_META[wine.type]?.color || '#cbd5e1' }}>
                    {wine.name?.slice(0, 2).toUpperCase() || 'W'}
                  </div>
                )}
                  <div className="wine-meta">
                    <div className="topline">
                      <span className="chip" style={{ backgroundColor: `${TYPE_META[wine.type]?.color || '#cbd5e1'}22`, color: TYPE_META[wine.type]?.color || '#334155' }}>
                        {t.wineTypes[wine.type] || wine.type}
                      </span>
                      <span className="rating">★ {Number(wine.rating || 0).toFixed(1)}</span>
                    </div>
                    <h3>{wine.name}</h3>
                    <p>{wine.producer}</p>
                    <p className="wine-country">
                      <CountryFlag country={wine.country} />
                      {wine.country || '-'}
                    </p>
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
                <div className="detail-title">
                  {selectedWine.image && <img className="detail-image" src={selectedWine.image} alt={selectedWine.name} />}
                  <div>
                  <p className="eyebrow">{t.wineTypes[selectedWine.type] || selectedWine.type}</p>
                  <h2>{selectedWine.name}</h2>
                  </div>
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
                  <span>{t.country}</span>
                  <strong className="country-origin">
                    <CountryFlag country={selectedWine.country} />
                    {selectedWine.country || '-'}
                  </strong>
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
                {tab === 0 ? (
                  <button className="primary-button" onClick={() => handleDrinkOne(selectedWine.id)}>Drink one</button>
                ) : (
                  <button className="primary-button" onClick={() => handleToggleArchive(selectedWine.id)}>Restore</button>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {csvDraft && csvPreview && (
        <div className="modal-backdrop" onClick={() => setCsvDraft(null)}>
          <section
            className="modal-card csv-import-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-import-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 id="csv-import-title">{t.csvImportTitle}</h3>
                <small>{csvDraft.fileName}</small>
              </div>
              <button className="ghost-button small" onClick={() => setCsvDraft(null)} aria-label={t.close}>×</button>
            </div>

            <div className="csv-import-settings">
              <label>
                <span>{t.csvDelimiter}</span>
                <input
                  aria-label={t.csvDelimiter}
                  maxLength="1"
                  value={csvDraft.delimiter}
                  onChange={(event) => setCsvDraft((current) => ({
                    ...current,
                    delimiter: event.target.value,
                    corrections: {},
                  }))}
                />
              </label>
              <span>{csvPreview.wines.length} valid · {csvPreview.errors.length} errors · {csvPreview.skipped} duplicates</span>
            </div>

            <h4>{t.csvColumnMapping}</h4>
            <div className="csv-mapping-grid">
              {Object.entries(t.csvFields).map(([field, label]) => {
                const suggestion = suggestCsvMapping(csvPreview.headers)[field] || '';
                const selected = Object.hasOwn(csvDraft.mapping, field) ? csvDraft.mapping[field] : suggestion;
                return (
                  <label key={field}>
                    <span>{label}</span>
                    <select
                      value={selected}
                      onChange={(event) => setCsvDraft((current) => ({
                        ...current,
                        mapping: { ...current.mapping, [field]: event.target.value },
                      }))}
                    >
                      <option value="">—</option>
                      {csvPreview.headers.map((header, index) => (
                        <option key={`${header}-${index}`} value={header}>{header}</option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>

            {csvPreview.errors.length > 0 && (
              <div className="csv-import-errors" role="alert">
                <strong>{t.importError}</strong>
                <ul>{csvPreview.errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>
              </div>
            )}
            {csvPreview.messages.length > 0 && (
              <p className="csv-import-notice">{csvPreview.messages.join(' ')}</p>
            )}

            <h4>{t.csvPreview}</h4>
            {csvPreview.rows.length ? (
              <div className="csv-preview-table-wrap">
                <table className="csv-preview-table">
                  <thead>
                    <tr>
                      {Object.keys(t.csvFields).map((field) => (
                        <th key={field}>{t.csvFields[field]}</th>
                      ))}
                      <th>{t.csvStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.map((row) => (
                      <tr key={row.lineNumber}>
                        {Object.keys(t.csvFields).map((field) => (
                          <td key={field}>
                            <input
                              className="csv-preview-input"
                              aria-label={`${t.csvFields[field]}, row ${row.lineNumber}`}
                              value={row.values[field]}
                              onChange={(event) => setCsvDraft((current) => ({
                                ...current,
                                corrections: {
                                  ...current.corrections,
                                  [row.lineNumber]: {
                                    ...current.corrections?.[row.lineNumber],
                                    [field]: event.target.value,
                                  },
                                },
                              }))}
                            />
                          </td>
                        ))}
                        <td className={row.error ? 'csv-row-error' : ''}>
                          {row.error || (row.duplicate ? t.csvDuplicate : t.csvReady)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>{t.csvNoRows}</p>
            )}

            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setCsvDraft(null)}>{t.cancel}</button>
              <button
                className="primary-button"
                onClick={confirmCsvImport}
                disabled={!csvPreview.wines.length}
              >
                {t.csvConfirm}
              </button>
            </div>
          </section>
        </div>
      )}

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
                <input required value={form.name || ''} onChange={(event) => updateForm('name', event.target.value)} />
              </label>
              <label>
                <span>{t.producer}</span>
                <input required value={form.producer || ''} onChange={(event) => updateForm('producer', event.target.value)} />
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
                    {Object.entries(TYPE_META).map(([key]) => (
                      <option key={key} value={key}>{t.wineTypes[key]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t.country}</span>
                  <div className="country-input-wrap">
                    <CountryFlag country={form.country} />
                    <input value={form.country || ''} onChange={(event) => updateForm('country', event.target.value)} />
                  </div>
                </label>
              </div>
              <div className="two-column">
                <label>
                  <span>{t.region}</span>
                  <input required value={form.region || ''} onChange={(event) => updateForm('region', event.target.value)} />
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
                {(form.grapes || [createGrape()]).map((grape, index) => (
                  <div className="grape-row" key={grape.id || index}>
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

              <div className="picture-field">
                <span className="field-label">{t.picture}</span>
                {form.image && <img className="picture-preview" src={form.image} alt={form.name || t.picture} />}
                <div className="picture-actions">
                  <label className="ghost-button small file-button">
                    <span>{t.choosePicture}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
                  </label>
                  {form.image && (
                    <button className="ghost-button small danger" type="button" onClick={() => updateForm('image', '')}>
                      {t.removePicture}
                    </button>
                  )}
                </div>
                <small>{t.pictureHelp}</small>
                {imageError && <p className="field-error" role="alert">{imageError}</p>}
              </div>
            </div>

            <div className="modal-actions">
              {formError && <p className="field-error" role="alert">{formError}</p>}
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
