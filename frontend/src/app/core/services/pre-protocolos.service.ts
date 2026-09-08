import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BuscaDadosPorCpf,
  CriarSolicitacaoRequest,
  ListarPreProtocolosFiltro,
  PaginaPreProtocolos,
  PreProtocolo,
  Solicitacao,
  SolicitanteTipo,
} from '../models';

@Injectable({ providedIn: 'root' })
export class PreProtocolosService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listar(filtro: ListarPreProtocolosFiltro = {}): Observable<PaginaPreProtocolos> {
    let params = new HttpParams();
    Object.entries(filtro).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, String(valor));
      }
    });
    return this.http.get<PaginaPreProtocolos>(`${this.baseUrl}/pre-protocolos`, { params });
  }

  buscarPorId(id: string): Observable<PreProtocolo> {
    return this.http.get<PreProtocolo>(`${this.baseUrl}/pre-protocolos/${id}`);
  }

  converter(id: string, dto: CriarSolicitacaoRequest): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(`${this.baseUrl}/pre-protocolos/${id}/converter`, dto);
  }

  /**
   * Formulário público de envio anônimo (sem login) — usado fora da área
   * autenticada (ver EnviarSolicitacaoPublicaComponent). Sem Authorization
   * header: o interceptor só anexa o token quando existe um, então funciona
   * normalmente mesmo sem sessão.
   */
  enviarPublico(dados: FormData): Observable<{ recebido: boolean }> {
    return this.http.post<{ recebido: boolean }>(`${this.baseUrl}/pre-protocolos/publico`, dados);
  }

  /** Ao digitar o CPF no formulário público, tenta pré-preencher a partir de um envio anterior. */
  buscarPorCpf(cpf: string): Observable<BuscaDadosPorCpf> {
    return this.http.get<BuscaDadosPorCpf>(`${this.baseUrl}/pre-protocolos/publico/buscar-cpf`, {
      params: { cpf },
    });
  }

  /** Anexa manualmente o ofício (PDF já enviado via AnexosService) quando o e-mail não trouxe um. */
  anexarOficio(
    id: string,
    payload: { anexoOficioId: string; solicitanteTipo: SolicitanteTipo }
  ): Observable<PreProtocolo> {
    return this.http.post<PreProtocolo>(`${this.baseUrl}/pre-protocolos/${id}/anexo`, payload);
  }

  descartar(id: string, motivo?: string): Observable<PreProtocolo> {
    return this.http.post<PreProtocolo>(`${this.baseUrl}/pre-protocolos/${id}/descartar`, { motivo });
  }
}
