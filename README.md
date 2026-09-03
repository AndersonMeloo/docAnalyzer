# DocAnalyzer

Plataforma para apoiar a análise profissional de processos e documentos. A IA será um assistente: a revisão e a decisão final permanecem com o profissional.

## Stack

- `apps/web`: Next.js, React, TypeScript e Tailwind CSS.
- `apps/api`: NestJS, TypeScript, Prisma e PostgreSQL.
- PostgreSQL local executado com Docker Compose.
- Autenticação preparada com Argon2 e JWT em cookie `HttpOnly`.
- Gemini isolada atrás de `AiService` e `GeminiProvider`.

## Requisitos

- Node.js 22 ou superior
- npm 10 ou superior
- Docker Desktop em execução

## Configuração

1. Copie `.env.example` para `apps/api/.env`. O Compose usa a porta local `5434` porque `5432` já pode estar ocupada por outro PostgreSQL.
2. Inicie o banco:

```bash
npm run db:up
```

3. Gere o cliente Prisma e execute a migration inicial:

```bash
npm run db:generate
npm run db:migrate
```

4. Inicie frontend e backend em terminais separados:

```bash
npm run dev:web
npm run dev:api
```

O frontend estará em `http://localhost:3000` e a API em `http://localhost:3001/api`.

## Etapa 1 concluída

- Estrutura inicial do monorepo.
- Tela inicial do DocAnalyzer em PT-BR.
- PostgreSQL com Docker Compose.
- Modelos `User` e `Process` no Prisma.
- Cadastro, login e logout.
- Senhas com hash Argon2.
- JWT em cookie `HttpOnly`.
- DTOs com validação de entrada.
- Endpoints de processos protegidos por autenticação e propriedade do usuário.
- Status iniciais de processo preparados para as próximas etapas.

A interface ainda exibe um estado vazio. Dashboard funcional e criação de processos pela interface pertencem à Etapa 2.

## Etapa 3: documentos

- Entidade `Document` relacionada a um único processo.
- Upload de até 10 PDFs por requisição.
- Limite de 20 MB por arquivo.
- Armazenamento local privado em `storage/uploads` durante o desenvolvimento.
- Listagem de documentos por processo.
- Verificação de propriedade do processo no backend antes de listar ou gravar arquivos.
- O conteúdo dos documentos ainda não é enviado para IA nem processado nesta etapa.

## Etapa 4: armazenamento e processamento

- Cada documento possui status `PENDING`, `PROCESSING`, `COMPLETED` ou `FAILED`.
- O arquivo recebe um hash SHA-256 para verificação de integridade.
- O processador calcula uma contagem inicial de páginas sem enviar o arquivo para qualquer provedor externo.
- O processamento é agendado após o upload e a interface atualiza os estados automaticamente.
- O serviço de processamento está separado do controller para permitir a futura substituição de `setImmediate` por Redis/BullMQ.
- O armazenamento local continua sendo apenas uma solução de desenvolvimento; arquivos reais não devem ser usados.

## Etapa 6: análise individual

- Cada documento não protegido pode possuir uma análise exclusiva.
- A análise armazena status, resumo, informações extraídas, pontos de atenção e mensagem de erro.
- Arquivos cujo nome indica `RG` ou `CPF` são marcados como protegidos e não são enviados à IA.
- Quando `GEMINI_API_KEY` não está configurada, a análise permanece pendente.
- O prompt instrui a Gemini a atuar como assistente e retornar JSON estruturado, sem substituir a decisão profissional.
- A extração textual inicial é local e simples; PDFs complexos poderão exigir um extrator dedicado em uma etapa futura.

## Etapa 7: resumo consolidado

- Cada processo possui um resumo consolidado persistido e atualizado sob demanda.
- As métricas incluem documentos, páginas, documentos analisados e documentos pendentes.
- A consolidação considera somente documentos e análises do processo autenticado.
- O resumo textual é gerado pela IA quando há análises concluídas e Gemini configurada.
- Sem configuração da IA, as métricas continuam disponíveis e o texto permanece pendente.
- Endpoints protegidos: `GET /api/processes/:id/summary` e `POST /api/processes/:id/summary/refresh`.

## Etapa 8: pontos de atenção

- Findings persistidos com documento, página, severidade, descrição e status de revisão.
- Severidades disponíveis: `INFO`, `WARNING` e `CRITICAL`.
- Status disponíveis: não revisado, revisado, ignorado e confirmado.
- Pontos retornados pela análise individual são materializados automaticamente.
- O profissional pode revisar cada ponto pelo dashboard.
- As rotas de listagem e atualização validam a propriedade do processo no backend.

## Etapa 9: conversa por processo

- Cada processo possui sua própria `Conversation` e mensagens persistidas.
- O backend valida a propriedade do processo antes de listar ou enviar mensagens.
- O contexto enviado à IA contém somente resumo, análises e findings do processo atual.
- O chat diferencia mensagens do profissional e da IA e mantém o histórico.
- Sem Gemini configurada, o envio retorna uma indisponibilidade explícita; nenhuma resposta artificial é gravada.
- Endpoints protegidos: `GET /api/processes/:id/conversation` e `POST /api/processes/:id/conversation/messages`.

## Etapa 10: visualização de PDF

- Visualização servida por rota autenticada e privada.
- O backend valida usuário, processo e documento antes de enviar o arquivo.
- O arquivo permanece fora da pasta pública e não expõe `storagePath`.
- O frontend abre o PDF em modal usando o visualizador nativo do navegador.
- Navegação por número de página e controles anterior/próxima usam o fragmento `#page=N`.
- Findings continuam informando documento e página de referência.

## Etapa 11: processamento assíncrono

- Redis e BullMQ estão preparados para processar documentos fora do fluxo HTTP.
- `REDIS_ENABLED=false` mantém o fallback local assíncrono, adequado ao desenvolvimento sem Redis.
- Para ativar filas, inicie `docker compose up -d redis` e defina `REDIS_ENABLED=true` em `apps/api/.env`.
- `REDIS_URL` configura a conexão do worker.
- Jobs possuem até 3 tentativas com backoff exponencial e o worker processa até 2 documentos em paralelo.
- O upload continua retornando rapidamente; o status do documento acompanha o processamento pelo frontend.

## Etapa 12: segurança e qualidade

- Helmet adiciona headers HTTP de segurança.
- CORS aceita somente a origem configurada em `WEB_URL` e credenciais por cookie.
- DTOs rejeitam propriedades não declaradas com `forbidNonWhitelisted`.
- Throttling global limita requisições a 100 por minuto por cliente.
- O guard valida assinatura, `sub` e `email` do JWT antes de autorizar a requisição.
- Processos, documentos, findings, resumo e conversa validam propriedade no backend.
- Arquivos são validados por MIME type, extensão, assinatura `%PDF-`, quantidade e tamanho.
- Senhas usam Argon2 e a sessão usa cookie `HttpOnly`.
- `npm run build:api` e `npm run build:web` são os checks de compilação atuais.
- O `npm audit` do ambiente ainda reporta vulnerabilidades transitivas altas; não foi aplicado `npm audit fix` automaticamente para evitar breaking changes sem revisão.

## Etapa 13: preparação para produção

- Lint do frontend sem warnings.
- Testes unitários do guard JWT cobrindo ausência de sessão, payload inválido e autenticação válida.
- Execute `npm run test:api` para rodar os testes do backend.
- Execute `npm run build:api` e `npm run build:web` antes de publicar.
- O próximo trabalho recomendado é ampliar testes de autorização, upload e isolamento entre processos, além de revisar a cadeia Prisma/CLI antes de produção.

## Segurança

A API valida a propriedade do processo no backend; o frontend não é tratado como camada de segurança. A chave Gemini ficará somente no backend, por meio de `GEMINI_API_KEY`, quando a integração for implementada. Documentos reais não devem ser usados durante o desenvolvimento inicial.

## Configuração da Gemini

Defina `GEMINI_API_KEY` somente em `apps/api/.env`. A variável `GEMINI_MODEL` permite trocar o modelo sem alterar código, e `AI_PROVIDER` deve permanecer como `gemini` nesta versão. A chave não é incluída nas respostas da API nem enviada ao frontend.

O endpoint autenticado `GET /api/ai/status` informa apenas o nome do provedor e se ele está configurado. A API pode iniciar sem chave, mas chamadas reais à IA serão recusadas até que `GEMINI_API_KEY` seja preenchida.

## Próximas etapas

A próxima etapa é o dashboard funcional com criação, listagem e visualização de processos. Upload, armazenamento privado, análise de documentos e Gemini serão adicionados somente nas etapas seguintes.
