import axios from 'axios'
import api from './api'

export const INTERPRETATION_TIMEOUT = 45000

export const campaignInterpretationService = {
  async interpret(payload, { signal } = {}) {
    const response = await api.post('/interpretador/extrair-regra', payload, {
      signal,
      timeout: INTERPRETATION_TIMEOUT
    })

    return response.data
  }
}

export function isInterpretationCancellation(error) {
  return axios.isCancel(error) || error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError'
}

export function normalizeInterpretationError(error) {
  if (error?.code === 'INTERPRETATION_FLOW') {
    return { status: null, kind: 'invalid', message: error.message }
  }

  if (isInterpretationCancellation(error)) {
    return { status: null, kind: 'canceled', message: '' }
  }

  const status = error?.response?.status || null
  const backendMessage = error?.response?.data?.message

  if (status === 400) {
    return {
      status,
      kind: 'validation',
      message: backendMessage || 'Não foi possível interpretar este texto. Revise a proposta e tente novamente.'
    }
  }

  if (status === 503) {
    return {
      status,
      kind: 'unavailable',
      message: 'O serviço de interpretação está indisponível temporariamente. Você pode revisar os campos manualmente.'
    }
  }

  if (status === 504 || error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return {
      status,
      kind: 'timeout',
      message: 'A interpretação excedeu o tempo esperado. Tente novamente ou preencha os campos manualmente.'
    }
  }

  return {
    status,
    kind: 'network',
    message: backendMessage || 'Não foi possível conectar ao serviço de interpretação. Seus dados foram preservados.'
  }
}
