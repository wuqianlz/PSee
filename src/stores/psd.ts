import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { readPsd, initializeCanvas, type Layer, type Psd } from 'ag-psd';

// Explicitly initialize canvas for ag-psd in browser environment
// Some bundlers might need this to ensure HTMLCanvasElement is used correctly
initializeCanvas((width, height) => {
  // Prevent allocating excessively large offscreen canvases which crashes the browser
  const MAX_AG_PSD_CANVAS_SIZE = 4096;
  
  if (width > MAX_AG_PSD_CANVAS_SIZE || height > MAX_AG_PSD_CANVAS_SIZE) {
    const scale = Math.min(MAX_AG_PSD_CANVAS_SIZE / width, MAX_AG_PSD_CANVAS_SIZE / height);
    const scaledWidth = Math.max(1, Math.floor(width * scale));
    const scaledHeight = Math.max(1, Math.floor(height * scale));
    console.warn(`[ag-psd] Canvas requested too large (${width}x${height}). Scaling down to ${scaledWidth}x${scaledHeight}`);
    
    const canvas = document.createElement('canvas');
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    
    // Intercept getContext to manually downscale the ImageData 
    // because ctx.putImageData does not scale automatically!
    const originalGetContext = canvas.getContext.bind(canvas);
    canvas.getContext = function(type: string, options?: any) {
      const ctx = originalGetContext(type, options) as CanvasRenderingContext2D | null;
      if (type === '2d' && ctx) {
        const originalPutImageData = ctx.putImageData.bind(ctx);
        ctx.putImageData = function(imageData: ImageData, dx: number, dy: number) {
          console.log(`[ag-psd] Intercepted putImageData. Downsampling ${imageData.width}x${imageData.height} to ${scaledWidth}x${scaledHeight}`);
          const src = imageData.data;
          const sw = imageData.width;
          
          const dest = ctx.createImageData(scaledWidth, scaledHeight);
          const dd = dest.data;
          
          // Nearest-neighbor manual downscaling
          for (let y = 0; y < scaledHeight; y++) {
            const sy = Math.floor(y / scale);
            const sy_sw_4 = sy * sw * 4;
            const y_dw_4 = y * scaledWidth * 4;
            for (let x = 0; x < scaledWidth; x++) {
              const sx = Math.floor(x / scale);
              const srcIdx = sy_sw_4 + sx * 4;
              const destIdx = y_dw_4 + x * 4;
              dd[destIdx] = src[srcIdx] || 0;
              dd[destIdx+1] = src[srcIdx+1] || 0;
              dd[destIdx+2] = src[srcIdx+2] || 0;
              dd[destIdx+3] = src[srcIdx+3] || 0;
            }
          }
          originalPutImageData(dest, dx, dy);
        };
      }
      return ctx;
    } as any;
    
    return canvas;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
});

export const usePsdStore = defineStore('psd', () => {
  const psdData = shallowRef<Psd | null>(null);
  const selectedLayer = shallowRef<Layer | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Load a PSD from a File object
  const loadPsd = async (file: File) => {
    try {
      isLoading.value = true;
      error.value = null;
      
      const buffer = await file.arrayBuffer();
      
      // Yield to main thread to allow UI to render "Loading..."
      // Use double requestAnimationFrame and setTimeout to guarantee the browser paints before blocking
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 50);
          });
        });
      });
      
      console.time('parsePSD');
      // Parse PSD
      const parsedPsd = readPsd(buffer, { skipLayerImageData: false, skipCompositeImageData: false, skipThumbnail: true });
      console.timeEnd('parsePSD');
      
      console.log('Parsed PSD completely:', parsedPsd);
      console.log('Global composite canvas exists?', !!parsedPsd.canvas);
      
      psdData.value = parsedPsd;
      selectedLayer.value = null;
      console.log('Parsed PSD:', parsedPsd);
    } catch (err: any) {
      console.error('Failed to parse PSD:', err);
      error.value = err.message || 'Failed to parse PSD file';
      psdData.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  const clearPsd = () => {
    psdData.value = null;
    selectedLayer.value = null;
  };

  const setSelectedLayer = (layer: Layer | null) => {
    selectedLayer.value = layer;
  };

  return {
    psdData,
    selectedLayer,
    isLoading,
    error,
    loadPsd,
    clearPsd,
    setSelectedLayer
  };
});
