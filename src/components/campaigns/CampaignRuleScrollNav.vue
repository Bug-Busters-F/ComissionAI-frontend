<template>
  <nav v-if="proposals.length" ref="rail" class="rule-scroll-nav sticky rounded-full border border-sage-border bg-white p-1 shadow-sm" :style="{ top: 'max(1rem, calc(50dvh - ' + Math.min(proposals.length * 44 + 8, 320) / 2 + 'px))', transform: 'translateX(' + horizontalShift + 'px)' }" aria-label="Navegar entre regras">
    <ol ref="list" class="rule-scroll-list flex flex-col items-center gap-2 overflow-y-auto py-1">
      <li v-for="(proposal, index) in proposals" :key="proposal.clientId" class="flex shrink-0">
        <button type="button" class="rule-dot focus-ring relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-sage-border-dark bg-sage-light text-xs font-extrabold text-brand-dark hover:border-brand-ring" :aria-label="'Ir para regra ' + (index + 1)" :title="'Regra ' + (index + 1)" :aria-current="activeIndex === index ? 'location' : undefined" :aria-controls="cardId(proposal.clientId)" @click="goToRule(index)">
          <span aria-hidden="true" class="pointer-events-none absolute inset-0 origin-bottom bg-brand" :style="{ transform: 'scaleY(' + (weights[index] || 0).toFixed(4) + ')' }" />
          <span class="relative z-10">{{ index + 1 }}</span>
        </button>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ruleScrollProgress, ruleScrollTarget } from '@/services/ruleScrollProgress'

const props = defineProps({ proposals: { type: Array, required: true }, contentElement: { default: null } })
const weights = ref([])
const activeIndex = ref(-1)
const list = ref(null)
const rail = ref(null)
const horizontalShift = ref(0)
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
    const desiredLeft = (contentRight + viewportRight - rect.width) / 2
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
  // Never correlate a dot to the wrong card when the collection is being patched.
  cards = found.every(Boolean) ? found : []
  cards.forEach((card) => observer?.observe(card))
  if (props.contentElement) observer?.observe(props.contentElement)
  scheduleMeasure()
}
function goToRule(index) {
  const card = cards[index]
  if (!card) return
  card.focus({ preventScroll: true })
  window.scrollTo({
    top: ruleScrollTarget(card.getBoundingClientRect(), { scrollY: window.scrollY, viewportHeight: window.innerHeight }),
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  })
}
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
  window.addEventListener('scroll', scheduleMeasure, { passive: true })
  window.addEventListener('resize', scheduleMeasure)
  refresh()
})
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  window.removeEventListener('scroll', scheduleMeasure)
  window.removeEventListener('resize', scheduleMeasure)
  if (frame !== null) window.cancelAnimationFrame(frame)
})
</script>

<style scoped>
.rule-scroll-list { max-height: min(60dvh, 320px); scrollbar-width: none; }
.rule-scroll-list::-webkit-scrollbar { display: none; }
.rule-dot > span:first-child { transition: transform 100ms linear; }
@media (prefers-reduced-motion: reduce) {
  .rule-dot > span:first-child { transition: none; }
}
</style>
