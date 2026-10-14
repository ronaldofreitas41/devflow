import { BarChart3, FolderKanban, LayoutDashboard, ListChecks, Timer } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", short: "Início", icon: LayoutDashboard },
  { href: "/projects", label: "Projetos", short: "Projetos", icon: FolderKanban },
  { href: "/tasks", label: "Tarefas", short: "Tarefas", icon: ListChecks },
  { href: "/focus", label: "Foco", short: "Foco", icon: Timer },
  { href: "/reports", label: "Relatórios", short: "Relatórios", icon: BarChart3 },
] as const;
