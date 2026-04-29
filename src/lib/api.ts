/**
 * PROSPEC-O — Motor de Inteligência B2B v3
 * Pipeline com fallback gradual: Serper → Apollo → Hunter
 */

export const getKey = (k: string) => localStorage.getItem(k) || "";

// ─── DOMÍNIOS SEMPRE BLOQUEADOS ──────────────────────────────────────
const BLOCKED = [
  "gov.br","jusbrasil","legisweb","planalto","wikipedia","youtube",
  "facebook","instagram","reclameaqui","scribd","slideshare","blogspot",
  "wordpress","medium.com","abnt.org","iso.org","sebrae","senai",
  "receita.fazenda","cnpj.biz","econodata","academia.edu","google.com",
  "bing.com","inmetro.gov","anvisa.gov","linkedin.com/pulse",
  "sindicato","associacao","abimo","abimed","procon",
];

// ─── TÍTULOS QUE INDICAM CONTEÚDO (não empresa) ──────────────────────
const CONTENT_START = [
  "como ","guia ","o que ","tudo sobre","entenda ","saiba ",
  "legislação","portaria n","resolução","norma iso","decreto ",
  "publicado","atualizado","lista de","consulta","faq ","curso ",
  "treinamento","download ","apostila","instrução de uso",
];

function isValidResult(title: string, url: string): boolean {
  const t = title.toLowerCase();
  const u = url.toLowerCase();
  if (BLOCKED.some(d => u.includes(d))) return false;
  if (u.endsWith(".pdf") || u.endsWith(".doc")) return false;
  if (t.includes("[pdf]") || t.startsWith("[pdf]")) return false;
  if (CONTENT_START.some(s => t.startsWith(s))) return false;
  return true;
}

// ─── QUERIES COM FALLBACK GRADUAL ────────────────────────────────────
function buildQueries(seed: string, estado: string): string[] {
  const base = `-filetype:pdf -site:gov.br -site:jusbrasil.com.br -site:wikipedia.org -site:youtube.com`;
  return [
    // Nível 1: Filtro máximo (fabricantes + exclusões completas)
    `(fabricante OR indústria OR importador) "${seed}" "${estado}" -laboratório -"prestação de serviço" -consultoria -OCP -ensaio ${base}`,
    // Nível 2: Relaxa exclusões, mantém fabricante
    `(fabricante OR indústria) "${seed}" ${estado} -laboratório ${base}`,
    // Nível 3: Mínimo — apenas seed + estado + .com.br
    `"${seed}" ${estado} site:.com.br ${base}`,
  ];
}

// ─── LOG ESTRUTURADO ─────────────────────────────────────────────────
export interface SearchLog {
  step:    string;
  status:  "ok" | "warn" | "error";
  detail:  string;
  count?:  number;
}

export interface SerperResult {
  titulo:  string;
  site:    string;
  snippet: string;
  dominio: string;
}

// ─── STEP 01: SERPER COM FALLBACK ────────────────────────────────────
export async function serperSearchWithFallback(
  seed: string,
  estado: string,
  onLog: (log: SearchLog) => void
): Promise<SerperResult[]> {
  const key = getKey("SERPER_API_KEY");
  if (!key) throw new Error("SERPER_API_KEY não configurada");

  const queries = buildQueries(seed, estado);

  for (let level = 0; level < queries.length; level++) {
    const q = queries[level];
    const levelLabel = ["Máximo", "Padrão", "Fallback"][level];

    onLog({ step: "Serper", status: "ok", detail: `Tentativa ${level + 1}/3 (${levelLabel}): "${seed.slice(0, 40)}..."` });

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
      const filtered = raw.filter(res => isValidResult(res.title, res.link));

      onLog({
        step: "Serper",
        status: filtered.length > 0 ? "ok" : "warn",
        detail: `Nível ${level + 1}: ${raw.length} resultados brutos → ${filtered.length} empresas válidas`,
        count: filtered.length,
      });

      if (filtered.length > 0) {
        return filtered.map(res => ({
          titulo:  res.title,
          site:    res.link,
          snippet: res.snippet || "",
          dominio: extractDomain(res.link),
        }));
      }

      // Aguarda antes da próxima tentativa
      if (level < queries.length - 1) await new Promise(r => setTimeout(r, 500));

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onLog({ step: "Serper", status: "error", detail: msg });
      if (msg.includes("inválida")) throw new Error(msg);
    }
  }

  onLog({ step: "Serper", status: "warn", detail: "Todas as tentativas esgotadas — nenhuma empresa encontrada", count: 0 });
  return [];
}

// ─── STEP 02: APOLLO COM FALLBACK DE CARGOS ──────────────────────────
const APOLLO_TITLES_STRICT = [
  "Gerente de Qualidade","Quality Manager","Responsável Técnico",
  "Assuntos Regulatórios","Regulatory Affairs","Diretor de Operações",
  "Comprador","Purchasing Manager","Gerente de P&D",
];

const APOLLO_TITLES_BROAD = [
  "Diretor","Engenheiro","Gerente","Manager","Coordenador",
  "Supervisor","Analista Sênior","Technical","Operations",
];

export interface ApolloResult {
  decisor:   string | null;
  cargo:     string | null;
  email:     string | null;
  linkedin:  string | null;
  fonte:     string;
}

export async function apolloFindDecisionMaker(
  empresa: string,
  dominio: string,
  onLog: (log: SearchLog) => void
): Promise<ApolloResult | null> {
  const key = getKey("APOLLO_API_KEY");
  if (!key) {
    onLog({ step: "Apollo", status: "warn", detail: "APOLLO_API_KEY não configurada — pulando" });
    return null;
  }

  const titleSets = [APOLLO_TITLES_STRICT, APOLLO_TITLES_BROAD];

  for (let attempt = 0; attempt < titleSets.length; attempt++) {
    const titles = titleSets[attempt];
    const label = attempt === 0 ? "cargos técnicos" : "cargos amplos";

    onLog({ step: "Apollo", status: "ok", detail: `Buscando ${label} em "${empresa.slice(0, 35)}"...` });

    try {
      const payload: Record<string, unknown> = {
        api_key: key,
        person_titles: titles,
        page: 1,
        per_page: 3,
      };
      if (dominio) payload.q_organization_domains = [dominio];
      else payload.q_organization_name = empresa;

      const r = await fetch("https://api.apollo.io/v1/mixed_people/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        onLog({ step: "Apollo", status: "warn", detail: `HTTP ${r.status}` });
        continue;
      }

      const data = await r.json();
      const people: Array<{
        first_name?: string; last_name?: string; title?: string;
        email?: string; linkedin_url?: string;
      }> = data?.people || [];

      onLog({
        step: "Apollo",
        status: people.length > 0 ? "ok" : "warn",
        detail: `${label}: ${people.length} decisores encontrados`,
        count: people.length,
      });

      if (people.length > 0) {
        const p = people[0];
        return {
          decisor: `${p.first_name || ""} ${p.last_name || ""}`.trim() || null,
          cargo:   p.title || null,
          email:   p.email || null,
          linkedin:p.linkedin_url || null,
          fonte:   `apollo_${attempt === 0 ? "strict" : "broad"}`,
        };
      }
    } catch (e: unknown) {
      onLog({ step: "Apollo", status: "error", detail: e instanceof Error ? e.message : String(e) });
    }
  }

  onLog({ step: "Apollo", status: "warn", detail: "Nenhum decisor encontrado após 2 tentativas", count: 0 });
  return null;
}

// ─── STEP 03: HUNTER ─────────────────────────────────────────────────
export interface HunterResult {
  email:       string;
  decisor:     string | null;
  deliverable: boolean;
}

export async function hunterValidate(
  dominio: string,
  empresa: string,
  emailApollo: string | null,
  onLog: (log: SearchLog) => void
): Promise<HunterResult | null> {
  const key = getKey("HUNTER_API_KEY");
  if (!key) {
    onLog({ step: "Hunter", status: "warn", detail: "HUNTER_API_KEY não configurada — pulando" });
    return null;
  }
  if (!dominio) {
    onLog({ step: "Hunter", status: "warn", detail: "Sem domínio para buscar" });
    return null;
  }

  try {
    // Valida email do Apollo se disponível
    if (emailApollo) {
      onLog({ step: "Hunter", status: "ok", detail: `Verificando: ${emailApollo}` });
      const vr = await fetch(
        `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(emailApollo)}&api_key=${key}`
      );
      if (vr.ok) {
        const vd = await vr.json();
        const deliverable = vd?.data?.status === "valid";
        onLog({ step: "Hunter", status: "ok", detail: `E-mail ${deliverable ? "✓ válido" : "✗ inválido"}: ${emailApollo}` });
        return { email: emailApollo, decisor: null, deliverable };
      }
    }

    // Busca email pelo domínio
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

    onLog({ step: "Hunter", status: "ok", detail: `${emails.length} emails encontrados em ${dominio}`, count: emails.length });
    if (!emails.length) return null;

    const PRIORITY = ["quality","regulatory","engineering","management","executive","research","purchase","compras"];
    let best = emails.find(e => PRIORITY.some(d => (e.department || "").toLowerCase().includes(d))) || emails[0];
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

// ─── PIPELINE COMPLETO ────────────────────────────────────────────────
export interface EnrichedLead {
  email:       string | null;
  decisor:     string | null;
  cargo:       string | null;
  linkedin:    string | null;
  deliverable: boolean | null;
}

export async function enrichLeadPipeline(
  titulo: string,
  site: string,
  dominio: string,
  onLog: (log: SearchLog) => void
): Promise<EnrichedLead> {
  const apollo = await apolloFindDecisionMaker(titulo, dominio, onLog);
  const hunter = await hunterValidate(dominio, titulo, apollo?.email || null, onLog);

  return {
    email:       apollo?.email    || hunter?.email    || null,
    decisor:     apollo?.decisor  || hunter?.decisor  || null,
    cargo:       apollo?.cargo    || null,
    linkedin:    apollo?.linkedin || null,
    deliverable: hunter?.deliverable ?? null,
  };
}

export function extractDomain(url: string): string {
  const m = url?.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/);
  return m?.[1] || "";
}
