/**
 * crmData.ts — Base de conhecimento extraída da planilha de propostas
 * 405 propostas · 192 empresas · dados reais de fechamento
 */

export interface CrmEntry {
  sigla:    string;
  produto:  string;
  portaria: string;
  seeds:    string[];
  apollo_kws: string[];
}

export interface SectorStat {
  label:       string;
  total:       number;
  aprovado:    number;
  desistencia: number;
  ticket_total:number;
  taxa:        number;
  cor:         string;
}

// ─── ÍNDICE CRM — empresas reais da planilha ────────────────────────
// Usado para detectar se um lead já está na base (evitar duplicata)
export const CRM_EMPRESAS: Record<string, { status: string; portaria: string; ticket: number }> = {
  "walter indústria de fundidos usinados":     { status: "Aprovado",   portaria: "Portaria 145/2022", ticket: 6800 },
  "saeron automotive":                          { status: "Aprovado",   portaria: "Portaria 145/2022", ticket: 7450 },
  "mando iksan":                                { status: "Aprovado",   portaria: "Portaria 145/2022", ticket: 10650 },
  "kb autosys":                                 { status: "Aprovado",   portaria: "Portaria 145/2022", ticket: 10650 },
  "akebono brake":                              { status: "Aprovado",   portaria: "Portaria 145/2022", ticket: 5650 },
  "wenzhou yuanhao":                            { status: "Aprovado",   portaria: "Portaria 145/2022", ticket: 13950 },
  "lanxi enlin":                                { status: "Aprovado",   portaria: "Portaria 071/2022", ticket: 0 },
  "renqiu xintai":                              { status: "Aprovado",   portaria: "Portaria 071/2022", ticket: 0 },
  "primax corporation":                         { status: "Aprovado",   portaria: "Portaria 145/2022", ticket: 5650 },
  "samsung precision":                          { status: "Aprovado",   portaria: "Portaria 145/2022", ticket: 5650 },
  "central automotive parts":                   { status: "Aprovado",   portaria: "Portaria 145/2022", ticket: 10650 },
  "resonac materials":                          { status: "Aprovado",   portaria: "Portaria 145/2022", ticket: 10650 },
  "dyna metal":                                 { status: "Aprovado",   portaria: "Portaria 145/2022", ticket: 5650 },
};

// Função para detectar se empresa já está no CRM
export function checkCrmMatch(titulo: string): { found: boolean; status?: string; portaria?: string; ticket?: number } {
  const t = titulo.toLowerCase();
  for (const [key, val] of Object.entries(CRM_EMPRESAS)) {
    if (t.includes(key)) return { found: true, ...val };
  }
  return { found: false };
}

// ─── PERFORMANCE POR SETOR (dados reais da planilha) ───────────────
export const SECTOR_STATS: SectorStat[] = [
  { sigla:"CA", label:"Componentes Automotivos", total:241, aprovado:110, desistencia:25, ticket_total:689472, taxa:46, cor:"blue" },
  { sigla:"CV", label:"Conteúdo Reciclado / Veículos", total:25,  aprovado:21,  desistencia:2,  ticket_total:37808,  taxa:84, cor:"green" },
  { sigla:"CM", label:"Correntes e Mecanismos",  total:71,  aprovado:41,  desistencia:8,  ticket_total:117491, taxa:58, cor:"purple" },
  { sigla:"EM", label:"Eletromédicos / ANVISA",  total:33,  aprovado:19,  desistencia:5,  ticket_total:255043, taxa:58, cor:"violet" },
  { sigla:"TC", label:"Telecom / Anatel",        total:12,  aprovado:5,   desistencia:2,  ticket_total:55642,  taxa:42, cor:"indigo" },
  { sigla:"RA", label:"Rádio Amador",            total:12,  aprovado:4,   desistencia:3,  ticket_total:17858,  taxa:33, cor:"amber" },
];

// ─── ESCOPOS OCP COM DADOS REAIS DA PLANILHA ───────────────────────
export interface OcpScope {
  id:         string;
  sigla:      string;
  icon:       string;
  label:      string;
  sub:        string;
  portaria:   string;
  validade:   string;
  motivo:     string;
  color:      "blue"|"violet"|"teal"|"green"|"indigo"|"amber";
  seeds:      string[];
  apollo_kws: string[];
  top_products: string[];
  taxa_conversao: number;
  ticket_medio: number;
}

export const OCP_SCOPES_DATA: OcpScope[] = [
  {
    id: "p145_amortecedor",
    sigla: "CA",
    icon: "🚗",
    label: "Portaria 145 — Amortecedores",
    sub: "38 aprovados · Ticket R$7.800",
    portaria: "Portaria Inmetro 145/2022",
    validade: "5 anos",
    motivo: "Fabricante de amortecedor para veículos — certificação compulsória INMETRO + recertificação a cada 5 anos",
    color: "blue",
    seeds: ["fabricante amortecedor automotivo","indústria amortecedor veicular","amortecedor suspensão veículo fabricante"],
    apollo_kws: ["shock absorber manufacturer","automotive suspension","vehicle parts manufacturer"],
    top_products: ["AMORTECEDOR","TERMINAL DE DIREÇÃO","BARRA DE DIREÇÃO"],
    taxa_conversao: 46,
    ticket_medio: 7800,
  },
  {
    id: "p145_lampada",
    sigla: "CA",
    icon: "💡",
    label: "Portaria 145 — Lâmpadas",
    sub: "35 aprovados · Ticket R$6.500",
    portaria: "Portaria Inmetro 145/2022",
    validade: "5 anos",
    motivo: "Fabricante de lâmpada de filamento automotiva — maior volume de aprovações na planilha",
    color: "amber",
    seeds: ["fabricante lâmpada filamento automotivo","indústria lâmpada veicular","lâmpada farol automotivo fabricante"],
    apollo_kws: ["automotive lamp manufacturer","vehicle lighting","headlight manufacturer"],
    top_products: ["LÂMPADA DE FILAMENTO","LÂMPADA LED","FAROL"],
    taxa_conversao: 57,
    ticket_medio: 6500,
  },
  {
    id: "p145_bomba",
    sigla: "CA",
    icon: "⛽",
    label: "Portaria 145 — Bomba Combustível",
    sub: "32 aprovados · Ticket R$8.200",
    portaria: "Portaria Inmetro 145/2022",
    validade: "5 anos",
    motivo: "Fabricante de bomba de combustível — alta demanda comprovada na base Scitec",
    color: "teal",
    seeds: ["fabricante bomba combustível automotivo","indústria bomba gasolina etanol veicular","bomba injetora combustível fabricante"],
    apollo_kws: ["fuel pump manufacturer","automotive fuel system","fuel injection manufacturer"],
    top_products: ["BOMBA DE COMBUSTÍVEL","BOMBA INJETORA","FILTRO COMBUSTÍVEL"],
    taxa_conversao: 52,
    ticket_medio: 8200,
  },
  {
    id: "cm_corrente",
    sigla: "CM",
    icon: "⛓",
    label: "Correntes e Mecanismos",
    sub: "41 aprovados · Taxa 58%",
    portaria: "Portaria Inmetro 071/2022",
    validade: "5 anos",
    motivo: "Fabricante de correntes de transmissão e coroas — 58% de conversão, melhor taxa após CV",
    color: "purple",
    seeds: ["fabricante corrente transmissão motocicleta","indústria corrente rolamento transmissão","corrente coroa pinhão fabricante"],
    apollo_kws: ["transmission chain manufacturer","motorcycle chain","drive chain manufacturer"],
    top_products: ["Corrente","Coroa","Corrente de Transmissão","Pinhão","Kit de Transmissão"],
    taxa_conversao: 58,
    ticket_medio: 4500,
  },
  {
    id: "p384_eletromedico",
    sigla: "EM",
    icon: "🏥",
    label: "Portaria 384 — Eletromédicos",
    sub: "19 aprovados · Ticket R$13.400",
    portaria: "Portaria Inmetro 384/2020",
    validade: "3 anos",
    motivo: "Fabricante de equipamento eletromédico — maior ticket médio, prazo de recertificação 3 anos",
    color: "violet",
    seeds: ["fabricante equipamento eletromédico hospitalar","indústria equipamento médico diagnóstico","equipamento médico hospitalar fabricante"],
    apollo_kws: ["electromedical equipment","medical devices manufacturer","hospital equipment"],
    top_products: ["EQUIPAMENTO ELETROMÉDICO","MONITOR","DESFIBRILADOR"],
    taxa_conversao: 58,
    ticket_medio: 13400,
  },
  {
    id: "anatel_telecom",
    sigla: "TC",
    icon: "📡",
    label: "Anatel 715/2019 — Telecom",
    sub: "5 aprovados · Ticket R$11.100",
    portaria: "Resolução Anatel 715/2019",
    validade: "3 anos",
    motivo: "Fabricante de equipamento de telecomunicação — homologação Anatel compulsória",
    color: "indigo",
    seeds: ["fabricante equipamento telecomunicação","indústria rádio transmissor homologação","equipamento wireless IoT fabricante"],
    apollo_kws: ["telecommunications equipment","wireless devices","IoT manufacturer","radio transmitter"],
    top_products: ["RÁDIO","TRANSMISSOR","ANTENA","ROTEADOR"],
    taxa_conversao: 42,
    ticket_medio: 11100,
  },
];

// ─── ESCOPOS LAB (mantidos) ──────────────────────────────────────────
export const LAB_SCOPES_DATA = [
  {
    id:"iso10993",    icon:"🦴", label:"ISO 10993-18", sub:"Biocompatibilidade",
    cnae:"3250-7/01", color:"violet" as const,
    motivo:"Fabricante de dispositivo implantável — ensaios de biocompatibilidade ISO 10993",
    seeds:["implante ortopédico biomédica","dispositivo médico implantável","prótese cirúrgica biomaterial","instrumental cirúrgico estéril"],
    apollo_kws:["medical devices","orthopedic implants","biomaterials"],
    portaria:"ISO 10993", validade:"3 anos", taxa_conversao: 50, ticket_medio: 8000,
  },
  {
    id:"mri",         icon:"🧲", label:"MRI", sub:"Ressonância Magnética",
    cnae:"26.60-4/00", color:"blue" as const,
    motivo:"Fabricante de implante — avaliação de compatibilidade MRI",
    seeds:["equipamento imagem médica","implante ressonância magnética","monitor desfibrilador"],
    apollo_kws:["medical imaging","mri equipment","diagnostic equipment"],
    portaria:"ISO 62570", validade:"3 anos", taxa_conversao: 45, ticket_medio: 9000,
  },
  {
    id:"endotoxina",  icon:"🧬", label:"Endotoxina", sub:"8129-0/00",
    cnae:"8129-0/00", color:"teal" as const,
    motivo:"Fabricante de produto injetável/estéril — ensaios de endotoxina bacteriana",
    seeds:["farmácia manipulação injetáveis","indústria farmacêutica injetável","produto estéril hospitalar"],
    apollo_kws:["pharmaceutical manufacturing","injectable products","sterile manufacturing"],
    portaria:"RDC 204/2017", validade:"1 ano", taxa_conversao: 40, ticket_medio: 6000,
  },
  {
    id:"esterilidade",icon:"⚗️", label:"Esterilidade", sub:"3250-7/01",
    cnae:"3250-7/01", color:"green" as const,
    motivo:"Fabricante de material médico-hospitalar — validação de esterilidade e bioburden",
    seeds:["embalagem farmacêutica estéril","material médico descartável","seringa agulha cateter"],
    apollo_kws:["medical supplies","disposable medical","hospital supplies"],
    portaria:"ABNT NBR 11135", validade:"1 ano", taxa_conversao: 42, ticket_medio: 5500,
  },
];

// ─── LOOKALIKE — empresas referência para busca similar ─────────────
export interface LookalikeRef {
  nome:    string;
  setor:   string;
  portaria:string;
  produto: string;
  seeds:   string[];
}

export const LOOKALIKE_REFS: LookalikeRef[] = [
  { nome:"Bosch", setor:"Automotivo", portaria:"Portaria 145/2022", produto:"Amortecedor / Bomba",
    seeds:["fabricante componentes automotivos porte Bosch","indústria autopeças sistema freio suspensão","fornecedor tier1 fabricante automotivo"] },
  { nome:"Scania / Volvo", setor:"Veículos Pesados", portaria:"Portaria 145/2022", produto:"Componentes Caminhão",
    seeds:["fabricante componentes caminhão ônibus","indústria veículos pesados autopeças","fornecedor sistema freio pesado"] },
  { nome:"ArcelorMittal / Gerdau", setor:"Siderúrgico", portaria:"Portaria 145/2022", produto:"Aço / Metal",
    seeds:["fabricante aço componente automotivo","indústria metalúrgica peças automóveis","fundição usinagem autopeças"] },
  { nome:"Akebono / TRW", setor:"Sistema de Freios", portaria:"Portaria 145/2022", produto:"Material de Atrito",
    seeds:["fabricante pastilha freio lona atrito","indústria material atrito freio automotivo","sistema freio veicular fabricante"] },
  { nome:"Philips / Osram", setor:"Iluminação Automotiva", portaria:"Portaria 145/2022", produto:"Lâmpada Automotiva",
    seeds:["fabricante lâmpada automotiva iluminação","indústria iluminação veicular LED halógena","lâmpada farol automotivo"] },
];
