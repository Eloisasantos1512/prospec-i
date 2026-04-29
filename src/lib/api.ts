/**
 * api.ts — Serper + Hunter + Apollo (sem backend)
 * Serper busca APENAS empresas via operadores Google
 */

export const getKey = (k: string) => localStorage.getItem(k) || "";

// Domínios bloqueados — nunca são empresas
const BLOCKED = [
  "gov.br","jusbrasil","legisweb","planalto","inmetro.gov","anvisa.gov",
  "wikipedia","youtube","facebook","instagram","reclameaqui","procon",
  "slideshare","scribd","blogspot","wordpress","medium.com","abnt.org",
  "normas.com","sebrae","senai","receita.fazenda","cnpj.biz","econodata",
  "tabelionato","contabilidade","sindicato","associacao","iso.org",
  "google.com","bing.com","yahoo.com","linkedin.com/pulse",
];

// Palavras que indicam artigo/portal — rejeita se título começa com isso
const CONTENT_START = [
  "como","guia","o que","passo","manual","tudo","entenda","saiba",
  "legislação","portaria","resolução","norma","decreto","publicado",
  "atualizado","certificação inmetro:","o processo","artigo","blog",
  "notícia","news","download","curso","treinamento","lista de",
  "empresas de","consulta","registro","perguntas","faq",
];

// Palavras que identificam empresa no título/URL
const COMPANY_WORDS = [
  "ltda","s.a.","s/a","eireli"," me "," epp ","industria","indústria",
  "fabricante","comércio","importadora","distribuidora","engenharia",
  "tecnologia","biomédica","biomed","medical","pharma","farmacêutica",
  "equipamentos","produtos","sistemas","soluções","instrumentos",
  "laboratorio","laboratório","implantes","ortopedia","hospitalar",
];

function isCompany(title: string, url: string): boolean {
  const t = title.toLowerCase();
  const u = url.toLowerCase();
  if (BLOCKED.some(b => u.includes(b))) return false;
  if (CONTENT_START.some(s => t.startsWith(s))) return false;
  if (t.includes(" pdf") || t.endsWith(".pdf") || titulo.includes("[PDF]") || titulo.includes("[pdf]")) return false;
  return COMPANY_WORDS.some(w => t.includes(w) || u.includes(w));
}

// ── SERPER — força empresas com operadores Google ─────────────────────
export async function serperSearch(seed: string, estado: string) {
  const key = getKey("SERPER_API_KEY");
  if (!key) throw new Error("Configure a SERPER_API_KEY em Configurações");

  // Operadores que forçam resultados de empresas
  const q = `"${seed}" "${estado}" ("LTDA" OR "S.A." OR "Indústria" OR "Importadora") site:.com.br`;

  const r = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, gl: "br", hl: "pt", num: 10 }),
  });

  if (r.status === 403) throw new Error("SERPER_API_KEY inválida");
  if (!r.ok) throw new Error(`Serper erro ${r.status}`);

  const data = await r.json();
  return ((data.organic || []) as Array<{title:string;link:string;snippet:string}>)
    .filter(res => isCompany(res.title, res.link))
    .map(res => ({
      titulo:  res.title,
      site:    res.link,
      snippet: res.snippet || "",
    }));
}

// ── HUNTER — email corporativo por domínio ────────────────────────────
export async function hunterEmail(dominio: string, empresa: string) {
  const key = getKey("HUNTER_API_KEY");
  if (!key || !dominio) return null;
  try {
    const r = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${dominio}&company=${encodeURIComponent(empresa)}&api_key=${key}&limit=5`
    );
    if (!r.ok) return null;
    const data = await r.json();
    const emails: Array<{value:string;department:string;first_name:string;last_name:string}> =
      data?.data?.emails || [];
    const DEPTS = ["quality","regulatory","engineering","management","executive","research","purchase","compras"];
    for (const e of emails) {
      if (DEPTS.some(d => (e.department || "").toLowerCase().includes(d))) {
        return {
          email:   e.value,
          decisor: `${e.first_name || ""} ${e.last_name || ""}`.trim() || null,
        };
      }
    }
    return emails[0] ? { email: emails[0].value, decisor: null } : null;
  } catch { return null; }
}

// ── APOLLO — decisor B2B por empresa ─────────────────────────────────
export async function apolloContact(empresa: string) {
  const key = getKey("APOLLO_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        q_organization_name: empresa,
        person_titles: [
          "Gerente de Qualidade","Quality Manager","Regulatory Affairs",
          "Assuntos Regulatórios","Engenharia","P&D","Compras",
          "Diretor Técnico","Gerente de Produção",
        ],
        page: 1,
        per_page: 1,
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const p = data?.people?.[0];
    if (!p) return null;
    return {
      decisor: `${p.first_name || ""} ${p.last_name || ""}`.trim() || null,
      cargo:   p.title || null,
      email:   p.email || null,
      linkedin:p.linkedin_url || null,
    };
  } catch { return null; }
}

// ── Extrai domínio de URL ─────────────────────────────────────────────
export function getDomain(url: string) {
  const m = url?.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/);
  return m?.[1] || "";
}

// ── Pipeline: Hunter + Apollo em paralelo ────────────────────────────
export async function enrichLead(titulo: string, site: string) {
  const domain = getDomain(site);
  const [h, a] = await Promise.allSettled([
    hunterEmail(domain, titulo),
    apolloContact(titulo),
  ]);
  const hunter = h.status === "fulfilled" ? h.value : null;
  const apollo = a.status === "fulfilled" ? a.value : null;
  return {
    email:    apollo?.email    || hunter?.email    || null,
    decisor:  apollo?.decisor  || hunter?.decisor  || null,
    cargo:    apollo?.cargo    || null,
    linkedin: apollo?.linkedin || null,
  };
}
