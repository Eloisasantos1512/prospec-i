"""
backend.py — API REST para o Lovable (PROSPEC-O)
Fontes: Serper (Google Search) + Hunter.io (emails) + Apollo.io (decisores)
Deploy: Railway, Render ou Fly.io (gratuitos)
"""
import re, os, asyncio, logging
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)

# ── Chaves de API (configure no painel do Railway/Render) ─────────────
SERPER_KEY = os.getenv("SERPER_API_KEY", "")
HUNTER_KEY = os.getenv("HUNTER_API_KEY", "")
APOLLO_KEY = os.getenv("APOLLO_API_KEY", "")

TIMEOUT = httpx.Timeout(12.0, connect=5.0)
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

app = FastAPI(title="PROSPEC-O Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://prospect-oscitec2026.lovable.app", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ───────────────────────────────────────────────────────────
class EnrichRequest(BaseModel):
    empresa: str
    cnpj: Optional[str] = None
    site: Optional[str] = None

class LeadEnriquecido(BaseModel):
    empresa: str
    site: Optional[str] = None
    email: Optional[str] = None
    decisor: Optional[str] = None
    cargo: Optional[str] = None
    linkedin: Optional[str] = None
    telefone: Optional[str] = None
    fonte_site: Optional[str] = None
    fonte_email: Optional[str] = None
    fonte_decisor: Optional[str] = None

class BuscaRequest(BaseModel):
    termo: str
    estado: Optional[str] = "SP"
    max_resultados: int = 10

# ─────────────────────────────────────────────────────────────────────
#  1. SERPER — Google Search para encontrar site oficial
# ─────────────────────────────────────────────────────────────────────
async def buscar_site_serper(client: httpx.AsyncClient, empresa: str) -> Optional[str]:
    if not SERPER_KEY:
        return None
    try:
        r = await client.post(
            "https://google.serper.dev/search",
            json={
                "q": f"{empresa} site oficial",
                "gl": "br",
                "hl": "pt",
                "num": 5
            },
            headers={
                "X-API-KEY": SERPER_KEY,
                "Content-Type": "application/json"
            },
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            resultados = r.json().get("organic", [])
            # Ignora portais genéricos
            _IGNORAR = (
                "cnpj.biz", "jusbrasil", "econodata", "linkedin.com",
                "facebook.com", "instagram.com", "receita.fazenda.gov",
                "gov.br", "reclameaqui", "google.com"
            )
            for res in resultados:
                url = res.get("link", "")
                if url and not any(s in url for s in _IGNORAR):
                    return url
    except Exception as e:
        logger.warning(f"Serper '{empresa}': {e}")
    return None


# ─────────────────────────────────────────────────────────────────────
#  2. HUNTER.IO — Emails corporativos por domínio
# ─────────────────────────────────────────────────────────────────────
def _extrair_dominio(url: str) -> str:
    if not url:
        return ""
    m = re.search(r"https?://(?:www\.)?([a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})", url)
    return m.group(1) if m else ""


async def buscar_email_hunter(
    client: httpx.AsyncClient, dominio: str, empresa: str
) -> dict:
    if not HUNTER_KEY or not dominio:
        return {}
    try:
        r = await client.get(
            "https://api.hunter.io/v2/domain-search",
            params={
                "domain": dominio,
                "company": empresa,
                "api_key": HUNTER_KEY,
                "limit": 5,
                "type": "generic,personal",
            },
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            data = r.json().get("data", {})
            emails = data.get("emails", [])
            if not emails:
                return {}

            # Prioriza departamentos relevantes para Scitec
            _DEPTS_PRIORITY = {
                "executive", "management", "quality",
                "engineering", "regulatory", "research", "purchasing"
            }
            for e in emails:
                dept = (e.get("department") or "").lower()
                if any(d in dept for d in _DEPTS_PRIORITY):
                    return {
                        "email": e["value"],
                        "decisor": f"{e.get('first_name','')} {e.get('last_name','')}".strip(),
                        "fonte_email": "hunter.io"
                    }

            # Fallback: primeiro email encontrado
            first = emails[0]
            return {
                "email": first["value"],
                "fonte_email": "hunter.io"
            }
    except Exception as e:
        logger.warning(f"Hunter '{dominio}': {e}")
    return {}


# ─────────────────────────────────────────────────────────────────────
#  3. APOLLO.IO — Decisores por cargo e empresa
# ─────────────────────────────────────────────────────────────────────
async def buscar_decisor_apollo(
    client: httpx.AsyncClient, empresa: str
) -> dict:
    if not APOLLO_KEY:
        return {}
    try:
        r = await client.post(
            "https://api.apollo.io/v1/mixed_people/search",
            json={
                "api_key": APOLLO_KEY,
                "q_organization_name": empresa,
                "person_titles": [
                    # Cargos dos decisores do perfil ICP Scitec
                    "Gerente de Qualidade",
                    "Quality Manager",
                    "Regulatory Affairs",
                    "Assuntos Regulatórios",
                    "Engenharia de Materiais",
                    "P&D",
                    "Research and Development",
                    "Compras",
                    "Purchasing Manager",
                    "Diretor Técnico",
                ],
                "page": 1,
                "per_page": 3,
            },
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            pessoas = r.json().get("people", [])
            if pessoas:
                p = pessoas[0]
                nome = f"{p.get('first_name','')} {p.get('last_name','')}".strip()
                return {
                    "decisor":       nome,
                    "cargo":         p.get("title", ""),
                    "email":         p.get("email") or None,
                    "linkedin":      p.get("linkedin_url") or None,
                    "fonte_decisor": "apollo.io"
                }
    except Exception as e:
        logger.warning(f"Apollo '{empresa}': {e}")
    return {}


# ─────────────────────────────────────────────────────────────────────
#  Pipeline principal — chama as 3 APIs em paralelo
# ─────────────────────────────────────────────────────────────────────
async def enriquecer_lead(empresa: str, cnpj: str = "", site_conhecido: str = "") -> dict:
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as client:

        # Passo 1: Serper busca o site (se não informado)
        site = site_conhecido
        if not site:
            site = await buscar_site_serper(client, empresa) or ""

        # Passo 2: Hunter + Apollo em paralelo
        dominio = _extrair_dominio(site)
        hunter_data, apollo_data = await asyncio.gather(
            buscar_email_hunter(client, dominio, empresa),
            buscar_decisor_apollo(client, empresa),
            return_exceptions=True
        )

        hunter_data = hunter_data if isinstance(hunter_data, dict) else {}
        apollo_data = apollo_data if isinstance(apollo_data, dict) else {}

        # Mescla resultados (Apollo tem prioridade para email de decisor)
        resultado = {
            "empresa":       empresa,
            "site":          site or None,
            "fonte_site":    "serper.dev" if site else None,
        }

        # Email: Apollo > Hunter
        email = apollo_data.get("email") or hunter_data.get("email")
        resultado["email"]       = email
        resultado["fonte_email"] = apollo_data.get("fonte_decisor") if apollo_data.get("email") else hunter_data.get("fonte_email")

        # Decisor: Apollo
        resultado["decisor"]       = apollo_data.get("decisor")
        resultado["cargo"]         = apollo_data.get("cargo")
        resultado["linkedin"]      = apollo_data.get("linkedin")
        resultado["fonte_decisor"] = apollo_data.get("fonte_decisor")

        return resultado


# ─────────────────────────────────────────────────────────────────────
#  ENDPOINTS
# ─────────────────────────────────────────────────────────────────────
@app.get("/")
async def health():
    return {
        "status": "ok",
        "apis_configuradas": {
            "serper":  bool(SERPER_KEY),
            "hunter":  bool(HUNTER_KEY),
            "apollo":  bool(APOLLO_KEY),
        }
    }


@app.post("/enriquecer", response_model=LeadEnriquecido)
async def enriquecer(body: EnrichRequest):
    """
    Enriquece 1 empresa com Serper + Hunter + Apollo.
    Chame do Lovable para cada lead selecionado.
    """
    if not body.empresa:
        raise HTTPException(400, "Campo 'empresa' obrigatório")

    resultado = await enriquecer_lead(
        empresa=body.empresa,
        cnpj=body.cnpj or "",
        site_conhecido=body.site or ""
    )
    return LeadEnriquecido(**resultado)


@app.post("/enriquecer/lote")
async def enriquecer_lote(leads: List[EnrichRequest]):
    """
    Enriquece até 20 empresas em paralelo.
    Retorna lista com os resultados.
    """
    if len(leads) > 20:
        raise HTTPException(400, "Máximo 20 empresas por lote")

    resultados = await asyncio.gather(*[
        enriquecer_lead(l.empresa, l.cnpj or "", l.site or "")
        for l in leads
    ], return_exceptions=True)

    return [
        r if isinstance(r, dict) else {"empresa": leads[i].empresa, "erro": str(r)}
        for i, r in enumerate(resultados)
    ]


@app.post("/buscar")
async def buscar_empresas(body: BuscaRequest):
    """
    Busca empresas no Google via Serper e retorna lista com sites.
    Use para descobrir leads a partir de um termo de busca.
    """
    if not SERPER_KEY:
        raise HTTPException(503, "SERPER_API_KEY não configurada")

    async with httpx.AsyncClient(headers=HEADERS) as client:
        try:
            r = await client.post(
                "https://google.serper.dev/search",
                json={
                    "q": f"{body.termo} {body.estado} LTDA OR SA fabricante",
                    "gl": "br",
                    "hl": "pt",
                    "num": body.max_resultados
                },
                headers={"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"},
                timeout=TIMEOUT,
            )
            if r.status_code != 200:
                raise HTTPException(r.status_code, "Erro no Serper")

            _IGNORAR = (
                "cnpj.biz", "jusbrasil", "econodata", "linkedin.com",
                "facebook.com", "instagram.com", "receita.fazenda.gov",
                "gov.br", "reclameaqui", "google.com"
            )
            resultados = []
            for res in r.json().get("organic", []):
                url = res.get("link", "")
                if url and not any(s in url for s in _IGNORAR):
                    resultados.append({
                        "titulo": res.get("title", ""),
                        "site":   url,
                        "snippet": res.get("snippet", ""),
                    })

            return {"total": len(resultados), "resultados": resultados}

        except Exception as e:
            raise HTTPException(500, str(e))
