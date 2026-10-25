# Lote 1 — interpretação e contrato

## Implementado

O modo `api` conecta o provedor ao cliente HTTP existente. “Interpretar e continuar” envia o texto à extração multirregras. Taxa decimal `0.0350` vira `3,5%`; valores zero, matrícula textual, operadores e todos os blocos são preservados. Título e descrição digitados não são substituídos; o título sugerido recebido é preservado no estado, sem exibição na interface.

O mapeador mantém propostas incompletas e inválidas visíveis com impedimentos, além de pendências globais. O período comum é consolidado apenas quando todos os blocos devolvem as mesmas duas datas. Sem datas ou com divergências, o usuário deve corrigir o texto e reinterpretar.

## Como integrar/verificar

Ative `VITE_CAMPAIGN_PROPOSALS_MODE=api`, configure `VITE_API_URL`, reinicie e abra `/campanhas/nova`. O contrato usa `POST /interpretador/extrair-propostas`, relativo à base da API. Confira três regras, uma sem taxa, mínimo zero, matrícula `001234` e dois operadores diferentes. Não há fallback para exemplos em caso de erro.

## O que falta

Não falta criar endpoint no backend para essa extração. Falta homologar com os serviços reais configurados e dados de cadastro. Confiança e origem dependem da informação efetivamente devolvida pelo servidor. Persistência não integra este lote.
