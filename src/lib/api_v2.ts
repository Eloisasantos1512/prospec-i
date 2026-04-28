/**
 * api.ts — Chamadas diretas às APIs sem backend
 * Serper com filtros forçados para empresas reais
 */

export function getKey(k: string) {
  return localStorage.getItem(k) || "";
}

// Sites a ignorar sempre
const SKIP_SITES = [
  "gov.br","jusbrasil","legisweb","planalto","inmetro.gov","anvisa.gov",
  "wikipedia","youtube","facebook","instagram","linkedin.com/in",
  "reclameaqui","procon","slideshare","academia.edu","scribd",
  "blogspot","wordpress","medium.com","tabelionato","contabilidade",
  "sindicato","associacao","abnt.org","iso.org","pdf","legislacao",
  "normas.com","sebrae","senai","receita.fazenda","cnpj.biz","econodata",
];

function isEmpresa(titulo: string, url: string): boolean {
  const t = titulo.toLowerCase();
  const u = url.toLowerCase();
  
  // Rejeita sites de conteúdo
  if (SKIP_SITES.some(s => u.includes(s))) return false;
  
  // Rejeita títulos que são artigos/guias
  const REJEITAR = ["como","guia","o que é","passo","manual","tudo sobre",
    "entenda","saiba","legislação","portaria","resolução","norma","decreto",
    "publicado","atualizado","certificação inmetro:","o processo","artigo",
    "blog","notícia","news","pdf","download","curso","treinamento"];
  if (REJEITAR.some(r => t.startsWith(r) || t.includes(` ${r} `))) return false;
  
  // Favorece indicadores de empresa
  const EMPRESA_KWS = ["ltda","s.a.","s/a","eireli","me ","epp ","industria",
    "indústria","fabricante","comércio","importadora","distribuidora",
    "engenharia","tecnologia","biomédica","biomed","medical","pharma",
    "equipamentos","produtos","sistemas","soluções"];
  return EMPRESA_KWS.some(k => t.includes(k) || u.includes(k));
}

// ── Serper: busca empresas reais ─────────────────────────────────────
export async function serperBuscar(seed: string, estado: string) {
  const key = getKey("SERPER_API_KEY");
  if (!key) throw new Error("SERPER_API_KEY não configurada");

  // Força resultados de empresas com operadores Google
  const query = `${seed} ${estado} ("LTDA" OR "S.A." OR "indústria" OR "fabricante" OR "importadora") -site:gov.br -site:jusbrasil.com.br -site:legisweb.com.br -site:planalto.gov.br -filetype:pdf`;

  const r = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "br", hl: "pt", num: 10 }),
  });

  if (r.status === 403) throw new Error("SERPER_API_KEY inválida ou sem créditos");
  if (!r.ok) throw new Error(`Serper erro ${r.status}`);

  const data = await r.json();
  return (data.organic || [])
    .filter((res: { title: string; link: string }) => isEmpresa(res.title, res.link))
    .map((res: { title: string; link: string; snippet: string }) => ({
      titulo:  res.title,
      site:    res.link,
      snippet: res.snippet || "",
    }));
}

// ── Hunter: email pelo domínio ────────────────────────────────────────
export async function hunterEmail(dominio: string, empresa: string) {
  const key = getKey("HUNTER_API_KEY");
  if (!key || !dominio) return null;
  try {
    const r = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${dominio}&company=${encodeURIComponent(empresa)}&api_key=${key}&limit=3`
    );
    if (!r.ok) return null;
    const data = await r.json();
    const emails = data?.data?.emails || [];
    const PRIORITY = ["quality","regulatory","engineering","management","executive","research","purchase"];
    for (const e of emails) {
      if (PRIORITY.some(p => (e.department || "").toLowerCase().includes(p))) {
        return { email: e.value, decisor: `${e.first_name || ""} ${e.last_name || ""}`.trim() };
      }
    }
    return emails[0] ? { email: emails[0].value } : null;
  } catch { return null; }
}

// ── Apollo: decisor por empresa ───────────────────────────────────────
export async function apolloDecisor(empresa: string) {
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
          "Assuntos Regulatórios","Engenharia de Materiais","P&D",
          "Compras","Diretor Técnico","Gerente de Produção",
        ],
        page: 1, per_page: 1,
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const p = data?.people?.[0];
    if (!p) return null;
    return {
      decisor: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      cargo:   p.title || "",
      email:   p.email || null,
      linkedin:p.linkedin_url || null,
    };
  } catch { return null; }
}

// ── Extrai domínio ────────────────────────────────────────────────────
export function extrairDominio(url: string) {
  if (!url) return "";
  const m = url.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})/);
  return m ? m[1] : "";
}

// ── Enriquece um lead com Hunter + Apollo em paralelo ─────────────────
export async function enriquecerLead(lead: { titulo: string; site: string }) {
  const dominio = extrairDominio(lead.site);
  const [hunter, apollo] = await Promise.all([
    hunterEmail(dominio, lead.titulo),
    apolloDecisor(lead.titulo),
  ]);
  return {
    email:    apollo?.email    || hunter?.email    || null,
    decisor:  apollo?.decisor  || hunter?.decisor  || null,
    cargo:    apollo?.cargo    || null,
    linkedin: apollo?.linkedin || null,
  };
}
