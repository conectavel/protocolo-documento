import { Injectable } from '@nestjs/common';
import {
  RmCoordenadorRegionalDto,
  RmMiddlewareClient,
  RmMobilizadorDto,
  RmParceiroDto,
  RmPresidenteDto,
} from './rm-middleware.client';

/**
 * Implementação de desenvolvimento/homologação: simula o RM Middleware com os dados de
 * exemplo do PDF (Parceiro FAEG, Presidente Eduardo Araújo, Mobilizador Marcos Santos),
 * respeitando a hierarquia Coordenador Regional → Parceiro → (1 Mobilizador + 1 Presidente).
 * Ativada via RM_MIDDLEWARE_MODE=mock (padrão em desenvolvimento).
 */
@Injectable()
export class RmMiddlewareMockClient extends RmMiddlewareClient {
  private readonly agora = new Date().toISOString();

  private readonly coordenadores: RmCoordenadorRegionalDto[] = [
    { rmCodigo: 'CR-GO-01', nome: 'Coordenador Regional Goiás', ativo: true, atualizadoEm: this.agora },
  ];

  private readonly presidentes: RmPresidenteDto[] = [
    { rmCodigo: 'PRES-001', nome: 'Eduardo Araújo', email: 'eduardo.araujo@faeg.com.br', ativo: true, atualizadoEm: this.agora },
  ];

  // Um Parceiro tem 1 ou mais Mobilizadores (regra de negócio) — dois aqui só
  // para exercitar isso em desenvolvimento; o login de exemplo do seed usa o MOB-001.
  private readonly mobilizadores: RmMobilizadorDto[] = [
    {
      rmCodigo: 'MOB-001',
      nome: 'Marcos Santos',
      email: 'marcos.santos@faeg.com.br',
      parceiroRmCodigo: 'PARC-FAEG',
      ativo: true,
      atualizadoEm: this.agora,
    },
    {
      rmCodigo: 'MOB-002',
      nome: 'Juliana Ferreira',
      email: 'juliana.ferreira@faeg.com.br',
      parceiroRmCodigo: 'PARC-FAEG',
      ativo: true,
      atualizadoEm: this.agora,
    },
  ];

  private readonly parceiros: RmParceiroDto[] = [
    {
      rmCodigo: 'PARC-FAEG',
      sigla: 'FAEG',
      razaoSocial: 'Federação da Agricultura e Pecuária do Estado de Goiás',
      coordenadorRegionalRmCodigo: 'CR-GO-01',
      mobilizadorRmCodigo: 'MOB-001',
      presidenteRmCodigo: 'PRES-001',
      ativo: true,
      atualizadoEm: this.agora,
      cnpj: '33.638.735/0001-02',
      endereco: 'Rua Professor Jurandir, quadra 26, lote 1D, Centro, Hidrolândia/GO. CEP 75.340-000',
      telefone: '(62) 99356-5501',
    },
  ];

  async listarParceiros(): Promise<RmParceiroDto[]> {
    return this.parceiros;
  }

  async listarPresidentes(): Promise<RmPresidenteDto[]> {
    return this.presidentes;
  }

  async listarMobilizadores(): Promise<RmMobilizadorDto[]> {
    return this.mobilizadores;
  }

  async listarCoordenadoresRegionais(): Promise<RmCoordenadorRegionalDto[]> {
    return this.coordenadores;
  }
}
