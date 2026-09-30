# Wine Cellar Management

A modernized React + Vite version of the Wine Cellar Management app. The project keeps the original cellar-management workflows while moving the UI into a component-driven, responsive React application.

## Local development

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal, usually `http://localhost:5173`.

Important: do not open `index.html` directly in the browser. The React app is a module-based app, and opening the file directly will trigger the MIME-type error:

`Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "application/octet-stream".`

Use the Vite dev server (or `npm start`) instead of serving the repo with a generic static file server.

## Production build

```bash
npm run build
```

The production bundle is generated into the `dist/` folder.

## Importing wine data

Use **Import JSON** in the toolbar to select a JSON file from a desktop or mobile device. The file must contain an array of wines with `name`, `producer`, `region`, `country`, `style`, `qty`, `price`, `vintage`, `rating`, and `grapes` fields. Each grape must provide a `name` and numeric `pct`; `style` must be `red`, `white`, `sparkling`, or `rose`.

Country flags appear alongside wine origins in the cellar list, wine details, and country editor. Common English and German country names and ISO two-letter codes are recognized; unknown names remain visible without a flag.

Use **Import CSV** to preview a spreadsheet export before importing it. Comma-, semicolon-, tab-, and pipe-delimited files are detected automatically; the delimiter and each column mapping can be adjusted in the preview. UTF-8 and legacy single-byte encodings are supported. Winery, wine name, vintage, region, country, wine type, and cellar count are recognized by common header names. Optional price, rating, alcohol, notes, grapes (pipe-separated), and drink-window fields are also imported. Blank vintages are stored as `0` (non-vintage), while missing optional values default to empty values or zero. Preview rows are editable so validation errors can be corrected before confirming the import.

An import never replaces existing cellar data. Wines matching an existing `name`, `producer`, and `vintage` are skipped as duplicates, and invalid entries are reported without blocking valid entries in the same file. See [`examples/wines.json`](examples/wines.json) for JSON and [`examples/cellar.csv`](examples/cellar.csv) for CSV examples.

## Exporting wine data

Use the export controls to download all wines, the wines currently visible after search and type filtering, or the wines checked for export. JSON exports preserve each complete wine record, including grapes, notes, images, and other stored metadata; JavaScript date values are serialized as ISO 8601 strings. The JSON shape is described by [`examples/wine-export-schema.json`](examples/wine-export-schema.json). For example:

```json
[
  {
    "id": "wine-1",
    "name": "Château Margaux",
    "producer": "Château Margaux",
    "region": "Bordeaux",
    "country": "France",
    "type": "red",
    "qty": 12,
    "price": 89.99,
    "vintage": 2015,
    "rating": 4.8,
    "grapes": [{ "name": "Cabernet Sauvignon", "pct": 75 }]
  }
]
```

CSV exports use the import-compatible columns `Winery`, `Wine name`, `Vintage`, `Region`, `Country`, `Wine type`, and `User cellar count`, in that order. Values with commas, quotes, or line breaks are escaped according to CSV rules, and Unicode text is retained. CSV contains these mapped fields; use JSON when you need the full record and its additional metadata. Both formats download as `winecellar-YYYY-MM-DD` files.

## Notes on migration strategy

- The app stores cellar data in `localStorage` under the existing `weinkeller-wines-v2` key, preserving compatibility with the legacy app data model.
- The project is being developed in a dedicated branch / worktree to keep the migration reviewable and easy to compare against the original app.
- Core cellar workflows include search, sorting, filtering, add/edit flows, ratings, archive handling, and responsive UI behavior.
