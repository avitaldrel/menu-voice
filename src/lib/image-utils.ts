export function resizeImage(file: File, maxDim = 1568): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not create canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];
        if (!base64 || base64.length < 100) {
          reject(new Error('Image conversion produced empty result — try a smaller photo or different format'));
          return;
        }
        resolve(base64);
      } catch (err) {
        reject(new Error(
          err instanceof Error ? err.message : 'Failed to process image — try a smaller photo'
        ));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image — the format may not be supported'));
    };
    img.src = url;
  });
}
