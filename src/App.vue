<template>
  <div :inert="loginWelcome.visible || undefined"><AppShell /></div>
  <LoginWelcomeSplash />
</template>

<script setup>
import AppShell from '@/components/layout/AppShell.vue'
import LoginWelcomeSplash from '@/components/accounts/LoginWelcomeSplash.vue'
import { loginWelcome } from '@/services/loginWelcome'
</script>
