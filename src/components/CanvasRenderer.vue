<template>
  <div 
    class="canvas-renderer" 
    ref="containerRef"
    @wheel="onWheel"
    @mousedown="onMouseDown"
  >
    <div 
      class="canvas-wrapper" 
      :style="wrapperStyle"
    >
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { usePsdStore } from '../stores/psd';
import type { Layer } from 'ag-psd';

const store = usePsdStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let renderFrameId: number | null = null;

const wrapperStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
}));

const createCanvasFromImageData = (layer: Layer) => {
  if (!layer.imageData) return null;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = layer.imageData.width;
  tempCanvas.height = layer.imageData.height;

  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return null;

  const imageData = new ImageData(
    new Uint8ClampedArray(layer.imageData.data),
    layer.imageData.width,
    layer.imageData.height,
  );
  tempCtx.putImageData(imageData, 0, 0);
  layer.canvas = tempCanvas;
  return tempCanvas;
};

const getSelectedLayerCanvas = () => {
  const psd = store.psdData;
  const layer = store.selectedLayer;

  if (!psd || !layer) return null;

  if (layer.canvas) {
    return {
      canvas: layer.canvas,
      width: layer.canvas.width,
      height: layer.canvas.height,
      source: 'layer-canvas',
    };
  }

  const fromImageData = createCanvasFromImageData(layer);
  if (fromImageData) {
    return {
      canvas: fromImageData,
      width: fromImageData.width,
      height: fromImageData.height,
      source: 'layer-image-data',
    };
  }

  if (!psd.canvas) return null;

  const left = Math.max(0, layer.left ?? 0);
  const top = Math.max(0, layer.top ?? 0);
  const right = Math.max(left, layer.right ?? left);
  const bottom = Math.max(top, layer.bottom ?? top);
  const width = right - left;
  const height = bottom - top;

  if (!width || !height) return null;

  const scaleX = psd.canvas.width / psd.width;
  const scaleY = psd.canvas.height / psd.height;
  const sx = Math.max(0, Math.floor(left * scaleX));
  const sy = Math.max(0, Math.floor(top * scaleY));
  const sw = Math.max(1, Math.floor(width * scaleX));
  const sh = Math.max(1, Math.floor(height * scaleY));

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = sw;
  cropCanvas.height = sh;
  const cropCtx = cropCanvas.getContext('2d');

  if (!cropCtx) return null;

  cropCtx.drawImage(psd.canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  return {
    canvas: cropCanvas,
    width: sw,
    height: sh,
    source: 'composite-crop',
  };
};

const getRenderSource = () => {
  const psd = store.psdData;
  if (!psd) return null;

  const selectedLayerCanvas = getSelectedLayerCanvas();
  if (selectedLayerCanvas) return selectedLayerCanvas;

  if (psd.canvas) {
    return {
      canvas: psd.canvas,
      width: psd.canvas.width,
      height: psd.canvas.height,
      source: 'psd-composite',
    };
  }

  return null;
};

const centerAndFitCanvas = () => {
  const container = containerRef.value;
  const renderSource = getRenderSource();

  if (!container || !renderSource) return;

  const padding = 40;
  const containerWidth = Math.max(container.clientWidth - padding * 2, 100);
  const containerHeight = Math.max(container.clientHeight - padding * 2, 100);

  const scaleX = containerWidth / renderSource.width;
  const scaleY = containerHeight / renderSource.height;

  scale.value = Math.max(0.01, Math.min(scaleX, scaleY, 1));
  translateX.value = (container.clientWidth - renderSource.width * scale.value) / 2;
  translateY.value = (container.clientHeight - renderSource.height * scale.value) / 2;

  console.log(
    `[Renderer] Canvas centered. Container: ${container.clientWidth}x${container.clientHeight}, Source: ${renderSource.width}x${renderSource.height}, Mode: ${renderSource.source}, Scale: ${scale.value}`,
  );
};

const render = () => {
  if (renderFrameId !== null) {
    cancelAnimationFrame(renderFrameId);
  }

  renderFrameId = requestAnimationFrame(() => {
    try {
      const canvas = canvasRef.value;
      const renderSource = getRenderSource();

      if (!canvas || !renderSource) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.width !== renderSource.width || canvas.height !== renderSource.height) {
        canvas.width = renderSource.width;
        canvas.height = renderSource.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(renderSource.canvas, 0, 0, renderSource.width, renderSource.height);

      console.log(
        `[Renderer] Finished rendering. Mode: ${renderSource.source}, Size: ${renderSource.width}x${renderSource.height}`,
      );
    } catch (error) {
      console.error('Error rendering PSD:', error);
    }
  });
};

const onWheel = (event: WheelEvent) => {
  if (!store.psdData) return;
  event.preventDefault();

  const container = containerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;
  const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
  const newScale = Math.max(0.05, Math.min(scale.value * zoomFactor, 50));

  translateX.value = pointerX - (pointerX - translateX.value) * (newScale / scale.value);
  translateY.value = pointerY - (pointerY - translateY.value) * (newScale / scale.value);
  scale.value = newScale;
};

const onMouseDown = (event: MouseEvent) => {
  if (!store.psdData) return;
  if (event.button !== 0 && event.button !== 1) return;

  isDragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

const onMouseMove = (event: MouseEvent) => {
  if (!isDragging) return;

  translateX.value += event.clientX - lastMouseX;
  translateY.value += event.clientY - lastMouseY;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
};

const onMouseUp = () => {
  isDragging = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
};

watch(
  () => [store.psdData, store.selectedLayer],
  () => {
    if (!store.psdData) return;
    setTimeout(() => {
      centerAndFitCanvas();
      render();
    }, 10);
  },
  { deep: false },
);

onUnmounted(() => {
  if (renderFrameId !== null) {
    cancelAnimationFrame(renderFrameId);
  }
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
});

defineExpose({ render });
</script>

<style scoped>
.canvas-renderer {
  width: 100%;
  height: 100%;
  overflow: hidden; /* Use our own panning */
  position: relative;
  background-color: #e0e0e0;
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), 
    linear-gradient(-45deg, #ccc 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #ccc 75%), 
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  cursor: grab;
}

.canvas-renderer:active {
  cursor: grabbing;
}

.canvas-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  /* Will-change helps with CSS transform performance */
  will-change: transform;
}

canvas {
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  background-color: transparent;
  display: block;
}
</style>
