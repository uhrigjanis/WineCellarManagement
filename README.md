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

### GitHub Codespaces

Open the repo or a pull request branch with **Code → Codespaces → Create codespace**. The dev container installs dependencies, starts the Vite dev server, and opens port 5173 in a browser tab. If the tab doesn't open, use the **Ports** panel and open port 5173.

Wines are stored in the browser's `localStorage`, so a new codespace starts empty. To get sample wines, use **Import / Export** and import `examples/cellar.csv` (31 wines; download it from the codespace's file explorer first).

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

Use the export controls to download all wines, the wines currently visible after search and filtering, or the wines checked for export. The cellar and archive lists support simultaneous filters by country, producer, grape variety, region, and vintage alongside wine type and search. JSON exports preserve each complete wine record, including grapes, notes, images, and other stored metadata; JavaScript date values are serialized as ISO 8601 strings. The JSON shape is described by [`examples/wine-export-schema.json`](examples/wine-export-schema.json). For example:

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

## Scanning wine labels

When you choose a picture in the add/edit form, the app also reads it as a wine label and fills in what it recognises: wine name, producer, vintage, alcohol, wine type, region, country, and grapes. Only fields that are empty or still at their new-wine default are filled, so nothing you typed is overwritten. A status line lists the fields taken from the label, or explains that nothing could be read so you can enter the details manually.

Text recognition runs entirely in the browser with [PaddleOCR.js](https://www.npmjs.com/package/@paddleocr/paddleocr-js) (PP-OCRv6 small). The photo never leaves the device. On the first scan, the OCR models (~30 MB, from PaddlePaddle's model CDN) and the ONNX Runtime WASM files (jsDelivr) are downloaded and cached by the browser. In production builds OCR runs in a Web Worker; the dev server falls back to the main thread.

## Notes on migration strategy

- The app stores cellar data in `localStorage` under the existing `weinkeller-wines-v2` key, preserving compatibility with the legacy app data model.
- The project is being developed in a dedicated branch / worktree to keep the migration reviewable and easy to compare against the original app.
- Core cellar workflows include search, sorting, filtering, add/edit flows, ratings, archive handling, and responsive UI behavior.
