# Lote 3 — aceite formal e conferência

## Disponível

“Aceitar simulação e continuar” pede responsável obrigatório e observação opcional. Não inventa usuário autenticado. Envia `POST /api/v1/simulacoes/{id}/aceite` com `{ campanhaId, aceitoPor, motivo }`.

O avanço depende do aceite confirmado e de `GET /api/v1/campanhas/{id}/conferencia-simulacao` indicando `aptaParaAtivacao: true` para a mesma simulação. A conferência reúne todas as regras atuais e o protocolo aceito. Reabrir o rascunho recupera a simulação aceita e verifica sua correspondência antes de liberar a revisão.

Editar campos, texto, público, faixas, operações, ordem ou coleção de regras invalida o aceite local. Salvar alterações invalida o aceite também no backend; é necessário simular e aceitar novamente. Trocar a competência exige novo resultado/aceite. Falhas na conferência não viram sucesso local.

## Como conferir

1. Execute uma simulação da versão salva.
2. Abra o aceite: sem responsável o botão fica desabilitado.
3. Confirme, confira o POST de aceite e o GET de conferência e avance.
4. Recarregue: o protocolo aceito deve ser recuperado do backend.
5. Edite uma regra: revisão/ativação devem bloquear até novo ciclo.

## Integração futura

Responsável digitado poderá ser substituído pela identidade autenticada quando existir integração de autenticação. No ambiente atual, executar o backend atualizado é necessário para testar os endpoints reais de aceite/conferência. Os testes controlados verificam o contrato, mas não substituem a homologação financeira.
