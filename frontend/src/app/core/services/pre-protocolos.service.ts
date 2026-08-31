import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CriarSolicitacaoRequest, PreProtocolo, Solicitacao } from '../models';

@Injectable({ providedIn: 'root' })
export class PreProtocolosService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<PreProtocolo[]> {
    return this.http.get<PreProtocolo[]>(`${this.baseUrl}/pre-protocolos`);
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
