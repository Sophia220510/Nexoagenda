export const featureDefinitions = [
  {
    key: "team_management",
    label: "Gestão de equipe",
    description: "Cadastros, funções e visão da equipe.",
  },
  {
    key: "reception",
    label: "Recepção",
    description: "Acesso próprio para recepcionistas operarem a agenda.",
  },
  {
    key: "commissions",
    label: "Comissões",
    description: "Regras e acompanhamento de comissão por profissional.",
  },
  {
    key: "waitlist",
    label: "Lista de espera",
    description: "Organização de clientes aguardando um horário.",
  },
  {
    key: "cash_closing",
    label: "Fechamento de caixa",
    description: "Conferência financeira diária da operação.",
  },
  {
    key: "advanced_reports",
    label: "Relatórios avançados",
    description: "Indicadores gerenciais e visão consolidada.",
  },
  {
    key: "whatsapp_reminders",
    label: "Lembretes por WhatsApp",
    description: "Configuração de lembretes de agendamento.",
  },
] as const;

export type FeatureKey = (typeof featureDefinitions)[number]["key"];
export type FeatureFlags = Record<FeatureKey, boolean>;
export type OperationProfile =
  | "SOLO"
  | "ESSENTIAL_TEAM"
  | "GROWING_OPERATION"
  | "STRUCTURED_OPERATION";

const flags = (...enabled: FeatureKey[]): FeatureFlags =>
  Object.fromEntries(
    featureDefinitions.map(({ key }) => [key, enabled.includes(key)]),
  ) as FeatureFlags;

export const operationProfiles: Array<{
  id: OperationProfile;
  label: string;
  description: string;
  bestFor: string;
  businessMode: "SOLO" | "TEAM";
  features: FeatureFlags;
}> = [
  {
    id: "SOLO",
    label: "Profissional independente",
    description: "Agenda e gestão objetivas para quem atende sozinho.",
    bestFor: "1 profissional",
    businessMode: "SOLO",
    features: flags("whatsapp_reminders"),
  },
  {
    id: "ESSENTIAL_TEAM",
    label: "Equipe essencial",
    description: "O necessário para uma equipe enxuta trabalhar em conjunto.",
    bestFor: "2 a 5 pessoas",
    businessMode: "TEAM",
    features: flags(
      "team_management",
      "reception",
      "commissions",
      "whatsapp_reminders",
    ),
  },
  {
    id: "GROWING_OPERATION",
    label: "Operação em crescimento",
    description: "Mais controle de agenda, demanda, equipe e financeiro.",
    bestFor: "6 a 15 pessoas",
    businessMode: "TEAM",
    features: flags(
      "team_management",
      "reception",
      "commissions",
      "waitlist",
      "cash_closing",
      "whatsapp_reminders",
    ),
  },
  {
    id: "STRUCTURED_OPERATION",
    label: "Operação estruturada",
    description: "Todos os recursos para uma gestão completa e escalável.",
    bestFor: "16+ pessoas",
    businessMode: "TEAM",
    features: flags(...featureDefinitions.map(({ key }) => key)),
  },
];

export const operationProfileIds = operationProfiles.map(({ id }) => id) as [
  OperationProfile,
  ...OperationProfile[],
];

export function getOperationProfile(profile: OperationProfile) {
  return operationProfiles.find(({ id }) => id === profile)!;
}

export function normalizeFeatureFlags(value: unknown): FeatureFlags {
  const source =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    featureDefinitions.map(({ key }) => [key, source[key] === true]),
  ) as FeatureFlags;
}
