import { useState } from "react";
import { useUnit } from "@/contexts/UnitContext";
import {
  getKey, serperSearchWithFallback, enrichLeadPipeline,
  SerperResult, SearchLog, LeadType,
} from "@/lib/api";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Search, Loader2, AlertCircle, ExternalLink,
  ChevronDown, ChevronUp, Zap, Target, User, Star,
  RefreshCw, Download, Filter, X, CheckCircle, XCircle,
  Building2, Briefcase, ArrowRight, ShieldCheck, Factory,
} from "lucide-react";

const LAB_SCOPES = [
  { id:"iso10993",   icon:"🦴", label:"ISO 10993-18", sub:"Biocompatibilidade",  cnae:"3250-7/01",   color:"violet" as const,
    motivo:"Fabricante de dispositivo implantável — necessita ensaios de biocompatibilidade ISO 10993",
    seeds:["implante ortopédico biomédica","dispositivo médico implantável titânio","prótese cirúrgica biomaterial","instrumental cirúrgico estéril"] },
  { id:"mri",        icon:"🧲", label:"MRI",           sub:"Ressonância Magnética", cnae:"26.60-4/00", color:"blue" as const,
    motivo:"Fabricante de implante — necessita avaliação de compatibilidade MRI",
    seeds:["equipamento imagem médica diagnóstico","implante compatível ressonância magnética","monitor cardíaco desfibrilador"] },
  { id:"endotoxina", icon:"🧬", label:"Endotoxina",    sub:"8129-0/00",           cnae:"8129-0/00",   color:"teal" as const,
    motivo:"Fabricante de produto injetável/estéril — necessita testes de endotoxina bacteriana",
    seeds:["farmácia manipulação injetáveis parenterais","indústria farmacêutica produto injetável","fabricante produto estéril hospitalar"] },
  { id:"esterilidade",icon:"⚗️",label:"Esterilidade",  sub:"3250-7/01",           cnae:"3250-7/01",   color:"green" as const,
    motivo:"Fabricante de material médico-hospitalar — necessita validação de esterilidade e bioburden",
    seeds:["embalagem produto farmacêutico estéril","material médico descartável hospitalar","seringa agulha cateter sutura"] },
];

const OCP_SCOPES = [
  { id:"p145",      icon:"🚗", label:"Portaria 145", sub:"2022 — Automotivos",  cnae:"2910-7/02", color:"blue" as const,
    motivo:"Fabricante/importador de autopeças — necessita certificação INMETRO Portaria 145/2022",
    seeds:["autopeças fabricante homologação","componentes automotivos certificação","peças veiculares fabricante"] },
  { id:"p384",      icon:"🏥", label:"Portaria 384", sub:"2020 — Eletromédicos", cnae:"26.60-4/00", color:"violet" as const,
    motivo:"Fabricante de equipamento eletromédico — necessita certificação INMETRO Portaria 384/2020",
    seeds:["equipamento eletromédico hospitalar fabricante","monitor desfibrilador fabricante","equipamento médico diagnóstico"] },
  { id:"anatel715", icon:"📡", label:"Anatel 715",   sub:"2019 — Telecom",       cnae:"2631-1/00", color:"indigo" as const,
    motivo:"Fabricante de equipamento de telecomunicação — necessita homologação Anatel 715/2019",
    seeds:["equipamento telecomunicação fabricante","rádio transmissor antena fabricante","equipamento wireless IoT fabricante"] },
  { id:"p071",      icon:"⚡", label:"Portaria 071", sub:"2022 — Eficiência",    cnae:"2710-4/02", color:"amber" as const,
    motivo:"Fabricante de eletrodoméstico — necessita etiquetagem eficiência energética INMETRO",
    seeds:["eletrodoméstico ar condicionado fabricante","equipamento elétrico eficiência energética","geladeira fogão máquina lavar fabricante"] },
  { id:"p501",      icon:"🔌", label:"Portaria 501", sub:"2021 — Elétricos",     cnae:"2710-4/03", color:"green" as const,
    motivo:"Fabricante de produto eletroeletrônico — necessita certificação INMETRO Portaria 501",
    seeds:["cabo fio elétrico fabricante","produto eletroeletrônico fabricante","tomada plugue extensão fabricante"] },
];

type Color = "violet"|"blue"|"teal"|"green"|"indigo"|"amber";
const PAL: Record<Color,{bg:string;bd:string;tx:string;dot:string;tag:string}> = {
  violet:{ bg:"bg-violet-50 dark:bg-violet-950/30", bd:"border-violet-300 dark:border-violet-700", tx:"text-violet-700 dark:text-violet-300", dot:"bg-violet-500", tag:"bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  blue:  { bg:"bg-blue-50 dark:bg-blue-950/30",     bd:"border-blue-300 dark:border-blue-700",     tx:"text-blue-700 dark:text-blue-300",     dot:"bg-blue-500",   tag:"bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  teal:  { bg:"bg-teal-50 dark:bg-teal-950/30",     bd:"border-teal-300 dark:border-teal-700",     tx:"text-teal-700 dark:text-teal-300",     dot:"bg-teal-500",   tag:"bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  green: { bg:"bg-green-50 dark:bg-green-950/30",   bd:"border-green-300 dark:border-green-700",   tx:"text-green-700 dark:text-green-300",   dot:"bg-green-500",  tag:"bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  indigo:{ bg:"bg-indigo-50 dark:bg-indigo-950/30", bd:"border-indigo-300 dark:border-indigo-700", tx:"text-indigo-700 dark:text-indigo-300", dot:"bg-indigo-500", tag:"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  amber: { bg:"bg-amber-50 dark:bg-amber-950/30",   bd:"border-amber-300 dark:border-amber-700",   tx:"text-amber-700 dark:text-amber-300",   dot:"bg-amber-500",  tag:"bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
};

// ── Tag de tipo de lead ──────────────────────────────────────────────
const LEAD_TYPE_STYLE: Record<LeadType, string> = {
  "Fabricante Verificado":    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700",
  "Indústria Nacional":       "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700",
  "Importador Verificado":    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-700",
  "Distribuidor B2B":         "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700",
  "Empresa Não Classificada": "bg-muted text-muted-foreground border-border",
};

const LEAD_TYPE_ICON: Record<LeadType, typeof Factory> = {
  "Fabricante Verificado":    Factory,
  "Indústria Nacional":       Building2,
  "Importador Verificado":    ShieldCheck,
  "Distribuidor B2B":         Building2,
  "Empresa Não Classificada": Building2,
};

const ESTADOS = ["SP","MG","SC","RS","PR","RJ","GO","CE","PE","DF","BA","AM","PA","MT","MS"];

interface Lead extends SerperResult {
  estado?:          string;
  norma?:           string;
  motivo?:          string;
  icp_score?:       number;
  email?:           string | null;
  decisor?:         string | null;
  cargo?:           string | null;
  linkedin_pessoa?: string | null;
  linkedin_empresa?:string | null;
  empresa_apollo?:  string | null;
  deliverable?:     boolean | null;
  company_verified?:boolean;
  enriching?:       boolean;
  enriched?:        boolean;
}

function calcIcp(l: Lead): number {
  const t = (l.titulo + " " + l.snippet).toLowerCase();
  const kws = ["implant","ortopéd","biomédic","prótese","cirúrg","farmácia","parenter","esteril","médic","equip","fabricante","indústria"];
  let s = kws.filter(k => t.includes(k)).length * 6;
  if (l.lead_type === "Fabricante Verificado") s += 15;
  if (l.company_verified) s += 10;
  if (l.email) s += 12; if (l.decisor) s += 18; if (l.deliverable) s += 8;
  return Math.min(s, 100);
}

// ── Skeleton ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-muted rounded w-1/3" /><div className="h-2 bg-muted rounded w-1/4" />
        </div>
        <div className="h-5 w-24 bg-muted rounded-full" />
      </div>
      <div className="px-5 py-4 flex gap-4">
        <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-muted rounded w-2/3" />
          <div className="h-2 bg-muted rounded w-full" />
          <div className="h-2 bg-muted rounded w-4/5" />
          <div className="flex gap-2 mt-2"><div className="h-5 w-24 bg-muted rounded-full" /><div className="h-5 w-12 bg-muted rounded-full" /></div>
        </div>
      </div>
    </div>
  );
}

// ── Log Toast ────────────────────────────────────────────────────────
function LogToast({ logs }: { logs: SearchLog[] }) {
  if (!logs.length) return null;
  const colors = { ok:"text-green-400", warn:"text-amber-400", error:"text-red-400" };
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 space-y-1">
      {logs.slice(-5).map((log, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-gray-900 dark:bg-gray-800 border border-gray-700 shadow-xl text-xs backdrop-blur-sm">
          <span className="font-bold text-gray-300 shrink-0 font-mono">[{log.step}]</span>
          <span className={cn("flex-1 leading-relaxed", colors[log.status])}>{log.detail}</span>
          {log.count !== undefined && <span className="shrink-0 font-mono font-bold text-white">{log.count}</span>}
        </div>
      ))}
    </div>
  );
}

function IcpBadge({ score }: { score: number }) {
  if (score >= 75) return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700"><Star className="h-3 w-3 fill-amber-500 text-amber-500" />Alto {score}</span>;
  if (score >= 45) return <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700"><Target className="h-3 w-3" />Médio {score}</span>;
  return <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full border border-border">Baixo {score}</span>;
}

export default function Prospeccao() {
  const { unit } = useUnit();
  const scopes  = unit === "lab" ? LAB_SCOPES : OCP_SCOPES;
  const [scopeId,  setScopeId]  = useState(scopes[0].id);
  const [estados,  setEstados]  = useState<string[]>(["SP"]);
  const [termo,    setTermo]    = useState("");
  const [leads,    setLeads]    = useState<Lead[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [skeletons,setSkeletons]= useState(0);
  const [logs,     setLogs]     = useState<SearchLog[]>([]);
  const [erro,     setErro]     = useState("");
  const [exp,      setExp]      = useState<number | null>(null);
  const [onlyICP,  setOnlyICP] = useState(false);

  const scope = scopes.find(s => s.id === scopeId) || scopes[0];
  const pal   = PAL[scope.color];
  const temSerper = !!getKey("SERPER_API_KEY");

  const addLog = (l: SearchLog) => setLogs(p => [...p.slice(-12), l]);
  const toggle = (uf: string) => setEstados(p => p.includes(uf) ? p.filter(e => e !== uf) : [...p, uf]);

  async function buscar() {
    if (!getKey("SERPER_API_KEY")) { setErro("Configure a SERPER_API_KEY em Configurações."); return; }
    if (!estados.length) { setErro("Selecione ao menos um estado."); return; }
    setLoading(true); setErro(""); setLeads([]); setLogs([]); setSkeletons(3);

    const seeds = termo.trim() ? [termo.trim()] : scope.seeds;
    const all: Lead[] = [];
    const seen = new Set<string>();

    try {
      for (const seed of seeds.slice(0, 3)) {
        for (const uf of estados.slice(0, 3)) {
          try {
            const results = await serperSearchWithFallback(seed, uf, addLog);
            for (const item of results) {
              const k = item.dominio || item.titulo;
              if (!seen.has(k)) {
                seen.add(k);
                const lead: Lead = { ...item, estado: uf, norma: scope.label, motivo: scope.motivo, icp_score: 0 };
                lead.icp_score = calcIcp(lead);
                all.push(lead);
              }
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addLog({ step: "Serper", status: "error", detail: msg });
            if (msg.includes("inválida")) { setErro(msg); break; }
          }
          await new Promise(r => setTimeout(r, 350));
        }
      }
      all.sort((a, b) => (b.icp_score || 0) - (a.icp_score || 0));
      setLeads(all);
      setSkeletons(0);
      addLog({ step: "Resultado", status: all.length > 0 ? "ok" : "warn",
        detail: all.length > 0
          ? `${all.length} empresas-alvo · ${all.filter(l => l.lead_type === "Fabricante Verificado").length} fabricantes verificados`
          : "Nenhuma empresa encontrada após todas as tentativas",
        count: all.length });
      if (!all.length) setErro("Nenhuma empresa encontrada. Tente ajustar o escopo, estado ou busca personalizada.");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado");
      setSkeletons(0);
    } finally {
      setLoading(false);
      setTimeout(() => setLogs([]), 10000);
    }
  }

  async function enriquecer(idx: number) {
    const l = leads[idx];
    setLeads(p => p.map((x, i) => i === idx ? { ...x, enriching: true } : x));
    addLog({ step: "Pipeline", status: "ok", detail: `Iniciando Apollo + Hunter para "${l.titulo.slice(0, 35)}"` });
    try {
      const data = await enrichLeadPipeline(l.titulo, l.site, l.dominio, addLog);
      const updated: Lead = { ...l, ...data, enriching: false, enriched: true };
      updated.icp_score = calcIcp(updated);
      setLeads(p => p.map((x, i) => i === idx ? updated : x));
    } catch {
      setLeads(p => p.map((x, i) => i === idx ? { ...x, enriching: false } : x));
    }
  }

  async function enriquecerTodos() {
    const idxs = leads.map((_, i) => i).filter(i => !leads[i].enriched && !leads[i].enriching);
    for (const idx of idxs.slice(0, 10)) {
      await enriquecer(idx);
      await new Promise(r => setTimeout(r, 900));
    }
  }

  function exportCSV() {
    const rows = [
      ["Tipo Lead","Decisor","Cargo","Email","Verificado","Empresa","Empresa Apollo","LinkedIn Empresa","LinkedIn Pessoa","Site","Motivo","Norma","Estado","Score ICP"],
      ...leads.map(l => [
        l.lead_type||"", l.decisor||"", l.cargo||"", l.email||"",
        l.deliverable===true?"Sim":l.deliverable===false?"Não":"Pendente",
        l.titulo, l.empresa_apollo||"", l.linkedin_empresa||"",
        l.linkedin_pessoa||"", l.site||"", l.motivo||"",
        l.norma||"", l.estado||"", String(l.icp_score||0),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
    a.download = `leads_verificados_${scope.id}.csv`; a.click();
  }

  const visible = onlyICP ? leads.filter(l => (l.icp_score||0) >= 45) : leads;
  const fabricantes = leads.filter(l => l.lead_type === "Fabricante Verificado").length;
  const comDecisor  = leads.filter(l => l.decisor).length;
  const verificados = leads.filter(l => l.deliverable === true).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <LogToast logs={logs} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prospecção {unit==="lab"?"Laboratório":"OCP"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Serper (intitle) → Validação Domínio → Apollo Company → Hunter · Apenas Fabricantes</p>
        </div>
        {leads.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={enriquecerTodos} className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted shadow-sm">
              <Zap className="h-3.5 w-3.5 text-amber-500" />Enriquecer todos
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted shadow-sm">
              <Download className="h-3.5 w-3.5" />CSV
            </button>
          </div>
        )}
      </div>

      {!temSerper && (
        <div className="flex items-start gap-4 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/60">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Configure a <strong>SERPER_API_KEY</strong> em{" "}
            <Link to="/configuracoes" className="underline font-semibold">Configurações</Link>.
            Gratuito em <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" className="underline">serper.dev</a>.
          </p>
        </div>
      )}

      {/* Painel */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {unit==="lab"?"Ensaio / Norma":"Portaria / Norma"}
          </p>
          <div className="flex flex-wrap gap-2">
            {scopes.map(s => {
              const p = PAL[s.color]; const active = scopeId===s.id;
              return (
                <button key={s.id} onClick={()=>{setScopeId(s.id);setLeads([]);setTermo("");}}
                  className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all",
                    active?`${p.bg} ${p.bd} ${p.tx}`:"border-border text-muted-foreground hover:bg-muted")}>
                  <span>{s.icon}</span>
                  <div><span className="block text-[13px] font-semibold">{s.label}</span><span className="block text-[10px] opacity-70">{s.sub}</span></div>
                  {active&&<div className={cn("h-1.5 w-1.5 rounded-full ml-1",pal.dot)}/>}
                </button>
              );
            })}
          </div>
          <div className={cn("mt-3 flex items-start gap-2 px-3 py-2 rounded-xl border text-xs",pal.bg,pal.bd,pal.tx)}>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-0.5"/><span><strong>Motivo:</strong> {scope.motivo}</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Busca personalizada <span className="font-normal opacity-60">(opcional)</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
              <input type="text" value={termo} onChange={e=>setTermo(e.target.value)} onKeyDown={e=>e.key==="Enter"&&buscar()}
                placeholder={`Ex: ${scope.seeds[0]}`}
                className="w-full h-10 pl-9 pr-9 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"/>
              {termo&&<button onClick={()=>setTermo("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5"/></button>}
            </div>
          </div>

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

          {/* Status APIs */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              {n:"01",label:"Serper",desc:"intitle:fabricante",icon:"🔍",key:"SERPER_API_KEY"},
              {n:"02",label:"Apollo",desc:"Company + Decisor", icon:"👤",key:"APOLLO_API_KEY"},
              {n:"03",label:"Hunter",desc:"Valida e-mails",    icon:"✉️",key:"HUNTER_API_KEY"},
            ].map(s=>{
              const ok=!!getKey(s.key);
              return(
                <div key={s.n} className={cn("flex items-center gap-2 p-2.5 rounded-xl border",
                  ok?"bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800":"bg-muted border-border")}>
                  <span>{s.icon}</span>
                  <div>
                    <p className={cn("font-semibold text-[11px]",ok?"text-green-700 dark:text-green-400":"text-muted-foreground")}>{s.n}·{s.label} {ok?"✓":"—"}</p>
                    <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {!termo&&(
            <div className={cn("rounded-xl p-3 border",pal.bg,pal.bd)}>
              <p className={cn("text-[11px] font-semibold mb-2",pal.tx)}>Seeds com intitle + fallback ({scope.seeds.length})</p>
              {scope.seeds.map((s,i)=>(
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground mb-1">
                  <div className={cn("h-1 w-1 rounded-full mt-1.5 shrink-0",pal.dot)}/>{s}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button onClick={buscar} disabled={loading}
              className="flex items-center gap-2 px-6 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 shadow-sm active:scale-95 transition-all">
              {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Search className="h-4 w-4"/>}
              {loading?"Buscando fabricantes...":"Buscar Leads"}
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

      {/* Erro com log */}
      {erro&&!loading&&(
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 space-y-2">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300 text-sm"><AlertCircle className="h-4 w-4 shrink-0"/>{erro}</div>
          {logs.length>0&&(
            <div className="mt-2 space-y-1 border-t border-red-200 dark:border-red-700 pt-2">
              <p className="text-[11px] text-red-700 dark:text-red-400 font-semibold">Log do pipeline:</p>
              {logs.map((l,i)=>(
                <p key={i} className="text-[11px] text-red-600 dark:text-red-400 font-mono">
                  [{l.step}] {l.detail}{l.count!==undefined?` → ${l.count}`:""}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skeletons */}
      {loading&&skeletons>0&&(
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin"/>
            <span>Filtrando fabricantes com <code className="text-xs bg-muted px-1 rounded">intitle:fabricante</code> · Validando domínios · Buscando decisores...</span>
          </div>
          {Array.from({length:skeletons}).map((_,i)=><SkeletonCard key={i}/>)}
        </div>
      )}

      {/* Resultados */}
      {leads.length>0&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold">{leads.length} empresas</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700">
                <Factory className="h-3 w-3 inline mr-1"/>
                {fabricantes} fabricantes verificados
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3 text-blue-500"/>{comDecisor} decisores
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500"/>{verificados} e-mails verificados
              </span>
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
            const TypeIcon = LEAD_TYPE_ICON[lead.lead_type] || Building2;

            return(
              <div key={idx} className={cn(
                "bg-card border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md",
                isHot?"border-amber-300 dark:border-amber-700/60":isMed?"border-blue-200 dark:border-blue-800/60":"border-border"
              )}>
                {/* Decisor em destaque */}
                {temDecisor&&(
                  <div className={cn("px-5 py-3 border-b border-border flex items-center gap-4 flex-wrap",
                    isHot?"bg-amber-50/60 dark:bg-amber-950/20":"bg-primary/5 dark:bg-primary/10")}>
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
                          {lead.deliverable===true&&<span className="text-[10px] text-green-600 font-semibold bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">✓ verificado</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lead.linkedin_pessoa&&(
                        <a href={lead.linkedin_pessoa} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3"/>LinkedIn
                        </a>
                      )}
                      <IcpBadge score={lead.icp_score||0}/>
                    </div>
                  </div>
                )}

                {/* Empresa */}
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border">
                    <TypeIcon className="h-5 w-5 text-muted-foreground"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground text-sm">{lead.empresa_apollo||lead.titulo}</h3>
                        {lead.empresa_apollo&&lead.empresa_apollo!==lead.titulo&&(
                          <p className="text-xs text-muted-foreground">{lead.titulo}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{lead.snippet}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!temDecisor&&<IcpBadge score={lead.icp_score||0}/>}
                        {lead.site&&(
                          <a href={lead.site.startsWith("http")?lead.site:`https://${lead.site}`}
                            target="_blank" rel="noopener noreferrer"
                            className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary">
                            <ExternalLink className="h-3.5 w-3.5"/>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Tags: Tipo Lead + Norma + Estado */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",LEAD_TYPE_STYLE[lead.lead_type])}>
                        <TypeIcon className="h-2.5 w-2.5"/>{lead.lead_type}
                      </span>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border",pal.tag,pal.bd)}>
                        {scope.icon} {lead.norma}
                      </span>
                      {lead.estado&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">📍 {lead.estado}</span>}
                      {lead.company_verified&&(
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700">
                          <ShieldCheck className="h-2.5 w-2.5"/>Apollo ✓
                        </span>
                      )}
                    </div>

                    {/* Contexto de venda */}
                    {lead.motivo&&(
                      <div className={cn("mt-2 flex items-start gap-1.5 text-[11px] rounded-lg px-2.5 py-1.5 border",pal.bg,pal.bd,pal.tx)}>
                        <ArrowRight className="h-3 w-3 shrink-0 mt-0.5"/>
                        <span>{lead.motivo}</span>
                      </div>
                    )}

                    {/* LinkedIn da empresa */}
                    {lead.linkedin_empresa&&(
                      <a href={lead.linkedin_empresa} target="_blank" rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                        <ExternalLink className="h-3 w-3"/>Página da Empresa no LinkedIn
                      </a>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    {lead.enriching
                      ?<span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin"/>Apollo + Hunter em andamento...</span>
                      :lead.enriched
                      ?<span className="text-green-600 dark:text-green-400 font-semibold">✓ Pipeline completo</span>
                      :`${lead.lead_type} · ${lead.estado}`}
                  </span>
                  <div className="flex items-center gap-2">
                    {!lead.enriched&&(
                      <button onClick={()=>enriquecer(idx)} disabled={lead.enriching}
                        className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 disabled:opacity-50 border border-primary/20">
                        {lead.enriching?<Loader2 className="h-3 w-3 animate-spin"/>:<Zap className="h-3 w-3"/>}
                        {lead.enriching?"Buscando...":"→ Decisor"}
                      </button>
                    )}
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
                        ["🏷 Tipo Lead", lead.lead_type],
                        ["👤 Decisor", lead.decisor],
                        ["💼 Cargo", lead.cargo],
                        ["✉️ Email", lead.email],
                        ["✅ Verificado", lead.deliverable===true?"Sim ✓":lead.deliverable===false?"Não ✗":"Pendente"],
                        ["🌐 Site", lead.site],
                        ["🏢 Empresa Apollo", lead.empresa_apollo],
                        ["📍 Estado", lead.estado],
                        ["🔗 LinkedIn Empresa", lead.linkedin_empresa],
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
                          isHot?"bg-gradient-to-r from-amber-400 to-orange-500":
                          isMed?"bg-gradient-to-r from-blue-400 to-blue-600":"bg-muted-foreground/30")}
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
          <p className="text-base font-semibold mb-1">{scope.label} — {scope.sub}</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{scope.motivo}</p>
          <p className="text-xs text-muted-foreground mt-3">Selecione estados e clique em <strong>Buscar Leads</strong></p>
        </div>
      )}
    </div>
  );
}
