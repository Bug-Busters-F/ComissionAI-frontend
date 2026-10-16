<template>
  <span class="inline-flex shrink-0" @mouseenter="show" @mouseleave="scheduleClose">
    <button ref="trigger" type="button" class="focus-ring inline-flex h-6 w-6 items-center justify-center rounded-full text-sage-muted hover:bg-sage-light hover:text-brand-dark" :aria-label="'Origem do campo: ' + fieldLabel" :aria-describedby="opened ? tooltipId : undefined" :aria-expanded="opened" @focus="show" @blur="scheduleClose" @click="toggle">
      <CircleHelp :size="16" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <div v-if="opened" :id="tooltipId" ref="panel" role="tooltip" class="fixed z-[70] rounded-xl border border-sage-border bg-white px-4 py-3 text-xs leading-5 text-brand-dark shadow-lg" :style="position" @mouseenter="hold" @mouseleave="scheduleClose">
        Aqui será apresentada a origem deste valor, como texto informado, cadastro consultado, base de comissão ou edição manual.
      </div>
    </Teleport>
  </span>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { CircleHelp } from 'lucide-vue-next'

defineProps({ fieldLabel: { type: String, required: true } })
const tooltipId = 'field-origin-' + useId()
const trigger = ref(null)
const panel = ref(null)
const opened = ref(false)
const position = ref({})
let pinned = false
let timer = null

function place() {
  if (!trigger.value || !panel.value) return
  const rect = trigger.value.getBoundingClientRect()
  const width = Math.min(304, window.innerWidth - 32)
  panel.value.style.width = width + 'px'
  const height = panel.value.getBoundingClientRect().height
  const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16))
  const below = rect.bottom + 8
  const top = below + height <= window.innerHeight - 16 ? below : Math.max(16, rect.top - height - 8)
  position.value = { left: left + 'px', top: top + 'px', width: width + 'px' }
}
async function show() { clearTimeout(timer); opened.value = true; await nextTick(); place() }
function hold() { clearTimeout(timer) }
function close() { clearTimeout(timer); pinned = false; opened.value = false }
function scheduleClose() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (!pinned && document.activeElement !== trigger.value) opened.value = false
  }, 120)
}
function toggle() { if (pinned) close(); else { pinned = true; show() } }
function outside(event) {
  if (!trigger.value?.contains(event.target) && !panel.value?.contains(event.target)) close()
}
function escape(event) { if (event.key === 'Escape') close() }
function detach() {
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', escape)
  window.removeEventListener('resize', place)
  window.removeEventListener('scroll', place, true)
}
watch(opened, (open) => {
  if (!open) { detach(); return }
  document.addEventListener('pointerdown', outside)
  document.addEventListener('keydown', escape)
  window.addEventListener('resize', place)
  window.addEventListener('scroll', place, true)
})
onBeforeUnmount(() => { clearTimeout(timer); detach() })
</script>
