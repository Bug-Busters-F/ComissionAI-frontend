import { reactive } from 'vue'

export const loginWelcome = reactive({ visible: false, firstName: '' })
let current = null

export function cancelLoginWelcome() {
  current?.cancel()
}

// The animation overlaps navigation; it never postpones the login request.
export function beginLoginWelcome(name, { reducedMotion = false } = {}) {
  cancelLoginWelcome()
  loginWelcome.firstName = String(name || '').trim().split(/\s+/)[0].slice(0, 32)
  loginWelcome.visible = true
  let resolve, minimumTimer, maximumTimer, cancelled = false
  const minimum = new Promise(done => { resolve = done })
  const run = {
    cancel() {
      cancelled = true
      clearTimeout(minimumTimer); clearTimeout(maximumTimer); resolve()
      if (current === run) { loginWelcome.visible = false; current = null }
    },
    async finish() {
      await minimum
      if (!cancelled && current === run) run.cancel()
    }
  }
  current = run
  minimumTimer = setTimeout(resolve, reducedMotion ? 200 : 1500)
  // A slow or failed navigation must not leave an indefinite splash on screen.
  maximumTimer = setTimeout(() => run.cancel(), 4000)
  return run
}
