/**
 * PROSPEC-O — Motor de Inteligência B2B
 * Pipeline: Serper → Apollo → Hunter (cascata)
 * Foco: INDÚSTRIA/FABRICANTE — nunca laboratório, OCP ou consultoria
 */

export const getKey = (k: string) => localStorage.getItem(k) || "";

// ─── DOMÍNIOS BLOQUEADOS (portais, governo, diretórios, concorrentes) ─
const BLOCKED_DOMAINS = [
  // Governo e regulatório
  "gov.br","inmetro.gov","anvisa.gov","planalto.gov","mec.gov",
  // Portais jurídicos e legislação
  "jusbrasil","legisweb","normas.com","abnt.org","iso.org",
  // Portais de notícias e conteúdo
  "wikipedia","youtube","facebook","instagram","linkedin.com/pulse",
  "reclameaqui","procon","scribd","slideshare","blogspot","wordpress",
  "medium.com","academia.edu","google.com","bing.com",
  // Diretórios de empresas (não são a empresa em si)
  "cnpj.biz","econodata","empresas.com.br","listadeempresas",
  // Formação e consultoria
  "sebrae","senai","curso","treinamento","consultoria",
  // Associações e sindicatos
  "sindical","associacao","sindicato","abimo","abimed",
];

// ─── PALAVRAS QUE INDICAM CONTEÚDO (não empresa) ────────────────────
const CONTENT_SIGNALS = [
  "[pdf]","[doc]","[ppt]",
  "como ","guia ","o que é","o que são","passo a passo","manual de",
  "tudo sobre","entenda ","saiba mais","legislação","portaria n°",
  "resolução rdc","norma iso","decreto ","publicado em","atualizado em",
  "lista de empresas","consulta de","registro de","faq ","perguntas frequentes",
  "instrucciones","instrução de uso","curso de","treinamento em",
  "apostila","download ","artigo ","blog:","notícia:","news:",
  "certificação inmetro:","análise de","ensaio de","prestação de serviço",
];

// ─── PALAVRAS QUE CONFIRMAM INDÚSTRIA/FABRICANTE ─────────────────────
const INDUSTRY_SIGNALS = [
  "ltda","s.a.","s/a","eireli"," me "," epp ","industria","indústria",
  "fabricante","fabricação","manufatura","importadora","distribuidora",
  "engenharia","tecnologia","biomédica","biomed","medical","pharma",
  "farmacêutica","equipamentos","instrumentos","implantes","hospitalar",
  "ortopedia","sistemas","soluções","produtos","materiais","componentes",
];

function classifyResult(title: string, url: string): "industry" | "content" | "blocked" {
  const t = title.toLowerCase();
  const u = url.toLowerCase();

  if (BLOCKED_DOMAINS.some(d => u.includes(d))) return "blocked";
  if (u.endsWith(".pdf") || u.endsWith(".doc") || u.endsWith(".ppt")) return "blocked";
  if (CONTENT_SIGNALS.some(s => t.startsWith(s) || t.includes(s))) return "content";
  if (INDUSTRY_SIGNALS.some(w => t.includes(w) || u.includes(w))) return "industry";
  return "content"; // dúvida → descarta
}

// ─── STEP 01: SERPER — Identifica domínios institucionais ────────────
export async function serperSearch(seed: string, estado: string): Promise<SerperResult[]> {
  const key = getKey("SERPER_API_KEY");
  if (!key) throw new Error("Configure a SERPER_API_KEY em Configurações");

  // Query com exclusões agressivas para forçar fabricantes
  const exclusions = "-laboratório -\"serviço de análise\" -\"prestação de serviço\" -consultoria -\"OCP\" -\"organismo\" -ensaio -acreditação";
  const q = `(fabricante OR indústria OR importador) "${seed}" ${estado} ${exclusions} -filetype:pdf -site:gov.br -site:jusbrasil.com.br -site:wikipedia.org -site:youtube.com`;

  const r = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, gl: "br", hl: "pt", num: 10 }),
  });

  if (r.status === 403) throw new Error("SERPER_API_KEY inválida ou expirada");
  if (!r.ok) throw new Error(`Serper erro ${r.status}`);

  const data = await r.json();
  return ((data.organic || []) as Array<{ title: string; link: string; snippet: string }>)
    .filter(res => classifyResult(res.title, res.link) === "industry")
    .map(res => ({
      titulo:  res.title,
      site:    res.link,
      snippet: res.snippet || "",
      dominio: extractDomain(res.link),
    }));
}

// ─── STEP 02: APOLLO — Busca decisores pelo domínio/empresa ──────────
export async function apolloFindDecisionMaker(
  empresa: string,
  dominio: string
): Promise<ApolloResult | null> {
  const key = getKey("APOLLO_API_KEY");
  if (!key) return null;

  const DECISION_TITLES = [
    "Gerente de Qualidade",
    "Responsável Técnico",
    "Diretor de Operações",
    "Assuntos Regulatórios",
    "Regulatory Affairs",
    "Quality Manager",
    "Comprador",
    "Purchasing Manager",
    "Gerente de P&D",
    "Diretor Técnico",
    "Engenharia de Produto",
    "Gerente de Produção",
    "CTO","COO","VP Qualidade",
  ];

  try {
    const payload: Record<string, unknown> = {
      api_key: key,
      person_titles: DECISION_TITLES,
      page: 1,
      per_page: 3,
    };

    // Prefere busca por domínio (mais preciso) do que por nome
    if (dominio) payload.q_organization_domains = [dominio];
    else payload.q_organization_name = empresa;

    const r = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) return null;
    const data = await r.json();
    const people: ApolloPersonRaw[] = data?.people || [];
    if (!people.length) return null;

    // Prioriza por cargo mais relevante
    const PRIORITY_TITLES = ["qualidade","regulatório","regulatory","técnico","compra","purchase"];
    const sorted = [...people].sort((a, b) => {
      const aScore = PRIORITY_TITLES.some(t => (a.title||"").toLowerCase().includes(t)) ? 1 : 0;
      const bScore = PRIORITY_TITLES.some(t => (b.title||"").toLowerCase().includes(t)) ? 1 : 0;
      return bScore - aScore;
    });

    const p = sorted[0];
    return {
      decisor:  `${p.first_name || ""} ${p.last_name || ""}`.trim() || null,
      cargo:    p.title || null,
      email:    p.email || null,
      linkedin: p.linkedin_url || null,
      empresa_confirmada: p.organization?.name || empresa,
      fonte_decisor: "apollo",
    };
  } catch { return null; }
}

// ─── STEP 03: HUNTER — Valida e-mail corporativo ─────────────────────
export async function hunterValidateEmail(
  dominio: string,
  empresa: string,
  emailApollo?: string | null
): Promise<HunterResult | null> {
  const key = getKey("HUNTER_API_KEY");
  if (!key || !dominio) return null;

  try {
    // Se Apollo retornou email, valida com Hunter
    if (emailApollo) {
      const vr = await fetch(
        `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(emailApollo)}&api_key=${key}`
      );
      if (vr.ok) {
        const vdata = await vr.json();
        const status = vdata?.data?.status;
        const deliverable = status === "valid"; // só "valid" é confiável
        return { email: emailApollo, deliverable, fonte: "hunter_verified" };
      }
    }

    // Caso contrário, busca email pelo domínio
    const sr = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${dominio}&company=${encodeURIComponent(empresa)}&api_key=${key}&limit=5`
    );
    if (!sr.ok) return null;

    const sdata = await sr.json();
    const emails: HunterEmailRaw[] = sdata?.data?.emails || [];
    if (!emails.length) return null;

    // Prioriza email de decisor por departamento
    const PRIORITY_DEPTS = ["quality","regulatory","engineering","management","executive","research","purchase","compras","operações"];
    let best = emails.find(e => PRIORITY_DEPTS.some(d => (e.department || "").toLowerCase().includes(d)));
    if (!best) best = emails[0];

    return {
      email:    best.value,
      decisor:  `${best.first_name || ""} ${best.last_name || ""}`.trim() || null,
      deliverable: best.verification?.status === "valid",
      fonte: "hunter_search",
    };
  } catch { return null; }
}

// ─── PIPELINE COMPLETO: Serper → Apollo → Hunter ─────────────────────
export async function enrichLeadPipeline(
  titulo: string,
  site: string,
  dominio: string
): Promise<EnrichedData> {
  // Step 02: Apollo (decisor)
  const apollo = await apolloFindDecisionMaker(titulo, dominio);

  // Step 03: Hunter (validação e-mail)
  const hunter = await hunterValidateEmail(dominio, titulo, apollo?.email);

  const email     = apollo?.email    || hunter?.email    || null;
  const decisor   = apollo?.decisor  || hunter?.decisor  || null;
  const cargo     = apollo?.cargo    || null;
  const linkedin  = apollo?.linkedin || null;
  const deliverable = hunter?.deliverable ?? null;

  return { email, decisor, cargo, linkedin, deliverable, fonte_decisor: apollo?.fonte_decisor || "hunter" };
}

// ─── HELPERS ─────────────────────────────────────────────────────────
export function extractDomain(url: string): string {
  const m = url?.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/);
  return m?.[1] || "";
}

// ─── TIPOS ────────────────────────────────────────────────────────────
export interface SerperResult {
  titulo:  string;
  site:    string;
  snippet: string;
  dominio: string;
}

export interface ApolloResult {
  decisor:              string | null;
  cargo:                string | null;
  email:                string | null;
  linkedin:             string | null;
  empresa_confirmada:   string;
  fonte_decisor:        string;
}

export interface HunterResult {
  email:       string;
  decisor?:    string | null;
  deliverable: boolean;
  fonte:       string;
}

export interface EnrichedData {
  email:          string | null;
  decisor:        string | null;
  cargo:          string | null;
  linkedin:       string | null;
  deliverable:    boolean | null;
  fonte_decisor:  string;
}

interface ApolloPersonRaw {
  first_name?: string;
  last_name?:  string;
  title?:      string;
  email?:      string;
  linkedin_url?: string;
  organization?: { name?: string };
}

interface HunterEmailRaw {
  value:        string;
  first_name?:  string;
  last_name?:   string;
  department?:  string;
  verification?: { status?: string };
}
