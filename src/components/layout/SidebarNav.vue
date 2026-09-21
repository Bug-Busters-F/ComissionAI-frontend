<template>
  <aside class="fixed inset-y-0 left-0 z-30 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto bg-white px-5 py-8 overscroll-contain md:flex">
    <RouterLink to="/home" class="focus-ring flex items-center gap-3 rounded-xl" aria-label="ComissionAI - Home">
      <img :src="comissionaiIcon" alt="" class="h-10 w-10 rounded-xl object-cover" />
      <span class="text-[20px] font-extrabold tracking-[-0.04em] text-brand-dark">ComissionAI</span>
    </RouterLink>

    <div class="mt-12 flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-sage-muted">
      <span>BUG BUSTERS</span>
      <span class="rounded-md border border-sage-border-dark px-1.5 py-1 text-[10px] tracking-normal text-brand-dark">DOM ROCK</span>
    </div>

    <nav class="mt-7 space-y-2" aria-label="Navegação principal">
      <RouterLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        :class="[
          'focus-ring flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
          route.meta.section === item.section
            ? 'bg-brand text-brand-dark font-bold'
            : 'text-sage-muted hover:bg-sage-light hover:text-brand-dark'
        ]"
      >
        <component :is="item.icon" :size="18" :stroke-width="1.8" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="mt-auto border-t border-sage-border-light pt-6">
      <div class="flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-full bg-success-bg text-xs font-bold text-success-text">US</span>
        <div>
          <p class="text-sm font-bold text-brand-dark">Usuário</p>
          <p class="mt-0.5 text-xs text-sage-muted">Administrador</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { BarChart3, Database, House } from 'lucide-vue-next'
import comissionaiIcon from '@/assets/images/comissionai-icon.png'

const route = useRoute()

const navigation = [
  { label: 'Home', to: '/home', section: 'home', icon: House },
  { label: 'Dados', to: '/dados', section: 'dados', icon: Database },
  { label: 'Campanhas', to: '/campanhas', section: 'campanhas', icon: BarChart3 }
]
</script>
