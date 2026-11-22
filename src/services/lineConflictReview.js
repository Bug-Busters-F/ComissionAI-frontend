import { ref } from 'vue'

export function createLineConflictReview(form) {
  const conflict = ref(false)
  const currentLine = ref(null)
  function register(current) {
    conflict.value = true
    currentLine.value = current
  }
  function confirmLocal() {
    if (!currentLine.value || !Number.isSafeInteger(currentLine.value.versao)) return
    form.value.versao = currentLine.value.versao
    conflict.value = false
  }
  return { conflict, currentLine, register, confirmLocal }
}
