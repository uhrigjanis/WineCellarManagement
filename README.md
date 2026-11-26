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

Open the repo or a pull request branch with **Code → Codespaces → Create codespace**. The dev container installs dependencies and Java 21. It then starts the Firebase emulators (Auth + Firestore, demo project, no credentials needed) together with the Vite dev server (`npm run dev:emulator`) and opens port 5173 in a browser tab. If the tab doesn't open, use the **Ports** panel and open port 5173. The first start takes a minute while the emulators download.

The app reaches the emulators through the Vite dev server, so only port 5173 needs to be open, and it can stay private. **Sign in with Google** opens the emulator's fake account picker, so no real Google account is used. The status chip shows an *Emulator* badge. The emulator data is discarded when the dev server stops. To get sample wines, use **Import / Export** and import `examples/cellar.csv` (31 wines; download it from the codespace's file explorer first). Import before signing in to test the migration, or after signing in to write directly to the cloud cellar.

For plain local-only mode without Firebase, stop the dev server and run `npm run dev` instead.

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

## Cloud sync with Firebase (optional)

Without configuration the app stores everything in the browser's `localStorage` (local-only mode). When a Firebase web config is provided, a **Sign in with Google** button appears. Signed-in users keep their cellar in Firestore under `users/{uid}/wines/{wineId}` (one document per wine), so it survives clearing browser data and syncs between devices. Firestore's persistent offline cache keeps the app usable offline; changes sync once the connection is back. The status chip in the toolbar shows *Synced*, *Saving…*, or *Offline – will sync later*.

On the first sign-in on a device, the wines from that browser's `localStorage` are uploaded once. Wines matching an existing cloud wine by `name`, `producer`, and `vintage` are skipped. The local copy is kept as a backup and is shown again after signing out. Label images stay client-side compressed (max. 1200 px, JPEG 0.8) and are stored inside the wine document; a wine above ~1 MB (Firestore's document limit is 1 MiB) is rejected with a message. JSON/CSV import and export work in both modes.

### Setting up a Firebase project

1. In the [Firebase console](https://console.firebase.google.com) create a project (Spark/free plan, Analytics not needed) and register a **Web app** (without Firebase Hosting). Note the `firebaseConfig` values.
2. **Authentication → Sign-in method → Google**: enable. Under **Settings → Authorized domains** add `uhrigjanis.github.io` (`localhost` is already there).
3. **Firestore Database → Create database** in production mode (location e.g. `europe-west3`, cannot be changed later). Under **Rules**, paste the contents of [`firestore.rules`](firestore.rules) and publish.
4. Local development: copy `.env.example` to `.env.local` and fill in the values, then `npm run dev`.
5. GitHub Pages: add the same values as repository **variables** (Settings → Secrets and variables → Actions → Variables): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. The deploy workflow passes them to the build.

The web config is not secret, it ends up in the site's JavaScript anyway. The data is protected by the security rules: each user can only read and write their own documents.

### Testing locally with the Firebase Emulator Suite

The emulators need Java 21+ and run a throw-away demo project (`demo-weinkeller`), no real Firebase project or Google account required. GitHub Codespaces already has everything set up (see above).

```bash
npm run dev:emulator      # Auth + Firestore emulators, Emulator UI (port 4000) and the app (http://localhost:5173)
npm run test:rules        # security rules tests (starts and stops its own emulator)
npm run test:e2e          # browser test: sign-in, migration, live sync (needs `npx playwright install chromium`)
```

In emulator mode the Google sign-in opens a fake account picker, so you can create several test users. The Emulator UI shows the Firestore documents and lets you edit or delete them to observe live sync. The app talks to the emulators through the Vite dev server (see `vite.config.js`), which also makes `http://<your-LAN-IP>:5173` work on a phone. If the emulators are already running separately (`npm run emulators`), start only the app with `npm run dev:app-emulator`. To keep emulator data between runs, use `npm run emulators -- --import=.emulator-data --export-on-exit`.

## Notes on migration strategy

- The app stores cellar data in `localStorage` under the existing `weinkeller-wines-v2` key, preserving compatibility with the legacy app data model.
- The project is being developed in a dedicated branch / worktree to keep the migration reviewable and easy to compare against the original app.
- Core cellar workflows include search, sorting, filtering, add/edit flows, ratings, archive handling, and responsive UI behavior.
