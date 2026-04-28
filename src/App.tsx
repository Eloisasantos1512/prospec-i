import { useState } from "react";
import { useUnit } from "@/contexts/UnitContext";
import { getApiKey, isApiConfigured } from "@/lib/utils";
import {
  Search, Loader2, AlertCircle, ExternalLink, ChevronDown,
  ChevronUp, Zap, Target, Building2, Mail, User,
  Star, RefreshCw, Download, Filter
} from "lucide-react";
import { Link } from "react-router-dom";

const LAB_SCOPES = [
  { id:"iso10993", label:"ISO 10993-18", full:"ISO 10993-18 — Biocompatibilidade", cnae_label:"CNAE 3250-7/01 · Fab. equip. médico-odontológicos", color:"purple", icon:"🦴",
    seeds:["fabricante implante ortopédico biocompatibilidade ISO 10993 ANVISA","fabricante dispositivo médico implantável ensaio biológico","empresa biomédica implante cirúrgico avaliação biológica"] },
  { id:"mri", label:"MRI", full:"MRI — Ressonância Magnética", cnae_label:"CNAE 26.60-4/00 · Fab. equip. imagem médica", color:"blue", icon:"🧲",
    seeds:["fabricante implante compatível ressonância magnética MRI ANVISA","fabricante dispositivo médico MRI safe implante","indústria implante ortopédico avaliação artefato MRI"] },
  { id:"endotoxina", label:"Endotoxina", full:"Endotoxina & Esterilidade", cnae_label:"CNAE 8129-0/00 · 8650-0/99 · Serviços saúde", color:"teal", icon:"🧬",
    seeds:["farmácia manipulação injetáveis ANVISA registro Brasil","indústria farmacêutica fabricante produto injetável parenterais","fabricante dispositivo médico estéril ANVISA bioburden"] },
  { id:"bioburden", label:"Bioburden", full:"Bioburden (CNAE 3250-7/01)", cnae_label:"CNAE 3250-7/01 · Fabricantes equip. médicos", color:"green", icon:"⚗️",
    seeds:["fabricante embalagem primária produto farmacêutico bioburden","fabricante material médico-hospitalar descartável","indústria farmacêutica semi-sólido parenterais bpf"] },
];

const OCP_SCOPES = [
  { id:"p145", label:"Portaria 145", full:"Portaria 145/2022 — Automotivos", cnae_label:"CNAE 2910-7/02 · Fabricantes automotivos", color:"blue", icon:"🚗",
    seeds:["fabricante autopeças certificação INMETRO portaria 145","indústria automotiva produto certificado OCP INMETRO","fabricante componentes veicular certificação compulsória"] },
  { id:"p384", label:"Portaria 384", full:"Portaria 384/2020 — Eletromédicos", cnae_label:"CNAE 26.60-4/00 · Equipamentos médicos", color:"purple", icon:"🏥",
    seeds:["fabricante equipamento eletromédico certificação INMETRO portaria 384","fabricante equipamento médico hospitalar OCP certificação","importador equipamento médico certificação INMETRO"] },
];

const ICP_CARGOS = ["Gerente Qualidade","Reg. Affairs","Engenharia","P&D","Compras","Dir. Técnico"];
const ESTADOS = ["SP","MG","SC","RS","PR","RJ","GO","CE","PE","DF","BA","AM","PA"];

const CC: Record<string,{badge:string;dot:string;border:string;bg:string}> = {
  purple:{badge:"bg-purple-100 text-purple-700",dot:"bg-purple-500",border:"border-purple-200",bg:"bg-purple-50"},
  blue:  {badge:"bg-blue-100 text-blue-700",  dot:"bg-blue-500",  border:"border-blue-200",  bg:"bg-blue-50"},
  teal:  {badge:"bg-teal-100 text-teal-700",  dot:"bg-teal-500",  border:"border-teal-200",  bg:"bg-teal-50"},
  green: {badge:"bg-green-100 text-green-700",dot:"bg-green-500", border:"border-green-200", bg:"bg-green-50"},
};

interface Lead {
  titulo:string; site:string; snippet:string;
  email?:string; decisor?:string; cargo?:string; linkedin?:string;
  fonte?:string; icp_score?:number; icp_match?:string[];
  enriching?:boolean; enriched?:boolean;
}

function calcIcp(lead:Lead):{score:number;matches:string[]}{
  const t=(lead.titulo+" "+lead.snippet).toLowerCase();
  const kws=["implant","ortopéd","biomédic","dental","prótese","cirúrg","farmácia","parenter","esteril","médic"];
  const m=kws.filter(k=>t.includes(k));
  let s=m.length*12;
  if(lead.email) s+=10; if(lead.decisor) s+=15;
  return {score:Math.min(s,100),matches:m};
}

function Badge({score}:{score:number}){
  if(score>=70) return <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><Star className="h-3 w-3 fill-amber-500 text-amber-500"/>Alto</span>;
  if(score>=40) return <span className="flex items-center gap-1 text-xs text-blue-600"><Target className="h-3 w-3"/>Médio</span>;
  return <span className="text-xs text-muted-foreground">Baixo</span>;
}

export default function Prospeccao() {
  const {unit} = useUnit();
  const scopes = unit==="lab" ? LAB_SCOPES : OCP_SCOPES;
  const [scopeId,setScopeId]=useState(scopes[0].id);
  const [estados,setEstados]=useState<string[]>(["SP"]);
  const [termo,setTermo]=useState("");
  const [leads,setLeads]=useState<Lead[]>([]);
  const [loading,setLoading]=useState(false);
  const [erro,setErro]=useState("");
  const [expanded,setExpanded]=useState<number|null>(null);
  const [filtroICP,setFiltroICP]=useState(false);

  const bUrl=getApiKey("BACKEND_URL");
  const temCfg=isApiConfigured("SERPER_API_KEY")&&!!bUrl;
  const scope=scopes.find(s=>s.id===scopeId)||scopes[0];
  const cc=CC[scope.color];

  function toggleEstado(uf:string){
    setEstados(p=>p.includes(uf)?p.filter(e=>e!==uf):[...p,uf]);
  }

  async function buscar(){
    if(!bUrl){setErro("Configure a URL do Backend em Configurações.");return;}
    if(!estados.length){setErro("Selecione ao menos um estado.");return;}
    setLoading(true);setErro("");setLeads([]);
    const seeds=termo.trim()?[termo.trim()]:scope.seeds;
    const all:Lead[]=[]; const seen=new Set<string>();
    try{
      for(const seed of seeds.slice(0,3)){
        for(const uf of estados.slice(0,3)){
          const r=await fetch(`${bUrl}/buscar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({termo:seed,estado:uf,max_resultados:8})});
          if(!r.ok) continue;
          const d=await r.json();
          for(const item of d.resultados||[]){
            const k=item.site||item.titulo;
            if(!seen.has(k)){seen.add(k);const {score,matches}=calcIcp(item);all.push({...item,fonte:`Serper/${uf}`,icp_score:score,icp_match:matches});}
          }
        }
      }
      all.sort((a,b)=>(b.icp_score||0)-(a.icp_score||0));
      setLeads(all);
    }catch(e:unknown){setErro(e instanceof Error?e.message:"Erro ao buscar");}
    finally{setLoading(false);}
  }

  async function enriquecer(idx:number){
    if(!bUrl) return;
    const l=leads[idx];
    setLeads(p=>p.map((x,i)=>i===idx?{...x,enriching:true}:x));
    try{
      const r=await fetch(`${bUrl}/enriquecer`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({empresa:l.titulo,site:l.site})});
      if(!r.ok) throw new Error();
      const d=await r.json();
      const {score,matches}=calcIcp({...l,...d});
      setLeads(p=>p.map((x,i)=>i===idx?{...x,...d,enriching:false,enriched:true,icp_score:score,icp_match:matches}:x));
    }catch{setLeads(p=>p.map((x,i)=>i===idx?{...x,enriching:false}:x));}
  }

  async function enriquecerTodos(){
    const idxs=leads.map((_,i)=>i).filter(i=>!leads[i].enriched&&!leads[i].enriching);
    for(const idx of idxs.slice(0,10)){await enriquecer(idx);await new Promise(r=>setTimeout(r,600));}
  }

  function exportCSV(){
    const rows=[["Empresa","Site","Email","Decisor","Cargo","Score ICP","Fonte"],...leads.map(l=>[l.titulo,l.site||"",l.email||"",l.decisor||"",l.cargo||"",String(l.icp_score||0),l.fonte||""])];
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`leads_scitec_${scope.id}.csv`;a.click();
  }

  const visible=filtroICP?leads.filter(l=>(l.icp_score||0)>=40):leads;

  return(
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prospecção {unit==="lab"?"Laboratório":"OCP"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Busca por CNAE e normas técnicas · Serper + Hunter + Apollo</p>
        </div>
        {leads.length>0&&(
          <div className="flex gap-2">
            <button onClick={enriquecerTodos} className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <Zap className="h-3.5 w-3.5 text-amber-500"/>Enriquecer todos
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <Download className="h-3.5 w-3.5"/>Exportar CSV
            </button>
          </div>
        )}
      </div>

      {!temCfg&&(
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5"/>
          <p className="text-sm text-yellow-800">Configure as APIs em <Link to="/configuracoes" className="underline font-semibold">Configurações</Link> para ativar a prospecção.</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Escopos */}
        <div className="border-b border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{unit==="lab"?"Ensaio / Norma":"Portaria INMETRO"}</p>
          <div className="flex flex-wrap gap-2">
            {scopes.map(s=>{
              const c=CC[s.color];
              return(
                <button key={s.id} onClick={()=>{setScopeId(s.id);setLeads([]);}}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${scopeId===s.id?`${c.bg} ${c.border} ${c.badge.split(" ")[1]}`:"border-border text-muted-foreground hover:bg-muted"}`}>
                  <span>{s.icon}</span><span>{s.label}</span>
                  {scopeId===s.id&&<div className={`h-1.5 w-1.5 rounded-full ${c.dot}`}/>}
                </button>
              );
            })}
          </div>
          <p className={`mt-3 text-xs px-3 py-1.5 rounded-lg inline-block ${cc.bg} ${cc.badge.split(" ")[1]}`}>{scope.icon} {scope.cnae_label}</p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Busca personalizada <span className="opacity-60">(opcional)</span></label>
            <input type="text" value={termo} onChange={e=>setTermo(e.target.value)} onKeyDown={e=>e.key==="Enter"&&buscar()}
              placeholder={scope.seeds[0]}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"/>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Estados alvo</label>
            <div className="flex flex-wrap gap-1.5">
              {ESTADOS.map(uf=>(
                <button key={uf} onClick={()=>toggleEstado(uf)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${estados.includes(uf)?`${cc.bg} ${cc.border} ${cc.badge.split(" ")[1]}`:"border-border text-muted-foreground hover:bg-muted"}`}>{uf}</button>
              ))}
              <button onClick={()=>setEstados(ESTADOS)} className="px-2.5 py-1 rounded-md text-xs border border-dashed border-border text-muted-foreground hover:bg-muted">Todos</button>
              <button onClick={()=>setEstados([])} className="px-2.5 py-1 rounded-md text-xs border border-dashed border-border text-muted-foreground hover:bg-muted">Limpar</button>
            </div>
          </div>

          {!termo&&(
            <div>
              <p className="text-xs text-muted-foreground mb-2">Seeds do escopo <span className="opacity-60">(automático)</span></p>
              {scope.seeds.slice(0,3).map((s,i)=>(
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <div className={`h-1 w-1 rounded-full shrink-0 ${cc.dot}`}/>{s}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button onClick={buscar} disabled={loading}
              className="flex items-center gap-2 px-5 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Search className="h-4 w-4"/>}
              {loading?"Buscando...":"Buscar Leads"}
            </button>
            {leads.length>0&&(
              <button onClick={()=>setLeads([])} className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">
                <RefreshCw className="h-3.5 w-3.5"/>Nova busca
              </button>
            )}
          </div>
        </div>
      </div>

      {erro&&<div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">{erro}</div>}

      {leads.length>0&&(
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium">{leads.length} leads encontrados</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${cc.badge}`}>{scope.icon} {scope.label}</span>
              <span className="text-xs text-muted-foreground">{leads.filter(l=>l.email).length} email · {leads.filter(l=>l.decisor).length} decisor</span>
            </div>
            <button onClick={()=>setFiltroICP(!filtroICP)}
              className={`flex items-center gap-1.5 px-3 h-7 rounded-lg border text-xs font-medium transition-colors ${filtroICP?`${cc.bg} ${cc.border}`:"border-border text-muted-foreground hover:bg-muted"}`}>
              <Filter className="h-3 w-3"/>ICP Alto/Médio
            </button>
          </div>

          <div className={`flex flex-wrap gap-1.5 p-3 rounded-lg ${cc.bg} border ${cc.border}`}>
            <span className="text-xs text-muted-foreground mr-1">Decisores ICP:</span>
            {ICP_CARGOS.map(c=><span key={c} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cc.badge}`}>{c}</span>)}
          </div>

          {visible.map((lead,idx)=>(
            <div key={idx} className={`bg-card border rounded-xl overflow-hidden ${(lead.icp_score||0)>=70?"border-amber-300/60":"border-border"}`}>
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-muted-foreground"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{lead.titulo}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{lead.snippet}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge score={lead.icp_score||0}/>
                      {lead.site&&<a href={lead.site.startsWith("http")?lead.site:`https://${lead.site}`} target="_blank" rel="noopener noreferrer" className="text-primary text-xs"><ExternalLink className="h-3 w-3"/></a>}
                    </div>
                  </div>
                  {(lead.email||lead.decisor)&&(
                    <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-border">
                      {lead.email&&<span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3 text-green-500"/>{lead.email}</span>}
                      {lead.decisor&&<span className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3 text-blue-500"/>{lead.decisor}{lead.cargo&&<span className="opacity-60"> — {lead.cargo}</span>}</span>}
                    </div>
                  )}
                  {lead.icp_match&&lead.icp_match.length>0&&(
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {lead.icp_match.slice(0,4).map(m=><span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{m}</span>)}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{lead.fonte}</span>
                <div className="flex items-center gap-2">
                  {!lead.enriched&&(
                    <button onClick={()=>enriquecer(idx)} disabled={lead.enriching}
                      className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors">
                      {lead.enriching?<><Loader2 className="h-3 w-3 animate-spin"/>Buscando...</>:<><Zap className="h-3 w-3"/>Enriquecer</>}
                    </button>
                  )}
                  {lead.enriched&&<span className="text-[10px] text-green-600 font-medium">✓ Enriquecido</span>}
                  <button onClick={()=>setExpanded(expanded===idx?null:idx)}
                    className="flex items-center gap-1 px-2 h-7 rounded-lg text-xs text-muted-foreground hover:bg-muted">
                    {expanded===idx?<ChevronUp className="h-3 w-3"/>:<ChevronDown className="h-3 w-3"/>}Detalhes
                  </button>
                </div>
              </div>
              {expanded===idx&&(
                <div className="px-4 py-3 border-t border-border bg-muted/10 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[["Site",lead.site],["Email",lead.email],["Decisor",lead.decisor],["Cargo",lead.cargo]].map(([l,v])=>(
                      <div key={l}><p className="text-muted-foreground mb-0.5">{l}</p><p>{v||"—"}</p></div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Score ICP</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-2 rounded-full ${(lead.icp_score||0)>=70?"bg-amber-500":(lead.icp_score||0)>=40?"bg-blue-500":"bg-muted-foreground/30"}`}
                          style={{width:`${lead.icp_score||0}%`}}/>
                      </div>
                      <span className="text-xs font-mono">{lead.icp_score||0}/100</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading&&!leads.length&&!erro&&(
        <div className="text-center py-16">
          <div className="text-4xl mb-3">{scope.icon}</div>
          <p className="text-sm font-medium mb-1">Pronto para prospectar {scope.full}</p>
          <p className="text-xs text-muted-foreground">Selecione os estados e clique em Buscar Leads</p>
        </div>
      )}
    </div>
  );
}