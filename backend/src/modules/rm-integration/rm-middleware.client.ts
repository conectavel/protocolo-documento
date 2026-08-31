export interface RmParceiroDto {
  rmCodigo: string;
  sigla: string;
  razaoSocial: string;
  coordenadorRegionalRmCodigo: string;
  mobilizadorRmCodigo: string;
  presidenteRmCodigo: string;
  ativo: boolean;
  atualizadoEm: string;
}

export interface RmPresidenteDto {
  rmCodigo: string;
  nome: string;
  email?: string;
  ativo: boolean;
  atualizadoEm: string;
}

export interface RmMobilizadorDto {
  rmCodigo: string;
  nome: string;
  email?: string;
  parceiroRmCodigo: string;
  ativo: boolean;
  atualizadoEm: string;
}

export interface RmCoordenadorRegionalDto {
  rmCodigo: string;
  nome: string;
  email?: string;
  ativo: boolean;
  atualizadoEm: string;
}

/**
 * Contrato do cliente do RM Middleware (ver documentacao/specs/protocolo-oficio/integracao-rm-fluig.md §4).
 * Implementações concretas: `RmMiddlewareHttpClient` (produção) e `RmMiddlewareMockClient` (desenvolvimento).
 * Trocar a implementação é apenas configuração (RM_MIDDLEWARE_MODE) — o domínio não conhece a diferença.
 */
export abstract class RmMiddlewareClient {
  abstract listarParceiros(atualizadoDesde?: Date): Promise<RmParceiroDto[]>;
  abstract listarPresidentes(atualizadoDesde?: Date): Promise<RmPresidenteDto[]>;
  abstract listarMobilizadores(atualizadoDesde?: Date): Promise<RmMobilizadorDto[]>;
  abstract listarCoordenadoresRegionais(atualizadoDesde?: Date): Promise<RmCoordenadorRegionalDto[]>;
}
