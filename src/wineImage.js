export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'Please select an image.' };
  }

  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return { valid: false, error: 'Please choose a JPG, PNG, or WebP image.' };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'Images must be 5 MB or smaller.' };
  }

  return { valid: true, error: '' };
}

export function readImageFile(file) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return Promise.reject(new Error(validation.error));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('The image could not be processed.'));
            return;
          }
          const compressedReader = new FileReader();
          compressedReader.onload = () => resolve(compressedReader.result);
          compressedReader.onerror = () => reject(new Error('The image could not be read.'));
          compressedReader.readAsDataURL(blob);
        }, 'image/jpeg', 0.8);
      };
      image.onerror = () => reject(new Error('The image could not be read.'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
}
