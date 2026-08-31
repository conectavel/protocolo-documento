import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AtualizarPreferenciasRequest, PreferenciasNotificacao } from '../models';

@Injectable({ providedIn: 'root' })
export class PreferenciasService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  buscarMinhas(): Observable<PreferenciasNotificacao> {
    return this.http.get<PreferenciasNotificacao>(`${this.baseUrl}/usuarios/me/preferencias-notificacao`);
  }

  salvar(dto: AtualizarPreferenciasRequest): Observable<PreferenciasNotificacao> {
    return this.http.put<PreferenciasNotificacao>(
      `${this.baseUrl}/usuarios/me/preferencias-notificacao`,
      dto,
    );
  }
}
