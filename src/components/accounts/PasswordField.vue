<template>
  <div>
    <label :for="id" class="mb-2 block text-sm font-semibold">{{ label }} <span aria-hidden="true" class="text-danger">*</span></label>
    <div class="relative">
      <input :id="id" :value="modelValue" :type="visible ? 'text' : 'password'" :autocomplete="autocomplete" required :aria-invalid="Boolean(error)" :aria-describedby="error ? id + '-error' : undefined" class="focus-ring h-12 w-full rounded-xl border bg-white pl-4 pr-14 text-sm" :class="error ? 'border-danger' : 'border-sage-border-dark'" @input="$emit('update:modelValue', $event.target.value)" />
      <button type="button" :aria-label="(visible ? 'Ocultar ' : 'Mostrar ') + label.toLowerCase()" :aria-pressed="visible" class="focus-ring absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-sage-muted hover:bg-sage-light" @click="visible = !visible"><EyeOff v-if="visible" :size="18" /><Eye v-else :size="18" /></button>
    </div>
    <p v-if="error" :id="id + '-error'" class="mt-2 text-sm text-danger-dark">{{ error }}</p>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
defineProps({ id: { type: String, required: true }, label: String, modelValue: String, error: String, autocomplete: { type: String, default: 'current-password' } })
defineEmits(['update:modelValue'])
const visible = ref(false)
</script>
