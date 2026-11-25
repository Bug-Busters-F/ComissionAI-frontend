# Bases na apuração — guia rápido

Nos detalhes da campanha, as bases agora ficam em **Resultados da campanha → Selecionar bases**, sem um bloco separado na página.

1. Selecione uma competência da vigência. Mesmo sem arquivos cadastrados, o mês pode ser selecionado.
2. Abra **Selecionar bases**. O modal reúne RH, Vendas e Taxas de comissão. RH global também pode ser reutilizado.
3. Se houver um único arquivo disponível de cada tipo, ele fica pré-selecionado. Quando houver várias opções, escolha explicitamente. Arquivos já vinculados são preservados.
4. Clique em **Confirmar bases** para vincular o conjunto. Apenas escolher o mês ou abrir/fechar o modal não cria vínculos.
5. Aguarde a conferência e use **Apurar competência**. A confirmação da execução financeira permanece separada.

Em **Cadastrar ou corrigir bases**, é possível enviar RH e Vendas, importar taxas de comissão e consultar/corrigir os arquivos vinculados. Novas competências são cadastradas pelo envio de arquivos para o mês escolhido. As cargas continuam compartilhadas entre campanhas; pendências não são aceitas automaticamente.

## Integração

Somente o frontend foi alterado. Reutiliza consultas de `/imports` e `/campanhas/{id}/anexos-base`, associa os identificadores reais em `POST /campanhas/{id}/anexos-base` e mantém a conferência de `/campanhas/{id}/cobertura-fechamento` antes da apuração.

O backend associa cada arquivo individualmente. Se uma associação falhar após outra confirmar, o modal mantém os vínculos confirmados, informa o erro e permite atualizar os arquivos para tentar somente os restantes. Não há transação única dos três arquivos.

Gerente e administrador continuam responsáveis pelos envios/vínculos e pela execução. Auditor consulta resultados sem essas ações. As restrições de fechamento, aprovação do código e pendências continuam valendo.

## Verificação

Testes automatizados cobrem seleção única/ambígua, arquivos ausentes, RH global, separação por mês, falhas parciais, consulta indisponível e importação de taxas com associação rejeitada. A abertura do modal foi conferida no navegador com os arquivos reais de dezembro; nenhuma nova apuração foi executada durante essa inspeção.
