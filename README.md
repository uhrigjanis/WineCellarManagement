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

## Notes on migration strategy

- The app stores cellar data in `localStorage` under the existing `weinkeller-wines-v2` key, preserving compatibility with the legacy app data model.
- The project is being developed in a dedicated branch / worktree to keep the migration reviewable and easy to compare against the original app.
- Core cellar workflows include search, sorting, filtering, add/edit flows, ratings, archive handling, and responsive UI behavior.
