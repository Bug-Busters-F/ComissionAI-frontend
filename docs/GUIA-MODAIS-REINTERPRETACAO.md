# Guia rápido — modais de reinterpretação

## Regra individual

O fluxo real reutiliza `CampaignRuleReviewDialog.vue`, também usado na demonstração. A revisão mostra o texto enviado, “Reinterpretar novamente”, alterações no formato “Atual → Proposto”, campos corrigíveis e “Cancelar”/“OK”. “Ver todos os campos” amplia a lista; “Detalhes da proposta” reúne os dados, explicação, origens e pendências disponíveis.

Valores atuais editados manualmente recebem destaque. Campos explicitamente nulos na nova interpretação aparecem como remoções. Alterar o texto desabilita a confirmação até nova interpretação; uma falha não permite aplicar silenciosamente o resultado anterior. Cancelar preserva a regra atual.

Quando o texto origina várias regras, o mesmo modal mostra a regra atual e todas as propostas, com detalhes expansíveis e “Confirmar divisão”. Somente o bloco selecionado é substituído; os demais mantêm suas identidades e valores.

## Campanha inteira

Com regras existentes, “Reinterpretar regras” abre um aviso compacto antes de enviar a solicitação. O aviso informa a substituição de todas as regras, ajustes manuais e vigência e orienta usar o lápis do bloco para alterações pontuais.

Cancelar fecha o aviso sem requisição e preserva também o texto editado. Confirmar envia o texto completo e aplica o conjunto válido recebido de uma vez, sem comparação posterior. Título e texto informado são preservados. Falha, resposta vazia, cancelamento da solicitação ou alteração dos dados durante o processamento não substituem as regras atuais. A primeira interpretação, sem regras existentes, dispensa esse aviso.

## Integração

Nenhuma alteração necessária no backend ou na IA. Ambos os fluxos continuam usando `POST /api/v1/interpretador/extrair-propostas`, com 75 segundos e cancelamento. A solicitação individual envia somente o texto do bloco e a vigência comum no contexto; a completa não restringe o período anterior. O provedor continua sendo a Groq pelo serviço de IA. Não há salvamento ou publicação.

## Verificação

- 157 testes aprovados: confirmação antes do envio, cancelamento sem chamadas, substituição atômica, falhas e respostas antigas, reinterpretação dentro da revisão, correções e divisão sem perda das outras regras.
- Navegador com respostas controladas, sem consumir Groq: revisão de taxa manual 4% → 6%, correção para 7% aplicada somente à regra selecionada; texto alterado bloqueando “OK”; nova interpretação no modal gerando duas regras; divisão preservando os outros dois blocos.
- Campanha inteira: cancelar manteve as quatro regras; confirmar aplicou três propostas e mudou a vigência para novembro, sem comparação posterior. Falha controlada preservou os identificadores das três regras.
- Tela de 390 px: os dois modais ficaram dentro da tela, sem transbordamento horizontal, com a confirmação individual visível. Esc fechou as revisões sem aplicar; o viewport padrão foi restaurado. Nenhum erro JavaScript capturado.
- Build de produção concluído; permanece o aviso conhecido de tamanho do bundle. Conferência automatizada não substitui homologação da interpretação com o modelo real.

Para testar manualmente: interprete uma campanha, edite uma regra pelo lápis e confira o modal. Depois altere o texto completo, cancele o aviso uma vez e confirme na segunda tentativa. Confira regras, datas e preservação dos campos quando o serviço retornar erro.

Capturas em `/home/renan/Documents/Codex/2026-10-11/new-chat/outputs/`: `Modal-Reinterpretacao-Individual.png`, `Modal-Reinterpretacao-Campanha.png`, `Modal-Reinterpretacao-Divisao.png` e `Modal-Reinterpretacao-Mobile.png`.
