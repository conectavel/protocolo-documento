import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Papel, UsuarioResumo } from '../models';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /** Usado, por exemplo, pelo Superintendente para escolher os Diretores responsáveis (HU04). */
  listarPorPapel(papel: Papel): Observable<UsuarioResumo[]> {
    const params = new HttpParams().set('papel', papel);
    return this.http.get<UsuarioResumo[]>(`${this.baseUrl}/usuarios`, { params });
  }
}
