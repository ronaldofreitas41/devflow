/**
 * Seed opcional de demonstração. Cria (ou recria) apenas o usuário demo e os dados dele —
 * nunca toca em outros usuários. As telas continuam lendo tudo do banco normalmente.
 *
 *   npm run db:seed
 *   login: demo@devflow.dev / devflow123
 */
import "dotenv/config";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";
import { addDays, dayKey, endOfDay, startOfDay } from "../src/lib/dates";

const DEMO_EMAIL = "demo@devflow.dev";
const DEMO_PASSWORD = "devflow123";

// Gerador determinístico para que o seed seja reprodutível.
let state = 42;
const rand = () => ((state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const between = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1));

const PROJECTS = [
  { name: "API de pagamentos", color: "#8b5cf6", status: "ACTIVE", description: "Migração do checkout para o novo gateway com webhooks idempotentes." },
  { name: "Portfólio pessoal", color: "#3b82f6", status: "ACTIVE", description: "Novo layout, estudos de caso e otimização de Core Web Vitals." },
  { name: "App mobile — onboarding", color: "#10b981", status: "ACTIVE", description: "Fluxo de cadastro em 3 passos e testes de usabilidade." },
  { name: "Estudos: sistemas distribuídos", color: "#f59e0b", status: "PAUSED", description: "Leituras sobre consenso, filas e consistência eventual." },
  { name: "Design system", color: "#ec4899", status: "COMPLETED", description: "Tokens, componentes base e documentação." },
] as const;

const TASK_TITLES = [
  "Mapear eventos de webhook",
  "Escrever testes de integração do checkout",
  "Revisar PR de refatoração do carrinho",
  "Configurar retry com backoff exponencial",
  "Documentar contrato da API",
  "Ajustar contraste do tema escuro",
  "Otimizar imagens do hero",
  "Escrever estudo de caso do DevFlow",
  "Implementar tela de boas-vindas",
  "Validar fluxo com 5 usuários",
  "Corrigir bug de teclado no Android",
  "Ler capítulo sobre Raft",
  "Resumir artigo sobre CRDTs",
  "Criar componente de tabela responsiva",
  "Revisar tokens de espaçamento",
  "Atualizar dependências",
  "Configurar CI com testes",
  "Preparar apresentação da sprint",
  "Investigar lentidão no dashboard",
  "Adicionar índices no Postgres",
  "Planejar roadmap do trimestre",
  "Responder issues abertas",
  "Refinar mensagens de erro",
  "Criar seed de demonstração",
];

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "URGENT"];

async function main() {
  const existing = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) await db.user.delete({ where: { id: existing.id } }); // cascata remove os dados do demo

  const { user } = await auth.api.signUpEmail({ body: { name: "Dev Demo", email: DEMO_EMAIL, password: DEMO_PASSWORD } });
  const userId = user.id;
  const now = new Date();
  const today = dayKey(now);

  const projects = [];
  for (const [i, p] of PROJECTS.entries()) {
    projects.push(
      await db.project.create({
        data: {
          userId,
          name: p.name,
          description: p.description,
          color: p.color,
          status: p.status,
          startDate: startOfDay(addDays(today, -80 + i * 6)),
          dueDate: i < 3 ? endOfDay(addDays(today, 10 + i * 12)) : null,
          createdAt: startOfDay(addDays(today, -80 + i * 6)),
        },
      }),
    );
  }

  // ~70 tarefas espalhadas nos últimos 60 dias
  for (let i = 0; i < 70; i++) {
    const createdDaysAgo = between(0, 60);
    const createdAt = new Date(startOfDay(addDays(today, -createdDaysAgo)).getTime() + between(8, 20) * 3_600_000);
    if (createdAt > now) continue;
    const project = rand() < 0.85 ? pick(projects) : null;
    const roll = rand();
    let status: TaskStatus = roll < 0.55 ? "DONE" : roll < 0.75 ? "IN_PROGRESS" : "TODO";
    if (project?.status === "COMPLETED") status = "DONE";
    let completedAt: Date | null = null;
    if (status === "DONE") {
      const maxDays = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000));
      completedAt = new Date(createdAt.getTime() + between(0, Math.min(maxDays, 10)) * 86_400_000 + between(1, 6) * 3_600_000);
      if (completedAt > now) completedAt = new Date(now.getTime() - between(5, 120) * 60_000);
    }
    const dueOffset = between(-8, 20);
    await db.task.create({
      data: {
        userId,
        projectId: project?.id ?? null,
        title: pick(TASK_TITLES),
        description: rand() < 0.5 ? "Detalhes, links e critérios de aceite combinados com o time." : null,
        priority: pick(PRIORITIES),
        status,
        completedAt,
        dueDate: rand() < 0.7 ? endOfDay(addDays(dayKey(createdAt), Math.max(1, dueOffset + 6))) : null,
        position: i * 1000,
        createdAt,
      },
    });
  }

  // Sessões de foco: 0–4 por dia útil, nos últimos 60 dias
  const tasks = await db.task.findMany({ where: { userId }, select: { id: true, projectId: true } });
  for (let d = 60; d >= 0; d--) {
    const key = addDays(today, -d);
    const dow = new Date(`${key}T12:00:00Z`).getUTCDay();
    const count = dow === 0 || dow === 6 ? between(0, 1) : between(1, 4);
    for (let s = 0; s < count; s++) {
      const planned = pick([25, 25, 25, 50, 15]);
      const startedAt = new Date(startOfDay(key).getTime() + (9 + s * 2) * 3_600_000 + between(0, 40) * 60_000);
      const durationSeconds = Math.round(planned * 60 * (rand() < 0.8 ? 1 : 0.6 + rand() * 0.3));
      if (startedAt.getTime() + durationSeconds * 1000 > now.getTime()) continue;
      const task = rand() < 0.6 ? pick(tasks) : null;
      await db.focusSession.create({
        data: {
          userId,
          plannedMinutes: planned,
          status: "COMPLETED",
          startedAt,
          endedAt: new Date(startedAt.getTime() + durationSeconds * 1000),
          durationSeconds,
          taskId: task?.id ?? null,
          projectId: task?.projectId ?? (rand() < 0.5 ? pick(projects).id : null),
        },
      });
    }
  }

  const recent = [
    ["PROJECT_CREATED", "App mobile — onboarding", 52],
    ["TASK_COMPLETED", "Adicionar índices no Postgres", 30],
    ["FOCUS_COMPLETED", "25 min de foco", 22],
    ["TASK_CREATED", "Investigar lentidão no dashboard", 14],
    ["TASK_COMPLETED", "Revisar PR de refatoração do carrinho", 6],
    ["FOCUS_COMPLETED", "50 min de foco", 3],
  ] as const;
  for (const [type, label, hoursAgo] of recent) {
    await db.activity.create({ data: { userId, type, label, createdAt: new Date(now.getTime() - hoursAgo * 3_600_000) } });
  }

  const counts = await Promise.all([db.project.count({ where: { userId } }), db.task.count({ where: { userId } }), db.focusSession.count({ where: { userId } })]);
  console.log(`Seed concluído: ${counts[0]} projetos, ${counts[1]} tarefas, ${counts[2]} sessões.`);
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
