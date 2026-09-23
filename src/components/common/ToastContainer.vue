<template>
  <div
    class="pointer-events-none fixed bottom-5 right-5 z-[9999] flex max-w-md flex-col gap-2.5 p-2 sm:bottom-6 sm:right-6"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-4 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-for="item in notificationStore.notifications"
        :key="item.id"
        class="pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition"
        :class="getStyleClasses(item.type)"
        role="alert"
      >
        <!-- Ícone do tipo -->
        <div class="shrink-0 mt-0.5">
          <CheckCircle2 v-if="item.type === 'success'" class="h-5 w-5 text-success" />
          <AlertOctagon v-else-if="item.type === 'danger'" class="h-5 w-5 text-danger" />
          <AlertTriangle v-else-if="item.type === 'warning'" class="h-5 w-5 text-warning" />
          <Info v-else class="h-5 w-5 text-brand-dark" />
        </div>

        <!-- Conteúdo -->
        <div class="min-w-0 flex-1">
          <h4 class="text-xs font-bold uppercase tracking-wider text-brand-dark">
            {{ item.title }}
          </h4>
          <p class="mt-1 text-xs text-brand-dark/85 leading-relaxed">
            {{ item.message }}
          </p>

          <div v-if="item.actionLabel && item.onAction" class="mt-2.5">
            <button
              type="button"
              @click="handleAction(item)"
              class="focus-ring rounded-lg bg-brand-dark px-3 py-1 text-[11px] font-bold text-white transition hover:bg-brand-dark-hover"
            >
              {{ item.actionLabel }}
            </button>
          </div>
        </div>

        <!-- Botão de Fechar -->
        <button
          type="button"
          @click="notificationStore.remove(item.id)"
          class="focus-ring -mr-1 -mt-1 rounded-lg p-1 text-sage-muted transition hover:bg-black/5 hover:text-brand-dark"
          aria-label="Fechar notificação"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from 'lucide-vue-next'
import { useNotificationStore } from '@/stores/notificationStore'

const notificationStore = useNotificationStore()

function getStyleClasses(type) {
  switch (type) {
    case 'success':
      return 'border-success/30 bg-success-bg/95 text-brand-dark'
    case 'danger':
      return 'border-danger/30 bg-danger-bg/95 text-brand-dark'
    case 'warning':
      return 'border-warning/30 bg-warning-bg/95 text-brand-dark'
    default:
      return 'border-sage-border bg-white/95 text-brand-dark'
  }
}

function handleAction(item) {
  if (item.onAction) {
    item.onAction()
  }
  notificationStore.remove(item.id)
}
</script>
