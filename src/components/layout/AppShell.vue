<template>
  <div class="min-h-screen bg-[#e8ebe6] text-[#0e0f0c] md:flex">
    <SidebarNav />
    <div class="min-w-0 flex-1 md:pl-60">
      <Topbar />
      <main class="mx-auto w-full max-w-[1500px] px-5 py-7 sm:px-8 lg:px-[42px] lg:py-9">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import SidebarNav from './SidebarNav.vue'
import Topbar from './Topbar.vue'
</script>
