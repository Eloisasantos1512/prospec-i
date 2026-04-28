import { useUnit } from "@/contexts/UnitContext";
import { isApiConfigured } from "@/lib/utils";
import { AlertCircle, CheckCircle, TrendingUp, Users, FileBarChart, Target } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { unit } = useUnit();

  const apisOk = ["SERPER_API_KEY","HUNTER_API_KEY","APOLLO_API_KEY"].filter(isApiConfigured).length;

  const stats = unit === "lab"
    ? [
        { label: "Total Leads", value: "1.000", icon: Users, color: "text-blue-600" },
        { label: "Vendidas", value: "101", icon: TrendingUp, color: "text-green-600" },
        { label: "Em Andamento", value: "605", icon: Target, color: "text-yellow-600" },
        { label: "Perdidas", value: "294", icon: FileBarChart, color: "text-red-600" },
      ]
    : [
        { label: "Portaria 145", value: "490", icon: Users, color: "text-blue-600" },
        { label: "Portaria 384", value: "29", icon: FileBarChart, color: "text-purple-600" },
        { label: "Certificadas", value: "312", icon: CheckCircle, color: "text-green-600" },
        { label: "Pendentes", value: "207", icon: Target, color: "text-yellow-600" },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel de Inteligência</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral · {unit === "lab" ? "Laboratório" : "Certificadora OCP"}
        </p>
      </div>

      {/* Aviso de APIs */}
      {apisOk < 3 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <strong className="text-yellow-800 dark:text-yellow-400">
              {apisOk}/3 APIs configuradas
            </strong>
            <span className="text-yellow-700 dark:text-yellow-500">
              {" "}— Configure as chaves em{" "}
              <Link to="/configuracoes" className="underline font-medium">Configurações</Link>
              {" "}para ativar o enriquecimento automático de leads.
            </span>
          </div>
        </div>
      )}

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-3xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/prospeccao" className="group bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Nova Prospecção</h3>
          </div>
          <p className="text-sm text-muted-foreground">Buscar leads por CNPJ, CNAE ou palavra-chave</p>
        </Link>

        <Link to="/relatorios" className="group bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <FileBarChart className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-foreground">Relatórios</h3>
          </div>
          <p className="text-sm text-muted-foreground">Exportar e analisar dados de prospecção</p>
        </Link>
      </div>
    </div>
  );
}
