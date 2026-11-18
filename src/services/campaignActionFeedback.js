const actions = {
  saveProposal: { success: 'Proposta salva', message: 'As alterações foram salvas separadamente da versão vigente.', error: 'Não foi possível salvar a proposta' },
  publish: { success: 'Nova versão publicada', message: 'A nova versão está vigente para todo o período da campanha. As anteriores permanecem no histórico.', error: 'Não foi possível publicar a nova versão' },
  discardProposal: { success: 'Proposta descartada', message: 'A campanha vigente e seus resultados foram preservados.', error: 'Não foi possível descartar a proposta' },
  save: { success: 'Rascunho salvo', message: 'Suas alterações foram salvas.', error: 'Não foi possível salvar o rascunho' },
  interpret: { success: 'Regras interpretadas', message: 'Confira os campos e as pendências antes de continuar.', error: 'Não foi possível interpretar a campanha' },
  reinterpret: { success: 'Campanha reinterpretada', message: 'O novo conjunto de regras foi aplicado. Confira as alterações.', error: 'Não foi possível reinterpretar a campanha' },
  apply: { success: 'Alterações aplicadas', message: 'Confira as regras atualizadas e salve o rascunho para guardar as alterações.', error: 'Não foi possível aplicar as alterações' },
  simulate: { success: 'Simulação concluída', message: 'Os resultados estão disponíveis para conferência.', error: 'Não foi possível concluir a simulação' },
  accept: { success: 'Simulação aceita', message: 'O aceite foi registrado. Confira a campanha antes de ativá-la.', error: 'Não foi possível registrar o aceite' },
  activate: { success: 'Campanha ativada', message: 'A campanha foi aprovada e suas regras estão ativas para a vigência definida.', error: 'Não foi possível ativar a campanha' },
  approveCode: { success: 'Código aprovado', message: 'A aprovação técnica de código foi registrada.', error: 'Não foi possível aprovar o código' },
  rejectCode: { success: 'Código rejeitado', message: 'A rejeição técnica de código foi registrada.', error: 'Não foi possível rejeitar o código' },
  forwardToManager: { success: 'Encaminhado ao gerente', message: 'A campanha foi encaminhada para conferência do gerente.', error: 'Não foi possível encaminhar ao gerente' },
  returnProposal: { success: 'Proposta devolvida', message: 'A proposta foi devolvida com sucesso para a etapa indicada.', error: 'Não foi possível devolver a proposta' }
}

// Only explicit actions produce feedback. Keep at most one campaign toast visible.
export function createCampaignActionFeedback(notifications) {
  const pending = new Set()
  let toastId
  function show(type, title, message) {
    if (toastId) notifications.remove(toastId)
    toastId = notifications[type](title, message, { duration: type === 'error' ? 9000 : 5000 })
  }
  return async function feedback(key, action, { error = () => '', successMessage = () => '' } = {}) {
    if (pending.has(key)) return false
    pending.add(key)
    try {
      const result = await action()
      if (result === true) show('success', actions[key].success, successMessage() || actions[key].message)
      else if (error()) show('error', actions[key].error, error())
      return result
    } finally {
      pending.delete(key)
    }
  }
}
