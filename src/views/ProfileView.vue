<template>
  <div class="space-y-7">
    <header><p class="text-xs font-bold uppercase tracking-[.16em] text-sage-muted">Sua conta</p><h1 class="mt-2 text-4xl font-extrabold tracking-[-.045em]">Meu perfil</h1><p class="mt-3 text-sm text-sage-muted">Confira seus dados e cuide do seu acesso.</p></header>
    <div class="grid items-start gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <section class="rounded-[24px] bg-white p-6 sm:p-8" aria-labelledby="profile-data">
        <div class="flex items-center gap-4"><div class="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-success-bg text-xl font-extrabold text-success-dark">{{ initials(account.user?.name) }}</div><div class="min-w-0"><h2 id="profile-data" class="break-words text-xl font-extrabold">{{ account.user?.name }}</h2><p class="mt-1 text-sm text-sage-muted">{{ roleLabel(account.user?.role) }}</p></div></div>
        <dl class="mt-8 space-y-6 text-sm"><div><dt class="text-sage-muted">Nome completo</dt><dd class="mt-1 break-words font-semibold">{{ account.user?.name }}</dd></div><div><dt class="text-sage-muted">E-mail</dt><dd class="mt-1 break-all font-semibold">{{ account.user?.email }}</dd></div><div><dt class="text-sage-muted">Perfil de acesso</dt><dd class="mt-2 inline-flex rounded-full bg-sage-light px-3 py-1 font-semibold">{{ roleLabel(account.user?.role) }}</dd></div><div><dt class="text-sage-muted">Situação</dt><dd class="mt-2 inline-flex items-center gap-2 font-semibold text-success-dark"><span class="h-2 w-2 rounded-full bg-success"></span>Ativo</dd></div></dl>
        <p class="mt-8 border-t border-sage-border-light pt-5 text-sm leading-6 text-sage-muted">Para alterar seus dados ou perfil de acesso, fale com o administrador.</p>
      </section>
      <section class="rounded-[24px] bg-white p-6 sm:p-8" aria-labelledby="password-heading">
        <div class="flex items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-sage-light"><LockKeyhole :size="19" /></span><h2 id="password-heading" class="text-xl font-extrabold">Alterar senha</h2></div>
        <p class="mt-3 text-sm leading-6 text-sage-muted">Escolha uma senha diferente da atual, com pelo menos 8 caracteres.</p>
        <form class="mt-6 space-y-5" @submit.prevent="submit">
          <PasswordField id="password-current" v-model="form.current" label="Senha atual" :error="errors.current" />
          <PasswordField id="password-next" v-model="form.next" label="Nova senha" autocomplete="new-password" :error="errors.next" />
          <PasswordField id="password-confirm" v-model="form.confirmation" label="Confirmar nova senha" autocomplete="new-password" :error="errors.confirmation" />
          <p v-if="error" role="alert" class="rounded-xl bg-danger-bg p-4 text-sm text-danger-dark">{{ error }}</p>
          <p v-if="message" role="status" class="rounded-xl bg-success-bg p-4 text-sm text-success-dark">{{ message }}</p>
          <div class="flex flex-wrap justify-end gap-3 border-t border-sage-border-light pt-5"><button type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-semibold hover:bg-sage-light" @click="reset">Limpar</button><button type="submit" :disabled="busy" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold hover:bg-brand-hover disabled:opacity-50">{{ busy ? 'Alterando…' : 'Alterar senha' }}</button></div>
        </form>
      </section>
    </div>
  </div>
</template>
<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LockKeyhole } from 'lucide-vue-next'
import PasswordField from '@/components/accounts/PasswordField.vue'
import { useAccountStore } from '@/stores/accountStore'
import { initials, roleLabel, validatePassword } from '@/services/accountModel'
const account = useAccountStore(), router = useRouter()
const form = reactive({ current: '', next: '', confirmation: '' }), errors = ref({}), error = ref(''), message = ref(''), busy = ref(false)
function reset() { Object.assign(form, { current: '', next: '', confirmation: '' }); errors.value = {}; error.value = ''; message.value = '' }
async function submit() {
  errors.value = validatePassword(form); error.value = ''; message.value = ''
  if (Object.keys(errors.value).length || busy.value) return
  busy.value = true
  try {
    await account.changePassword(form); reset()
    window.location.replace(router.resolve({ name: 'login', query: { motivo: 'password-changed' } }).href)
  } catch (e) { error.value = e.message; errors.value = e.fields || {} }
  finally { busy.value = false }
}
</script>
