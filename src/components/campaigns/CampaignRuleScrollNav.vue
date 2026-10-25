<template>
  <nav v-if="proposals.length" ref="rail" class="rule-scroll-nav sticky py-2" :style="{ top: 'max(1rem, calc(50dvh - ' + Math.min(proposals.length * 24 + 16, 336) / 2 + 'px))', transform: 'translateX(' + horizontalShift + 'px)' }" aria-label="Navegar entre regras" @keydown.esc="hidePreview">
    <ol ref="list" class="rule-scroll-list flex flex-col items-center overflow-y-auto" @scroll="updatePreviewAfterListScroll">
      <li v-for="(proposal, index) in proposals" :key="proposal.clientId" class="flex shrink-0">
        <button type="button" class="rule-mark focus-ring grid h-6 w-8 shrink-0 place-items-center rounded text-sage-muted" :aria-label="'Ir para regra ' + (index + 1)" :aria-current="activeIndex === index ? 'location' : undefined" :aria-controls="cardId(proposal.clientId)" :aria-describedby="previewIndex === index ? previewId : undefined" @click="goToRule(index)" @mouseenter="showPreview(index, $event)" @mouseleave="leavePreview" @focus="showPreview(index, $event)" @blur="hidePreview" @keydown="navigateMarks(index, $event)">
          <Minus aria-hidden="true" class="rule-mark-line" :size="24" :stroke-width="2" :style="{ width: (12 + (weights[index] || 0) * 12) + 'px', opacity: 0.8 + (weights[index] || 0) * 0.2 }" />
        </button>
      </li>
    </ol>
  </nav>
  <Teleport to="body">
    <div v-if="previewIndex >= 0 && proposals[previewIndex]" :id="previewId" role="tooltip" class="rule-scroll-preview pointer-events-none fixed z-50 rounded-xl border border-sage-border bg-white p-3 shadow-lg" :style="{ left: previewPosition.left + 'px', top: previewPosition.top + 'px' }">
      <p class="text-xs font-bold text-brand-dark">Regra {{ previewIndex + 1 }}</p>
      <p class="mt-1 line-clamp-3 break-words text-xs leading-5 text-sage-muted">{{ proposals[previewIndex].textoOrigem || proposals[previewIndex].trechoOriginal || 'Regra adicionada manualmente. Selecione para conferir os campos.' }}</p>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { Minus } from 'lucide-vue-next'
import { ruleScrollProgress, ruleScrollTarget } from '@/services/ruleScrollProgress'

const props = defineProps({ proposals: { type: Array, required: true }, contentElement: { default: null } })
const weights = ref([])
const activeIndex = ref(-1)
const list = ref(null)
const rail = ref(null)
const horizontalShift = ref(0)
const previewIndex = ref(-1)
const previewPosition = ref({ left: 0, top: 0 })
const previewId = 'rule-scroll-preview-' + useId()
let cards = []
let observer = null
let frame = null
let disposed = false
const cardId = (id) => 'proposal-card-' + encodeURIComponent(id)

function measure() {
  frame = null
  if (!cards.length) return
  if (rail.value) {
    const rect = rail.value.getBoundingClientRect()
    const contentRight = cards[0].getBoundingClientRect().right
    const viewportRight = document.documentElement.clientWidth
    const desiredLeft = Math.max(0, Math.min(viewportRight - rect.width - 4, (contentRight + viewportRight - rect.width) / 2))
    const naturalLeft = rect.left - horizontalShift.value
    horizontalShift.value = Math.round((desiredLeft - naturalLeft) * 100) / 100
  }
  const state = ruleScrollProgress(cards.map((card) => card.getBoundingClientRect()), {
    scrollY: window.scrollY, viewportHeight: window.innerHeight, scrollHeight: document.documentElement.scrollHeight
  })
  weights.value = state.weights
  activeIndex.value = state.activeIndex
}
function scheduleMeasure() {
  if (frame === null) frame = window.requestAnimationFrame(measure)
}
async function refresh() {
  await nextTick()
  if (disposed) return
  observer?.disconnect()
  const found = props.proposals.map((proposal) => document.getElementById(cardId(proposal.clientId)))
  hidePreview()
  // Never correlate a marker to the wrong card when the collection is being patched.
  cards = found.every(Boolean) ? found : []
  cards.forEach((card) => observer?.observe(card))
  if (props.contentElement) observer?.observe(props.contentElement)
  scheduleMeasure()
}
function goToRule(index) {
  hidePreview()
  const card = cards[index]
  if (!card) return
  card.focus({ preventScroll: true })
  window.scrollTo({
    top: ruleScrollTarget(card.getBoundingClientRect(), { scrollY: window.scrollY, viewportHeight: window.innerHeight }),
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  })
}
function showPreview(index, event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const width = Math.min(288, document.documentElement.clientWidth - 48)
  previewPosition.value = { left: Math.max(8, rect.left - width - 12), top: Math.max(8, Math.min(rect.top - 8, window.innerHeight - 120)) }
  previewIndex.value = index
}
function hidePreview() { previewIndex.value = -1 }
function leavePreview(event) {
  if (document.activeElement !== event.currentTarget) hidePreview()
}
function updatePreviewAfterListScroll() {
  const controls = [...(list.value?.querySelectorAll('button') || [])]
  const index = controls.indexOf(document.activeElement)
  if (index >= 0) showPreview(index, { currentTarget: controls[index] })
  else hidePreview()
}
function navigateMarks(index, event) {
  const destinations = { ArrowDown: Math.min(index + 1, props.proposals.length - 1), ArrowUp: Math.max(0, index - 1), Home: 0, End: props.proposals.length - 1 }
  if (!Object.hasOwn(destinations, event.key)) return
  event.preventDefault()
  list.value?.querySelectorAll('button')[destinations[event.key]]?.focus()
}
function handleScroll() { hidePreview(); scheduleMeasure() }
function handleResize() { hidePreview(); scheduleMeasure() }
watch(() => props.proposals.map((proposal) => proposal.clientId), refresh)
watch(() => props.contentElement, refresh)
watch(activeIndex, async (index) => {
  await nextTick()
  const control = list.value?.querySelectorAll('button')[index]
  if (!control || !list.value) return
  const rect = control.getBoundingClientRect()
  const viewport = list.value.getBoundingClientRect()
  if (rect.top < viewport.top) list.value.scrollTop -= viewport.top - rect.top + 4
  else if (rect.bottom > viewport.bottom) list.value.scrollTop += rect.bottom - viewport.bottom + 4
})
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') observer = new ResizeObserver(scheduleMeasure)
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize)
  refresh()
})
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
  if (frame !== null) window.cancelAnimationFrame(frame)
})
</script>

<style scoped>
.rule-scroll-list { max-height: min(60dvh, 320px); scrollbar-width: none; }
.rule-scroll-list::-webkit-scrollbar { display: none; }
.rule-scroll-preview { width: min(18rem, calc(100vw - 3rem)); }
.rule-mark-line { transition: width 120ms ease, opacity 120ms ease, color 120ms ease; }
.rule-mark[aria-current="location"], .rule-mark:hover, .rule-mark:focus-visible { color: var(--color-success-text); }
.rule-mark:hover .rule-mark-line, .rule-mark:focus-visible .rule-mark-line { width: 24px !important; opacity: 1 !important; }
@media (prefers-reduced-motion: reduce) {
  .rule-mark-line { transition: none; }
}
</style>
