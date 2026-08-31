import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Metricas, MetricasFiltro } from '../models';

@Injectable({ providedIn: 'root' })
export class MetricasService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  buscar(filtro: MetricasFiltro): Observable<Metricas> {
    let params = new HttpParams();
    Object.entries(filtro).forEach(([chave, valor]) => {
      if (valor) params = params.set(chave, valor);
    });
    return this.http.get<Metricas>(`${this.baseUrl}/solicitacoes/metricas`, { params });
  }
}
