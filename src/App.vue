<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo">
        <h1>PSee</h1>
        <span class="subtitle">PSD / PSB Viewer</span>
      </div>
      <div class="actions">
        <label for="file-upload" class="upload-btn">
          <Upload :size="16" style="margin-right: 6px" />
          打开文件 (Open)
        </label>
        <input 
          id="file-upload" 
          type="file" 
          accept=".psd,.psb" 
          @change="onFileChange" 
          style="display: none" 
        />
        <span v-if="store.isLoading" class="loading-text">Loading...</span>
        <button v-if="store.selectedLayer" class="secondary-btn" @click="resetPreview">
          返回整图
        </button>
        <span v-if="store.error" class="error-text">{{ store.error }}</span>
      </div>
    </header>

    <main class="app-main">
      <div class="canvas-area">
        <CanvasRenderer ref="canvasRef" />
        <div class="empty-canvas" v-if="!store.psdData && !store.isLoading">
          <p>请选择一个 PSD 或 PSB 文件</p>
          <p class="small">Please select a PSD or PSB file to view</p>
        </div>
      </div>
      
      <LayerPanel @layer-updated="onLayerUpdated" @layer-selected="onLayerSelected" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePsdStore } from './stores/psd';
import CanvasRenderer from './components/CanvasRenderer.vue';
import LayerPanel from './components/LayerPanel.vue';
import type { Layer } from 'ag-psd';
import { Upload } from 'lucide-vue-next';

const store = usePsdStore();
const canvasRef = ref<InstanceType<typeof CanvasRenderer> | null>(null);

const onFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  await store.loadPsd(file);
};

const onLayerUpdated = () => {
  if (canvasRef.value) {
    canvasRef.value.render();
  }
};

const onLayerSelected = (layer: Layer | null) => {
  store.setSelectedLayer(layer);
  if (canvasRef.value) {
    canvasRef.value.render();
  }
};

const resetPreview = () => {
  store.setSelectedLayer(null);
  if (canvasRef.value) {
    canvasRef.value.render();
  }
};
</script>

<style>
/* Reset and base styles */
* {
  box-sizing: border-box;
}

body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: #f5f5f5;
}

#app {
  height: 100vh;
}
</style>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.app-header {
  height: 56px;
  background-color: #333;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 10;
}

.logo h1 {
  margin: 0;
  font-size: 20px;
  display: inline-block;
  margin-right: 8px;
}

.subtitle {
  font-size: 12px;
  color: #aaa;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.upload-btn {
  display: flex;
  align-items: center;
  background-color: #4a90e2;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.upload-btn:hover {
  background-color: #357abd;
}

.secondary-btn {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.loading-text {
  color: #ffca28;
  font-size: 14px;
}

.error-text {
  color: #ef5350;
  font-size: 14px;
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  position: relative;
  background-color: #e0e0e0;
}

.empty-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #666;
  pointer-events: none;
}

.empty-canvas p {
  margin: 8px 0;
  font-size: 18px;
}

.empty-canvas p.small {
  font-size: 14px;
  color: #999;
}
</style>
