import { useState } from "react";
import { useUnit } from "@/contexts/UnitContext";
import { getKey, serperSearch, enrichLead } from "@/lib/api";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Search, Loader2, AlertCircle, ExternalLink,
  ChevronDown, ChevronUp, Zap, Target, Building2,
  Mail, User, Star, RefreshCw, Download, Filter, X,
} from "lucide-react";

// ── Escopos Lab ──────────────────────────────────────────────────────
const LAB_SCOPES = [
  {
    id:"iso10993", icon:"🦴", label:"ISO 10993-18", sub:"Biocompatibilidade",
    cnae_label:"CNAE 3250-7/01", color:"violet" as const,
    seeds:[
      "implante ortopédico biomédica",
      "dispositivo médico implantável",
      "prótese cirúrgica biomaterial",
      "instrumental cirúrgico hospitalar",
    ],
  },
  {
    id:"mri", icon:"🧲", label:"MRI", sub:"Ressonância Magnética",
    cnae_label:"CNAE 26.60-4/00", color:"blue" as const,
    seeds:[
      "equipamento ressonância magnética médica",
      "implante MRI compatível ortopédico",
      "equipamento diagnóstico imagem médica",
    ],
  },
  {
    id:"endotoxina", icon:"🧬", label:"Endotoxina", sub:"8129-0/00 · 8650-0/99",
    cnae_label:"CNAE 8129-0/00 · 8650-0/99", color:"teal" as const,
    seeds:[
      "farmácia manipulação injetáveis parenterais",
      "indústria farmacêutica injetável",
      "fabricante produto estéril hospitalar",
    ],
  },
  {
    id:"esterilidade", icon:"⚗️", label:"Esterilidade", sub:"2121-1/01 · 3250-7/01",
    cnae_label:"CNAE 2121-1/01 · 3250-7/01", color:"green" as const,
    seeds:[
      "embalagem produto farmacêutico estéril",
      "material médico descartável estéril",
      "seringa agulha cateter hospitalar",
    ],
  },
];

// ── Escopos OCP ──────────────────────────────────────────────────────
const OCP_SCOPES = [
  {
    id:"p145", icon:"🚗", label:"Portaria 145", sub:"2022 — Automotivos",
    cnae_label:"Automotivos INMETRO", color:"blue" as const,
    seeds:[
      "autopeças fabricante certificado INMETRO",
      "componentes automotivos homologação",
      "peças veiculares certificação compulsória",
    ],
  },
  {
    id:"p384", icon:"🏥", label:"Portaria 384", sub:"2020 — Eletromédicos",
    cnae_label:"CNAE 26.60-4/00", color:"violet" as const,
    seeds:[
      "equipamento eletromédico hospitalar fabricante",
      "equipamento médico hospitalar certificado",
      "monitor cardíaco desfibrilador fabricante",
    ],
  },
  {
    id:"anatel715", icon:"📡", label:"Anatel 715", sub:"2019 — Telecom",
    cnae_label:"CNAE 2631-1/00", color:"indigo" as const,
    seeds:[
      "equipamento telecomunicação homologação Anatel",
      "rádio transmissor fabricante homologado",
      "antena roteador wireless fabricante",
    ],
  },
  {
    id:"p071", icon:"⚡", label:"Portaria 071", sub:"2022 — Eficiência",
    cnae_label:"CNAE 2710-4/02", color:"amber" as const,
    seeds:[
      "eletrodoméstico eficiência energética fabricante",
      "equipamento elétrico etiquetagem INMETRO",
      "ar condicionado geladeira fabricante certificado",
    ],
  },
  {
    id:"p501", icon:"🔌", label:"Portaria 501", sub:"2021 — Elétricos",
    cnae_label:"CNAE 2710-4/03", color:"green" as const,
    seeds:[
      "cabo fio elétrico fabricante certificado",
      "produto eletroeletrônico certificação",
      "tomada plugue elétrico fabricante",
    ],
  },
];

type Color = "violet"|"blue"|"teal"|"green"|"indigo"|"amber";
const P: Record<Color,{bg:string;bd:string;tx:string;dot:string;tag:string}> = {
  violet:{ bg:"bg-violet-50 dark:bg-violet-950/30", bd:"border-violet-300 dark:border-violet-700", tx:"text-violet-700 dark:text-violet-300", dot:"bg-violet-500", tag:"bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  blue:  { bg:"bg-blue-50 dark:bg-blue-950/30",     bd:"border-blue-300 dark:border-blue-700",     tx:"text-blue-700 dark:text-blue-300",     dot:"bg-blue-500",   tag:"bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  teal:  { bg:"bg-teal-50 dark:bg-teal-950/30",     bd:"border-teal-300 dark:border-teal-700",     tx:"text-teal-700 dark:text-teal-300",     dot:"bg-teal-500",   tag:"bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  green: { bg:"bg-green-50 dark:bg-green-950/30",   bd:"border-green-300 dark:border-green-700",   tx:"text-green-700 dark:text-green-300",   dot:"bg-green-500",  tag:"bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  indigo:{ bg:"bg-indigo-50 dark:bg-indigo-950/30", bd:"border-indigo-300 dark:border-indigo-700", tx:"text-indigo-700 dark:text-indigo-300", dot:"bg-indigo-500", tag:"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  amber: { bg:"bg-amber-50 dark:bg-amber-950/30",   bd:"border-amber-300 dark:border-amber-700",   tx:"text-amber-700 dark:text-amber-300",   dot:"bg-amber-500",  tag:"bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
};

const ESTADOS = ["SP","MG","SC","RS","PR","RJ","GO","CE","PE","DF","BA","AM","PA","MT","MS"];
const ICP_CARGOS = ["Qualidade","Regulatório","Engenharia","P&D","Compras","Dir. Técnico"];

interface Lead {
  titulo:string; site:string; snippet:string;
  cnpj?:string; email?:string|null; decisor?:string|null;
  cargo?:string|null; linkedin?:string|null;
  telefone?:string|null; cidade?:string;
  estado?:string; norma?:string;
  icp_score?:number; icp_match?:string[];
  enriching?:boolean; enriched?:boolean;
}

function calcIcp(l:Lead){
  const t=(l.titulo+" "+l.snippet).toLowerCase();
  const kws=["implant","ortopéd","biomédic","dental","prótese","cirúrg","farmácia","parenter","esteril","médic","equip","biomed"];
  const m=kws.filter(k=>t.includes(k));
  let s=m.length*10; if(l.email) s+=12; if(l.decisor) s+=18;
  return {score:Math.min(s,100),matches:m.slice(0,5)};
}

function IcpBadge({score}:{score:number}){
  if(score>=70) return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200"><Star className="h-3 w-3 fill-amber-500 text-amber-500"/>Alto {score}</span>;
  if(score>=40) return <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full border border-blue-200"><Target className="h-3 w-3"/>Médio {score}</span>;
  return <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full border border-border">Baixo {score}</span>;
}

export default function Prospeccao() {
  const {unit} = useUnit();
  const scopes = unit==="lab" ? LAB_SCOPES : OCP_SCOPES;
  const [scopeId,setScopeId]   = useState(scopes[0].id);
  const [estados,setEstados]   = useState<string[]>(["SP"]);
  const [termo,setTermo]       = useState("");
  const [leads,setLeads]       = useState<Lead[]>([]);
  const [loading,setLoading]   = useState(false);
  const [progress,setProgress] = useState("");
  const [erro,setErro]         = useState("");
  const [exp,setExp]           = useState<number|null>(null);
  const [onlyICP,setOnlyICP]   = useState(false);

  const scope = scopes.find(s=>s.id===scopeId)||scopes[0];
  const pal   = P[scope.color];
  const temSerper = !!getKey("SERPER_API_KEY");

  const toggle = (uf:string) => setEstados(p=>p.includes(uf)?p.filter(e=>e!==uf):[...p,uf]);

  async function buscar(){
    if(!getKey("SERPER_API_KEY")){setErro("Configure a SERPER_API_KEY em Configurações.");return;}
    if(!estados.length){setErro("Selecione ao menos um estado.");return;}
    setLoading(true);setErro("");setLeads([]);setProgress("");

    const seeds = termo.trim() ? [termo.trim()] : scope.seeds;
    const all:Lead[]=[]; const seen=new Set<string>();

    try{
      for(const seed of seeds.slice(0,3)){
        for(const uf of estados.slice(0,3)){
          setProgress(`🔍 Buscando "${seed.slice(0,35)}..." em ${uf}`);
          try{
            const results = await serperSearch(seed, uf);
            for(const item of results){
              const k = item.site||item.titulo;
              if(!seen.has(k)){
                seen.add(k);
                const {score,matches}=calcIcp(item as Lead);
                all.push({...item, estado:uf, norma:scope.label, icp_score:score, icp_match:matches});
              }
            }
          } catch(e:unknown){
            if(e instanceof Error && e.message.includes("SERPER")){
              setErro(e.message); setLoading(false); return;
            }
          }
          await new Promise(r=>setTimeout(r,400));
        }
      }
      all.sort((a,b)=>(b.icp_score||0)-(a.icp_score||0));
      setLeads(all);
      setProgress(all.length>0 ? `✅ ${all.length} empresas encontradas` : "");
      if(!all.length) setErro("Nenhuma empresa encontrada. Tente outro escopo ou estado.");
    } catch(e:unknown){
      setErro(e instanceof Error ? e.message : "Erro na busca");
    } finally {
      setLoading(false);
    }
  }

  async function enriquecer(idx:number){
    const l=leads[idx];
    setLeads(p=>p.map((x,i)=>i===idx?{...x,enriching:true}:x));
    try{
      const d = await enrichLead(l.titulo, l.site);
      const {score,matches}=calcIcp({...l,...d});
      setLeads(p=>p.map((x,i)=>i===idx?{...x,...d,enriching:false,enriched:true,icp_score:score,icp_match:matches}:x));
    } catch{
      setLeads(p=>p.map((x,i)=>i===idx?{...x,enriching:false}:x));
    }
  }

  async function enriquecerTodos(){
    const idxs=leads.map((_,i)=>i).filter(i=>!leads[i].enriched&&!leads[i].enriching);
    for(const idx of idxs.slice(0,10)){
      await enriquecer(idx);
      await new Promise(r=>setTimeout(r,700));
    }
  }

  function exportCSV(){
    const rows=[
      ["Empresa","CNPJ","Site","Email","Decisor","Cargo","Telefone","Cidade","Estado","Norma","Score ICP"],
      ...leads.map(l=>[l.titulo,l.cnpj||"",l.site||"",l.email||"",l.decisor||"",l.cargo||"",l.telefone||"",l.cidade||"",l.estado||"",l.norma||"",String(l.icp_score||0)]),
    ];
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
    a.download=`leads_scitec_${scope.id}.csv`; a.click();
  }

  const visible = onlyICP ? leads.filter(l=>(l.icp_score||0)>=40) : leads;

  return(
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prospecção {unit==="lab"?"Laboratório":"OCP"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Serper · Hunter · Apollo — somente empresas reais</p>
        </div>
        {leads.length>0&&(
          <div className="flex gap-2">
            <button onClick={enriquecerTodos} className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition-colors">
              <Zap className="h-3.5 w-3.5 text-amber-500"/>Enriquecer todos
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition-colors">
              <Download className="h-3.5 w-3.5"/>CSV
            </button>
          </div>
        )}
      </div>

      {/* Aviso sem Serper */}
      {!temSerper&&(
        <div className="flex items-start gap-4 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/60">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"/>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Configure a <strong>SERPER_API_KEY</strong> em{" "}
            <Link to="/configuracoes" className="underline font-semibold">Configurações</Link>.
            Cadastro gratuito em <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" className="underline">serper.dev</a> (2.500 buscas/mês grátis).
          </p>
        </div>
      )}

      {/* Painel de busca */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

        {/* Escopos */}
        <div className="p-5 border-b border-border">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {unit==="lab"?"Ensaio / Norma":"Portaria / Norma"}
          </p>
          <div className="flex flex-wrap gap-2">
            {scopes.map(s=>{
              const p=P[s.color]; const active=scopeId===s.id;
              return(
                <button key={s.id} onClick={()=>{setScopeId(s.id);setLeads([]);setTermo("");}}
                  className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all",
                    active?`${p.bg} ${p.bd} ${p.tx}`:"border-border text-muted-foreground hover:bg-muted")}>
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
          <div className={cn("mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border",pal.bg,pal.bd,pal.tx)}>
            <div className={cn("h-1.5 w-1.5 rounded-full",pal.dot)}/>{scope.icon} {scope.cnae_label}
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Busca personalizada */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Busca personalizada <span className="font-normal opacity-60">(opcional)</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
              <input
                type="text" value={termo}
                onChange={e=>setTermo(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&buscar()}
                placeholder={`Ex: ${scope.seeds[0]}`}
                className="w-full h-10 pl-9 pr-9 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
              />
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

          {/* Seeds preview */}
          {!termo&&(
            <div className={cn("rounded-xl p-3 border",pal.bg,pal.bd)}>
              <p className={cn("text-[11px] font-semibold mb-2",pal.tx)}>
                Seeds de busca ({scope.seeds.length}) — forçam resultados .com.br
              </p>
              {scope.seeds.map((s,i)=>(
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground mb-1">
                  <div className={cn("h-1 w-1 rounded-full mt-1.5 shrink-0",pal.dot)}/>{s}
                </div>
              ))}
            </div>
          )}

          {/* Progresso */}
          {loading&&progress&&(
            <div className={cn("rounded-xl p-3 border text-xs font-medium",pal.bg,pal.bd,pal.tx)}>
              <Loader2 className="h-3 w-3 animate-spin inline mr-2"/>{progress}
            </div>
          )}

          {/* Botão */}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={buscar} disabled={loading}
              className="flex items-center gap-2 px-6 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm active:scale-95">
              {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Search className="h-4 w-4"/>}
              {loading?"Buscando empresas...":"Buscar Leads"}
            </button>
            {leads.length>0&&(
              <button onClick={()=>{setLeads([]);setExp(null);setProgress("");}}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted">
                <RefreshCw className="h-3.5 w-3.5"/>Nova busca
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Erro */}
      {erro&&(
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 text-red-800 dark:text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0"/>{erro}
        </div>
      )}

      {/* Resultados */}
      {leads.length>0&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold">{leads.length} empresas</span>
              <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border",pal.bg,pal.bd,pal.tx)}>{scope.icon} {scope.label}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3 text-green-500"/>{leads.filter(l=>l.email).length}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3 text-blue-500"/>{leads.filter(l=>l.decisor).length}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 text-amber-500"/>{leads.filter(l=>(l.icp_score||0)>=70).length} alto ICP</span>
            </div>
            <button onClick={()=>setOnlyICP(!onlyICP)}
              className={cn("flex items-center gap-1.5 px-3 h-8 rounded-xl border text-xs font-medium transition-all",
                onlyICP?`${pal.bg} ${pal.bd} ${pal.tx}`:"border-border text-muted-foreground hover:bg-muted")}>
              <Filter className="h-3 w-3"/>Alto/Médio ICP
            </button>
          </div>

          {/* ICP cargos */}
          <div className={cn("flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border",pal.bg,pal.bd)}>
            <span className={cn("text-[11px] font-semibold",pal.tx)}>Decisores ICP:</span>
            {ICP_CARGOS.map(c=><span key={c} className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full",pal.tag)}>{c}</span>)}
          </div>

          {visible.map((lead,idx)=>{
            const isHot=(lead.icp_score||0)>=70;
            const isMed=(lead.icp_score||0)>=40;
            return(
              <div key={idx} className={cn(
                "bg-card border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md",
                isHot?"border-amber-300 dark:border-amber-700/60":isMed?"border-blue-200 dark:border-blue-800/60":"border-border"
              )}>
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-muted-foreground"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm leading-tight">{lead.titulo}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lead.snippet}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <IcpBadge score={lead.icp_score||0}/>
                        {lead.site&&(
                          <a href={lead.site.startsWith("http")?lead.site:`https://${lead.site}`}
                            target="_blank" rel="noopener noreferrer"
                            className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                            <ExternalLink className="h-3.5 w-3.5"/>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Tags norma + estado */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border",pal.tag,pal.bd)}>
                        {scope.icon} {lead.norma}
                      </span>
                      {lead.estado&&<span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">📍 {lead.estado}</span>}
                      {lead.cnpj&&<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{lead.cnpj}</span>}
                    </div>

                    {/* Dados enriquecidos */}
                    {(lead.email||lead.decisor||lead.telefone)&&(
                      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-border">
                        {lead.email&&<span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5 text-green-500"/>{lead.email}</span>}
                        {lead.telefone&&<span className="flex items-center gap-1.5 text-xs text-muted-foreground">📞 {lead.telefone}</span>}
                        {lead.decisor&&<span className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3.5 w-3.5 text-blue-500"/><strong className="text-foreground">{lead.decisor}</strong>{lead.cargo&&<span className="opacity-60"> — {lead.cargo}</span>}</span>}
                      </div>
                    )}

                    {/* ICP matches */}
                    {lead.icp_match&&lead.icp_match.length>0&&(
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lead.icp_match.map(m=><span key={m} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">{m}</span>)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">{lead.norma} · {lead.estado}</span>
                  <div className="flex items-center gap-2">
                    {lead.enriched
                      ? <span className="text-[11px] text-green-600 dark:text-green-400 font-semibold">✓ Enriquecido</span>
                      : <button onClick={()=>enriquecer(idx)} disabled={lead.enriching}
                          className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 disabled:opacity-50 border border-primary/20">
                          {lead.enriching?<><Loader2 className="h-3 w-3 animate-spin"/>Buscando...</>:<><Zap className="h-3 w-3"/>Enriquecer</>}
                        </button>
                    }
                    <button onClick={()=>setExp(exp===idx?null:idx)}
                      className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs text-muted-foreground hover:bg-muted">
                      {exp===idx?<ChevronUp className="h-3.5 w-3.5"/>:<ChevronDown className="h-3.5 w-3.5"/>}Detalhes
                    </button>
                  </div>
                </div>

                {/* Detalhes */}
                {exp===idx&&(
                  <div className="px-5 py-4 border-t border-border bg-muted/10 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {([["🌐 Site",lead.site],["✉️ Email",lead.email],["👤 Decisor",lead.decisor],["💼 Cargo",lead.cargo],["📍 Estado",lead.estado],["📋 Norma",lead.norma]] as [string,string|null|undefined][]).map(([lbl,val])=>(
                        <div key={lbl} className="bg-card rounded-xl border border-border p-3">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">{lbl}</p>
                          <p className="text-xs font-medium break-all">{val||"—"}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Score ICP</p>
                        <span className="text-xs font-black font-mono">{lead.icp_score||0}/100</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-2 rounded-full transition-all",isHot?"bg-gradient-to-r from-amber-400 to-orange-500":isMed?"bg-gradient-to-r from-blue-400 to-blue-600":"bg-muted-foreground/30")}
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

      {/* Estado vazio */}
      {!loading&&!leads.length&&!erro&&(
        <div className="text-center py-20">
          <div className="text-5xl mb-4">{scope.icon}</div>
          <p className="text-base font-semibold mb-1">{scope.label} — {scope.sub}</p>
          <p className="text-sm text-muted-foreground">{scope.cnae_label}</p>
          <p className="text-xs text-muted-foreground mt-2">Selecione os estados e clique em <strong>Buscar Leads</strong></p>
        </div>
      )}
    </div>
  );
}
