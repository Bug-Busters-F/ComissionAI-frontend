import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/accountStore'
import { useAccessPolicy } from './useAccessPolicy'
import { auditFilterDefaults, readAuditQuery, writeAuditQuery } from './auditFilters'
import { createAuditResource } from './auditResource'
import { auditService } from './auditService'

export function useAuditSessionResource(loader, source, permission = 'viewAudit', detail = false) {
  const account = useAccountStore(), access = useAccessPolicy()
  const resource = createAuditResource(loader, detail)
  const identity = computed(() => [account.user?.id, account.user?.role, ...(account.user?.permissions || [])].join('|'))
  watch([identity, () => JSON.stringify(source())], () => {
    resource.clear()
    const params = source()
    if (account.user && access.can(permission) && params !== null) resource.load(params)
  }, { immediate: true })
  onUnmounted(resource.dispose)
  return resource
}

export function useAuditListing(kind, prefix) {
  const route = useRoute(), router = useRouter()
  const applied = computed(() => readAuditQuery(kind, route.query, prefix))
  const filters = ref(auditFilterDefaults(kind)), formError = ref('')
  watch(() => applied.value.filters, value => { filters.value = { ...value }; formError.value = '' }, { immediate: true })
  const resource = useAuditSessionResource(auditService[kind], () => applied.value.params, kind === 'events' ? 'viewAudit' : 'viewData')
  const selected = computed(() => {
    const value = route.query[prefix + 'detalhe']
    return typeof value === 'string' ? value : ''
  })
  const error = computed(() => formError.value || applied.value.error)
  async function navigate(nextFilters, page = 0, size = applied.value.params?.size || 20, detail = null) {
    try {
      const query = writeAuditQuery(kind, route.query, prefix, nextFilters, page, size, detail)
      formError.value = ''
      if (JSON.stringify(query) === JSON.stringify(route.query)) return resource.load(applied.value.params)
      await router.push({ query })
    } catch (failure) { formError.value = failure.message }
  }
  return { ...resource, filters, applied, selected, error,
    apply: () => navigate(filters.value),
    reset: () => navigate(auditFilterDefaults(kind), 0, 20),
    page: page => navigate(applied.value.filters, page),
    size: size => navigate(applied.value.filters, 0, Number(size)),
    select: async id => {
      const previous = selected.value
      await navigate(applied.value.filters, applied.value.params?.page || 0, undefined, id)
      if (!id && previous) { await nextTick(); globalThis.document?.getElementById(`${prefix}entry-${previous}`)?.focus() }
    },
    reload: () => { if (applied.value.params) resource.load(applied.value.params) }
  }
}
