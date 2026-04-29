export const getKey = (k: string) => localStorage.getItem(k) || "";

const SKIP_DOMAINS = [
  "gov.br","jusbrasil","legisweb","planalto","wikipedia","youtube",
  "facebook","instagram","reclameaqui","scribd","slideshare","blogspot",
  "wordpress","medium.com","abnt.org","normas.com","sebrae","senai",
  "receita.fazenda","cnpj.biz","econodata","academia.edu","google.com",
  "bing.com","iso.org","inmetro.gov","anvisa.gov","mec.gov","portal.mec",
];

const SKIP_TITLE_START = [
  "como ","guia ","o que ","passo a","manual ","tudo sobre","entenda ",
  "saiba ","legislação","portaria n","resolução","norma iso","decreto ",
  "publicado em","atualizado em","lista de empresas","consulta de",
  "registro de","faq ","perguntas","instrucciones","instrução de uso",
  "curso ","treinamento","download ","apostila",
];

function isValidResult(title: string, url: string): boolean {
  const t = title.toLowerCase();
  const u = url.toLowerCase();
  // Bloqueia domínios ruins
  if (SKIP_DOMAINS.some(d => u.includes(d))) return false;
  // Bloqueia PDFs
  if (u.endsWith(".pdf") || t.includes("[pdf]") || t.startsWith("[pdf]")) return false;
  // Bloqueia títulos de artigos/legislação
  if (SKIP_TITLE_START.some(s => t.startsWith(s))) return false;
  // Aceita tudo mais — deixa resultados de empresas passarem
  return true;
}

export async function serperSearch(seed: string, estado: string) {
  const key = getKey("SERPER_API_KEY");
  if (!key) throw new Error("Configure a SERPER_API_KEY em Configurações");
  
  const q = `${seed} ${estado} -filetype:pdf -site:gov.br -site:jusbrasil.com.br -site:legisweb.com.br -site:planalto.gov.br -site:wikipedia.org -site:youtube.com`;
  
  const r = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, gl: "br", hl: "pt", num: 10 }),
  });
  if (r.status === 403) throw new Error("SERPER_API_KEY inválida");
  if (!r.ok) throw new Error(`Serper erro ${r.status}`);
  const data = await r.json();
  return ((data.organic || []) as Array<{title:string;link:string;snippet:string}>)
    .filter(res => isValidResult(res.title, res.link))
    .map(res => ({ titulo: res.title, site: res.link, snippet: res.snippet || "" }));
}

export async function hunterEmail(dominio: string, empresa: string) {
  const key = getKey("HUNTER_API_KEY");
  if (!key || !dominio) return null;
  try {
    const r = await fetch(`https://api.hunter.io/v2/domain-search?domain=${dominio}&company=${encodeURIComponent(empresa)}&api_key=${key}&limit=5`);
    if (!r.ok) return null;
    const data = await r.json();
    const emails: Array<{value:string;department:string;first_name:string;last_name:string}> = data?.data?.emails || [];
    const DEPTS = ["quality","regulatory","engineering","management","executive","research","purchase","compras"];
    for (const e of emails) {
      if (DEPTS.some(d => (e.department||"").toLowerCase().includes(d)))
        return { email: e.value, decisor: `${e.first_name||""} ${e.last_name||""}`.trim()||null };
    }
    return emails[0] ? { email: emails[0].value, decisor: null } : null;
  } catch { return null; }
}

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
        person_titles: ["Gerente de Qualidade","Quality Manager","Regulatory Affairs","Assuntos Regulatórios","Engenharia","P&D","Compras","Diretor Técnico"],
        page: 1, per_page: 1,
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const p = data?.people?.[0];
    if (!p) return null;
    return { decisor: `${p.first_name||""} ${p.last_name||""}`.trim()||null, cargo: p.title||null, email: p.email||null, linkedin: p.linkedin_url||null };
  } catch { return null; }
}

export function getDomain(url: string) {
  const m = url?.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9\-.]+\.[a-zA-Z]{2,})/);
  return m?.[1] || "";
}

export async function enrichLead(titulo: string, site: string) {
  const domain = getDomain(site);
  const [h, a] = await Promise.allSettled([hunterEmail(domain, titulo), apolloContact(titulo)]);
  const hunter = h.status === "fulfilled" ? h.value : null;
  const apollo = a.status === "fulfilled" ? a.value : null;
  return { email: apollo?.email||hunter?.email||null, decisor: apollo?.decisor||hunter?.decisor||null, cargo: apollo?.cargo||null, linkedin: apollo?.linkedin||null };
}
