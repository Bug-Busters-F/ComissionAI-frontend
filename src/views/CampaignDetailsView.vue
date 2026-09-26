<template>
  <div class="space-y-7">
    <PageHeader :title="campaign?.titulo || 'Detalhes da campanha'" description="Consulte os valores persistidos da campanha e da regra vinculada.">
      <template #action>
        <div class="flex flex-wrap gap-3">
          <RouterLink to="/campanhas" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-white">Voltar</RouterLink>
          <RouterLink v-if="campaign" :to="`/campanhas/${campaign.id}/editar`" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover">Editar</RouterLink>
        </div>
      </template>
    </PageHeader>

    <div v-if="isLoading" class="rounded-2xl bg-white px-5 py-10 text-center text-sm text-sage-muted" role="status">Carregando detalhes…</div>

    <section v-else-if="loadError" class="rounded-2xl border border-danger/30 bg-danger-bg p-6 sm:p-7" role="alert">
      <h2 class="text-xl font-extrabold text-danger-dark">Campanha não encontrada</h2>
      <p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ loadError }}</p>
      <RouterLink to="/campanhas" class="focus-ring mt-5 inline-flex rounded-full bg-danger px-5 py-3 text-sm font-bold text-white">Voltar para campanhas</RouterLink>
    </section>

    <template v-else-if="campaign">
      <section class="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <article class="rounded-2xl bg-white p-6 sm:p-7">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">Estado da campanha</p>
              <div class="mt-3"><StatusBadge :label="formatCampaignState(campaign.estado)" :tone="campaignStateTone(campaign.estado)" /></div>
            </div>
            <button ref="deleteButton" type="button" class="focus-ring rounded-full border border-danger/30 px-4 py-2 text-sm font-bold text-danger-dark transition hover:bg-danger-bg" @click="isDeleteOpen = true">Remover campanha</button>
          </div>

          <div class="mt-8">
            <h2 class="text-lg font-extrabold text-brand-dark">Texto original</h2>
            <p class="mt-3 whitespace-pre-wrap rounded-xl bg-sage-light p-4 text-sm leading-7 text-sage-subtle">{{ campaign.textoOriginal || 'Não informado' }}</p>
          </div>
        </article>

        <article class="rounded-2xl bg-brand-dark p-6 text-white sm:p-7">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-border">Vigência</p>
          <p class="mt-4 text-2xl font-extrabold tracking-[-0.03em] text-brand">{{ formatPeriod(campaign.dataInicio, campaign.dataFim) }}</p>
          <dl class="mt-7 space-y-4 text-sm">
            <div><dt class="text-sage-border">Criada em</dt><dd class="mt-1 font-semibold">{{ formatDateTime(campaign.criadoEm) }}</dd></div>
            <div><dt class="text-sage-border">Atualizada em</dt><dd class="mt-1 font-semibold">{{ formatDateTime(campaign.atualizadoEm) }}</dd></div>
          </dl>
        </article>
      </section>

      <section class="rounded-2xl bg-white p-6 sm:p-7" aria-labelledby="campaign-rule-details-heading">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="campaign-rule-details-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Parâmetros da regra</h2>
            <p class="mt-1 text-sm text-sage-muted">Campos ausentes são exibidos como não informados.</p>
          </div>
          <StatusBadge v-if="campaign.regra" :label="formatRuleStatus(campaign.regra.status)" :tone="ruleStatusTone(campaign.regra.status)" />
        </div>

        <dl class="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Canal" :value="campaign.regra?.canal" />
          <DetailItem label="Taxa" :value="formatRate(campaign.regra?.taxa)" />
          <DetailItem label="Código da marca" :value="campaign.regra?.codMarca" />
          <DetailItem label="Descrição da marca" :value="campaign.regra?.descrMarca" />
          <DetailItem label="Código da loja" :value="campaign.regra?.codLoja" />
          <DetailItem label="Código do cargo" :value="campaign.regra?.codCargo" />
          <DetailItem label="Descrição do cargo" :value="campaign.regra?.descriCargo" />
          <DetailItem label="Matrícula" :value="campaign.regra?.matricula" />
          <DetailItem label="Início da regra" :value="formatDate(campaign.regra?.dataInicio)" />
          <DetailItem label="Fim da regra" :value="formatDate(campaign.regra?.dataFim)" />
        </dl>
      </section>
    </template>

    <CampaignDeleteDialog :open="isDeleteOpen" :campaign-title="campaign?.titulo" :is-removing="isRemoving" :error-message="deleteError" @cancel="closeDeleteDialog" @confirm="removeCampaign" />
  </div>
</template>

<script setup>
import { defineComponent, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampaignDeleteDialog from '@/components/common/CampaignDeleteDialog.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { campaignService, normalizeCampaignError } from '@/services/campaignService'
import { campaignStateTone, formatCampaignState, formatDate, formatPeriod } from '@/services/campaignMappers'

const DetailItem = defineComponent({
  props: { label: String, value: [String, Number] },
  setup(props) {
    return () => h('div', [
      h('dt', { class: 'text-xs font-bold uppercase tracking-[0.08em] text-sage-muted' }, props.label),
      h('dd', { class: 'mt-1 break-words text-sm font-semibold text-brand-dark' }, props.value ?? 'Não informado')
    ])
  }
})

const route = useRoute()
const router = useRouter()
const notifications = useNotificationStore()
const campaign = ref(null)
const isLoading = ref(true)
const loadError = ref('')
const isDeleteOpen = ref(false)
const isRemoving = ref(false)
const deleteError = ref('')

onMounted(loadCampaign)

async function loadCampaign() {
  try {
    campaign.value = await campaignService.get(route.params.id)
  } catch (error) {
    loadError.value = normalizeCampaignError(error).message
  } finally {
    isLoading.value = false
  }
}

function closeDeleteDialog() {
  if (!isRemoving.value) {
    isDeleteOpen.value = false
    deleteError.value = ''
  }
}

async function removeCampaign() {
  if (isRemoving.value || !campaign.value) {
    return
  }

  isRemoving.value = true
  deleteError.value = ''
  try {
    await campaignService.remove(campaign.value.id)
    notifications.success('Campanha removida', 'A campanha não aparecerá mais nas consultas.')
    await router.push('/campanhas')
  } catch (error) {
    deleteError.value = normalizeCampaignError(error).message
  } finally {
    isRemoving.value = false
  }
}

function formatDateTime(value) {
  if (!value) {
    return 'Não informado'
  }

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatRate(value) {
  if (value === null || value === undefined || value === '') {
    return 'Não informado'
  }

  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(Number(value) * 100)}%`
}

function formatRuleStatus(status) {
  const labels = { DRAFT: 'Rascunho', ATIVA: 'Ativa', INATIVA: 'Inativa' }
  return labels[status] || status || 'Não informado'
}

function ruleStatusTone(status) {
  return status === 'ATIVA' ? 'success' : status === 'INATIVA' ? 'danger' : 'warning'
}
</script>
