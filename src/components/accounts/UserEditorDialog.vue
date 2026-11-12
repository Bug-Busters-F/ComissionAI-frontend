<template>
  <Teleport to="body">
    <dialog ref="dialog" class="w-[calc(100%-2rem)] max-w-lg overflow-visible rounded-[24px] bg-white p-0 text-brand-dark shadow-2xl" aria-labelledby="user-editor-title" @cancel.prevent="!busy && $emit('cancel')">
      <form class="flex max-h-[90dvh] flex-col" @submit.prevent="submit">
        <header class="flex shrink-0 items-start justify-between gap-4 border-b border-sage-border-light p-6"><div><p class="text-xs font-semibold uppercase tracking-widest text-sage-muted">Gerenciamento</p><h2 id="user-editor-title" class="mt-2 text-2xl font-extrabold">{{ user ? 'Editar usuário' : 'Novo usuário' }}</h2></div><button type="button" aria-label="Fechar formulário" :disabled="busy" class="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-sage-light" @click="$emit('cancel')"><X :size="19" /></button></header>
        <div class="min-h-0 space-y-5 overflow-y-auto p-6">
          <p class="text-sm leading-6 text-sage-muted">{{ user ? 'Atualize os dados e as permissões deste usuário.' : 'Preencha os dados e selecione o perfil de acesso.' }}</p>
          <div><label for="user-name" class="mb-2 block text-sm font-semibold">Nome completo <span aria-hidden="true" class="text-danger">*</span></label><input id="user-name" v-model="form.name" required maxlength="120" autocomplete="off" :aria-invalid="Boolean(fields.name)" :aria-describedby="fields.name ? 'user-name-error' : undefined" class="focus-ring h-12 w-full rounded-xl border border-sage-border-dark bg-white px-4 text-sm" /><p v-if="fields.name" id="user-name-error" class="mt-2 text-sm text-danger-dark">{{ fields.name }}</p></div>
          <div><label for="user-email" class="mb-2 block text-sm font-semibold">E-mail <span aria-hidden="true" class="text-danger">*</span></label><input id="user-email" v-model="form.email" type="email" required autocomplete="off" :aria-invalid="Boolean(fields.email)" :aria-describedby="fields.email ? 'user-email-error' : undefined" class="focus-ring h-12 w-full rounded-xl border border-sage-border-dark bg-white px-4 text-sm" /><p v-if="fields.email" id="user-email-error" class="mt-2 text-sm text-danger-dark">{{ fields.email }}</p></div>
          <div><label for="user-role" class="mb-2 block text-sm font-semibold">Perfil de acesso <span aria-hidden="true" class="text-danger">*</span></label><select id="user-role" v-model="form.role" required :disabled="self" :aria-invalid="Boolean(fields.role)" :aria-describedby="fields.role ? 'user-role-error' : 'user-role-help'" class="focus-ring h-12 w-full rounded-xl border border-sage-border-dark bg-white px-4 text-sm disabled:bg-sage-light"><option value="" disabled>Selecione um perfil</option><option v-for="role in roles" :key="role.value" :value="role.value">{{ role.label }}</option></select><p id="user-role-help" class="mt-2 text-xs leading-5 text-sage-muted">{{ self ? 'Seu próprio perfil de acesso não pode ser alterado por esta tela.' : selectedRole?.description }}</p><p v-if="fields.role" id="user-role-error" class="mt-2 text-sm text-danger-dark">{{ fields.role }}</p></div>
          <PasswordField v-if="open && !user" id="user-initial-password" v-model="form.password" label="Senha inicial" autocomplete="new-password" :error="fields.password" />
          <p v-if="!user" class="text-xs leading-5 text-sage-muted">Defina uma senha inicial com pelo menos 8 caracteres. Nenhum convite será enviado automaticamente.</p>
          <p v-if="error" role="alert" class="rounded-xl bg-danger-bg p-3 text-sm text-danger-dark">{{ error }}</p>
        </div>
        <footer class="flex shrink-0 flex-wrap justify-end gap-3 border-t border-sage-border-light p-6"><button type="button" :disabled="busy" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-semibold hover:bg-sage-light" @click="$emit('cancel')">Cancelar</button><button type="submit" :disabled="busy" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold hover:bg-brand-hover disabled:opacity-50">{{ busy ? 'Salvando…' : user ? 'Salvar alterações' : 'Adicionar usuário' }}</button></footer>
      </form>
    </dialog>
  </Teleport>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import PasswordField from './PasswordField.vue'
const props = defineProps({ open: Boolean, user: Object, roles: { type: Array, default: () => [] }, self: Boolean, busy: Boolean, fields: { type: Object, default: () => ({}) }, error: String })
const emit = defineEmits(['cancel', 'save'])
const dialog = ref(null), form = reactive({ name: '', email: '', role: '', password: '' })
const selectedRole = computed(() => props.roles.find(role => role.value === form.role))
let returnFocus
watch(() => props.open, async open => {
  await nextTick()
  if (open) {
    Object.assign(form, { name: props.user?.name || '', email: props.user?.email || '', role: props.user?.role || '', password: '' })
    returnFocus = document.activeElement
    dialog.value.showModal()
    dialog.value.querySelector('input')?.focus()
  } else if (dialog.value?.open) { form.password = ''; dialog.value.close(); if (returnFocus?.isConnected) returnFocus.focus() }
}, { immediate: true })
function submit() { if (!props.busy) emit('save', { ...form }) }
onBeforeUnmount(() => dialog.value?.close())
</script>
<style scoped>dialog::backdrop { background: rgb(0 0 0 / .5); backdrop-filter: blur(3px); }</style>
