export function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = src;
  });
}

export async function compressImageFile(
  file,
  { maxWidth = 1280, maxHeight = 1280, quality = 0.82 } = {}
) {
  const source = await readImageAsDataUrl(file);
  const image = await loadImage(source);

  let { width, height } = image;
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Image processing is not supported in this browser.');
  }

  context.drawImage(image, 0, 0, width, height);

  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(mimeType, quality);
}
