import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AnaliseAssessoriaRequest,
  AnexoProcesso,
  CriarSolicitacaoRequest,
  DesignarCoordenadorRequest,
  DespachoSuperintendenteRequest,
  DirecionamentoDiretorRequest,
  EditarItemRequest,
  EncaminharItemRequest,
  ListaSolicitacoesFiltro,
  Pagina,
  RegistrarDevolutivaRequest,
  Solicitacao,
  Tramitacao,
} from '../models';

@Injectable({ providedIn: 'root' })
export class SolicitacoesService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listar(filtro: ListaSolicitacoesFiltro): Observable<Pagina<Solicitacao>> {
    let params = new HttpParams();
    Object.entries(filtro).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, String(valor));
      }
    });
    return this.http.get<Pagina<Solicitacao>>(`${this.baseUrl}/solicitacoes`, { params });
  }

  buscarPorId(id: string): Observable<Solicitacao> {
    return this.http.get<Solicitacao>(`${this.baseUrl}/solicitacoes/${id}`);
  }

  criar(payload: CriarSolicitacaoRequest): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(`${this.baseUrl}/solicitacoes`, payload);
  }

  darCiencia(solicitacaoId: string): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(
      `${this.baseUrl}/solicitacoes/${solicitacaoId}/ciencia`,
      {}
    );
  }

  analisarAssessoria(
    solicitacaoId: string,
    payload: AnaliseAssessoriaRequest
  ): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(
      `${this.baseUrl}/solicitacoes/${solicitacaoId}/analise-assessoria`,
      payload
    );
  }

  despacharSuperintendente(
    solicitacaoId: string,
    payload: DespachoSuperintendenteRequest
  ): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(
      `${this.baseUrl}/solicitacoes/${solicitacaoId}/despacho-superintendente`,
      payload
    );
  }

  /** HU05 — direciona UM item específico; cada item de uma solicitação pode ir para uma Área diferente. */
  direcionarItem(itemId: string, payload: DirecionamentoDiretorRequest): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(
      `${this.baseUrl}/solicitacoes/itens/${itemId}/direcionamento-diretor`,
      payload
    );
  }

  designarCoordenador(
    itemId: string,
    payload: DesignarCoordenadorRequest
  ): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(
      `${this.baseUrl}/solicitacoes/itens/${itemId}/designar-coordenador`,
      payload
    );
  }

  aceitarItem(itemId: string): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(
      `${this.baseUrl}/solicitacoes/itens/${itemId}/aceitar`,
      {}
    );
  }

  encaminharItem(itemId: string, payload: EncaminharItemRequest): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(
      `${this.baseUrl}/solicitacoes/itens/${itemId}/encaminhar`,
      payload
    );
  }

  /** O Coordenador corrige os campos preenchidos pelo Mobilizador/Presidente — o original vira histórico. */
  editarItem(itemId: string, payload: EditarItemRequest): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(`${this.baseUrl}/solicitacoes/itens/${itemId}/editar`, payload);
  }

  registrarDevolutiva(
    itemId: string,
    payload: RegistrarDevolutivaRequest
  ): Observable<Solicitacao> {
    return this.http.post<Solicitacao>(
      `${this.baseUrl}/solicitacoes/itens/${itemId}/devolutiva`,
      payload
    );
  }

  buscarHistorico(solicitacaoId: string): Observable<Tramitacao[]> {
    return this.http.get<Tramitacao[]>(
      `${this.baseUrl}/solicitacoes/${solicitacaoId}/historico`
    );
  }

  buscarAnexos(solicitacaoId: string): Observable<AnexoProcesso[]> {
    return this.http.get<AnexoProcesso[]>(
      `${this.baseUrl}/solicitacoes/${solicitacaoId}/anexos`
    );
  }
}
