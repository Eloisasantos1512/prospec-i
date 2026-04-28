import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle, XCircle, ExternalLink, Save, Key } from "lucide-react";

const APIS = [
  {
    key: "SERPER_API_KEY",
    label: "Serper.dev",
    subtitle: "Google Search API",
    description: "Busca o site oficial de empresas no Google. Necessário para a prospecção automática.",
    freePlan: "2.500 buscas/mês grátis",
    signupUrl: "https://serper.dev",
    docsUrl: "https://serper.dev/api-reference",
    placeholder: "Cole sua chave Serper aqui...",
    color: "blue",
  },
  {
    key: "HUNTER_API_KEY",
    label: "Hunter.io",
    subtitle: "Email Finder",
    description: "Encontra e valida emails corporativos pelo domínio da empresa.",
    freePlan: "25 buscas/mês grátis",
    signupUrl: "https://hunter.io/users/sign_up",
    docsUrl: "https://hunter.io/api-documentation",
    placeholder: "Cole sua chave Hunter aqui...",
    color: "orange",
  },
  {
    key: "APOLLO_API_KEY",
    label: "Apollo.io",
    subtitle: "B2B Contact Search",
    description: "Encontra decisores por cargo: Qualidade, Regulatório, P&D, Compras, Engenharia.",
    freePlan: "10.000 créditos/mês grátis",
    signupUrl: "https://app.apollo.io/#/sign-up",
    docsUrl: "https://apolloio.github.io/apollo-api-docs",
    placeholder: "Cole sua chave Apollo aqui...",
    color: "purple",
  },
  {
    key: "BACKEND_URL",
    label: "Backend URL",
    subtitle: "Railway / Render",
    description: "URL do servidor backend que processa as buscas usando as APIs acima.",
    freePlan: "Deploy gratuito no Railway",
    signupUrl: "https://railway.app",
    docsUrl: "https://docs.railway.app",
    placeholder: "https://seu-backend.railway.app",
    color: "green",
  },
];

const COLOR_MAP: Record<string, string> = {
  blue:   "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
  orange: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800",
  purple: "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800",
  green:  "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
};

const DOT_MAP: Record<string, string> = {
  blue:   "bg-blue-500",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
  green:  "bg-green-500",
};

export default function Configuracoes() {
  const [values, setValues]   = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saved, setSaved]     = useState<Record<string, boolean>>({});
  const [toast, setToast]     = useState("");

  useEffect(() => {
    const loaded: Record<string, string> = {};
    APIS.forEach(({ key }) => { loaded[key] = localStorage.getItem(key) || ""; });
    setValues(loaded);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function handleSave(key: string) {
    const val = (values[key] || "").trim();
    if (!val) { showToast("⚠️ Digite a chave antes de salvar."); return; }
    localStorage.setItem(key, val);
    setSaved((p) => ({ ...p, [key]: true }));
    showToast("✅ Chave salva com sucesso!");
    setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 3000);
  }

  function handleClear(key: string) {
    localStorage.removeItem(key);
    setValues((p) => ({ ...p, [key]: "" }));
    showToast("Chave removida.");
  }

  const isOk = (key: string) => !!localStorage.getItem(key);
  const totalOk = APIS.filter(({ key }) => isOk(key)).length;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Key className="h-6 w-6 text-primary" />
          Configurações de API
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure as chaves para ativar o enriquecimento automático de leads.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-foreground text-background text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* Status geral */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Status das integrações</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            totalOk === APIS.length
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}>
            {totalOk}/{APIS.length} configuradas
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {APIS.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2">
              {isOk(key)
                ? <CheckCircle className="h-4 w-4 text-green-500" />
                : <XCircle className="h-4 w-4 text-muted-foreground" />}
              <div className={`h-2 w-2 rounded-full ${isOk(key) ? DOT_MAP[color] : "bg-muted-foreground/30"}`} />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cards */}
      {APIS.map(({ key, label, subtitle, description, freePlan, signupUrl, docsUrl, placeholder, color }) => (
        <div key={key} className={`border rounded-xl overflow-hidden ${isOk(key) ? "border-green-400/40" : "border-border"}`}>
          {/* Header colorido */}
          <div className={`px-5 py-4 border-b ${COLOR_MAP[color]}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground">{label}</h3>
                  <span className="text-xs text-muted-foreground">— {subtitle}</span>
                  {isOk(key) && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      ✓ Ativa
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
              <span className="text-[10px] shrink-0 whitespace-nowrap px-2 py-1 rounded-lg bg-background/60 text-muted-foreground border border-border/40">
                {freePlan}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="bg-card px-5 py-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={visible[key] ? "text" : "password"}
                  placeholder={placeholder}
                  value={values[key] || ""}
                  onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleSave(key)}
                  className="w-full h-9 px-3 pr-10 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
                />
                <button
                  type="button"
                  onClick={() => setVisible((p) => ({ ...p, [key]: !p[key] }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {visible[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <button
                onClick={() => handleSave(key)}
                className={`flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-medium transition-all ${
                  saved[key]
                    ? "border border-green-500 text-green-600 bg-green-50 dark:bg-green-950/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {saved[key] ? <CheckCircle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                {saved[key] ? "Salvo!" : "Salvar"}
              </button>

              {isOk(key) && (
                <button
                  onClick={() => handleClear(key)}
                  className="px-3 h-9 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  Remover
                </button>
              )}
            </div>

            <div className="flex gap-4 pt-1">
              <a href={signupUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> Criar conta gratuita
              </a>
              <a href={docsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:underline">
                <ExternalLink className="h-3 w-3" /> Documentação da API
              </a>
            </div>
          </div>
        </div>
      ))}

      {/* Info */}
      <div className="border border-dashed border-border rounded-xl p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Segurança:</strong>{" "}
          As chaves são salvas no seu navegador (localStorage) e nunca enviadas para terceiros.
          Para produção, configure as variáveis de ambiente no painel do Railway — nunca suba chaves no código-fonte.
        </p>
      </div>
    </div>
  );
}
