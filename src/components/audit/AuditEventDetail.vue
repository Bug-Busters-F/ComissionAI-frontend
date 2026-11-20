<template>
  <section ref="panel" class="rounded-2xl border border-sage-border bg-white p-5 sm:p-6" aria-labelledby="audit-event-heading" tabindex="-1">
    <div class="mb-5 flex items-start justify-between gap-4"><h2 id="audit-event-heading" class="text-xl font-extrabold">Detalhes da atividade</h2><button type="button" class="focus-ring rounded-full border border-sage-border px-4 py-2 text-xs font-semibold hover:bg-sage-light" @click="$emit('close')">Fechar detalhes</button></div>
    <AuditQueryStatus :state="state" loading-text="Consultando a atividade…" @retry="retry" />
    <template v-if="state.data && !state.loading && !state.error">
      <div class="flex flex-wrap items-center gap-3"><h3 class="text-lg font-bold">{{ label(ACTIONS, state.data.tipoAcao) }}</h3><StatusBadge :label="state.data.sucesso ? 'Sucesso' : 'Falha'" :tone="state.data.sucesso ? 'success' : 'danger'" /></div>
      <p class="mt-3 whitespace-pre-wrap break-words text-sm text-sage-muted">{{ text(state.data.descricao || 'Sem descrição adicional.') }}</p>
      <dl class="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <div><dt class="text-xs text-sage-muted">Data e hora</dt><dd class="mt-1 font-semibold">{{ date(state.data.dataHora) }}</dd></div>
        <div><dt class="text-xs text-sage-muted">Autor registrado</dt><dd class="mt-1 break-words font-semibold">{{ state.data.usuario || 'Não informado' }}</dd></div>
        <div><dt class="text-xs text-sage-muted">Perfil no momento da ação</dt><dd class="mt-1 font-semibold">{{ label(PROFILES, state.data.perfilUsuario) }}</dd></div>
        <div v-if="state.data.competencia"><dt class="text-xs text-sage-muted">Competência</dt><dd class="mt-1 font-semibold">{{ month(state.data.competencia) }}</dd></div>
        <div><dt class="text-xs text-sage-muted">Protocolo da atividade</dt><dd class="mt-1 break-all text-xs">{{ state.data.protocolo || 'Não informado' }}</dd></div>
      </dl>
      <p v-if="state.data.detalheErro" class="mt-5 rounded-xl bg-danger-bg p-4 text-sm text-danger-dark">{{ text(state.data.detalheErro) }}</p>
      <div v-if="campaign || file || calculation" class="mt-5 grid gap-4 md:grid-cols-3">
        <section v-if="campaign" class="rounded-xl bg-sage-light p-4 text-sm"><h3 class="font-bold">Campanha relacionada</h3><p class="mt-2 break-words">{{ campaign.titulo || `Campanha #${campaign.campanhaId}` }}</p><p v-if="campaign.versaoNumero != null" class="mt-1 text-xs text-sage-muted">Versão {{ campaign.versaoNumero }} registrada nesta atividade</p><RouterLink v-if="positiveId(campaign.campanhaId)" :to="{ name: 'campanha-detalhes', params: { id: campaign.campanhaId } }" class="focus-ring mt-3 inline-block text-xs font-semibold underline underline-offset-4">Consultar campanha →</RouterLink></section>
        <section v-if="file" class="rounded-xl bg-sage-light p-4 text-sm"><h3 class="font-bold">Carga relacionada</h3><p class="mt-2 break-words">{{ file.nomeArquivo || state.data.nomeArquivo || 'Arquivo registrado' }}</p><p v-if="file.excluido || file.status === 'EXCLUIDO'" class="mt-1 text-xs text-sage-muted">Carga excluída · histórico preservado</p><RouterLink v-if="positiveId(file.reportId)" :to="{ name: 'auditoria', query: { aba: 'cargas', c_detalhe: String(file.reportId) } }" class="focus-ring mt-3 inline-block text-xs font-semibold underline underline-offset-4">Consultar carga →</RouterLink></section>
        <section v-if="calculation" class="rounded-xl bg-sage-light p-4 text-sm"><h3 class="font-bold">Cálculo relacionado</h3><p class="mt-2">Competência {{ month(calculation.competencia || state.data.competencia) }}</p><p v-if="calculation.protocoloCalculo || state.data.protocoloCalculo" class="mt-2 break-all text-xs text-sage-muted">Protocolo: {{ calculation.protocoloCalculo || state.data.protocoloCalculo }}</p><RouterLink v-if="validMonth(calculation.competencia || state.data.competencia) && access.can('viewData')" :to="{ name: 'dados-calculo', params: { competencia: calculation.competencia || state.data.competencia } }" class="focus-ring mt-3 inline-block text-xs font-semibold underline underline-offset-4">Consultar competência →</RouterLink></section>
      </div>
      <details class="mt-5 rounded-xl border border-sage-border p-4"><summary class="focus-ring cursor-pointer text-sm font-bold">Dados registrados antes e depois</summary><div class="mt-4 grid gap-4 md:grid-cols-2"><AuditSnapshot title="Antes" :value="state.data.dadosAnteriores" /><AuditSnapshot title="Depois" :value="state.data.dadosNovos" /></div></details>
      <p class="mt-4 text-xs text-sage-muted">Registro histórico somente para consulta. O perfil exibido corresponde à data da ação.</p>
    </template>
  </section>
</template>
<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AuditQueryStatus from './AuditQueryStatus.vue'
import AuditSnapshot from './AuditSnapshot.vue'
import { auditService } from '@/services/auditService'
import { useAuditSessionResource } from '@/services/useAuditListing'
import { useAccessPolicy } from '@/services/useAccessPolicy'
import { userFacingText as text } from '@/services/userFacingText'
import { AUDIT_ACTIONS as ACTIONS, AUDIT_PROFILES as PROFILES, auditLabel as label, auditDate as date, auditMonth as month, positiveId } from '@/services/auditModel'
const props = defineProps({ id: { type: String, required: true } })
const panel = ref(null)
watch(() => props.id, async () => { await nextTick(); panel.value?.focus() }, { immediate: true })
defineEmits(['close'])
const access = useAccessPolicy()
const resource = useAuditSessionResource(auditService.event, () => ({ id: props.id }), 'viewAudit', true)
const { state } = resource
const retry = () => resource.load({ id: props.id })
const campaign = computed(() => state.data?.relacionamentos?.campanha || (state.data?.campanhaId ? { campanhaId: state.data.campanhaId } : null))
const file = computed(() => state.data?.relacionamentos?.arquivo || (state.data?.reportId ? { reportId: state.data.reportId } : null))
const calculation = computed(() => state.data?.relacionamentos?.calculo || (state.data?.protocoloCalculo ? { protocoloCalculo: state.data.protocoloCalculo } : null))
const validMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
</script>
