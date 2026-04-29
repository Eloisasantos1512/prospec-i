/**
 * PROSPEC-O — Motor B2B v6
 * Query Constructor por tokens + Apollo direto como fallback garantido
 */

export const getKey = (k: string) => localStorage.getItem(k) || "";

export type LeadType = "Fabricante Verificado" | "Indústria Nacional" | "Importador Verificado" | "Distribuidor B2B" | "Empresa";

export interface SearchLog { step: string; status: "ok"|"warn"|"error"; detail: string; count?: number; }
export interface SerperResult { titulo: string; site: string; snippet: string; dominio: string; lead_type: LeadType; }
export interface EnrichedLead { email: string|null; decisor: string|null; cargo: string|null; linkedin_pessoa: string|null; linkedin_empresa: string|null; empresa_apollo: string|null; industry: string|null; deliverable: boolean|null; company_verified: boolean; }

// ─── BLACKLIST embutida na query ─────────────────────────────────────
const NEG_SITES = "-site:gov.br -site:jusbrasil.com.br -site:wikipedia.org -site:youtube.com -site:blogspot.com -site:wordpress.com -site:medium.com -site:facebook.com -site:instagram.com";
const NEG_WORDS = "-blog -notícia -guia -artigo -manual -vaga -\"trabalhe conosco\" -infográfico -filetype:pdf";
const NEG = `${NEG_SITES} ${NEG_WORDS}`;

// Domínios ainda bloqueados no filtro JS (para o que escapou da query)
const BLOCKED_DOMAINS = ["gov.br","jusbrasil","legisweb","planalto","wikipedia","youtube","facebook","instagram","twitter","reclameaqui","scribd","slideshare","blogspot","wordpress","medium.com","abnt.org","iso.org","sebrae","senai","receita.fazenda","cnpj.biz","econodata","academia.edu","google.com","bing.com","inmetro.gov","anvisa.gov","procon","sindicato","abimo","abimed","exame.com","valor.com","estadao","globo.com","uol.com","folha.uol","correiobraziliense","gazetadopovo","agenciabrasil","tecmundo","startups.com.br","resultadosdigitais"];
const CONTENT = ["saiba mais sobre","guia completo","entenda como","como funciona","o que é","tudo sobre","passo a passo","aprenda a","descubra como","artigo sobre","white paper","estudo de caso","portaria n°","resolução rdc","norma iso","decreto federal","vaga de emprego","trabalhe conosco","oportunidade de carreira","clipping","pesquisa de mercado"];

function classify(title: string, url: string, snippet: string): LeadType | null {
  const t = (title + " " + snippet).toLowerCase();
  const u = url.toLowerCase();
  if (BLOCKED_DOMAINS.some(d => u.includes(d))) return null;
  if (u.endsWith(".pdf") || u.endsWith(".doc")) return null;
  if (CONTENT.some(p => t.includes(p))) return null;
  // Rejeita subdomínios de conteúdo
  const dom = u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  if (/^(blog|news|noticias|revista|portal|forum|ajuda|suporte)\./i.test(dom)) return null;
  if (/fabricante|fabricação|manufatura/.test(t)) return "Fabricante Verificado";
  if (/importadora|importador/.test(t)) return "Importador Verificado";
  if (/distribuidora|atacadista/.test(t)) return "Distribuidor B2B";
  if (/indústria|industria|ltda|s\.a\.|eireli/.test(t + u)) return "Indústria Nacional";
  if (/\.com\.br|\.ind\.br/.test(u)) return "Empresa";
  return null;
}

// ─── QUERY CONSTRUCTOR — tokens, não frase literal ──────────────────
function makeQuery(seed: string, estado: string, level: number): string {
  const stop = new Set(["de","do","da","dos","das","em","para","com","por","e","ou","a","o","um","uma","que","no","na","nos","nas"]);
  const tokens = seed.split(/\s+/)
    .filter(w => w.length > 3 && !stop.has(w.toLowerCase()))
    .slice(0, 3)
    .map(w => `"${w}"`);
  const kw = tokens.join(" ");

  switch (level) {
    case 0: return `(intitle:fabricante OR intitle:indústria OR intitle:importadora) ${kw} "${estado}" ${NEG}`;
    case 1: return `${kw} "${estado}" CNPJ ${NEG}`;
    case 2: return `${kw} (contato OR vendas OR "fale conosco") site:.com.br ${NEG_SITES}`;
    default: return `${kw} ${estado} ${NEG_SITES}`;
  }
}

// ─── STEP 01: SERPER ────────────────────────────────────────────────
export async function serperSearchWithFallback(seed: string, estado: string, onLog: (l: SearchLog) => void): Promise<SerperResult[]> {
  const key = getKey("SERPER_API_KEY");
  if (!key) throw new Error("SERPER_API_KEY não configurada");

  const LABELS = ["Máx (intitle:fabricante)", "Médio (produto+CNPJ)", "Mín (contato/.com.br)"];

  for (let lvl = 0; lvl < 3; lvl++) {
    const q = makeQuery(seed, estado, lvl);
    onLog({ step: "Serper", status: "ok", detail: `[Nível ${lvl+1}/3 — ${LABELS[lvl]}] Localizando indústrias: "${seed.slice(0,30)}" · ${estado}` });

    try {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": key, "Content-Type": "application/json" },
        body: JSON.stringify({ q, gl: "br", hl: "pt", num: 10 }),
      });
      if (r.status === 403) throw new Error("SERPER_API_KEY inválida ou sem créditos");
      if (!r.ok) throw new Error(`Serper HTTP ${r.status}`);

      const data = await r.json();
      const raw = (data.organic || []) as Array<{ title: string; link: string; snippet: string }>;
      const valid: SerperResult[] = raw
        .map(res => ({ res, lt: classify(res.title, res.link, res.snippet) }))
        .filter(({ lt }) => lt !== null)
        .map(({ res, lt }) => ({ titulo: res.title, site: res.link, snippet: res.snippet || "", dominio: extractDomain(res.link), lead_type: lt! }));

      onLog({ step: "Serper", status: valid.length > 0 ? "ok" : "warn", detail: `${raw.length} brutos → ${valid.length} válidos (nível ${lvl+1})`, count: valid.length });
      if (valid.length > 0) return valid;
      await new Promise(r => setTimeout(r, 400));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onLog({ step: "Serper", status: "error", detail: msg });
      if (msg.includes("inválida")) throw new Error(msg);
    }
  }
  onLog({ step: "Serper", status: "warn", detail: "Serper 0 resultados → Apollo Companies ativado", count: 0 });
  return [];
}

// ─── APOLLO COMPANIES DIRETO (fallback garantido) ───────────────────
export interface ApolloCompany { nome: string; dominio: string; site: string; industry: string|null; linkedin: string|null; }

export async function apolloSearchCompanies(keywords: string[], onLog: (l: SearchLog) => void): Promise<ApolloCompany[]> {
  const key = getKey("APOLLO_API_KEY");
  if (!key) { onLog({ step: "Apollo", status: "warn", detail: "APOLLO_API_KEY não configurada — sem fallback" }); return []; }

  onLog({ step: "Apollo", status: "ok", detail: `[Fallback] Buscando companies direto: ${keywords.slice(0,2).join(", ")}` });
  try {
    const r = await fetch("https://api.apollo.io/v1/mixed_companies/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, q_organization_keyword_tags: keywords, organization_locations: ["Brazil"], per_page: 10, page: 1 }),
    });
    if (!r.ok) return [];
    const d = await r.json();
    const orgs: Array<{ name?: string; primary_domain?: string; website_url?: string; industry?: string; linkedin_url?: string }> = d?.organizations || [];
    onLog({ step: "Apollo", status: "ok", detail: `${orgs.length} companies encontradas no Apollo DB`, count: orgs.length });
    return orgs.filter(o => o.name && o.primary_domain).map(o => ({
      nome: o.name!, dominio: o.primary_domain!, site: o.website_url || `https://${o.primary_domain}`,
      industry: o.industry || null, linkedin: o.linkedin_url || null,
    }));
  } catch (e: unknown) {
    onLog({ step: "Apollo", status: "error", detail: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

// ─── APOLLO ENRICH (company + decisor) ──────────────────────────────
const T_TECHNICAL = ["Gerente de Qualidade","Responsável Técnico","Diretor de Operações","Assuntos Regulatórios","Regulatory Affairs","Quality Manager","Comprador","Purchasing Manager","Gerente de P&D","Diretor Técnico","Engenheiro de Qualidade"];
const T_BROAD     = ["Diretor","Engenheiro","Gerente","Manager","Coordenador","CTO","COO","Head","Operations"];

export async function apolloEnrich(empresa: string, dominio: string, onLog: (l: SearchLog) => void): Promise<{ decisor:string|null; cargo:string|null; email:string|null; linkedin_pessoa:string|null; linkedin_empresa:string|null; empresa_apollo:string|null; industry:string|null; company_verified:boolean } | null> {
  const key = getKey("APOLLO_API_KEY");
  if (!key) { onLog({ step: "Apollo", status: "warn", detail: "APOLLO_API_KEY não configurada" }); return null; }

  let linkedin_empresa: string|null = null, empresa_apollo: string|null = null, company_verified = false, industry: string|null = null;

  if (dominio) {
    try {
      onLog({ step: "Apollo", status: "ok", detail: `Identificando company: ${dominio}` });
      const cr = await fetch("https://api.apollo.io/v1/organizations/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, domain: dominio }),
      });
      if (cr.ok) {
        const cd = await cr.json();
        const org = cd?.organization;
        if (org?.name) {
          empresa_apollo = org.name; linkedin_empresa = org.linkedin_url||null;
          industry = org.industry||null; company_verified = true;
          onLog({ step: "Apollo", status: "ok", detail: `✓ Company: "${org.name}" · ${org.industry||"setor n/a"}` });
        }
      }
    } catch {}
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const titles = attempt === 0 ? T_TECHNICAL : T_BROAD;
    onLog({ step: "Apollo", status: "ok", detail: `Identificando decisores ${attempt===0?"técnicos":"gerenciais"}: "${(empresa_apollo||empresa).slice(0,30)}"` });
    try {
      const payload: Record<string, unknown> = { api_key: key, person_titles: titles, page: 1, per_page: 3 };
      if (dominio) payload.q_organization_domains = [dominio];
      else         payload.q_organization_name    = empresa;
      const r = await fetch("https://api.apollo.io/v1/mixed_people/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) continue;
      const d = await r.json();
      const people: Array<{ first_name?:string; last_name?:string; title?:string; email?:string; linkedin_url?:string }> = d?.people || [];
      onLog({ step: "Apollo", status: people.length>0?"ok":"warn", detail: `${people.length} decisor(es) encontrado(s)`, count: people.length });
      if (people.length > 0) {
        const p = people[0];
        return { decisor: `${p.first_name||""} ${p.last_name||""}`.trim()||null, cargo: p.title||null, email: p.email||null, linkedin_pessoa: p.linkedin_url||null, linkedin_empresa, empresa_apollo, industry, company_verified };
      }
    } catch {}
  }
  if (company_verified) return { decisor:null, cargo:null, email:null, linkedin_pessoa:null, linkedin_empresa, empresa_apollo, industry, company_verified };
  return null;
}

// ─── STEP 03: HUNTER ────────────────────────────────────────────────
export async function hunterValidate(dominio: string, empresa: string, emailApollo: string|null, onLog: (l: SearchLog) => void): Promise<{ email:string; decisor:string|null; deliverable:boolean }|null> {
  const key = getKey("HUNTER_API_KEY");
  if (!key) { onLog({ step: "Hunter", status: "warn", detail: "HUNTER_API_KEY não configurada" }); return null; }
  if (!dominio) return null;
  try {
    if (emailApollo) {
      onLog({ step: "Hunter", status: "ok", detail: `Verificando e-mail: ${emailApollo}` });
      const vr = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(emailApollo)}&api_key=${key}`);
      if (vr.ok) {
        const vd = await vr.json(); const ok = vd?.data?.status === "valid";
        onLog({ step: "Hunter", status: "ok", detail: `${ok?"✓ válido":"✗ inválido"}: ${emailApollo}` });
        return { email: emailApollo, decisor: null, deliverable: ok };
      }
    }
    onLog({ step: "Hunter", status: "ok", detail: `Buscando e-mails corporativos: ${dominio}` });
    const sr = await fetch(`https://api.hunter.io/v2/domain-search?domain=${dominio}&company=${encodeURIComponent(empresa)}&api_key=${key}&limit=5`);
    if (!sr.ok) return null;
    const sd = await sr.json();
    const emails: Array<{ value:string; first_name?:string; last_name?:string; department?:string; verification?:{ status?:string } }> = sd?.data?.emails || [];
    onLog({ step: "Hunter", status: emails.length>0?"ok":"warn", detail: `${emails.length} e-mail(s) encontrado(s)`, count: emails.length });
    if (!emails.length) return null;
    const DEPTS = ["quality","regulatory","engineering","management","executive","research","purchase","compras"];
    const best = emails.find(e => DEPTS.some(d => (e.department||"").toLowerCase().includes(d))) || emails[0];
    return { email: best.value, decisor: `${best.first_name||""} ${best.last_name||""}`.trim()||null, deliverable: best.verification?.status==="valid" };
  } catch { return null; }
}

// ─── PIPELINE ───────────────────────────────────────────────────────
export async function enrichLeadPipeline(titulo: string, site: string, dominio: string, onLog: (l: SearchLog) => void): Promise<EnrichedLead> {
  const apollo = await apolloEnrich(titulo, dominio, onLog);
  const hunter = await hunterValidate(dominio, titulo, apollo?.email||null, onLog);
  return {
    email:            apollo?.email            || hunter?.email    || null,
    decisor:          apollo?.decisor          || hunter?.decisor  || null,
    cargo:            apollo?.cargo            || null,
    linkedin_pessoa:  apollo?.linkedin_pessoa  || null,
    linkedin_empresa: apollo?.linkedin_empresa || null,
    empresa_apollo:   apollo?.empresa_apollo   || null,
    industry:         apollo?.industry         || null,
    deliverable:      hunter?.deliverable      ?? null,
    company_verified: apollo?.company_verified ?? false,
  };
}

export function extractDomain(url: string): string {
  const m = url?.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/);
  return m?.[1] || "";
}
