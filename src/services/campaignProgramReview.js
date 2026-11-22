// Bounded line comparison: common prefix/suffix stay visible without quadratic
// allocation for a complete executable programme.
export function programLineDiff(before, after) {
  const a = before.split('\n'), b = after.split('\n')
  let start = 0, end = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++
  return [...a.slice(0, start).map(text => ({ type: 'same', text })),
    ...a.slice(start, a.length - end).map(text => ({ type: 'removed', text })),
    ...b.slice(start, b.length - end).map(text => ({ type: 'added', text })),
    ...a.slice(a.length - end).map(text => ({ type: 'same', text }))]
}
