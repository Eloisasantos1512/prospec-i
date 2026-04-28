import { useUnit } from "@/contexts/UnitContext";
import { isApiConfigured } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  TrendingUp, Users, Target, FileBarChart,
  AlertCircle, ArrowRight, CheckCircle,
  Search, Settings, Zap
} from "lucide-react";

const LEADS_LAB = [
  { label: "Total Leads",    value: "1.000", sub: "+12% este mês", icon: Users,       color: "from-blue-500 to-blue-700" },
  { label: "Vendidas",       value: "101",   sub: "Taxa: 34%",     icon: TrendingUp,  color: "from-green-500 to-green-700" },
  { label: "Em Andamento",   value: "605",   sub: "Nurturing ativo", icon: Target,    color: "from-amber-500 to-orange-600" },
  { label: "Perdidas",       value: "294",   sub: "Reativar: 48",  icon: FileBarChart,color: "from-red-500 to-red-700" },
];
const LEADS_OCP = [
  { label: "Portaria 145",   value: "490",   sub: "Automotivos",   icon: Users,       color: "from-blue-500 to-blue-700" },
  { label: "Portaria 384",   value: "29",    sub: "Eletromédicos", icon: FileBarChart,color: "from-purple-500 to-purple-700" },
  { label: "Certificadas",   value: "312",   sub: "Vigentes",      icon: CheckCircle, color: "from-green-500 to-green-700" },
  { label: "Vencendo",       value: "207",   sub: "Próx. 90 dias", icon: Target,      color: "from-amber-500 to-orange-600" },
];

export default function Dashboard() {
  const { unit } = useUnit();
  const cards = unit === "lab" ? LEADS_LAB : LEADS_OCP;
  const apis  = ["SERPER_API_KEY","HUNTER_API_KEY","APOLLO_API_KEY"].filter(isApiConfigured).length;

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {unit === "lab" ? "Laboratório — Dashboard" : "OCP — Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inteligência comercial · Scitec Certificações
          </p>
        </div>
        <Link to="/prospeccao"
          className="flex items-center gap-2 px-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
          <Search className="h-4 w-4" /> Nova prospecção
        </Link>
      </div>

      {/* Banner APIs */}
      {apis < 3 && (
        <div className="flex items-start gap-4 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/60">
          <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
              {apis}/3 APIs configuradas
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Configure Serper, Hunter e Apollo para ativar o enriquecimento automático de leads.
            </p>
          </div>
          <Link to="/configuracoes"
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors shrink-0">
            Configurar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-all hover:shadow-md group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c.label}</span>
              <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shadow-sm`}>
                <c.icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black text-foreground tracking-tight">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Acesso rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { to:"/prospeccao", icon:Search, label:"Buscar Leads", desc:"CNAE · Normas · Portarias", color:"bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60", ic:"text-blue-600" },
            { to:"/relatorios", icon:FileBarChart, label:"Relatórios", desc:"Exportar e analisar dados", color:"bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/60", ic:"text-green-600" },
            { to:"/configuracoes", icon:Settings, label:"Configurações", desc:`${apis}/3 APIs ativas`, color:"bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60", ic:"text-purple-600" },
          ].map((a) => (
            <Link key={a.to} to={a.to}
              className={`flex items-center gap-4 p-5 rounded-2xl border ${a.color} hover:shadow-md transition-all group`}>
              <div className="h-11 w-11 rounded-xl bg-white dark:bg-card border border-border flex items-center justify-center shadow-sm shrink-0">
                <a.icon className={`h-5 w-5 ${a.ic}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
        </div>
      </div>

      {/* ICP Footer */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
        <Zap className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Persona ICP ativa:</strong>{" "}
          Fabricantes de implantes ortopédicos, dispositivos médicos e equipamentos estéreis.
          Decisores-alvo: Qualidade · Regulatório · P&D · Compras.
        </p>
      </div>
    </div>
  );
}
