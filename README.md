# Wine Cellar Management

A modernized React + Vite version of the Wine Cellar Management app. The project keeps the original cellar-management workflows while moving the UI into a component-driven, responsive React application.

## Native app

The same React UI can run in Tauri on desktop and mobile. Install the prerequisites for [Tauri v2](https://v2.tauri.app/start/prerequisites/), then run:

```bash
npm install
npm run tauri:dev
```

For a mobile target, initialize its native project once and run the matching target command:

```bash
npm run tauri -- android init
npm run tauri -- android dev
npm run tauri -- ios init
npm run tauri -- ios dev
```

Android and iOS builds require their platform SDKs; iOS development also requires macOS and Xcode.

Native builds use SQLite in the app's private data directory. The database stores each wine as a JSON payload with its stable wine ID as the row key; writes are transactional. On first launch, any `weinkeller-wines-v2` data visible to the app's webview is copied into SQLite and left in browser storage as a backup. Browser storage is origin-specific, so GitHub Pages data is not automatically visible to the separately packaged native app. The GitHub Pages build continues to use browser `localStorage`.

The UI uses the asynchronous CRUD boundary in [`src/wineRepository.js`](src/wineRepository.js), backed by SQLite in Tauri and `localStorage` on the web. This lets a future remote/sync provider be added without coupling the UI to a database. Data is currently device-local: second-device access and synchronization are not implemented; adding them will also require an explicit conflict-resolution policy.

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
npm test
```

The production bundle is generated into the `dist/` folder.
The deployment workflow runs the JavaScript tests and the native SQLite tests before building the Pages bundle.

## Importing wine data

Use **Import JSON** in the toolbar to select a JSON file from a desktop or mobile device. The file must contain an array of wines with `name`, `producer`, `region`, `country`, `style`, `qty`, `price`, `vintage`, `rating`, and `grapes` fields. Each grape must provide a `name` and numeric `pct`; `style` must be `red`, `white`, `sparkling`, or `rose`.

An import never replaces existing cellar data. Wines matching an existing `name`, `producer`, and `vintage` are skipped as duplicates, and invalid entries are reported without blocking valid entries in the same file. See [`examples/wines.json`](examples/wines.json) for a ready-to-import file.

## Data migration strategy

- Existing records keep their stable wine IDs and JSON shape when moved from browser `localStorage` into the native SQLite database.
- The legacy import marker in the metadata table prevents old browser data from being reapplied after the user changes the native cellar; future schema changes should add explicit versioned migrations.
- A future synced provider can implement the same repository operations while adding synchronization metadata and conflict resolution. It should not expose the device's SQLite file directly over the network.
