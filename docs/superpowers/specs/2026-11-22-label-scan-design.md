# Wine label scanning (issue #60) – short design

## Intent
Adding a wine should not require typing everything. When the user picks a picture of a wine
label under "Bild" in the add/edit form, the app reads the label and fills in the recognised
details. If nothing can be recognised, the user gets a clear message and enters data manually.

## Constraints (from the user)
- Should work for other users later → no personal API key, no paid backend: **runs client-side**.
- Tesseract.js (earlier attempt, branch `uhrigjanis-issue-30-wine-label-scanning`) fails on cursive labels.

## Approaches considered
| Approach | Trade-off | Decision |
|---|---|---|
| Cloud vision model (e.g. Claude via backend) | best accuracy, but needs key/backend and uploads the photo | rejected: client-side wanted |
| Tesseract.js + better preprocessing | small, but fundamentally weak on cursive | rejected |
| PaddleOCR (PP-OCRv5/v6) in the browser | ~30 MB, no WebGPU needed, reads cursive well; field mapping is our job | **chosen** |
| Small VLMs in the browser (Florence-2, LFM2.5-VL, Qwen3-VL) | 0.36–1.5 GB, WebGPU, 10–60 s/photo, field mapping unreliable | rejected |

Evidence: spike `spikes/label-ocr` on branch `worktree-spike-label-ocr-comparison`
(PaddleOCR 16/16 vs. Tesseract 12/16 on synthetic print + cursive labels).

## Design
- `src/labelScan.js` – lazy-loads PaddleOCR (PP-OCRv6 small) on the first scan, reuses it,
  downsizes the photo to 1600 px, returns OCR lines (text + text height) in reading order.
  Web Worker in production builds, main-thread fallback. ORT WASM path pinned to the installed
  `onnxruntime-web` version (`vite.config.js` define).
- `src/labelParser.js` – pure heuristics: vintage (plausible year, not "seit 1874"),
  alcohol (`x % vol`, 5–22), grapes (word list → also implies white/red), wine type keywords,
  region dictionary → country, explicit country words, producer (Weingut/Domaine/Château/…
  prefix or "abgefüllt von / élaboré par …"), name = tallest remaining text line
  (Château producer as fallback).
- `src/labelSuggestions.js` – fills only fields that are empty or still at the new-wine default;
  grapes only if no grape was entered.
- Form: scan starts together with the existing picture handling; status line under the picture:
  busy → "Vom Etikett übernommen: … Bitte prüfen." / "keine Weindaten erkannt" / load error.

## Builder's calls (not discussed with the user)
- Automatic scan on every picture selection (no separate button).
- Defaults counted as "empty": vintage = current year, alcohol 13.5, type red, country Deutschland.
- Countries output in German, matching the app's default data.
- Models are loaded from PaddlePaddle's CDN and jsDelivr, not self-hosted.

## Known limits
- Producer without a keyword (e.g. "Joseph Drouhin") is not recognised and may end up as name.
- Accuracy on real photos (glare, curvature) still to be confirmed on a phone.
