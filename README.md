# DevFlow

Gerenciador de projetos, tarefas e foco para desenvolvedores. Dashboard com indicadores reais, quadro Kanban persistido, temporizador de foco que sobrevive a recarregamentos e relatórios comparativos exportáveis em PDF.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · componentes no padrão shadcn/ui (Radix) · Better Auth · PostgreSQL (Neon) + Prisma 6 · Recharts · React Hook Form + Zod · Lucide · jsPDF · Vitest.

## Funcionalidades

| Área | O que faz |
| --- | --- |
| **Dashboard** | Projetos ativos, tarefas pendentes, concluídas e horas de foco na semana com variação vs. semana anterior; produtividade diária (7 dias), horas por semana (8 semanas), tarefas prioritárias e atividade recente. |
| **Projetos** | CRUD com nome, descrição, cor, status, início e prazo opcional. Busca, filtro por status e progresso calculado pelas tarefas concluídas. |
| **Tarefas** | CRUD com projeto opcional, prioridade, status e vencimento. Busca, filtros, ordenação e paginação **no servidor**. Lista e Kanban com arrastar-e-soltar; ordem e coluna persistidas no banco. No mobile, mover pelo menu ⋯ (também acessível por teclado). |
| **Foco** | Iniciar, pausar, retomar, finalizar e descartar. Duração configurável (padrão 25 min), vínculo opcional com projeto/tarefa, histórico e gráfico por período. A duração é calculada a partir de timestamps persistidos (`startedAt`, `pausedAt`, `totalPausedMs`), então recarregar a página não perde a sessão. |
| **Relatórios** | Filtro por período e projeto; concluídas, pendentes, atrasadas e horas focadas; gráfico diário, distribuição por prioridade, projetos mais ativos e comparação com o período anterior equivalente. PDF com indicadores, tabelas e data de geração. |

### Definições dos indicadores

Calculadas no servidor por uma função pura (`src/server/services/report-calc.ts`), usada igualmente por dashboard, relatório e PDF:

- **Concluídas** — tarefas com `completedAt` dentro do período.
- **Pendentes** — tarefas criadas até o fim do período e ainda abertas naquele momento.
- **Atrasadas** — pendentes cujo prazo já tinha vencido no fim do período.
- **Horas focadas** — soma das sessões de foco concluídas iniciadas no período.
- **Período anterior equivalente** — mesmo número de dias, imediatamente antes.
- "Fim do período" é o menor entre o fim do último dia e o instante atual. Dias e semanas (segunda a domingo) seguem `APP_TIMEZONE`.

O PDF é gerado a partir do **mesmo objeto** renderizado na tela, então os números coincidem por construção.

## Arquitetura

```
src/
  app/
    (auth)/login, signup         páginas públicas
    (app)/dashboard, projects,   páginas privadas (sessão validada no servidor)
          tasks, focus, reports
    api/auth/[...all]            handler do Better Auth
  proxy.ts                       redirecionamento otimista (presença do cookie)
  components/
    ui/                          primitivas (Button, Dialog, Select…)
    shared/                      cartões de KPI, filtros por URL, estados vazios, paginação
    charts/                      gráficos Recharts
    projects/ tasks/ focus/ dashboard/ reports/
  lib/                           db, auth, sessão, datas com fuso, cálculo do foco
  server/
    validators/                  schemas Zod (compartilhados com os formulários)
    services/                    regras de negócio e acesso a dados — sempre filtrando por userId
    actions/                     Server Actions: autenticam, validam, chamam serviços, revalidam
tests/                           Vitest (unidade + integração com Postgres real)
prisma/                          schema, migrations, seed
```

**Segurança:** a sessão é validada no servidor (`auth.api.getSession`, que consulta o banco) em toda página privada e toda Server Action. Todo serviço recebe `userId` e o aplica em cada consulta e atualização (`updateMany/deleteMany where { id, userId }`); vínculos com projeto/tarefa são verificados. Registro de outro usuário é tratado como inexistente. Nada de autenticação no `localStorage` — o único cookie escrito pelo cliente guarda a preferência de menu recolhido.

## Rodando localmente

Requisitos: Node 20.9+ e um Postgres (Neon ou local).

```bash
npm install                 # também roda `prisma generate`
cp .env.example .env        # preencha as variáveis
npm run db:migrate          # aplica as migrations (prisma migrate dev)
npm run db:seed             # opcional: dados de demonstração
npm run dev                 # http://localhost:3000
```

Conta demo do seed: `demo@devflow.dev` / `devflow123`. O seed recria apenas esse usuário e nunca toca em outros dados.

### Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Conexão usada pela aplicação. No Neon, use a URL *pooled*. |
| `DIRECT_URL` | Conexão direta, usada pelas migrations. |
| `BETTER_AUTH_SECRET` | Segredo de assinatura das sessões. Gere com `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | URL pública da aplicação (ex.: `https://devflow.vercel.app`). |
| `NEXT_PUBLIC_APP_URL` | Mesma URL, exposta ao cliente. |
| `APP_TIMEZONE` | Fuso usado para agrupar dias/semanas. Padrão `America/Sao_Paulo`. |
| `TEST_DATABASE_URL` | Banco exclusivo para testes — é **apagado** a cada execução. |

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` / `build` / `start` | Desenvolvimento, build de produção, servidor de produção |
| `npm run lint` · `npm run typecheck` | ESLint e TypeScript |
| `npm test` | Suíte Vitest |
| `npm run db:migrate` | Cria/aplica migrations em desenvolvimento |
| `npm run db:deploy` | Aplica migrations em produção (`prisma migrate deploy`) |
| `npm run db:seed` | Dados de demonstração |
| `npm run db:studio` | Prisma Studio |

## Testes

```bash
createdb devflow_test        # ou crie um branch/banco de testes no Neon
npm test
```

O *global setup* recria o schema do `TEST_DATABASE_URL` aplicando as migrations SQL e roda os arquivos em série. A suíte cobre:

- **Autenticação** — cadastro com senha em hash, e-mail duplicado, senha errada, sessão validada no servidor, logout invalidando a sessão, cookie forjado.
- **Isolamento entre usuários** — listagens, leitura por ID, edição, exclusão, movimentação no Kanban (inclusive IDs misturados), vínculos com projeto/tarefa alheios, controle de sessão de foco e relatórios filtrados por projeto alheio.
- **CRUD** — projetos (com progresso e exclusão que preserva tarefas), tarefas (`completedAt`, filtros, ordenação, paginação, Kanban, log de atividades), sessões de foco (pausa/retomada, limite ao planejado, cancelamento) e validação Zod.
- **Cálculos dos relatórios** — definições de concluídas/pendentes/atrasadas, fuso horário, período anterior, série diária, prioridade, ranking de projetos e dashboard.

## Deploy (Vercel + Neon)

1. Crie um projeto no [Neon](https://neon.tech) e copie as URLs *pooled* e *direct*.
2. Importe o repositório na Vercel e configure as variáveis acima (`BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL` com o domínio final).
3. Aplique as migrations no banco de produção: `npm run db:deploy` (localmente apontando para o Neon, ou como passo de CI antes do deploy).
4. O build da Vercel roda `prisma generate && next build`. Opcionalmente, rode o seed para ter uma conta demo pública.

O Prisma Client usa `engineType = "client"` com o driver adapter `pg` — sem binário de query engine no runtime, o que funciona bem em ambientes serverless.
