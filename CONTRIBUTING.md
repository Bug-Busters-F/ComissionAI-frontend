# Como Contribuir - Seu Passaporte de Entrada

Estamos felizes em receber você aqui e saber que está interessado em contribuir para o nosso projeto. Cada contribuição é valorizada e ajuda a melhorar a qualidade do nosso trabalho. Este guia apresenta orientações gerais para participar da nossa comunidade de desenvolvimento.

## Código de Conduta

Para garantir um ambiente respeitoso e inclusivo, leia e siga nosso [Código de Conduta](./CODE_OF_CONDUCT.md).

## Começando a Contribuir

Para começar, você precisará de:

- Uma conta no [GitHub](https://github.com/).
- O sistema de controle de versão [Git](https://git-scm.com/) instalado.
- Um editor de código ou IDE de sua preferência.
- As ferramentas e dependências exigidas pelo repositório, conforme sua documentação, quando disponível.

Você pode contribuir corrigindo problemas, implementando melhorias, escrevendo testes ou aprimorando a documentação. Antes de iniciar, consulte as issues e os pull requests existentes para evitar trabalho duplicado. Para mudanças maiores, abra uma issue para discutir a proposta com a equipe.

## Preparando o Ambiente

### 1. Clonar o Repositório

Na página do repositório no GitHub, copie a URL de clonagem. No terminal, execute os comandos abaixo, substituindo os valores entre `<>` pelos dados correspondentes:

```bash
git clone <URL_DO_REPOSITORIO>
cd <NOME_DO_REPOSITORIO>
```

Se você não tiver permissão de escrita, crie um fork no GitHub e clone o seu fork.

### 2. Configurar o Projeto

Consulte o README e a documentação do repositório, quando disponíveis, para instalar as dependências, configurar as variáveis de ambiente e executar o projeto. Os requisitos e comandos podem variar entre os repositórios.

Não inclua senhas, tokens ou outras informações sensíveis nos arquivos versionados. Se houver um arquivo de exemplo de variáveis de ambiente, use-o como referência para sua configuração local.

## Enviando uma Contribuição

1. Crie uma branch para sua alteração:

   ```bash
   git switch -c tipo/descricao-da-alteracao
   ```

2. Faça alterações focadas no objetivo da contribuição, seguindo os padrões existentes no projeto.
3. Verifique o funcionamento da alteração e execute os testes e verificações disponíveis. Atualize a documentação quando necessário.
4. Revise os arquivos alterados e crie um commit com uma mensagem clara:

   ```bash
   git status
   git add <ARQUIVOS_ALTERADOS>
   git commit -m "Descreve a alteração realizada"
   ```

5. Envie sua branch para o GitHub:

   ```bash
   git push -u origin tipo/descricao-da-alteracao
   ```

6. Abra um pull request para a branch padrão do repositório original. Explique o que mudou, o motivo da mudança e como você validou o resultado. Relacione a issue correspondente, se houver.
7. Acompanhe a revisão e converse com a equipe sobre os ajustes solicitados.

## Relatando Problemas e Sugerindo Melhorias

Ao abrir uma issue, use um título claro e descreva o contexto. Para problemas, informe os passos para reproduzir, o comportamento esperado e o observado. Para melhorias, explique a necessidade e o resultado desejado.

---

Equipe Bug Busters
