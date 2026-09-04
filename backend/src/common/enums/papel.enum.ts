export enum Papel {
  MOBILIZADOR = 'MOBILIZADOR',
  PRESIDENTE = 'PRESIDENTE',
  COORDENADOR_REGIONAL = 'COORDENADOR_REGIONAL',
  ASSESSOR = 'ASSESSOR',
  SUPERINTENDENTE = 'SUPERINTENDENTE',
  DIRETOR_EDUCACIONAL = 'DIRETOR_EDUCACIONAL',
  GESTOR = 'GESTOR',
  COORDENADOR = 'COORDENADOR',
  ADMIN = 'ADMIN',
}

/** Papéis que operam exclusivamente dentro da organização (nunca o Mobilizador/Presidente). */
export const PAPEIS_INTERNOS: Papel[] = [
  Papel.COORDENADOR_REGIONAL,
  Papel.ASSESSOR,
  Papel.SUPERINTENDENTE,
  Papel.DIRETOR_EDUCACIONAL,
  Papel.GESTOR,
  Papel.COORDENADOR,
  Papel.ADMIN,
];

/**
 * Papéis externos ligados a um único Parceiro, com a mesma autonomia entre si
 * (Presidente do Sindicato tem exatamente as mesmas permissões do Mobilizador —
 * pedido explícito do cliente): protocolam em nome do próprio Parceiro, só
 * enxergam as próprias solicitações e nunca veem a tramitação interna
 * (etapaAtual/histórico) nem o painel de métricas (HU01).
 */
export const PAPEIS_PARCEIRO: Papel[] = [Papel.MOBILIZADOR, Papel.PRESIDENTE];
