import { useUnit } from "@/contexts/UnitContext";
import { isApiConfigured } from "@/lib/utils";
import { Link } from "react-router-dom";
import { SECTOR_STATS, OCP_SCOPES_DATA } from "@/lib/crmData";
import {
  TrendingUp, Users, Target, AlertCircle,
  ArrowRight, Search, Settings, Zap, Clock,
  CheckCircle, BarChart3, DollarSign, Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLOR_MAP: Record<string, { bar: string; bg: string; bd: string; tx: string }> = {
  blue:   { bar:"bg-blue-500",   bg:"bg-blue-50 dark:bg-blue-950/30",   bd:"border-blue-200 dark:border-blue-800",   tx:"text-blue-700 dark:text-blue-300" },
  green:  { bar:"bg-green-500",  bg:"bg-green-50 dark:bg-green-950/30", bd:"border-green-200 dark:border-green-800", tx:"text-green-700 dark:text-green-300" },
  purple: { bar:"bg-purple-500", bg:"bg-purple-50 dark:bg-purple-950/30",bd:"border-purple-200 dark:border-purple-800",tx:"text-purple-700 dark:text-purple-300" },
  violet: { bar:"bg-violet-500", bg:"bg-violet-50 dark:bg-violet-950/30",bd:"border-violet-200 dark:border-violet-800",tx:"text-violet-700 dark:text-violet-300" },
  indigo: { bar:"bg-indigo-500", bg:"bg-indigo-50 dark:bg-indigo-950/30",bd:"border-indigo-200 dark:border-indigo-800",tx:"text-indigo-700 dark:text-indigo-300" },
  amber:  { bar:"bg-amber-500",  bg:"bg-amber-50 dark:bg-amber-950/30", bd:"border-amber-200 dark:border-amber-800", tx:"text-amber-700 dark:text-amber-300" },
};

// Alertas de recertificação baseados na planilha (5 anos desde 2021)
const RECER_ALERTS = [
  { empresa:"Walter Indústria de Fundidos", portaria:"Portaria 145/2022", produto:"Bateria Chumbo-Ácido", vencimento:"Jun 2026", urgencia:"alta" },
  { empresa:"Saeron Automotive Beijing", portaria:"Portaria 145/2022", produto:"Material de Atrito", vencimento:"Ago 2026", urgencia:"alta" },
  { empresa:"Mando Iksan Plant", portaria:"Portaria 145/2022", produto:"Amortecedor", vencimento:"Nov 2026", urgencia:"media" },
  { empresa:"KB Autosys Co., Ltd.", portaria:"Portaria 145/2022", produto:"Material de Atrito", vencimento:"Dez 2026", urgencia:"media" },
  { empresa:"PRIMAX Corporation", portaria:"Portaria 145/2022", produto:"Barra de Direção", vencimento:"Jan 2027", urgencia:"baixa" },
];

export default function Dashboard() {
  const { unit } = useUnit();
  const apis = ["SERPER_API_KEY","HUNTER_API_KEY","APOLLO_API_KEY"].filter(isApiConfigured).length;

  // Totals from real spreadsheet data
  const totalProps = 405;
  const aprovadas  = 201;
  const ticketTotal = 689472 + 117491 + 255043 + 55642 + 17858;
  const taxaGeral  = Math.round(aprovadas / totalProps * 100);

  return (
    <div className="space-y-7 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {unit === "lab" ? "Lab — Inteligência de Mercado" : "OCP — Inteligência de Mercado"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Base real: {totalProps} propostas · {aprovadas} aprovadas · R${(ticketTotal/1000).toFixed(0)}k faturado
          </p>
        </div>
        <Link to="/prospeccao"
          className="flex items-center gap-2 px-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 shadow-sm transition-all">
          <Search className="h-4 w-4" /> Buscar Lookalike
        </Link>
      </div>

      {/* APIs banner */}
      {apis < 3 && (
        <div className="flex items-start gap-4 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/60">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{apis}/3 APIs configuradas</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Configure Serper + Apollo + Hunter para busca automática de lookalikes.</p>
          </div>
          <Link to="/configuracoes" className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 shrink-0">
            Configurar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* KPIs reais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Propostas", value:String(totalProps), sub:"desde 2021", icon:Users, grad:"from-blue-500 to-blue-700" },
          { label:"Aprovadas", value:String(aprovadas), sub:`${taxaGeral}% conversão`, icon:CheckCircle, grad:"from-green-500 to-green-700" },
          { label:"Faturamento", value:`R$${(ticketTotal/1000).toFixed(0)}k`, sub:"total acumulado", icon:DollarSign, grad:"from-violet-500 to-violet-700" },
          { label:"Recertificações", value:"5", sub:"vencendo em 2026", icon:Repeat, grad:"from-amber-500 to-orange-600" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c.label}</span>
              <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-sm`}>
                <c.icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black tracking-tight">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Alertas de recertificação */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-500" />
          <h2 className="font-bold text-foreground">Alertas de Recertificação</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
            {RECER_ALERTS.filter(a=>a.urgencia==="alta").length} urgentes
          </span>
        </div>
        <div className="divide-y divide-border">
          {RECER_ALERTS.map((a, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <div className={cn("h-2 w-2 rounded-full shrink-0",
                a.urgencia==="alta"?"bg-red-500":a.urgencia==="media"?"bg-amber-500":"bg-green-500")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{a.empresa}</p>
                <p className="text-xs text-muted-foreground">{a.produto} · {a.portaria}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={cn("text-xs font-bold",
                  a.urgencia==="alta"?"text-red-600 dark:text-red-400":a.urgencia==="media"?"text-amber-600 dark:text-amber-400":"text-green-600 dark:text-green-400")}>
                  {a.vencimento}
                </p>
                <p className="text-[10px] text-muted-foreground">recertificar</p>
              </div>
              <Link to="/prospeccao"
                className="shrink-0 flex items-center gap-1 px-2.5 h-7 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 border border-primary/20">
                <Zap className="h-3 w-3" />Contatar
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Performance por setor — dados reais */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground">Performance por Setor</h2>
          <span className="text-xs text-muted-foreground">dados reais da planilha</span>
        </div>
        <div className="p-5 space-y-4">
          {SECTOR_STATS.map(s => {
            const c = COLOR_MAP[s.cor] || COLOR_MAP.blue;
            return (
              <div key={s.sigla} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold px-1.5 py-0.5 rounded-md", c.bg, c.tx)}>{s.sigla}</span>
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="text-muted-foreground">({s.total} propostas)</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-green-600 dark:text-green-400 font-bold">{s.taxa}% conv.</span>
                    <span>R${(s.ticket_total/1000).toFixed(0)}k</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-2 rounded-full transition-all", c.bar)} style={{ width: `${s.taxa}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Escopos OCP de maior ROI */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Escopos de Maior Conversão — OCP
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {OCP_SCOPES_DATA.slice(0,3).map(s => {
            const c = COLOR_MAP[s.color] || COLOR_MAP.blue;
            return (
              <Link key={s.id} to="/prospeccao"
                className={cn("flex flex-col gap-3 p-4 rounded-2xl border hover:shadow-md transition-all", c.bg, c.bd)}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl">{s.icon}</span>
                    <h3 className={cn("font-bold text-sm mt-1", c.tx)}>{s.label}</h3>
                    <p className="text-xs text-muted-foreground">{s.portaria}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-2xl font-black", c.tx)}>{s.taxa_conversao}%</p>
                    <p className="text-[10px] text-muted-foreground">conversão</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ticket médio</span>
                  <span className={cn("font-bold", c.tx)}>R${s.ticket_medio.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                  <div className={cn("h-1.5 rounded-full", { blue:"bg-blue-500",amber:"bg-amber-500",teal:"bg-teal-500",violet:"bg-violet-500",green:"bg-green-500",indigo:"bg-indigo-500",purple:"bg-purple-500" }[s.color])}
                    style={{ width:`${s.taxa_conversao}%` }} />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <ArrowRight className="h-3 w-3" />{s.sub}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to:"/prospeccao", icon:Target, label:"Lookalike Search", desc:"Buscar indústrias similares às aprovadas", color:"bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60", ic:"text-blue-600" },
          { to:"/relatorios", icon:TrendingUp, label:"Relatórios", desc:"Exportar pipeline e análise de conversão", color:"bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/60", ic:"text-green-600" },
          { to:"/configuracoes", icon:Settings, label:"APIs", desc:`${apis}/3 APIs ativas`, color:"bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60", ic:"text-purple-600" },
        ].map(a => (
          <Link key={a.to} to={a.to}
            className={cn("flex items-center gap-4 p-5 rounded-2xl border hover:shadow-md transition-all group", a.color)}>
            <div className="h-11 w-11 rounded-xl bg-white dark:bg-card border border-border flex items-center justify-center shadow-sm shrink-0">
              <a.icon className={`h-5 w-5 ${a.ic}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">{a.label}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>
        ))}
      </div>
    </div>
  );
}
