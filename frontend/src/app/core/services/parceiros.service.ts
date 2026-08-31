import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AreaPrograma,
  CoordenadorRegional,
  Mobilizador,
  Pagina,
  Parceiro,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ParceirosService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listar(search?: string, page = 1, pageSize = 10): Observable<Pagina<Parceiro>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<Pagina<Parceiro>>(`${this.baseUrl}/parceiros`, { params });
  }

  buscarPorId(id: string): Observable<Parceiro> {
    return this.http.get<Parceiro>(`${this.baseUrl}/parceiros/${id}`);
  }

  listarMobilizadores(parceiroId?: string): Observable<Mobilizador[]> {
    let params = new HttpParams();
    if (parceiroId) {
      params = params.set('parceiroId', parceiroId);
    }
    return this.http.get<Mobilizador[]>(`${this.baseUrl}/mobilizadores`, { params });
  }

  listarCoordenadoresRegionais(): Observable<CoordenadorRegional[]> {
    return this.http.get<CoordenadorRegional[]>(`${this.baseUrl}/coordenadores-regionais`);
  }

  listarAreasPrograma(): Observable<AreaPrograma[]> {
    return this.http.get<AreaPrograma[]>(`${this.baseUrl}/areas-programa`);
  }
}
