<template>
  <div class="layer-item">
    <div 
      class="layer-row" 
      :class="{ 'is-group': isGroup, 'is-selected': isSelected }"
      @click="selectLayer"
    >
      <span class="expand-icon" v-if="isGroup" @click.stop="toggleExpand">
        <ChevronDown v-if="expanded" :size="14" />
        <ChevronRight v-else :size="14" />
      </span>
      <span class="expand-icon-placeholder" v-else></span>
      <span class="visibility-toggle" @click.stop="toggleVisibility">
        <Eye v-if="!layer.hidden" :size="16" />
        <EyeOff v-else :size="16" class="hidden-icon" />
      </span>
      <span class="layer-type-icon">
        <Folder v-if="isGroup" :size="16" />
        <Image v-else :size="16" />
      </span>
      <span class="layer-name" :title="layer.name">{{ layer.name || 'Unnamed Layer' }}</span>
    </div>
    <div class="layer-children" v-if="isGroup && expanded && layer.children">
      <LayerItem 
        v-for="(child, index) in layer.children" 
        :key="index" 
        :layer="child" 
        @visibility-changed="$emit('visibility-changed')"
        @layer-selected="$emit('layer-selected', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Layer } from 'ag-psd';
import { ChevronRight, ChevronDown, Eye, EyeOff, Folder, Image } from 'lucide-vue-next';

const props = defineProps<{
  layer: Layer
  selectedLayer?: Layer | null
}>();

const emit = defineEmits(['visibility-changed', 'layer-selected']);

const expanded = ref(true);

const isGroup = computed(() => {
  return props.layer.children && props.layer.children.length > 0;
});

const isSelected = computed(() => props.selectedLayer === props.layer);

const toggleExpand = () => {
  if (isGroup.value) {
    expanded.value = !expanded.value;
  }
};

const toggleVisibility = () => {
  props.layer.hidden = !props.layer.hidden;
  emit('visibility-changed');
};

const selectLayer = () => {
  emit('layer-selected', props.selectedLayer === props.layer ? null : props.layer);
};
</script>

<style scoped>
.layer-item {
  display: flex;
  flex-direction: column;
  user-select: none;
}

.layer-row {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
}

.layer-row:hover {
  background-color: #f5f5f5;
}

.layer-row.is-selected {
  background-color: #e8f2ff;
}

.expand-icon, .expand-icon-placeholder {
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
}

.visibility-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  cursor: pointer;
  color: #666;
}

.visibility-toggle:hover {
  color: #333;
}

.hidden-icon {
  color: #ccc;
}

.layer-type-icon {
  display: flex;
  align-items: center;
  margin-right: 8px;
  color: #888;
}

.layer-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #333;
}

.layer-children {
  padding-left: 20px;
  border-left: 1px dashed #e0e0e0;
  margin-left: 15px;
}
</style>
