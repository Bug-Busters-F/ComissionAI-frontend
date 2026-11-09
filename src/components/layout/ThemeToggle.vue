<template>
  <div
    class="inline-flex items-center gap-1 rounded-full border border-sage-border bg-sage-light p-1"
    role="radiogroup"
    aria-label="Tema da interface"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="preference === option.value"
      :title="option.label"
      :aria-label="option.label"
      :class="[
        'focus-ring grid h-8 w-8 place-items-center rounded-full transition-colors',
        preference === option.value
          ? 'bg-surface text-brand-dark shadow-sm'
          : 'text-sage-muted hover:text-brand-dark'
      ]"
      @click="setPreference(option.value)"
    >
      <component :is="option.icon" :size="16" :stroke-width="1.9" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup>
import { Monitor, Moon, Sun } from 'lucide-vue-next'
import { useTheme } from '@/services/useTheme'

const { preference, setPreference } = useTheme()

const options = [
  { value: 'light', label: 'Tema claro', icon: Sun },
  { value: 'dark', label: 'Tema escuro', icon: Moon },
  { value: 'system', label: 'Seguir o sistema', icon: Monitor }
]
</script>
