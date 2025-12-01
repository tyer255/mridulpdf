// Image enhancement utilities for document scanning

export interface EnhancementOptions {
  whiteBackground: boolean;
  removeShadows: boolean;
  boostClarity: boolean;
}

export interface BorderDetectionResult {
  detectedCorners: { x: number; y: number }[];
  canvas: HTMLCanvasElement;
}

/**
 * Enhance image to look like a scanned document
 */
export const enhanceImage = async (
  imageDataUrl: string,
  options: EnhancementOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply enhancements
      if (options.whiteBackground || options.removeShadows) {
        // Increase brightness and reduce shadows
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate brightness
          const brightness = (r + g + b) / 3;

          if (options.whiteBackground) {
            // Push lighter pixels towards white
            if (brightness > 180) {
              const whiteFactor = 1.3;
              data[i] = Math.min(255, r * whiteFactor);
              data[i + 1] = Math.min(255, g * whiteFactor);
              data[i + 2] = Math.min(255, b * whiteFactor);
            }
          }

          if (options.removeShadows) {
            // Lift shadows by adding a base brightness
            const shadowLift = 15;
            data[i] = Math.min(255, r + shadowLift);
            data[i + 1] = Math.min(255, g + shadowLift);
            data[i + 2] = Math.min(255, b + shadowLift);
          }
        }
      }

      if (options.boostClarity) {
        // Increase contrast for better clarity
        const contrast = 1.2;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
          data[i] = factor * (data[i] - 128) + 128;
          data[i + 1] = factor * (data[i + 1] - 128) + 128;
          data[i + 2] = factor * (data[i + 2] - 128) + 128;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
};

/**
 * Detect document borders in an image
 */
export const detectBorders = async (imageDataUrl: string): Promise<BorderDetectionResult> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Simple edge detection - find the largest rectangle
      // For a more accurate detection, you would use more sophisticated algorithms
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Find edges by looking for significant brightness changes
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;

      // Sample the image in a grid to find content boundaries
      const sampleSize = 20;
      for (let y = 0; y < canvas.height; y += sampleSize) {
        for (let x = 0; x < canvas.width; x += sampleSize) {
          const i = (y * canvas.width + x) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          
          // If pixel is not too bright (not background), consider it content
          if (brightness < 240) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      // Add some padding
      const padding = 10;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(canvas.width, maxX + padding);
      maxY = Math.min(canvas.height, maxY + padding);

      const detectedCorners = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ];

      resolve({ detectedCorners, canvas });
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
};

/**
 * Crop image based on detected or manual corners
 */
export const cropImage = (
  canvas: HTMLCanvasElement,
  corners: { x: number; y: number }[]
): string => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Find bounding box
  const minX = Math.min(...corners.map(c => c.x));
  const minY = Math.min(...corners.map(c => c.y));
  const maxX = Math.max(...corners.map(c => c.x));
  const maxY = Math.max(...corners.map(c => c.y));

  const width = maxX - minX;
  const height = maxY - minY;

  // Create new canvas with cropped content
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = width;
  croppedCanvas.height = height;
  const croppedCtx = croppedCanvas.getContext('2d');
  
  if (!croppedCtx) throw new Error('Could not get cropped canvas context');

  croppedCtx.drawImage(
    canvas,
    minX, minY, width, height,
    0, 0, width, height
  );

  return croppedCanvas.toDataURL('image/jpeg', 0.92);
};

/**
 * Generate thumbnail from data URL
 */
export const generateThumbnail = async (
  dataUrl: string,
  maxWidth: number = 150
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Lower quality for smaller file size and faster loading
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

/**
 * Apply filters to an image (brightness, contrast, black & white)
 */
export interface FilterOptions {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  blackAndWhite: boolean;
}

export const applyFilters = async (
  imageDataUrl: string,
  options: FilterOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply brightness and contrast
      const brightnessFactor = options.brightness * 2.55; // Convert to 0-255 range
      const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));

      for (let i = 0; i < data.length; i += 4) {
        // Apply brightness
        let r = data[i] + brightnessFactor;
        let g = data[i + 1] + brightnessFactor;
        let b = data[i + 2] + brightnessFactor;

        // Apply contrast
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        // Apply black and white
        if (options.blackAndWhite) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = g = b = gray;
        }

        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
};

/**
 * Prepare image for PDF: downscale to max width and convert to high-quality JPEG
 */
export const prepareImageForPdf = async (
  dataUrl: string,
  maxWidthPx: number = 1200,
): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidthPx / img.width);
      const width = Math.floor(img.width * scale);
      const height = Math.floor(img.height * scale);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Force JPEG with better compression for smaller size
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ dataUrl: jpegDataUrl, width, height });
    };
    img.onerror = () => reject(new Error('Unsupported image format'));
    img.src = dataUrl;
  });
};
