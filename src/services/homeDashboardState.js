import { ref } from 'vue'
import { dashboardError, homeDashboardService } from './homeDashboard'

export function createHomeDashboardState(service = homeDashboardService) {
  const indicators = ref(null), campaigns = ref([])
  const indicatorsLoading = ref(true), campaignsLoading = ref(true)
  const indicatorsError = ref(''), campaignsError = ref('')
  const requests = new Map()
  let disposed = false

  async function load(key, value, loading, error, empty, subject) {
    if (disposed) return
    requests.get(key)?.abort()
    const controller = new AbortController()
    requests.set(key, controller)
    value.value = empty; error.value = ''; loading.value = true
    try {
      const result = await service[key]({ signal: controller.signal })
      if (!disposed && !controller.signal.aborted && requests.get(key) === controller) value.value = result
    } catch (failure) {
      if (!disposed && !controller.signal.aborted && requests.get(key) === controller) error.value = dashboardError(failure, subject)
    } finally {
      if (!disposed && requests.get(key) === controller) {
        loading.value = false
        requests.delete(key)
      }
    }
  }
  const loadIndicators = () => load('indicators', indicators, indicatorsLoading, indicatorsError, null, 'os indicadores')
  const loadCampaigns = () => load('campaigns', campaigns, campaignsLoading, campaignsError, [], 'as campanhas recentes')
  function reset() {
    for (const controller of requests.values()) controller.abort()
    requests.clear()
    indicators.value = null; campaigns.value = []
    indicatorsError.value = ''; campaignsError.value = ''
    indicatorsLoading.value = false; campaignsLoading.value = false
  }
  function dispose() {
    disposed = true
    reset()
  }
  return { indicators, campaigns, indicatorsLoading, campaignsLoading, indicatorsError, campaignsError,
    loadIndicators, loadCampaigns, refresh: () => Promise.all([loadIndicators(), loadCampaigns()]), reset, dispose }
}
