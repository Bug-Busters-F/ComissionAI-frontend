<template>
  <div class="space-y-6">
    <PageHeader title="Auditoria" description="Consulte as atividades do sistema e o histórico permanente de cargas." />
    <p class="rounded-xl bg-white px-5 py-4 text-sm text-sage-muted">{{ scopeMessage }}</p>
    <nav class="flex flex-wrap gap-2 border-b border-sage-border pb-4" aria-label="Consultas de auditoria">
      <RouterLink v-for="tab in tabs" :key="tab.key" :to="{ name: 'auditoria', query: { aba: tab.key } }" class="focus-ring rounded-xl px-4 py-3 text-sm font-bold transition" :class="activeTab === tab.key ? 'bg-brand text-brand-dark' : 'bg-white text-sage-muted hover:bg-sage-light'" :aria-current="activeTab === tab.key ? 'page' : undefined">{{ tab.label }}</RouterLink>
    </nav>
    <template v-if="access.can('viewAudit')"><ImportHistoryPanel v-if="activeTab === 'cargas'" /><AuditEventList v-else /></template>
    <p v-else class="rounded-xl bg-danger-bg p-5 text-sm text-danger-dark" role="alert">Seu perfil não permite consultar a auditoria.</p>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import AuditEventList from '@/components/audit/AuditEventList.vue'
import ImportHistoryPanel from '@/components/audit/ImportHistoryPanel.vue'
import { useAccessPolicy } from '@/services/useAccessPolicy'
const route = useRoute(), access = useAccessPolicy()
const tabs = [{ key: 'atividades', label: 'Atividades' }, { key: 'cargas', label: 'Cargas e validações' }]
const activeTab = computed(() => route.query.aba === 'cargas' ? 'cargas' : 'atividades')
const scopeMessage = computed(() => ({
  ADMINISTRADOR: 'Você pode consultar todas as atividades. Os registros históricos são somente para leitura.',
  GERENTE_VENDAS: 'Nas atividades, você consulta ações dos analistas de negócios e de código. O histórico de cargas está disponível para conferência.',
  AUDITOR: 'Nas atividades, você consulta ações dos analistas e do gerente. O histórico de cargas está disponível somente para leitura.'
}[access.role.value] || 'A consulta respeita as permissões da sua conta.'))
</script>
