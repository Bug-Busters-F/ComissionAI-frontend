<template>
  <main class="grid min-h-dvh bg-sage lg:grid-cols-[1fr_1fr]">
    <section class="relative hidden overflow-hidden bg-brand-dark p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16" aria-label="ComissionAI">
      <div class="relative z-10 flex items-center gap-3"><img :src="logo" alt="" class="h-10 w-10" /><span class="text-2xl font-extrabold tracking-tight">ComissionAI</span></div>
      <div class="relative z-10 max-w-lg py-16">
        <p class="mb-6 text-xs font-bold uppercase tracking-[.2em] text-brand">Clareza em cada decisão</p>
        <h1 class="text-5xl font-extrabold leading-[1.12] tracking-[-.045em] xl:text-6xl">Suas campanhas.<br />Seus resultados.<br /><span class="text-brand">Tudo conectado.</span></h1>
        <p class="mt-7 max-w-sm text-base leading-7 text-white/70">Das primeiras regras à conferência das comissões, acompanhe cada etapa em um só lugar.</p>
        <div class="mt-10 flex items-center gap-3 text-sm text-white/80"><span class="grid h-9 w-9 place-items-center rounded-full bg-brand text-brand-dark"><Check :size="18" /></span>Mais visibilidade para sua equipe.</div>
      </div>
      <p class="relative z-10 text-xs text-white/50">Gestão de campanhas e comissões</p>
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-60 -right-52 h-[560px] w-[560px] rounded-full border-[70px] border-[#9fe870]/10"></div>
    </section>
    <section class="relative flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
      <div class="absolute right-6 top-5 sm:right-12"><ThemeSelector /></div>
      <div class="mx-auto w-full max-w-md">
        <div class="mb-12 flex items-center gap-3 lg:hidden"><img :src="logo" alt="" class="h-10 w-10" /><span class="text-xl font-extrabold">ComissionAI</span></div>
        <h2 class="mt-6 text-4xl font-extrabold tracking-[-.04em]">Bem-vindo de volta</h2>
        <p class="mt-3 text-sm leading-6 text-sage-muted">Entre com sua conta para acessar o ComissionAI.</p>
        <p v-if="notice" role="status" class="mt-6 rounded-xl border border-warning-border bg-warning-bg p-4 text-sm text-warning-text">{{ notice }}</p>
        <form class="login-form mt-8 space-y-5" @submit.prevent="submit">
          <div><label for="login-email" class="mb-2 block text-sm font-semibold">E-mail <span aria-hidden="true" class="text-danger">*</span></label><input id="login-email" v-model="email" type="email" autocomplete="username" required autofocus placeholder="seu.nome@empresa.com" class="focus-ring h-12 w-full rounded-xl border border-sage-border-dark bg-white px-4 text-sm" /></div>
          <PasswordField id="login-password" v-model="password" label="Senha" />
          <p v-if="error" role="alert" class="rounded-xl border border-danger/20 bg-danger-bg p-4 text-sm text-danger-dark">{{ error }}</p>
          <button type="submit" :disabled="busy" class="focus-ring flex h-12 w-full items-center justify-center gap-3 rounded-full bg-brand text-sm font-bold transition hover:bg-brand-hover disabled:opacity-50">{{ busy ? 'Entrando…' : 'Entrar' }}<ArrowRight v-if="!busy" :size="18" /></button>
        </form>
        <p class="mt-6 text-center text-sm text-sage-muted">Precisa de acesso? Fale com o administrador.</p>


      </div>
    </section>
  </main>
</template>
<script setup>
import { beginLoginWelcome } from '@/services/loginWelcome'
import ThemeSelector from '@/components/common/ThemeSelector.vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, Check } from 'lucide-vue-next'
import logo from '@/assets/images/comissionai-icon.png'
import PasswordField from '@/components/accounts/PasswordField.vue'
import { useAccountStore } from '@/stores/accountStore'
const route = useRoute(), router = useRouter(), accounts = useAccountStore()
const email = ref(''), password = ref(''), busy = ref(false), error = ref('')
const notice = computed(() => ({ expired: 'Sua sessão expirou. Entre novamente para continuar.', disabled: 'Seu acesso foi desativado. Entre em contato com o administrador.', logout: 'Você saiu da sua conta.', 'password-changed': 'Senha alterada. Entre novamente com sua nova senha.', connection: 'Não foi possível confirmar sua sessão. Verifique sua conexão e tente novamente.' })[route.query.motivo] || '')
async function submit() {
  if (busy.value) return
  busy.value = true; error.value = ''
  let welcome
  try {
    await accounts.login(email.value, password.value)
    password.value = ''
    welcome = beginLoginWelcome(accounts.user?.name, { reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true })
    const next = typeof route.query.retorno === 'string' && route.query.retorno.startsWith('/') && !route.query.retorno.startsWith('//') && !route.query.retorno.startsWith('/login') ? route.query.retorno : '/home'
    await router.replace(next)
    await welcome.finish()
  } catch (e) { error.value = e.message }
  finally { welcome?.cancel(); busy.value = false }
}
</script>

<style scoped>
/* One border provides focus without a second outer outline. */
.login-form :deep(input:focus) {
  outline: none;
  box-shadow: none;
  border-color: var(--color-brand-ring);
}
</style>
