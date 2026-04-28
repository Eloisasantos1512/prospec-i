import { useState } from "react";
import { useUnit } from "@/contexts/UnitContext";
import { getApiKey, isApiConfigured } from "@/lib/utils";
import { Search, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface Lead {
  titulo: string;
  site: string;
  snippet: string;
  email?: string;
  decisor?: string;
  cargo?: string;
}

export default function Prospeccao() {
  const { unit } = useUnit();
  const [termo, setTermo] = useState("");
  const [estado, setEstado] = useState("SP");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const backendUrl = getApiKey("BACKEND_URL");
  const temSerper = isApiConfigured("SERPER_API_KEY");

  async function buscar() {
    if (!termo.trim()) return;
    if (!backendUrl) { setErro("Configure a URL do Backend em Configurações."); return; }
    setLoading(true); setErro(""); setLeads([]);
    try {
      const r = await fetch(`${backendUrl}/buscar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termo, estado, max_resultados: 15 }),
      });
      if (!r.ok) throw new Error(`Erro ${r.status}`);
      const data = await r.json();
      setLeads(data.resultados || []);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao buscar");
    } finally {
      setLoading(false);
    }
  }

  async function enriquecer(lead: Lead, idx: number) {
    if (!backendUrl) return;
    try {
      const r = await fetch(`${backendUrl}/enriquecer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa: lead.titulo, site: lead.site }),
      });
      if (!r.ok) return;
      const data = await r.json();
      setLeads((prev) => prev.map((l, i) => i === idx ? { ...l, ...data } : l));
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Prospecção {unit === "lab" ? "Laboratório" : "OCP"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Busque empresas-alvo e enriqueça com emails, telefones e decisores automaticamente.
        </p>
      </div>

      {!temSerper && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-400">
            Configure as APIs em{" "}
            <Link to="/configuracoes" className="underline font-medium">Configurações</Link>
            {" "}para ativar a prospecção automática.
          </p>
        </div>
      )}

      {/* Busca */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Termo de busca</label>
            <input
              type="text"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              placeholder={unit === "lab"
                ? "Ex: fabricante implante ortopédico ISO 10993"
                : "Ex: fabricante equipamentos médicos certificação"}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {["SP","MG","SC","RS","PR","RJ","GO","CE","PE","DF","BA"].map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={buscar}
              disabled={loading}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm dark:bg-red-950/20 dark:border-red-800 dark:text-red-400">
          {erro}
        </div>
      )}

      {/* Resultados */}
      {leads.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{leads.length} empresas encontradas</p>
          {leads.map((lead, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-sm truncate">{lead.titulo}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{lead.snippet}</p>
                </div>
                <a href={lead.site} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-primary hover:underline text-xs flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Site
                </a>
              </div>
              {(lead.email || lead.decisor) && (
                <div className="flex flex-wrap gap-3 pt-1 border-t border-border">
                  {lead.email && (
                    <span className="text-xs text-muted-foreground">✉ {lead.email}</span>
                  )}
                  {lead.decisor && (
                    <span className="text-xs text-muted-foreground">👤 {lead.decisor}{lead.cargo ? ` — ${lead.cargo}` : ""}</span>
                  )}
                </div>
              )}
              {!lead.email && !lead.decisor && (
                <button
                  onClick={() => enriquecer(lead, idx)}
                  className="text-xs text-primary hover:underline"
                >
                  + Enriquecer com email e decisor
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && leads.length === 0 && termo && !erro && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum resultado encontrado para "{termo}".
        </div>
      )}
    </div>
  );
}
