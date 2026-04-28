/**
 * api.ts — Chamadas diretas às APIs (sem backend intermediário)
 * Serper.dev → busca Google
 * Hunter.io  → emails
 * Apollo.io  → decisores
 */

export function getKey(k: string) {
  return localStorage.getItem(k) || "";
}

// ── Serper: busca empresas no Google ─────────────────────────────────
export async function serperBuscar(termo: string, estado: string) {
  const key = getKey("SERPER_API_KEY");
  if (!key) throw new Error("SERPER_API_KEY não configurada");

  const r = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      q: `${termo} ${estado} LTDA OR "S.A." fabricante`,
      gl: "br", hl: "pt", num: 10,
    }),
  });
  if (!r.ok) throw new Error(`Serper erro ${r.status}`);
  const data = await r.json();

  const SKIP = ["cnpj.biz","jusbrasil","econodata","facebook","instagram",
                "receita.fazenda","gov.br","reclameaqui","google.com","youtube"];
  return (data.organic || [])
    .filter((res: {link:string}) => !SKIP.some(s => res.link.includes(s)))
    .map((res: {title:string; link:string; snippet:string}) => ({
      titulo:  res.title || "",
      site:    res.link  || "",
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
    const PRIORITY = ["quality","regulatory","engineering","management","executive","research"];
    for (const e of emails) {
      if (PRIORITY.some(p => (e.department||"").toLowerCase().includes(p))) {
        return { email: e.value, decisor: `${e.first_name||""} ${e.last_name||""}`.trim() };
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
          "Engenharia","P&D","Compras","Diretor Técnico",
        ],
        page: 1, per_page: 1,
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const p = data?.people?.[0];
    if (!p) return null;
    return {
      decisor: `${p.first_name||""} ${p.last_name||""}`.trim(),
      cargo:   p.title || "",
      email:   p.email || null,
      linkedin:p.linkedin_url || null,
    };
  } catch { return null; }
}

// ── Extrai domínio de uma URL ─────────────────────────────────────────
export function extrairDominio(url: string) {
  if (!url) return "";
  const m = url.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})/);
  return m ? m[1] : "";
}

// ── Pipeline completo: Serper + Hunter + Apollo em paralelo ───────────
export async function enriquecerLead(lead: { titulo: string; site: string }) {
  const dominio = extrairDominio(lead.site);
  const [hunter, apollo] = await Promise.all([
    hunterEmail(dominio, lead.titulo),
    apolloDecisor(lead.titulo),
  ]);
  return {
    email:   apollo?.email   || hunter?.email   || null,
    decisor: apollo?.decisor || hunter?.decisor || null,
    cargo:   apollo?.cargo   || null,
    linkedin:apollo?.linkedin|| null,
  };
}
