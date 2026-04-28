import { useUnit } from "@/contexts/UnitContext";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Search, FileBarChart, ShieldCheck, Beaker, Settings, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const labItems = [
  { title: "Dashboard",       url: "/",              icon: LayoutDashboard },
  { title: "Prospecção Lab",  url: "/prospeccao",    icon: Search },
  { title: "Relatórios",      url: "/relatorios",    icon: FileBarChart },
  { title: "Configurações",   url: "/configuracoes", icon: Settings },
];

const ocpItems = [
  { title: "Dashboard",        url: "/",              icon: LayoutDashboard },
  { title: "Prospecção OCP",   url: "/prospeccao",    icon: Search },
  { title: "Certificação OCP", url: "/certificacao",  icon: ShieldCheck },
  { title: "Relatórios",       url: "/relatorios",    icon: FileBarChart },
  { title: "Configurações",    url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { unit, setUnit, unitLabel } = useUnit();
  const location = useLocation();
  const items = unit === "lab" ? labItems : ocpItems;

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-sm",
            unit === "lab" ? "bg-red-900" : "bg-blue-900"
          )}>
            {unit === "lab" ? "SL" : "OCP"}
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              {unit === "lab" ? "SCITEC Lab" : "SCITEC OCP"}
            </h1>
            <p className="text-[10px] text-muted-foreground">{unitLabel}</p>
          </div>
        </div>
      </div>

      {/* Toggle de módulo */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setUnit("lab")}
            className={cn(
              "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5",
              unit === "lab" ? "bg-red-900 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Beaker className="h-3 w-3" /> Lab
          </button>
          <button
            onClick={() => setUnit("ocp")}
            className={cn(
              "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5",
              unit === "ocp" ? "bg-blue-900 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldCheck className="h-3 w-3" /> OCP
          </button>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
          Navegação
        </p>
        {items.map((item) => {
          const active = item.url === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.url);
          return (
            <Link
              key={item.title}
              to={item.url}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
              {active && <ChevronRight className="h-3 w-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          {unit === "lab"
            ? "Scitec Certificações — Laboratório"
            : "Scitec Inspeções e Certificações — OCP"}
        </p>
      </div>
    </aside>
  );
}
