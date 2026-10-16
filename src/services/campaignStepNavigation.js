import { nextTick } from 'vue'

export async function focusCampaignStepStart() {
  await nextTick()
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  // Keep keyboard focus in the new content without letting it scroll past the header.
  document.querySelector('[data-campaign-main]')?.focus({ preventScroll: true })
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
}
