# Spike: In-Browser-OCR für Weinetiketten (Issue #60)

**Wegwerf-Prototyp.** Nicht Teil der App, keine Abhängigkeit des Haupt-`package.json`.
Vergleicht OCR-/Bildmodelle, die vollständig im Browser laufen (kein Server, kein API-Key),
auf echten Etikettenfotos – mit Trefferquote und Laufzeit pro Foto.

| Engine | Art | Download | WebGPU nötig |
|---|---|---|---|
| Tesseract.js 7 | klassisches OCR (bisheriger Ansatz) | ~30 MB | nein |
| PaddleOCR PP-OCRv5 mobile | Deep-Learning-OCR (`@paddleocr/paddleocr-js`) | ~15 MB + OpenCV.js | nein |
| PaddleOCR PP-OCRv6 small | dito, neuere Modellgeneration | ~30 MB + OpenCV.js | nein |
| Florence-2 base | Bildmodell, `<OCR_WITH_REGION>` | ~360 MB | nein (WASM sehr langsam) |
| LFM2.5-VL 450M | kleines VLM, liefert Felder als JSON | ~550 MB | ja |
| Qwen3-VL 2B | größeres VLM, liefert Felder als JSON | ~1,5 GB | ja |

## Starten

```bash
cd spikes/label-ocr
npm install
npm run dev
```

- **GitHub Codespace:** Tab *Ports* → Adresse von Port 5173 (`https://…-5173.app.github.dev`)
  auf dem Handy öffnen. Privat (Standard) = im Handy-Browser bei GitHub eingeloggt sein.
  Der Server läuft dort auf HTTP; HTTPS liefert die Codespaces-Weiterleitung.
- **Lokal im WLAN:** `https://<LAN-IP>:5173` öffnen, Warnung zum selbstsignierten
  Zertifikat bestätigen (HTTPS ist Pflicht, sonst gibt es kein WebGPU).

Die Modelle lädt das Handy direkt von Hugging Face bzw. Baidu-CDN (nicht über den Server)
und rechnet selbst – Zeiten sind also echte Gerätezeiten. Große Modelle besser im WLAN. Fotos wählen, pro Foto die erwarteten
Werte (Wein, Produzent, Jahrgang, Region) eintragen, Modelle wählen, „Vergleich starten“,
danach „Ergebnisse als JSON“ exportieren.

Bewertung (`src/score.js`): ein Feld zählt als Treffer, wenn der erwartete Wert im Output
vorkommt – akzent-/groß-klein-unabhängig, mit ≤ 20 % Tippfehler-Toleranz; Jahrgänge exakt.
Gemessen wird also *Lesefähigkeit*, nicht die spätere Zuordnung zu Formularfeldern.

## Erste Messung (synthetische Etiketten, Intel-MacBook, Chrome 150, WebGPU)

4 gerenderte Etiketten, leicht gedreht: 1× Druckschrift (Georgia), 3× Schreibschrift
(Snell Roundhand, Apple Chancery, Zapfino). Zeiten ohne das erste (Aufwärm-)Foto.

| Engine | Treffer | Zeit/Foto | Beobachtung |
|---|---|---|---|
| Tesseract.js | 12/16 | < 1 s | „Weingut Dönnhoff“ nicht erkannt, Zapfino fast nichts; viel Rauschen (`| |`) |
| PaddleOCR v5 | **16/16** | 1–2 s | sauber, Zeilenreihenfolge korrekt, Umlaute ok |
| PaddleOCR v6 small | **16/16** | 1–1,5 s | wie v5, zusätzlich „ß“ korrekt |
| Florence-2 | 15/16 | 11–16 s | gut lesbar, kleine Fehler („Nake“, „Dönnhof“) |
| LFM2.5-VL | 14/16 | 10–12 s | liest ok, **ordnet Felder falsch zu** / halluziniert (Stil „Riesling“) |
| Qwen3-VL 2B | 13/16 | 55–75 s (+150 s Laden) | Weinwissen (rät Rebsorte), aber Felder vertauscht (Region „Riesling“); fürs Handy zu groß |

**Zwischenfazit:** PaddleOCR liest selbst Zapfino-Schreibschrift fehlerfrei, ist ~100× kleiner
als die Bildmodelle und läuft ohne WebGPU. Die VLMs bringen die erhoffte Feldzuordnung nicht
zuverlässig. Favorit vorbehaltlich echter Fotos: PaddleOCR (v6 small) + eigene Feldauswertung.

Synthetische Etiketten sind sauberer als echte Fotos (Licht, Wölbung, Spiegelungen) –
die eigentliche Aussage liefern erst echte Fotos auf dem Handy.
