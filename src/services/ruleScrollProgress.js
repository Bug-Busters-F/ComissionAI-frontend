const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

// Short cards settle in the middle of the viewport; tall forms settle at its top.
export function ruleScrollProgress(rects, { scrollY, viewportHeight, scrollHeight }) {
  if (!rects.length) return { weights: [], activeIndex: -1 }
  const maximum = Math.max(0, scrollHeight - viewportHeight)
  const targets = rects.map(({ top, height }) => {
    const offset = Math.max(24, (viewportHeight - Math.min(height, viewportHeight - 48)) / 2)
    return clamp(top + scrollY - offset, 0, maximum)
  })
  const weights = rects.map(() => 0)
  let current = 0
  while (current + 1 < targets.length && targets[current + 1] <= scrollY) current += 1
  if (current === targets.length - 1 || scrollY <= targets[0]) {
    weights[current] = 1
    return { weights, activeIndex: current }
  }
  const next = current + 1
  const progress = clamp((scrollY - targets[current]) / (targets[next] - targets[current]), 0, 1)
  weights[current] = 1 - progress
  weights[next] = progress
  return { weights, activeIndex: progress >= 0.5 ? next : current }
}

export function ruleScrollTarget(rect, { scrollY, viewportHeight }) {
  const offset = Math.max(24, (viewportHeight - Math.min(rect.height, viewportHeight - 48)) / 2)
  return Math.max(0, rect.top + scrollY - offset)
}
