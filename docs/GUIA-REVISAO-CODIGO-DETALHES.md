# Revisão do código nos detalhes da campanha

O painel consulta a aprovação do programa completo, sem utilizar aprovação antiga por regra ou permitir decisões sem revisar o código. A aprovação exige `statusAprovacao=APROVADO` e `validoParaExecucao=true`; aprovado sem validade exige nova revisão. Pendência e devolução são exibidas separadamente. Autor e data vêm do servidor.

- Consulta: `GET /campanhas/{id}/programa-python` ou `GET /campanhas/{id}/versoes/{numero}/programa-python` quando a versão é conhecida.
- Campanha publicada: consulta explicitamente a versão vigente, inclusive quando existe uma proposta separada. Rascunho: consulta sua versão proposta.
- Analista de código/administrador pode abrir a etapa 2 para revisão de um rascunho sem bloqueio conhecido. Não há aprovação direta nos detalhes.
- Falhas exibem nova tentativa sem aproveitar informação antiga ou produzir sucesso.

## Verificação rápida

Abra os detalhes de uma campanha aprovada e recarregue. Confira estado, versão, autor e data. Edite suas regras pelo fluxo e confira a necessidade de revisão. Aprove novamente na etapa 2 e reabra os detalhes. Com uma proposta separada de campanha publicada, os detalhes devem continuar mostrando a versão vigente. Interrompa o serviço e confirme o aviso de consulta indisponível.

Não há nova integração necessária no backend para este painel. Os controles antigos permanecem disponíveis para outros consumidores legados; este painel não os utiliza.
