<template>
  <header class="border-b border-[#dfe4dd] bg-[#e8ebe6] px-5 py-4 sm:px-8 lg:px-[42px]">
    <div class="flex min-h-11 items-center justify-between gap-4">
      <p class="text-xs font-medium text-[#646862]">Workspace / {{ currentLabel }}</p>
    </div>

    <nav class="mt-4 flex gap-2 overflow-x-auto md:hidden" aria-label="Navegação móvel">
      <RouterLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        :class="[
          'focus-ring whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold',
          route.meta.section === item.section ? 'bg-[#9fe870]' : 'bg-white text-[#646862]'
        ]"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const navigation = [
  { label: 'Home', to: '/home', section: 'home' },
  { label: 'Dados', to: '/dados', section: 'dados' },
  { label: 'Campanhas', to: '/campanhas', section: 'campanhas' }
]

const currentLabel = computed(() => route.meta.label || 'Home')
</script>
