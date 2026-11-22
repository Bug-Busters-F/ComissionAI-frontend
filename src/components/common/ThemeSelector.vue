<template>
  <div class="grid grid-cols-3 gap-1 rounded-2xl border border-sage-border bg-sage-light p-1" role="group" aria-label="Aparência">
    <button v-for="option in options" :key="option.value" type="button"
      :aria-label="option.accessible" :title="option.accessible" :aria-pressed="themePreference === option.value"
      class="focus-ring flex min-w-0 items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors"
      :class="themePreference === option.value ? 'bg-white text-brand-dark shadow-sm' : 'text-sage-muted hover:bg-white hover:text-brand-dark'"
      @click="setThemePreference(option.value)">
      <component :is="option.icon" :size="17" aria-hidden="true" />
    </button>
  </div>
</template>
<script setup>
import { Sun, Moon, Monitor } from 'lucide-vue-next'
import { themePreference, setThemePreference } from '@/services/theme'
const options = [
  { value: 'light', label: 'Claro', accessible: 'Modo claro', icon: Sun },
  { value: 'dark', label: 'Escuro', accessible: 'Modo escuro', icon: Moon },
  { value: 'system', label: 'Sistema', accessible: 'Usar aparência do sistema', icon: Monitor }
]
</script>
