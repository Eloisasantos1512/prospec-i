/**
 * PROSPEC-O — Motor B2B v4
 * Filtragem agressiva: apenas Indústrias e Fabricantes
 * Pipeline: Serper (intitle) → Validação Domínio → Apollo (company) → Hunter
 */

export const getKey = (k: string) => localStorage.getItem(k) || "";

// ─── DOMÍNIOS BLOQUEADOS ─────────────────────────────────────────────
const BLOCKED_DOMAINS = [
  "gov.br","jusbrasil","legisweb","planalto","wikipedia","youtube",
  "facebook","instagram","twitter","linkedin.com/pulse","reclameaqui",
  "scribd","slideshare","blogspot","wordpress","medium.com","abnt.org",
  "iso.org","sebrae","senai","receita.fazenda","cnpj.biz","econodata",
  "academia.edu","google.com","bing.com","inmetro.gov","anvisa.gov",
  "procon","sindicato","associacao","abimo","portal.","noticias.",
  "blog.","news.","revista.","jornal.","folha.","exame.","valor.",
  "estadao","globo.com","uol.com","ig.com","terra.com",
];

// ─── FRASES QUE INDICAM CONTEÚDO (não empresa) ──────────────────────
const CONTENT_PHRASES = [
  "saiba mais sobre","guia completo","entenda como","como funciona",
  "o que é","tudo sobre","passo a passo","aprenda a","descubra como",
  "conheça os","veja como","dicas de","melhores práticas","artigo sobre",
  "blog:","notícia:","infográfico","manual de","apostila","curso de",
  "treinamento em","vaga de","trabalhe conosco","oportunidade de",
  "pesquisa de","relatório de","estudo de caso","white paper",
  "portaria n°","resolução rdc","norma iso","decreto federal",
];

// ─── INDICADORES POSITIVOS DE EMPRESA ────────────────────────────────
const COMPANY_INDICATORS = [
  "ltda","s.a.","s/a","eireli"," me "," epp ","industria","indústria",
  "fabricante","fabricação","manufatura","importadora","distribuidora",
  "engenharia","tecnologia","biomédica","biomed","medical","pharma",
  "farmacêutica","equipamentos","instrumentos","implantes","hospitalar",
  "ortopedia","sistemas","soluções","produtos","materiais","componentes",
  "usinagem","montagem","fornecedor","atacadista",
];

// ─── TIPOS DE LEAD ───────────────────────────────────────────────────
export type LeadType =
  | "Fabricante Verificado"
  | "Indústria Nacional"
  | "Importador Verificado"
  | "Distribuidor B2B"
  | "Empresa Não Classificada";

function classifyLeadType(title: string, url: string, snippet: string): LeadType | null {
  const t = (title + " " + snippet).toLowerCase();
  const u = url.toLowerCase();

  if (BLOCKED_DOMAINS.some(d => u.includes(d))) return null;
  if (u.endsWith(".pdf") || u.endsWith(".doc") || u.endsWith(".ppt")) return null;
  if (t.includes("[pdf]") || t.startsWith("[pdf]")) return null;
  if (CONTENT_PHRASES.some(p => t.includes(p))) return null;

  // Pontuação positiva
  const hasFabricante = /fabricante|fabricação|manufatura|indústria/.test(t);
  const hasImportadora = /importadora|importador/.test(t);
  const hasDistrib = /distribuidora|atacadista/.test(t);
  const hasCompany = COMPANY_INDICATORS.some(c => t.includes(c) || u.includes(c));
  const hasInstitutional = /\.com\.br|\.ind\.br|\.med\.br|\.far\.br/.test(u);

  if (!hasCompany && !hasInstitutional) return null;
  if (hasFabricante) return "Fabricante Verificado";
  if (hasImportadora) return "Importador Verificado";
  if (hasDistrib) return "Distribuidor B2B";
  if (hasCompany) return "Indústria Nacional";
  return null;
}

// ─── VALIDAÇÃO DE DOMÍNIO INSTITUCIONAL ─────────────────────────────
function isInstitutionalDomain(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;
  // Rejeita subdomínios de notícias/blogs (ex: blog.empresa.com, news.empresa.com)
  if (/^(blog|news|noticias|revista|portal|forum|suporte|ajuda|help)\./i.test(domain)) return false;
  // Aceita domínios .com.br, .ind.br, .med.br, .com, .net
  return /\.(com\.br|ind\.br|med\.br|far\.br|com|net|org\.br)$/i.test(domain);
}

// ─── QUERIES COM 3 NÍVEIS DE FALLBACK ───────────────────────────────
function buildQueries(seed: string, estado: string): string[] {
  const neg = `-blog -notícia -guia -artigo -manual -vaga -"trabalhe conosco" -portal -infográfico -filetype:pdf -site:gov.br -site:jusbrasil.com.br -site:wikipedia.org -site:youtube.com -site:blogspot.com -site:wordpress.com`;
  return [
    // Nível 1: intitle força página de empresa
    `(intitle:fabricante OR intitle:indústria OR intitle:importadora) "${seed}" "${estado}" ${neg}`,
    // Nível 2: relaxa intitle, mantém negativações
    `(fabricante OR indústria OR importadora) "${seed}" ${estado} ${neg}`,
    // Nível 3: seed + estado + .com.br apenas
    `"${seed}" ${estado} site:.com.br ${neg}`,
  ];
}

// ─── TIPOS EXPORTADOS ────────────────────────────────────────────────
export interface SerperResult {
  titulo:    string;
  site:      string;
  snippet:   string;
  dominio:   string;
  lead_type: LeadType;
}

export interface SearchLog {
  step:   string;
  status: "ok" | "warn" | "error";
  detail: string;
  count?: number;
}

// ─── STEP 01: SERPER ────────────────────────────────────────────────
export async function serperSearchWithFallback(
  seed: string,
  estado: string,
  onLog: (l: SearchLog) => void
): Promise<SerperResult[]> {
  const key = getKey("SERPER_API_KEY");
  if (!key) throw new Error("SERPER_API_KEY não configurada");

  const levels = buildQueries(seed, estado);

  for (let lvl = 0; lvl < levels.length; lvl++) {
    const label = ["Máximo (intitle)", "Padrão", "Fallback .com.br"][lvl];
    onLog({ step: "Serper", status: "ok", detail: `Nível ${lvl + 1}/3 — ${label}: "${seed.slice(0, 35)}..." · ${estado}` });

    try {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": key, "Content-Type": "application/json" },
        body: JSON.stringify({ q: levels[lvl], gl: "br", hl: "pt", num: 10 }),
      });

      if (r.status === 403) throw new Error("SERPER_API_KEY inválida ou sem créditos");
      if (!r.ok) throw new Error(`Serper HTTP ${r.status}`);

      const data = await r.json();
      const raw = (data.organic || []) as Array<{ title: string; link: string; snippet: string }>;

      const validated: SerperResult[] = [];
      for (const res of raw) {
        const leadType = classifyLeadType(res.title, res.link, res.snippet);
        if (!leadType) continue;
        if (!isInstitutionalDomain(res.link)) continue;
        validated.push({
          titulo:    res.title,
          site:      res.link,
          snippet:   res.snippet || "",
          dominio:   extractDomain(res.link),
          lead_type: leadType,
        });
      }

      onLog({
        step: "Serper",
        status: validated.length > 0 ? "ok" : "warn",
        detail: `${raw.length} brutos → ${validated.length} empresas válidas (nível ${lvl + 1})`,
        count: validated.length,
      });

      if (validated.length > 0) return validated;
      if (lvl < levels.length - 1) await new Promise(r => setTimeout(r, 500));

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onLog({ step: "Serper", status: "error", detail: msg });
      if (msg.includes("inválida")) throw new Error(msg);
    }
  }

  onLog({ step: "Serper", status: "warn", detail: "Todas as tentativas esgotadas", count: 0 });
  return [];
}

// ─── STEP 02: APOLLO — Company + Decisor ────────────────────────────
const TITLES_STRICT = [
  "Gerente de Qualidade","Responsável Técnico","Diretor de Operações",
  "Assuntos Regulatórios","Regulatory Affairs","Quality Manager",
  "Comprador","Purchasing Manager","Gerente de P&D","Diretor Técnico",
];
const TITLES_BROAD = [
  "Diretor","Engenheiro","Gerente","Manager","Coordenador",
  "Supervisor","CTO","COO","VP","Head","Operations",
];

export interface ApolloResult {
  decisor:          string | null;
  cargo:            string | null;
  email:            string | null;
  linkedin_pessoa:  string | null;
  linkedin_empresa: string | null;
  empresa_apollo:   string | null;
  company_verified: boolean;
}

export async function apolloEnrich(
  empresa: string,
  dominio: string,
  onLog: (l: SearchLog) => void
): Promise<ApolloResult | null> {
  const key = getKey("APOLLO_API_KEY");
  if (!key) {
    onLog({ step: "Apollo", status: "warn", detail: "APOLLO_API_KEY não configurada" });
    return null;
  }

  // Verifica se existe company no Apollo para o domínio
  let linkedin_empresa: string | null = null;
  let empresa_apollo: string | null = null;
  let company_verified = false;

  if (dominio) {
    try {
      onLog({ step: "Apollo", status: "ok", detail: `Verificando company: ${dominio}` });
      const cr = await fetch("https://api.apollo.io/v1/organizations/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, domain: dominio }),
      });
      if (cr.ok) {
        const cd = await cr.json();
        const org = cd?.organization;
        if (org?.name) {
          empresa_apollo   = org.name;
          linkedin_empresa = org.linkedin_url || null;
          company_verified = true;
          onLog({ step: "Apollo", status: "ok", detail: `Company verificada: "${org.name}" (${org.industry || "setor n/a"})` });
        } else {
          onLog({ step: "Apollo", status: "warn", detail: `Domínio ${dominio} sem company no Apollo` });
        }
      }
    } catch {}
  }

  // Busca decisores (2 tentativas: cargos técnicos → cargos amplos)
  for (let attempt = 0; attempt < 2; attempt++) {
    const titles = attempt === 0 ? TITLES_STRICT : TITLES_BROAD;
    const label  = attempt === 0 ? "cargos técnicos" : "cargos amplos";

    onLog({ step: "Apollo", status: "ok", detail: `Buscando ${label} em "${empresa.slice(0, 35)}"` });

    try {
      const payload: Record<string, unknown> = {
        api_key: key, person_titles: titles, page: 1, per_page: 3,
      };
      if (dominio) payload.q_organization_domains = [dominio];
      else         payload.q_organization_name    = empresa;

      const r = await fetch("https://api.apollo.io/v1/mixed_people/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) continue;
      const d = await r.json();
      const people: Array<{
        first_name?: string; last_name?: string; title?: string;
        email?: string; linkedin_url?: string;
      }> = d?.people || [];

      onLog({
        step: "Apollo", status: people.length > 0 ? "ok" : "warn",
        detail: `${label}: ${people.length} decisores encontrados`, count: people.length,
      });

      if (people.length > 0) {
        const p = people[0];
        return {
          decisor:          `${p.first_name || ""} ${p.last_name || ""}`.trim() || null,
          cargo:            p.title || null,
          email:            p.email || null,
          linkedin_pessoa:  p.linkedin_url || null,
          linkedin_empresa, empresa_apollo, company_verified,
        };
      }
    } catch {}
  }

  // Retorna company mesmo sem decisor
  if (company_verified) {
    return { decisor: null, cargo: null, email: null, linkedin_pessoa: null, linkedin_empresa, empresa_apollo, company_verified };
  }
  return null;
}

// ─── STEP 03: HUNTER ────────────────────────────────────────────────
export interface HunterResult {
  email:       string;
  decisor:     string | null;
  deliverable: boolean;
}

export async function hunterValidate(
  dominio: string,
  empresa: string,
  emailApollo: string | null,
  onLog: (l: SearchLog) => void
): Promise<HunterResult | null> {
  const key = getKey("HUNTER_API_KEY");
  if (!key) { onLog({ step: "Hunter", status: "warn", detail: "HUNTER_API_KEY não configurada" }); return null; }
  if (!dominio) return null;

  try {
    if (emailApollo) {
      onLog({ step: "Hunter", status: "ok", detail: `Verificando: ${emailApollo}` });
      const vr = await fetch(
        `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(emailApollo)}&api_key=${key}`
      );
      if (vr.ok) {
        const vd = await vr.json();
        const deliverable = vd?.data?.status === "valid";
        onLog({ step: "Hunter", status: "ok", detail: `${deliverable ? "✓ válido" : "✗ inválido"}: ${emailApollo}` });
        return { email: emailApollo, decisor: null, deliverable };
      }
    }

    onLog({ step: "Hunter", status: "ok", detail: `Buscando emails em ${dominio}` });
    const sr = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${dominio}&company=${encodeURIComponent(empresa)}&api_key=${key}&limit=5`
    );
    if (!sr.ok) return null;
    const sd = await sr.json();
    const emails: Array<{
      value: string; first_name?: string; last_name?: string;
      department?: string; verification?: { status?: string };
    }> = sd?.data?.emails || [];

    onLog({ step: "Hunter", status: emails.length > 0 ? "ok" : "warn", detail: `${emails.length} emails encontrados`, count: emails.length });
    if (!emails.length) return null;

    const DEPTS = ["quality","regulatory","engineering","management","executive","research","purchase","compras","operações"];
    const best  = emails.find(e => DEPTS.some(d => (e.department || "").toLowerCase().includes(d))) || emails[0];
    return {
      email:       best.value,
      decisor:     `${best.first_name || ""} ${best.last_name || ""}`.trim() || null,
      deliverable: best.verification?.status === "valid",
    };
  } catch (e: unknown) {
    onLog({ step: "Hunter", status: "error", detail: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

// ─── PIPELINE COMPLETO ───────────────────────────────────────────────
export interface EnrichedLead {
  email:            string | null;
  decisor:          string | null;
  cargo:            string | null;
  linkedin_pessoa:  string | null;
  linkedin_empresa: string | null;
  empresa_apollo:   string | null;
  deliverable:      boolean | null;
  company_verified: boolean;
}

export async function enrichLeadPipeline(
  titulo: string,
  site: string,
  dominio: string,
  onLog: (l: SearchLog) => void
): Promise<EnrichedLead> {
  const apollo = await apolloEnrich(titulo, dominio, onLog);
  const hunter = await hunterValidate(dominio, titulo, apollo?.email || null, onLog);

  return {
    email:            apollo?.email            || hunter?.email    || null,
    decisor:          apollo?.decisor          || hunter?.decisor  || null,
    cargo:            apollo?.cargo            || null,
    linkedin_pessoa:  apollo?.linkedin_pessoa  || null,
    linkedin_empresa: apollo?.linkedin_empresa || null,
    empresa_apollo:   apollo?.empresa_apollo   || null,
    deliverable:      hunter?.deliverable      ?? null,
    company_verified: apollo?.company_verified ?? false,
  };
}

export function extractDomain(url: string): string {
  const m = url?.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/);
  return m?.[1] || "";
}
