<template>
  <div class="layer-panel">
    <div class="panel-header">
      <h3>图层 (Layers)</h3>
    </div>
    
    <div class="layer-list" v-if="store.psdData">
      <LayerItem 
        v-for="(layer, index) in store.psdData.children" 
        :key="index" 
        :layer="layer"
        :selected-layer="store.selectedLayer"
        @visibility-changed="onVisibilityChanged"
        @layer-selected="onLayerSelected"
      />
    </div>
    <div class="empty-state" v-else>
      No PSD Loaded
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePsdStore } from '../stores/psd';
import LayerItem from './LayerItem.vue';

const store = usePsdStore();

const emit = defineEmits(['layer-updated', 'layer-selected']);

const onVisibilityChanged = () => {
  emit('layer-updated');
};

const onLayerSelected = (layer: unknown) => {
  emit('layer-selected', layer);
};
</script>

<style scoped>
.layer-panel {
  width: 300px;
  height: 100%;
  background-color: #ffffff;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
  background-color: #fafafa;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.layer-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: #999;
  font-size: 14px;
}
</style>
