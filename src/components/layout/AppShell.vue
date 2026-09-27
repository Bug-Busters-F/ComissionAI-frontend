<template>
  <div class="min-h-screen bg-sage text-brand-dark md:flex">
    <SidebarNav />
    <div class="min-w-0 flex-1 md:pl-60">
      <Topbar />
      <main class="mx-auto w-full max-w-[1500px] px-5 py-7 sm:px-8 lg:px-[42px] lg:py-9">
        <RouterView />
      </main>
    </div>

    <!-- Modal Global de Upload e Diagnóstico -->
    <UploadBaseModal />

    <!-- Notificações Flutuantes (Toasts) -->
    <ToastContainer />
  </div>
</template>

<script setup>
import SidebarNav from './SidebarNav.vue'
import Topbar from './Topbar.vue'
import UploadBaseModal from '@/components/data/UploadBaseModal.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
</script>
