<template>
  <Transition name="welcome">
    <div v-if="loginWelcome.visible" class="welcome-screen fixed inset-0 z-[100] overflow-hidden bg-sage text-brand-dark" role="status" aria-live="polite">
      <svg class="landscape-graphic" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="splash-horizon-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".23" /><stop offset="100%" stop-color="currentColor" stop-opacity="0" /></linearGradient></defs>
        <g class="landscape-grid"><path v-for="n in 7" :key="n" :d="`M0 ${n * 100} H1200`" /></g>
        <path class="landscape-area" d="M-40 590 C120 590 120 430 290 460 S440 310 600 350 S800 190 930 230 S1100 110 1240 80 L1240 700 H-40Z" />
        <path class="landscape-line" pathLength="1" d="M-40 590 C120 590 120 430 290 460 S440 310 600 350 S800 190 930 230 S1100 110 1240 80" />
        <circle class="landscape-sun" cx="930" cy="230" r="13" />
      </svg>
      <div class="landscape-copy"><span class="eyebrow">COMISSIONAI</span><h1>Novos<br />horizontes.</h1></div>
      <span class="corner-note">Ideias que ganham movimento.</span>
      <div class="horizon-brand"><img :src="logo" alt="" /><span>Comission<span class="horizon-brand-ai">AI</span></span></div>
    </div>
  </Transition>
</template>

<script setup>
import { onBeforeUnmount, watch } from 'vue'
import logo from '@/assets/images/comissionai-icon.png'
import { loginWelcome, cancelLoginWelcome } from '@/services/loginWelcome'
import { useAccountStore } from '@/stores/accountStore'
const account = useAccountStore()
let previousOverflow
function unlockScroll() {
  if (previousOverflow !== undefined) {
    document.documentElement.style.overflow = previousOverflow
    previousOverflow = undefined
  }
}
watch(() => loginWelcome.visible, visible => {
  if (visible) {
    previousOverflow ??= document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  } else unlockScroll()
}, { immediate: true })
watch(() => account.user, user => { if (!user) cancelLoginWelcome() })
onBeforeUnmount(() => { cancelLoginWelcome(); unlockScroll() })
</script>

<style scoped>
.welcome-enter-active { transition: opacity 160ms ease; }
.welcome-leave-active { transition: opacity 180ms ease; }
.welcome-enter-from, .welcome-leave-to { opacity: 0; }
.eyebrow { font-size: 12px; font-weight: 750; letter-spacing: .24em; }
.corner-note { position: absolute; left: 7%; bottom: 7%; font-size: clamp(12px, 1.5vw, 16px); opacity: .65; animation: entrance 600ms 500ms both; }
.landscape-graphic { position: absolute; inset: 0; height: 100%; width: 100%; color: var(--color-brand); }
.landscape-grid { stroke: currentColor; stroke-width: 1; opacity: .1; }
.landscape-area { fill: url(#splash-horizon-fill); animation: entrance 1.2s both; }
.landscape-line { fill: none; stroke: currentColor; stroke-width: 4; stroke-dasharray: 1; stroke-dashoffset: 1; animation: horizon-draw 1.35s cubic-bezier(.3,.1,.2,1) forwards; }
.landscape-sun { fill: currentColor; transform-box: fill-box; transform-origin: center; animation: dot-rise 450ms 800ms both; }
.horizon-brand { position: absolute; right: 7%; bottom: 7%; display: flex; align-items: center; gap: 10px; font-size: clamp(18px, 2.2vw, 28px); font-weight: 800; letter-spacing: -.05em; animation: entrance 600ms 400ms both; }
.horizon-brand img { width: clamp(32px, 4vw, 48px); height: auto; object-fit: contain; }
.horizon-brand-ai { color: var(--color-brand); }
.landscape-copy { position: absolute; top: 13%; left: 7%; }
.landscape-copy h1 { margin-top: 20px; font-size: clamp(50px, 9vw, 126px); line-height: .98; letter-spacing: -.06em; font-weight: 800; animation: entrance 900ms both; }
@keyframes entrance { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
@keyframes horizon-draw { to { stroke-dashoffset: 0; } }
@keyframes dot-rise { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
@media (max-width: 600px) { .corner-note { bottom: 17%; } }
@media (prefers-reduced-motion: reduce) {
  .welcome-screen *, .welcome-enter-active, .welcome-leave-active { animation: none !important; transition: none !important; }
  .landscape-line { stroke-dashoffset: 0; }
}
</style>
