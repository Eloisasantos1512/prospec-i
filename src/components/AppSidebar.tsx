import { Link, useLocation } from "react-router-dom";
import { useUnit } from "@/contexts/UnitContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard, Search, FileBarChart, ShieldCheck,
  Settings, Beaker, Sun, Moon, ChevronRight, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LAB = [
  { label: "Dashboard",      path: "/",              icon: LayoutDashboard },
  { label: "Prospecção Lab", path: "/prospeccao",    icon: Search },
  { label: "Relatórios",     path: "/relatorios",    icon: FileBarChart },
  { label: "Configurações",  path: "/configuracoes", icon: Settings },
];
const NAV_OCP = [
  { label: "Dashboard",       path: "/",              icon: LayoutDashboard },
  { label: "Prospecção OCP",  path: "/prospeccao",    icon: Search },
  { label: "Certificação",    path: "/certificacao",  icon: ShieldCheck },
  { label: "Relatórios",      path: "/relatorios",    icon: FileBarChart },
  { label: "Configurações",   path: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { unit, setUnit } = useUnit();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const nav = unit === "lab" ? NAV_LAB : NAV_OCP;

  return (
    <aside className="w-60 shrink-0 min-h-screen flex flex-col"
      style={{ background:"hsl(var(--sidebar))", borderRight:"1px solid hsl(var(--sidebar-border))" }}>

      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom:"1px solid hsl(var(--sidebar-border))" }}>
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-black tracking-tight shrink-0",
          unit === "lab" ? "bg-gradient-to-br from-red-700 to-red-900" : "bg-gradient-to-br from-blue-600 to-blue-900")}>
          {unit === "lab" ? "SL" : "OCP"}
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color:"hsl(var(--sidebar-foreground))" }}>
            {unit === "lab" ? "SCITEC Lab" : "SCITEC OCP"}
          </p>
          <p className="text-[10px]" style={{ color:"hsl(var(--sidebar-muted))" }}>
            {unit === "lab" ? "Laboratório" : "Certificadora"}
          </p>
        </div>
      </div>

      {/* Toggle Módulo */}
      <div className="px-4 py-3" style={{ borderBottom:"1px solid hsl(var(--sidebar-border))" }}>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background:"hsl(var(--sidebar-muted))" }}>
          <button onClick={() => setUnit("lab")}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all",
              unit === "lab"
                ? "bg-red-800 text-white shadow-sm"
                : "text-sidebar-foreground/60 hover:text-white")}
            style={{ color: unit !== "lab" ? "hsl(var(--sidebar-muted))" : undefined }}>
            <Beaker className="h-3 w-3" /> Lab
          </button>
          <button onClick={() => setUnit("ocp")}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all",
              unit === "ocp"
                ? "bg-blue-700 text-white shadow-sm"
                : "hover:text-white")}
            style={{ color: unit !== "ocp" ? "hsl(var(--sidebar-muted))" : undefined }}>
            <ShieldCheck className="h-3 w-3" /> OCP
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-3"
          style={{ color:"hsl(var(--sidebar-muted))" }}>
          Navegação
        </p>
        {nav.map(item => {
          const active = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                active ? "text-white" : "hover:bg-white/5")}
              style={{
                background: active ? "hsl(var(--sidebar-active))" : undefined,
                color: active ? "#fff" : "hsl(var(--sidebar-foreground))",
              }}>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 space-y-2" style={{ borderTop:"1px solid hsl(var(--sidebar-border))" }}>
        <button onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5"
          style={{ color:"hsl(var(--sidebar-foreground))" }}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
        </button>
        <div className="flex items-center gap-2 px-3 py-2">
          <Zap className="h-3 w-3 text-amber-400" />
          <p className="text-[10px]" style={{ color:"hsl(var(--sidebar-muted))" }}>
            Scitec Certificações
          </p>
        </div>
      </div>
    </aside>
  );
}
