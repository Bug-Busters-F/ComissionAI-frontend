<template>
  <header class="border-b border-sage-border bg-sage px-5 py-4 sm:px-8 lg:px-[42px]">
    <div class="flex min-h-11 items-center justify-between gap-4">
      <p class="text-xs font-medium text-sage-muted">Workspace / {{ currentLabel }}</p>

      <!-- WIDGET DE PROCESSAMENTO EM SEGUNDO PLANO -->
      <div v-if="store.activeJob.isActive" class="flex items-center gap-2">
        <!-- Em processamento -->
        <button
          v-if="store.activeJob.status === 'PROCESSING'"
          type="button"
          @click="store.reabrirModalComStatus()"
          class="focus-ring flex items-center gap-2 rounded-full border border-warning-border bg-warning-bg px-3.5 py-1.5 text-xs font-bold text-brand-dark shadow-sm transition hover:bg-warning-bg/80"
          title="Clique para ver o andamento detalhado"
        >
          <RefreshCw class="h-3.5 w-3.5 animate-spin text-warning-dark" />
          <span>
            {{ store.activeJob.modo === 'CICLO' ? `Ciclo ${store.activeJob.competencia}` : 'Comissões' }}:
            {{ store.activeJob.progress }}%
          </span>
          <span class="hidden sm:inline text-[11px] font-normal text-sage-muted truncate max-w-[160px]">
            • {{ store.activeJob.stage }}
          </span>
        </button>

        <!-- Sucesso -->
        <div
          v-else-if="store.activeJob.status === 'SUCCESS'"
          class="flex items-center gap-2 rounded-full border border-success/30 bg-success-bg px-3.5 py-1.5 text-xs font-bold text-success shadow-sm"
        >
          <CheckCircle2 class="h-4 w-4 shrink-0 text-success" />
          <button
            type="button"
            @click="store.reabrirModalComStatus()"
            class="hover:underline text-brand-dark"
          >
            {{ store.activeJob.modo === 'CICLO' ? `Ciclo ${store.activeJob.competencia}` : 'Taxas' }} Fechado ✓
          </button>
          <button
            type="button"
            @click="store.limparJobConcluido()"
            class="ml-1 text-sage-muted hover:text-brand-dark"
            title="Dispensar aviso"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- Erro -->
        <div
          v-else-if="store.activeJob.status === 'ERROR'"
          class="flex items-center gap-2 rounded-full border border-danger/30 bg-danger-bg px-3.5 py-1.5 text-xs font-bold text-danger shadow-sm"
        >
          <AlertOctagon class="h-4 w-4 shrink-0 text-danger" />
          <button
            type="button"
            @click="store.reabrirModalComStatus()"
            class="hover:underline text-brand-dark"
          >
            Falha no envio • Ver detalhes
          </button>
          <button
            type="button"
            @click="store.limparJobConcluido()"
            class="ml-1 text-sage-muted hover:text-brand-dark"
            title="Dispensar aviso"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <nav class="mt-4 flex gap-2 overflow-x-auto md:hidden" aria-label="Navegação móvel">
      <RouterLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        :class="[
          'focus-ring whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold',
          route.meta.section === item.section ? 'bg-brand text-brand-dark' : 'bg-white text-sage-muted'
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
import { RefreshCw, CheckCircle2, AlertOctagon, X } from 'lucide-vue-next'
import { useDataStore } from '@/stores/dataStore'

const route = useRoute()
const store = useDataStore()

const navigation = [
  { label: 'Home', to: '/home', section: 'home' },
  { label: 'Dados', to: '/dados', section: 'dados' },
  { label: 'Campanhas', to: '/campanhas', section: 'campanhas' }
]

const currentLabel = computed(() => route.meta.label || 'Home')
</script>
