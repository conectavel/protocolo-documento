import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SalvarSubstituicaoRequest, Substituicao, UsuarioResumo } from '../models';

@Injectable({ providedIn: 'root' })
export class SubstituicoesService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listarUsuarios(): Observable<UsuarioResumo[]> {
    return this.http.get<UsuarioResumo[]>(`${this.baseUrl}/usuarios`);
  }

  listar(): Observable<Substituicao[]> {
    return this.http.get<Substituicao[]>(`${this.baseUrl}/usuarios/substituicoes`);
  }

  criar(dto: SalvarSubstituicaoRequest): Observable<Substituicao> {
    return this.http.post<Substituicao>(`${this.baseUrl}/usuarios/substituicoes`, dto);
  }

  atualizar(id: string, dto: SalvarSubstituicaoRequest): Observable<Substituicao> {
    return this.http.put<Substituicao>(`${this.baseUrl}/usuarios/substituicoes/${id}`, dto);
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/usuarios/substituicoes/${id}`);
  }
}
