import { useState } from "react";
import { useUnit } from "@/contexts/UnitContext";
import {
  getKey, serperSearchWithFallback, apolloSearchCompanies,
  enrichLeadPipeline, SerperResult, SearchLog, LeadType, extractDomain,
} from "@/lib/api";
import {
  OCP_SCOPES_DATA, LAB_SCOPES_DATA, LOOKALIKE_REFS,
  checkCrmMatch, LookalikeRef,
} from "@/lib/crmData";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Search, Loader2, AlertCircle, ExternalLink, ChevronDown, ChevronUp,
  Zap, Target, User, Star, RefreshCw, Download, Filter, X,
  CheckCircle, XCircle, Building2, Briefcase, ArrowRight,
  ShieldCheck, Factory, Package, Users, Repeat,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────
type Color = "violet"|"blue"|"teal"|"green"|"indigo"|"amber"|"purple";
const PAL: Record<Color,{bg:string;bd:string;tx:string;dot:string;tag:string}> = {
  violet:{ bg:"bg-violet-50 dark:bg-violet-950/30", bd:"border-violet-300 dark:border-violet-700", tx:"text-violet-700 dark:text-violet-300", dot:"bg-violet-500", tag:"bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  blue:  { bg:"bg-blue-50 dark:bg-blue-950/30",     bd:"border-blue-300 dark:border-blue-700",     tx:"text-blue-700 dark:text-blue-300",     dot:"bg-blue-500",   tag:"bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  teal:  { bg:"bg-teal-50 dark:bg-teal-950/30",     bd:"border-teal-300 dark:border-teal-700",     tx:"text-teal-700 dark:text-teal-300",     dot:"bg-teal-500",   tag:"bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  green: { bg:"bg-green-50 dark:bg-green-950/30",   bd:"border-green-300 dark:border-green-700",   tx:"text-green-700 dark:text-green-300",   dot:"bg-green-500",  tag:"bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  indigo:{ bg:"bg-indigo-50 dark:bg-indigo-950/30", bd:"border-indigo-300 dark:border-indigo-700", tx:"text-indigo-700 dark:text-indigo-300", dot:"bg-indigo-500", tag:"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  amber: { bg:"bg-amber-50 dark:bg-amber-950/30",   bd:"border-amber-300 dark:border-amber-700",   tx:"text-amber-700 dark:text-amber-300",   dot:"bg-amber-500",  tag:"bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  purple:{ bg:"bg-purple-50 dark:bg-purple-950/30", bd:"border-purple-300 dark:border-purple-700", tx:"text-purple-700 dark:text-purple-300", dot:"bg-purple-500", tag:"bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
};

const LEAD_STYLE: Record<LeadType, string> = {
  "Fabricante Verificado":    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700",
  "Indústria Nacional":       "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700",
  "Importador Verificado":    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-700",
  "Distribuidor B2B":         "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700",
  "Empresa":                  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600",
};

const LeadTypeIcon: Record<LeadType, typeof Factory> = {
  "Fabricante Verificado": Factory,
  "Indústria Nacional":    Building2,
  "Importador Verificado": ShieldCheck,
  "Distribuidor B2B":      Package,
  "Empresa":               Building2,
};

const ESTADOS = ["SP","MG","SC","RS","PR","RJ","GO","CE","PE","DF","BA","AM","PA","MT","MS"];

interface Lead extends SerperResult {
  estado?:          string;
  norma?:           string;
  motivo?:          string;
  portaria?:        string;
  icp_score?:       number;
  email?:           string | null;
  decisor?:         string | null;
  cargo?:           string | null;
  linkedin_pessoa?: string | null;
  linkedin_empresa?:string | null;
  empresa_apollo?:  string | null;
  industry?:        string | null;
  deliverable?:     boolean | null;
  company_verified?:boolean;
  fonte?:           "serper" | "apollo_direct";
  crm_match?:       { status: string; portaria: string; ticket: number };
  descartado?:      boolean;
  enriching?:       boolean;
  enriched?:        boolean;
}

function calcIcp(l: Lead): number {
  const t = (l.titulo + " " + l.snippet + " " + (l.industry||"")).toLowerCase();
  const kws = ["fabricante","indústria","autopeças","amortecedor","freio","transmissão","bomba","lâmpada","equipamento","médico","farmácia"];
  let s = kws.filter(k => t.includes(k)).length * 7;
  if (l.lead_type === "Fabricante Verificado") s += 15;
  if (l.company_verified) s += 12;
  if (l.email) s += 12; if (l.decisor) s += 18; if (l.deliverable) s += 8;
  if (l.crm_match) s -= 20; // já é cliente
  return Math.min(Math.max(s, 0), 100);
}

function IcpBadge({ score }: { score: number }) {
  if (score >= 75) return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700"><Star className="h-3 w-3 fill-amber-500 text-amber-500" />{score}</span>;
  if (score >= 45) return <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700"><Target className="h-3 w-3" />{score}</span>;
  return <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full border border-border">{score}</span>;
}

// ── Skeleton ─────────────────────────────────────────────────────────
function SkeletonCard({ label }: { label: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-1.5"><div className="h-3 bg-muted rounded w-1/3" /><div className="h-2 bg-muted rounded w-1/4" /></div>
        <span className="text-[10px] text-muted-foreground italic">{label}</span>
      </div>
      <div className="px-5 py-4 flex gap-4">
        <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-muted rounded w-2/3" /><div className="h-2 bg-muted rounded w-full" />
          <div className="h-2 bg-muted rounded w-3/4" />
          <div className="flex gap-2 mt-3"><div className="h-5 w-24 bg-muted rounded-full" /><div className="h-5 w-12 bg-muted rounded-full" /></div>
        </div>
      </div>
    </div>
  );
}

// ── Log Panel ─────────────────────────────────────────────────────────
function LogPanel({ logs, visible, onClose }: { logs: SearchLog[]; visible: boolean; onClose: () => void }) {
  if (!visible || !logs.length) return null;
  const cols = { ok:"text-emerald-400", warn:"text-amber-400", error:"text-red-400" };
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 font-mono">PIPELINE LOG</span>
        <div className="flex items-center gap-2">
          <Loader2 className="h-3 w-3 text-emerald-500 animate-spin" />
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400"><X className="h-3.5 w-3.5"/></button>
        </div>
      </div>
      <div className="p-3 space-y-1.5 max-h-60 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px] font-mono">
            <span className={cn("shrink-0 font-bold", cols[log.status])}>{log.status==="ok"?"✓":log.status==="warn"?"⚠":"✗"}</span>
            <span className="text-gray-500 shrink-0">[{log.step}]</span>
            <span className={cn("flex-1", cols[log.status])}>{log.detail}</span>
            {log.count !== undefined && <span className="shrink-0 text-white font-bold">{log.count}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Prospeccao() {
  const { unit } = useUnit();
  const ocpScopes = OCP_SCOPES_DATA;
  const labScopes = LAB_SCOPES_DATA;
  const scopes = unit === "lab" ? labScopes : ocpScopes;

  const [scopeId,    setScopeId]    = useState(scopes[0].id);
  const [estados,    setEstados]    = useState<string[]>(["SP"]);
  const [termo,      setTermo]      = useState("");
  const [lookalike,  setLookalike]  = useState<LookalikeRef|null>(null);
  const [leads,      setLeads]      = useState<Lead[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [logs,       setLogs]       = useState<SearchLog[]>([]);
  const [showLogs,   setShowLogs]   = useState(false);
  const [skelStep,   setSkelStep]   = useState("");
  const [erro,       setErro]       = useState("");
  const [exp,        setExp]        = useState<number|null>(null);
  const [onlyICP,    setOnlyICP]    = useState(false);
  const [blacklist,  setBlacklist]  = useState<string[]>([]);

  const scope   = scopes.find(s => s.id === scopeId) || scopes[0];
  const palColor = (scope.color || "blue") as Color;
  const pal     = PAL[palColor];
  const temSerper = !!getKey("SERPER_API_KEY");

  const addLog = (l: SearchLog) => { setLogs(p => [...p.slice(-15), l]); setSkelStep(l.detail.slice(0,55)); };
  const toggle  = (uf: string) => setEstados(p => p.includes(uf)?p.filter(e=>e!==uf):[...p,uf]);

  function descartar(idx: number) {
    const lead = leads[idx];
    const dom = lead.dominio;
    if (dom) setBlacklist(p => [...p, dom]);
    setLeads(p => p.map((x,i) => i===idx ? {...x,descartado:true} : x));
    addLog({ step:"Treino", status:"ok", detail:`Domínio "${dom}" adicionado à blacklist da sessão` });
  }

  async function buscar(seedsOverride?: string[]) {
    if (!getKey("SERPER_API_KEY")) { setErro("Configure a SERPER_API_KEY em Configurações."); return; }
    if (!estados.length) { setErro("Selecione ao menos um estado."); return; }
    setLoading(true); setErro(""); setLeads([]); setLogs([]); setShowLogs(true);

    const seeds = seedsOverride || (lookalike ? lookalike.seeds : termo.trim() ? [termo.trim()] : (scope as any).seeds);
    const all: Lead[] = [];
    const seen = new Set<string>();

    try {
      for (const seed of seeds.slice(0,3)) {
        for (const uf of estados.slice(0,2)) {
          try {
            const results = await serperSearchWithFallback(seed, uf, addLog);
            for (const item of results) {
              const k = item.dominio || item.titulo;
              if (!seen.has(k) && !blacklist.includes(item.dominio)) {
                seen.add(k);
                const crm = checkCrmMatch(item.titulo);
                const lead: Lead = {
                  ...item,
                  estado:   uf,
                  norma:    scope.label,
                  motivo:   (scope as any).motivo,
                  portaria: (scope as any).portaria,
                  fonte:    "serper",
                  crm_match: crm.found ? { status: crm.status!, portaria: crm.portaria!, ticket: crm.ticket! } : undefined,
                  icp_score: 0,
                };
                lead.icp_score = calcIcp(lead);
                all.push(lead);
              }
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addLog({ step:"Serper", status:"error", detail: msg });
            if (msg.includes("inválida")) { setErro(msg); setLoading(false); return; }
          }
          await new Promise(r => setTimeout(r, 350));
        }
      }

      // Fallback Apollo direto
      if (all.length < 3 && getKey("APOLLO_API_KEY")) {
        const kws = (scope as any).apollo_kws || ["manufacturer","industry"];
        const apolloRes = await apolloSearchCompanies(kws, addLog);
        for (const company of apolloRes) {
          if (!seen.has(company.dominio) && !blacklist.includes(company.dominio)) {
            seen.add(company.dominio);
            const crm = checkCrmMatch(company.nome);
            const lead: Lead = {
              titulo: company.nome, site: company.site,
              snippet: company.industry || "", dominio: company.dominio,
              lead_type: "Indústria Nacional",
              estado: estados[0]||"BR", norma: scope.label,
              motivo: (scope as any).motivo, portaria: (scope as any).portaria,
              industry: company.industry, linkedin_empresa: company.linkedin,
              company_verified: true, fonte: "apollo_direct",
              crm_match: crm.found ? { status: crm.status!, portaria: crm.portaria!, ticket: crm.ticket! } : undefined,
              icp_score: 0,
            };
            lead.icp_score = calcIcp(lead);
            all.push(lead);
          }
        }
      }

      all.sort((a,b) => (b.icp_score||0) - (a.icp_score||0));
      setLeads(all);
      addLog({ step:"Resultado", status: all.length>0?"ok":"warn",
        detail: all.length>0
          ? `${all.length} empresas · ${all.filter(l=>l.lead_type==="Fabricante Verificado").length} fabricantes · ${all.filter(l=>l.crm_match).length} já na base`
          : "Nenhuma empresa encontrada",
        count: all.length });
      if (!all.length) setErro("Nenhuma empresa encontrada. Tente outro escopo, estado ou busca personalizada.");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setLoading(false);
      setTimeout(() => setShowLogs(false), 10000);
    }
  }

  async function enriquecer(idx: number) {
    const l = leads[idx];
    setLeads(p => p.map((x,i) => i===idx?{...x,enriching:true}:x));
    setShowLogs(true);
    addLog({ step:"Pipeline", status:"ok", detail:`Apollo + Hunter: "${l.titulo.slice(0,30)}"` });
    try {
      const data = await enrichLeadPipeline(l.titulo, l.site, l.dominio, addLog);
      const updated: Lead = {...l, ...data, enriching:false, enriched:true};
      updated.icp_score = calcIcp(updated);
      setLeads(p => p.map((x,i) => i===idx?updated:x));
    } catch {
      setLeads(p => p.map((x,i) => i===idx?{...x,enriching:false}:x));
    }
    setTimeout(() => setShowLogs(false), 6000);
  }

  async function enriquecerTodos() {
    const idxs = leads.map((_,i)=>i).filter(i=>!leads[i].enriched&&!leads[i].enriching&&!leads[i].descartado);
    for (const idx of idxs.slice(0,10)) { await enriquecer(idx); await new Promise(r=>setTimeout(r,900)); }
  }

  function exportCSV() {
    const rows = [
      ["Tipo","Status CRM","Decisor","Cargo","Email","Verificado","Empresa","Apollo","Setor","LinkedIn Empresa","LinkedIn Decisor","Site","Portaria","Norma","Estado","Score"],
      ...leads.filter(l=>!l.descartado).map(l=>[
        l.lead_type||"", l.crm_match?.status||"Novo",
        l.decisor||"",l.cargo||"",l.email||"",
        l.deliverable===true?"Sim":l.deliverable===false?"Não":"Pendente",
        l.titulo,l.empresa_apollo||"",l.industry||"",
        l.linkedin_empresa||"",l.linkedin_pessoa||"",l.site||"",
        l.portaria||"",l.norma||"",l.estado||"",String(l.icp_score||0),
      ]),
    ];
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
    a.download = `leads_${scope.id}.csv`; a.click();
  }

  const visible = leads.filter(l => {
    if (l.descartado) return false;
    if (onlyICP) return (l.icp_score||0) >= 45;
    return true;
  });

  const fabricantes = leads.filter(l=>l.lead_type==="Fabricante Verificado"&&!l.descartado).length;
  const novos       = leads.filter(l=>!l.crm_match&&!l.descartado).length;
  const jaNaBase    = leads.filter(l=>!!l.crm_match&&!l.descartado).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <LogPanel logs={logs} visible={showLogs} onClose={()=>setShowLogs(false)} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Prospecção {unit==="lab"?"Laboratório":"OCP"} — Lookalike Search
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Baseado em {unit==="ocp"?"201 aprovações reais · Portaria 145/2022 = 46% conv.":"histórico de fechamentos Lab"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {logs.length>0&&(
            <button onClick={()=>setShowLogs(!showLogs)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-card text-xs font-medium hover:bg-muted">
              📋 {showLogs?"Ocultar":"Ver"} log
            </button>
          )}
          {leads.length>0&&<>
            <button onClick={enriquecerTodos} className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted shadow-sm">
              <Zap className="h-3.5 w-3.5 text-amber-500"/>Enriquecer todos
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted shadow-sm">
              <Download className="h-3.5 w-3.5"/>CSV
            </button>
          </>}
        </div>
      </div>

      {!temSerper&&(
        <div className="flex items-start gap-4 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/60">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"/>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Configure a <strong>SERPER_API_KEY</strong> em{" "}
            <Link to="/configuracoes" className="underline font-semibold">Configurações</Link>.
          </p>
        </div>
      )}

      {/* Painel */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

        {/* Escopos */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {unit==="lab"?"Ensaio / Norma":"Portaria / Produto — dados reais da planilha"}
            </p>
            {unit==="ocp"&&<span className="text-[10px] text-muted-foreground">245 ref. na base · 46% conv. média</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {scopes.map(s => {
              const c = PAL[(s.color||"blue") as Color]; const active = scopeId===s.id;
              return (
                <button key={s.id} onClick={()=>{setScopeId(s.id);setLeads([]);setTermo("");setLookalike(null);}}
                  className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all",
                    active?`${c.bg} ${c.bd} ${c.tx}`:"border-border text-muted-foreground hover:bg-muted")}>
                  <span>{s.icon}</span>
                  <div>
                    <span className="block text-[13px] font-semibold">{s.label}</span>
                    <span className="block text-[10px] opacity-70">{s.sub}</span>
                  </div>
                  {active&&<div className={cn("h-1.5 w-1.5 rounded-full ml-1",pal.dot)}/>}
                </button>
              );
            })}
          </div>
          {(scope as any).portaria&&(
            <div className={cn("mt-3 flex items-start gap-2 px-3 py-2 rounded-xl border text-xs",pal.bg,pal.bd,pal.tx)}>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-0.5"/>
              <span><strong>Motivo:</strong> {(scope as any).motivo} · <strong>Portaria:</strong> {(scope as any).portaria} · <strong>Validade:</strong> {(scope as any).validade}</span>
            </div>
          )}
        </div>

        {/* Lookalike refs */}
        {unit==="ocp"&&(
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="h-3.5 w-3.5"/>Buscar similares a (Lookalike)
            </p>
            <div className="flex flex-wrap gap-2">
              {LOOKALIKE_REFS.map(ref=>(
                <button key={ref.nome}
                  onClick={()=>{setLookalike(lookalike?.nome===ref.nome?null:ref);setLeads([]);setTermo("");}}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    lookalike?.nome===ref.nome?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:bg-muted")}>
                  <Repeat className="h-3 w-3"/>
                  {ref.nome}
                </button>
              ))}
              {lookalike&&<button onClick={()=>setLookalike(null)} className="px-2 h-7 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted"><X className="h-3 w-3"/></button>}
            </div>
            {lookalike&&(
              <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                Buscando empresas com perfil similar a <strong>{lookalike.nome}</strong> · {lookalike.produto} · {lookalike.portaria}
              </div>
            )}
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Busca personalizada */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Busca personalizada <span className="font-normal opacity-60">(opcional)</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
              <input type="text" value={termo} onChange={e=>setTermo(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&buscar()}
                placeholder={`Ex: ${((scope as any).seeds||["fabricante automotivo"])[0]}`}
                className="w-full h-10 pl-9 pr-9 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"/>
              {termo&&<button onClick={()=>setTermo("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5"/></button>}
            </div>
          </div>

          {/* Estados */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Estados alvo</label>
            <div className="flex flex-wrap gap-1.5">
              {ESTADOS.map(uf=>(
                <button key={uf} onClick={()=>toggle(uf)}
                  className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                    estados.includes(uf)?`${pal.bg} ${pal.bd} ${pal.tx}`:"border-border text-muted-foreground hover:bg-muted")}>
                  {uf}
                </button>
              ))}
              <button onClick={()=>setEstados(ESTADOS)} className="px-2.5 py-1 rounded-lg text-xs border border-dashed border-border text-muted-foreground hover:bg-muted">Todos</button>
              <button onClick={()=>setEstados([])} className="px-2.5 py-1 rounded-lg text-xs border border-dashed border-border text-muted-foreground hover:bg-muted">Limpar</button>
            </div>
          </div>

          {/* APIs status */}
          <div className="grid grid-cols-3 gap-2">
            {[{n:"01",l:"Serper",d:"intitle:fabricante",i:"🔍",k:"SERPER_API_KEY"},{n:"02",l:"Apollo",d:"Company+Decisor",i:"👤",k:"APOLLO_API_KEY"},{n:"03",l:"Hunter",d:"E-mail válido",i:"✉️",k:"HUNTER_API_KEY"}].map(s=>{
              const ok=!!getKey(s.k);
              return(
                <div key={s.n} className={cn("flex items-center gap-2 p-2.5 rounded-xl border text-xs",ok?"bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800":"bg-muted border-border")}>
                  <span>{s.i}</span>
                  <div>
                    <p className={cn("font-bold text-[11px]",ok?"text-green-700 dark:text-green-400":"text-muted-foreground")}>{s.n}·{s.l} {ok?"✓":"—"}</p>
                    <p className="text-[10px] text-muted-foreground">{s.d}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Blacklist da sessão */}
          {blacklist.length>0&&(
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">🚫 Blacklist sessão ({blacklist.length}):</span>
              {blacklist.slice(0,3).map(d=><span key={d} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded text-[10px]">{d}</span>)}
            </div>
          )}

          {/* Progresso */}
          {loading&&skelStep&&(
            <div className={cn("rounded-xl p-3 border text-[11px] font-medium flex items-center gap-2",pal.bg,pal.bd,pal.tx)}>
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0"/>{skelStep}
            </div>
          )}

          {/* Botão */}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={()=>buscar()} disabled={loading}
              className="flex items-center gap-2 px-6 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 shadow-sm active:scale-95 transition-all">
              {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Search className="h-4 w-4"/>}
              {loading?"Localizando fabricantes...":lookalike?`Buscar similar a ${lookalike.nome}`:"Buscar Leads"}
            </button>
            {leads.length>0&&(
              <button onClick={()=>{setLeads([]);setExp(null);setLogs([]);}}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted">
                <RefreshCw className="h-3.5 w-3.5"/>Nova busca
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Erro */}
      {erro&&!loading&&(
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 space-y-2">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300 text-sm font-medium">
            <AlertCircle className="h-4 w-4 shrink-0"/>{erro}
          </div>
          {logs.length>0&&(
            <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-700 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400">Pipeline log:</p>
              {logs.map((l,i)=><p key={i} className="text-[11px] font-mono text-red-500 dark:text-red-400">[{l.step}] {l.detail}{l.count!==undefined?` → ${l.count}`:""}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Skeletons */}
      {loading&&(
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin"/>
            Localizando fabricantes → Identificando decisores → Verificando e-mails...
          </p>
          {["Localizando indústrias...","Identificando decisores técnicos...","Verificando e-mails..."].map((s,i)=><SkeletonCard key={i} label={s}/>)}
        </div>
      )}

      {/* Resultados */}
      {leads.length>0&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold">{visible.length} empresas</span>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700">
                <Factory className="h-3 w-3 inline mr-1"/>{fabricantes} fabricantes
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3 text-blue-500"/>{novos} novos</span>
              {jaNaBase>0&&<span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"><Repeat className="h-3 w-3"/>{jaNaBase} já na base</span>}
            </div>
            <button onClick={()=>setOnlyICP(!onlyICP)}
              className={cn("flex items-center gap-1.5 px-3 h-8 rounded-xl border text-xs font-medium transition-all",
                onlyICP?`${pal.bg} ${pal.bd} ${pal.tx}`:"border-border text-muted-foreground hover:bg-muted")}>
              <Filter className="h-3 w-3"/>Score ≥ 45
            </button>
          </div>

          {visible.map((lead,idx)=>{
            const isHot=(lead.icp_score||0)>=75;
            const isMed=(lead.icp_score||0)>=45;
            const temDecisor=!!(lead.decisor||lead.email);
            const TIcon=LeadTypeIcon[lead.lead_type]||Building2;
            const isCrmMatch=!!lead.crm_match;

            return(
              <div key={idx} className={cn(
                "bg-card border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md",
                isCrmMatch?"border-amber-300 dark:border-amber-700/40 opacity-80":
                isHot?"border-green-300 dark:border-green-700/60":
                isMed?"border-blue-200 dark:border-blue-800/60":"border-border"
              )}>
                {/* Banner CRM match */}
                {isCrmMatch&&(
                  <div className="px-5 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
                    <Repeat className="h-3.5 w-3.5 text-amber-600"/>
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      Já na base — Status: {lead.crm_match?.status} · Portaria: {lead.crm_match?.portaria}
                      {lead.crm_match?.ticket ? ` · R$${lead.crm_match.ticket.toLocaleString()}` : ""}
                    </span>
                  </div>
                )}

                {/* Decisor */}
                {temDecisor&&(
                  <div className={cn("px-5 py-3 border-b border-border flex items-center gap-4 flex-wrap",
                    isHot?"bg-green-50/60 dark:bg-green-950/20":"bg-primary/5 dark:bg-primary/10")}>
                    <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {lead.decisor&&<span className="font-bold text-foreground text-sm">{lead.decisor}</span>}
                        {lead.cargo&&<span className="flex items-center gap-1 text-xs text-muted-foreground"><Briefcase className="h-3 w-3"/>{lead.cargo}</span>}
                      </div>
                      {lead.email&&(
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {lead.deliverable===true?<CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0"/>:lead.deliverable===false?<XCircle className="h-3.5 w-3.5 text-red-400 shrink-0"/>:null}
                          <span className="text-xs text-muted-foreground font-mono">{lead.email}</span>
                          {lead.deliverable===true&&<span className="text-[10px] font-semibold text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full border border-green-200 dark:border-green-700">✓ verificado</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lead.linkedin_pessoa&&<a href={lead.linkedin_pessoa} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3"/>LinkedIn</a>}
                      <IcpBadge score={lead.icp_score||0}/>
                    </div>
                  </div>
                )}

                {/* Empresa */}
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border">
                    <TIcon className="h-5 w-5 text-muted-foreground"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground text-sm">{lead.empresa_apollo||lead.titulo}</h3>
                        {lead.empresa_apollo&&lead.empresa_apollo!==lead.titulo&&<p className="text-xs text-muted-foreground">{lead.titulo}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{lead.industry||lead.snippet}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!temDecisor&&<IcpBadge score={lead.icp_score||0}/>}
                        {lead.site&&<a href={lead.site.startsWith("http")?lead.site:`https://${lead.site}`}
                          target="_blank" rel="noopener noreferrer"
                          className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary">
                          <ExternalLink className="h-3.5 w-3.5"/>
                        </a>}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",LEAD_STYLE[lead.lead_type])}>
                        <TIcon className="h-2.5 w-2.5"/>{lead.lead_type}
                      </span>
                      {lead.portaria&&<span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border",pal.tag,pal.bd)}>{scope.icon} {lead.portaria}</span>}
                      {lead.estado&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">📍 {lead.estado}</span>}
                      {lead.company_verified&&<span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700"><ShieldCheck className="h-2.5 w-2.5"/>Apollo ✓</span>}
                      {lead.fonte==="apollo_direct"&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-700">via Apollo DB</span>}
                    </div>

                    {lead.motivo&&(
                      <div className={cn("mt-2 flex items-start gap-1.5 text-[11px] rounded-lg px-2.5 py-1.5 border",pal.bg,pal.bd,pal.tx)}>
                        <ArrowRight className="h-3 w-3 shrink-0 mt-0.5"/>{lead.motivo}
                      </div>
                    )}
                    {lead.linkedin_empresa&&<a href={lead.linkedin_empresa} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><ExternalLink className="h-3 w-3"/>Empresa no LinkedIn</a>}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    {lead.enriching?<span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin"/>Apollo + Hunter...</span>
                    :lead.enriched?<span className="text-green-600 dark:text-green-400 font-semibold">✓ Pipeline completo</span>
                    :`${lead.lead_type} · ${lead.estado}`}
                  </span>
                  <div className="flex items-center gap-2">
                    {!lead.enriched&&<button onClick={()=>enriquecer(idx)} disabled={lead.enriching}
                      className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 disabled:opacity-50 border border-primary/20">
                      {lead.enriching?<Loader2 className="h-3 w-3 animate-spin"/>:<Zap className="h-3 w-3"/>}
                      {lead.enriching?"Buscando...":"→ Decisor"}
                    </button>}
                    <button onClick={()=>descartar(idx)}
                      className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-colors"
                      title="Descartar e bloquear domínio">
                      <X className="h-3.5 w-3.5"/>Descartar
                    </button>
                    <button onClick={()=>setExp(exp===idx?null:idx)}
                      className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs text-muted-foreground hover:bg-muted">
                      {exp===idx?<ChevronUp className="h-3.5 w-3.5"/>:<ChevronDown className="h-3.5 w-3.5"/>}Detalhes
                    </button>
                  </div>
                </div>

                {/* Detalhes */}
                {exp===idx&&(
                  <div className="px-5 py-4 border-t border-border bg-muted/10 animate-fade-in space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {([
                        ["🏷 Tipo",lead.lead_type],["👤 Decisor",lead.decisor],["💼 Cargo",lead.cargo],
                        ["✉️ Email",lead.email],["✅ Verificado",lead.deliverable===true?"Sim ✓":lead.deliverable===false?"Não ✗":"Pendente"],
                        ["🏢 Apollo",lead.empresa_apollo],["🏭 Setor",lead.industry],["🌐 Site",lead.site],["📋 Portaria",lead.portaria],
                      ] as [string,string|null|undefined][]).map(([lbl,val])=>(
                        <div key={lbl} className="bg-card rounded-xl border border-border p-3">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">{lbl}</p>
                          <p className="text-xs font-medium break-all">{val||"—"}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Contexto de venda</p>
                      <p className="text-xs">{lead.motivo||"—"}</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Score ICP</p>
                        <span className="text-xs font-black font-mono">{lead.icp_score||0}/100</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-2 rounded-full transition-all",
                          isHot?"bg-gradient-to-r from-green-400 to-emerald-500":isMed?"bg-gradient-to-r from-blue-400 to-blue-600":"bg-muted-foreground/30")}
                          style={{width:`${lead.icp_score||0}%`}}/>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading&&!leads.length&&!erro&&(
        <div className="text-center py-20 animate-fade-in">
          <div className="text-5xl mb-4">{scope.icon}</div>
          <p className="text-base font-semibold mb-1">{scope.label}</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{(scope as any).motivo}</p>
          {unit==="ocp"&&<p className="text-xs text-muted-foreground mt-2">Ou selecione uma empresa de referência para busca Lookalike ↑</p>}
          <p className="text-xs text-muted-foreground mt-2">Selecione estados e clique em <strong>Buscar Leads</strong></p>
        </div>
      )}
    </div>
  );
}
