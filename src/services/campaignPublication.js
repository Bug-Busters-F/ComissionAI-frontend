// Administrator performs the existing handoff and publication with one confirmation.
// Each operation still requires its own server confirmation; no approval is simulated.
export async function completeCampaignPublication(lifecycle, { administrator = false } = {}) {
  if (!lifecycle.canActivate.value) return false
  if (administrator && !lifecycle.state.encaminhadaGerente) {
    if (!await lifecycle.forwardToManager()) return false
  }
  return lifecycle.activate()
}
