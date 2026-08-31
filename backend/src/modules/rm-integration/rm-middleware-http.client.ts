import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  RmCoordenadorRegionalDto,
  RmMiddlewareClient,
  RmMobilizadorDto,
  RmParceiroDto,
  RmPresidenteDto,
} from './rm-middleware.client';

/**
 * Implementação real: consome o RM Middleware em produção.
 * Contrato assumido em documentacao/specs/protocolo-oficio/integracao-rm-fluig.md §4 —
 * a validar/ajustar com a equipe de integração responsável pelo RM Middleware antes do go-live.
 */
@Injectable()
export class RmMiddlewareHttpClient extends RmMiddlewareClient {
  constructor(private readonly http: HttpService, private readonly config: ConfigService) {
    super();
  }

  private get baseUrl(): string {
    return this.config.get<string>('RM_MIDDLEWARE_BASE_URL', '');
  }

  private get headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.config.get<string>('RM_MIDDLEWARE_API_KEY', '')}` };
  }

  async listarParceiros(atualizadoDesde?: Date): Promise<RmParceiroDto[]> {
    const { data } = await firstValueFrom(
      this.http.get<RmParceiroDto[]>(`${this.baseUrl}/parceiros`, {
        headers: this.headers,
        params: atualizadoDesde ? { atualizadoDesde: atualizadoDesde.toISOString() } : {},
      }),
    );
    return data;
  }

  async listarPresidentes(atualizadoDesde?: Date): Promise<RmPresidenteDto[]> {
    const { data } = await firstValueFrom(
      this.http.get<RmPresidenteDto[]>(`${this.baseUrl}/presidentes`, {
        headers: this.headers,
        params: atualizadoDesde ? { atualizadoDesde: atualizadoDesde.toISOString() } : {},
      }),
    );
    return data;
  }

  async listarMobilizadores(atualizadoDesde?: Date): Promise<RmMobilizadorDto[]> {
    const { data } = await firstValueFrom(
      this.http.get<RmMobilizadorDto[]>(`${this.baseUrl}/mobilizadores`, {
        headers: this.headers,
        params: atualizadoDesde ? { atualizadoDesde: atualizadoDesde.toISOString() } : {},
      }),
    );
    return data;
  }

  async listarCoordenadoresRegionais(atualizadoDesde?: Date): Promise<RmCoordenadorRegionalDto[]> {
    const { data } = await firstValueFrom(
      this.http.get<RmCoordenadorRegionalDto[]>(`${this.baseUrl}/coordenadores-regionais`, {
        headers: this.headers,
        params: atualizadoDesde ? { atualizadoDesde: atualizadoDesde.toISOString() } : {},
      }),
    );
    return data;
  }
}
