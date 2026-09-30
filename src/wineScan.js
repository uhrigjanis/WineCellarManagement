const MAX_SCAN_SIZE = 20 * 1024 * 1024;
const MAX_OCR_DIMENSION = 4096;
const DETECTION_DIMENSION = 1200;

const EMPTY_SUGGESTIONS = {
  name: '',
  producer: '',
  vintage: '',
  alcohol: '',
  type: '',
  region: '',
  country: '',
};

const LABELS = {
  name: /^(?:wine(?:\s+name)?|wein(?:name)?|nom|cuv[eé]e|name)\s*[:：-]\s*(.+)$/i,
  producer: /^(?:producer|winery|estate|weingut|domaine|produzent|producteur|maison)\s*[:：-]\s*(.+)$/i,
  vintage: /^(?:vintage|jahrgang|mill[eé]sime)\s*[:：-]\s*((?:19|20)\d{2})$/i,
  type: /^(?:type|wine\s+type|weinart)\s*[:：-]\s*(.+)$/i,
  region: /^(?:region|appellation|anbaugebiet|gebiet)\s*[:：-]\s*(.+)$/i,
  country: /^(?:country|land|pays)\s*[:：-]\s*(.+)$/i,
};

const TYPES = [
  { type: 'red', pattern: /^(?:red(?:\s+wine)?|rotwein|rouge)$/i },
  { type: 'white', pattern: /^(?:white(?:\s+wine)?|wei(?:ss|ß)wein|blanc)$/i },
  { type: 'rose', pattern: /^(?:ros[eé](?:\s+wine)?|ros[eé])$/i },
  { type: 'sparkling', pattern: /^(?:sparkling(?:\s+wine)?|sekt|schaumwein|brut(?:\s+nature)?|champagne)$/i },
];

const STYLE_CUES = /\b(?:brut|demi[- ]sec|sec|dry|extra[- ]dry|trocken|nature)\b/i;
const PRODUCER_EXCLUSIONS = /^(?:[A-Z]\s+)?(?:famille|family|vigneron(?:ne)?|grower|récoltant|recoltant|bouteille|mis en bouteille)\b/i;
let cvPromise;

function getWineType(value) {
  return TYPES.find(({ pattern }) => pattern.test(value.trim()))?.type || '';
}

export function isMobileDevice(userAgent = '', maxTouchPoints = 0) {
  return /android|iphone|ipad|ipod/i.test(userAgent)
    || (/macintosh/i.test(userAgent) && maxTouchPoints > 1);
}

export function orderQuadrilateral(points) {
  if (!Array.isArray(points) || points.length !== 4) {
    throw new Error('A label crop requires four corner points.');
  }

  const [topLeft, bottomRight] = [
    points.reduce((best, point) => point.x + point.y < best.x + best.y ? point : best),
    points.reduce((best, point) => point.x + point.y > best.x + best.y ? point : best),
  ];
  const [topRight, bottomLeft] = [
    points.reduce((best, point) => point.x - point.y > best.x - best.y ? point : best),
    points.reduce((best, point) => point.x - point.y < best.x - best.y ? point : best),
  ];

  return [topLeft, topRight, bottomRight, bottomLeft];
}

function inferChampagneLayout(lines, suggestions) {
  const champagneIndex = lines.findIndex((line) => /\bchampagne\b/i.test(line));
  if (!suggestions.region && champagneIndex >= 0) {
    suggestions.region = 'Champagne';
  }

  if (!suggestions.vintage) {
    const vintageLine = lines.find((line) => /\b(?:19|20)\d{2}\b/.test(line));
    suggestions.vintage = vintageLine?.match(/\b((?:19|20)\d{2})\b/)?.[1] || '';
  }

  if (!suggestions.type && (champagneIndex >= 0 || lines.some((line) => STYLE_CUES.test(line)))) {
    suggestions.type = 'sparkling';
  }

  const styleIndex = lines.findIndex((line) => STYLE_CUES.test(line) || /\b(?:19|20)\d{2}\b/.test(line));
  if (styleIndex >= 0) {
    if (!suggestions.name) {
      const previousLine = lines[styleIndex - 1] || '';
      if (/^pur\s+[\p{L}'’-]+(?:\s+[\p{L}'’-]+)?$/iu.test(previousLine)) {
        const style = lines[styleIndex].match(/\b(?:brut(?:\s+nature)?|demi[- ]sec|sec|dry|extra[- ]dry|trocken|nature)\b/i)?.[0];
        suggestions.name = [previousLine, style].filter(Boolean).join(' ');
      }
    }

    if (!suggestions.producer) {
      const candidate = lines.slice(styleIndex + 1).find((line) => {
        const words = line.split(/\s+/);
        return words.length >= 2
          && words.length <= 4
          && !PRODUCER_EXCLUSIONS.test(line)
          && /^[\p{Lu}\p{Lt}][\p{L}'’-]+(?:\s+[\p{Lu}\p{Lt}][\p{L}'’-]+){1,3}$/u.test(line);
      });
      if (candidate) {
        suggestions.producer = candidate;
      }
    }
  }

  if (!suggestions.producer && champagneIndex >= 0) {
    const familyIndex = lines.findIndex((line) => PRODUCER_EXCLUSIONS.test(line));
    if (familyIndex > 0 && familyIndex - champagneIndex <= 5) {
      const candidate = lines.slice(Math.max(champagneIndex + 1, familyIndex - 2), familyIndex)
        .find((line) => /^[\p{Lu}][\p{Lu}\p{M}'’-]+(?:\s+[\p{Lu}][\p{Lu}\p{M}'’-]+){1,2}$/u.test(line));
      if (candidate) {
        suggestions.producer = candidate;
      }
    }
  }
}

export function extractWineSuggestions(text) {
  const suggestions = { ...EMPTY_SUGGESTIONS };
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    for (const [field, pattern] of Object.entries(LABELS)) {
      const match = line.match(pattern);
      if (match) {
        const value = match[1].trim().replace(/[;,]+$/, '').trim();
        if (field === 'type') {
          suggestions.type = getWineType(value);
        } else if (field === 'region' && /\bchampagne\b/i.test(value)) {
          suggestions.region = 'Champagne';
        } else {
          suggestions[field] = value;
        }
        break;
      }
    }

    const alcohol = line.match(/\b(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*(?:(?:vol(?:ume)?\.?|alc(?:ohol)?|abv)\b)?/i);
    if (alcohol) {
      suggestions.alcohol = alcohol[1].replace(',', '.');
    }

    const wineType = getWineType(line);
    if (wineType) {
      suggestions.type = wineType;
    }
  }

  inferChampagneLayout(lines, suggestions);
  return suggestions;
}

function isHeicFile(file) {
  return /image\/hei[cf]/i.test(file.type) || /\.(?:heic|heif)$/i.test(file.name || '');
}

export function validateScanImageFile(file) {
  if (!file) {
    return { valid: false, error: 'Please select a wine-label image.' };
  }

  if (!isHeicFile(file) && !/^image\/(?:jpeg|png|webp)$/i.test(file.type)) {
    return { valid: false, error: 'Please choose a JPG, PNG, WebP, or HEIC image.' };
  }

  if (file.size > MAX_SCAN_SIZE) {
    return { valid: false, error: 'Wine-label images must be 20 MB or smaller.' };
  }

  return { valid: true, error: '' };
}

async function normalizeImageFile(file) {
  if (!isHeicFile(file)) return file;

  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
  return Array.isArray(converted) ? converted[0] : converted;
}

async function loadOpenCv() {
  if (!cvPromise) {
    cvPromise = import('@techstark/opencv-js').then(async ({ default: cvModule }) => {
      if (cvModule instanceof Promise) return cvModule;
      if (cvModule.Mat) return cvModule;
      await new Promise((resolve) => {
        cvModule.onRuntimeInitialized = resolve;
      });
      return cvModule;
    });
  }
  return cvPromise;
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The wine-label image could not be decoded.'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawScaledImage(image, maxDimension = MAX_OCR_DIMENSION) {
  const scale = Math.min(1, maxDimension / Math.max(image.width || image.naturalWidth, image.height || image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round((image.width || image.naturalWidth) * scale));
  canvas.height = Math.max(1, Math.round((image.height || image.naturalHeight) * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function contourToQuadrilateral(cv, contour) {
  const perimeter = cv.arcLength(contour, true);
  const polygon = new cv.Mat();
  try {
    cv.approxPolyDP(contour, polygon, 0.02 * perimeter, true);
    if (polygon.rows !== 4 || !cv.isContourConvex(polygon)) return null;

    const points = [];
    const coordinates = polygon.data32S;
    for (let i = 0; i < 4; i += 1) {
      points.push({
        x: coordinates[i * 2],
        y: coordinates[i * 2 + 1],
      });
    }
    return points;
  } finally {
    polygon.delete();
  }
}

function findLabelCorners(cv, canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const source = cv.matFromImageData(context.getImageData(0, 0, canvas.width, canvas.height));
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const hierarchy = new cv.Mat();
  const contours = new cv.MatVector();
  let best = null;
  let bestArea = canvas.width * canvas.height * 0.12;

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 40, 130);
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i);
      const area = Math.abs(cv.contourArea(contour));
      if (area <= bestArea) {
        contour.delete();
        continue;
      }

      const corners = contourToQuadrilateral(cv, contour);
      contour.delete();
      if (corners) {
        const [topLeft, topRight, bottomRight, bottomLeft] = orderQuadrilateral(corners);
        const width = Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight));
        const height = Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight));
        const aspectRatio = width / height;
        if (aspectRatio < 0.3 || aspectRatio > 2.5 || area > canvas.width * canvas.height * 0.95) {
          continue;
        }
        best = corners;
        bestArea = area;
      }
    }
  } finally {
    source.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    hierarchy.delete();
    contours.delete();
  }

  return best;
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function warpLabel(cv, canvas, corners) {
  const [topLeft, topRight, bottomRight, bottomLeft] = orderQuadrilateral(corners);
  const width = Math.round(Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight)));
  const height = Math.round(Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight)));
  if (width < 100 || height < 100) return null;

  const source = cv.matFromImageData(canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height));
  const sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    topLeft.x, topLeft.y,
    topRight.x, topRight.y,
    bottomRight.x, bottomRight.y,
    bottomLeft.x, bottomLeft.y,
  ]);
  const destinationPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    width - 1, 0,
    width - 1, height - 1,
    0, height - 1,
  ]);
  const transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints);
  const corrected = new cv.Mat();
  const output = document.createElement('canvas');

  try {
    cv.warpPerspective(source, corrected, transform, new cv.Size(width, height), cv.INTER_CUBIC, cv.BORDER_REPLICATE);
    cv.imshow(output, corrected);
    return output;
  } finally {
    source.delete();
    sourcePoints.delete();
    destinationPoints.delete();
    transform.delete();
    corrected.delete();
  }
}

function enhanceContrast(cv, canvas) {
  const source = cv.matFromImageData(canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height));
  const gray = new cv.Mat();
  const enhanced = new cv.Mat();
  const rgba = new cv.Mat();
  const output = document.createElement('canvas');

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    const clahe = cv.createCLAHE(2.5, new cv.Size(8, 8));
    try {
      clahe.apply(gray, enhanced);
    } finally {
      clahe.delete();
    }
    cv.cvtColor(enhanced, rgba, cv.COLOR_GRAY2RGBA);
    cv.imshow(output, rgba);
    return output;
  } finally {
    source.delete();
    gray.delete();
    enhanced.delete();
    rgba.delete();
  }
}

function rotateCanvas(canvas, angle) {
  const rotated = document.createElement('canvas');
  const quarterTurn = Math.abs(angle) === Math.PI / 2;
  rotated.width = quarterTurn ? canvas.height : canvas.width;
  rotated.height = quarterTurn ? canvas.width : canvas.height;
  const context = rotated.getContext('2d');
  context.translate(rotated.width / 2, rotated.height / 2);
  context.rotate(angle);
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return rotated;
}

export async function preprocessWineLabel(file) {
  const validation = validateScanImageFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const normalizedFile = await normalizeImageFile(file);
  const image = await decodeImage(normalizedFile);
  try {
    const fullResolution = drawScaledImage(image);
    const detectionCanvas = drawScaledImage(image, DETECTION_DIMENSION);
    const cv = await loadOpenCv();
    const detectedCorners = findLabelCorners(cv, detectionCanvas);
    let labelCanvas = null;

    if (detectedCorners) {
      const scaleX = fullResolution.width / detectionCanvas.width;
      const scaleY = fullResolution.height / detectionCanvas.height;
      const fullResolutionCorners = detectedCorners.map(({ x, y }) => ({
        x: x * scaleX,
        y: y * scaleY,
      }));
      labelCanvas = warpLabel(cv, fullResolution, fullResolutionCorners);
    }

    const source = labelCanvas || fullResolution;
    const enhanced = enhanceContrast(cv, source);
    const rotations = [enhanced];
    if (enhanced.width > enhanced.height * 1.25) {
      rotations.push(rotateCanvas(enhanced, Math.PI / 2));
      rotations.push(rotateCanvas(enhanced, -Math.PI / 2));
    }

    return { images: rotations, labelDetected: Boolean(labelCanvas) };
  } finally {
    image.close?.();
  }
}

async function createOcrWorker() {
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('eng+deu+fra');
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
  return worker;
}

function recognitionScore(result) {
  const text = result.data.text || '';
  const words = text.match(/[\p{L}\p{N}]{2,}/gu) || [];
  const fields = Object.values(extractWineSuggestions(text)).filter(Boolean).length;
  return Number(result.data.confidence || 0) * 0.1
    + Math.min(words.length, 20) * 0.2
    + fields * 25;
}

export async function scanWineLabel(file, {
  workerFactory = createOcrWorker,
  preprocess = preprocessWineLabel,
} = {}) {
  const validation = validateScanImageFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const { images, labelDetected } = await preprocess(file);
  const worker = await workerFactory();
  try {
    let bestResult = null;
    let bestScore = -1;
    for (const image of images) {
      const result = await worker.recognize(image);
      const score = recognitionScore(result);
      if (score > bestScore) {
        bestResult = result;
        bestScore = score;
      }
    }

    const text = bestResult?.data.text || '';
    return {
      text,
      suggestions: extractWineSuggestions(text),
      labelDetected,
    };
  } finally {
    await worker.terminate();
  }
}
