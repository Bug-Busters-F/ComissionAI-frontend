<template>
  <div v-if="route.meta.public" class="min-h-screen bg-sage text-brand-dark"><RouterView /></div>
  <div v-else-if="account.user" class="min-h-screen bg-sage text-brand-dark md:flex">
    <SidebarNav />
    <div class="min-w-0 flex-1 md:pl-60">
      <Topbar />
      <main class="mx-auto w-full max-w-[1500px] px-5 py-7 sm:px-8 lg:px-[42px] lg:py-9">
        <RouterView />
      </main>
    </div>

    <!-- Modal Global de Upload e Diagnóstico -->
    <UploadBaseModal v-if="access.can('manageData')" />

    <!-- Notificações Flutuantes (Toasts) -->
    <ToastContainer />
  </div>
  <main v-else class="grid min-h-screen place-items-center bg-sage p-6 text-brand-dark"><div class="text-center"><p>Não foi possível confirmar seu acesso.</p><RouterLink to="/login" class="focus-ring mt-4 inline-block rounded-full bg-brand px-5 py-3 font-bold">Entrar novamente</RouterLink></div></main>
</template>

<script setup>
import { useAccountStore } from '@/stores/accountStore'
const account = useAccountStore()
import { useAccessPolicy } from '@/services/useAccessPolicy'
const access = useAccessPolicy()
import { useRoute } from 'vue-router'
const route = useRoute()
import SidebarNav from './SidebarNav.vue'
import Topbar from './Topbar.vue'
import UploadBaseModal from '@/components/data/UploadBaseModal.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
</script>
