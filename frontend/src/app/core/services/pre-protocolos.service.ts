import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CriarSolicitacaoRequest,
  ListarPreProtocolosFiltro,
  PaginaPreProtocolos,
  PreProtocolo,
  Solicitacao,
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

  descartar(id: string, motivo?: string): Observable<PreProtocolo> {
    return this.http.post<PreProtocolo>(`${this.baseUrl}/pre-protocolos/${id}/descartar`, { motivo });
  }
}
