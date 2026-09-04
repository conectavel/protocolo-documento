import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Anexo, AnexoMetadados, GerarOficioModeloRequest, TipoAnexo } from '../models';

@Injectable({ providedIn: 'root' })
export class AnexosService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  enviar(arquivo: File, tipo: TipoAnexo = 'OFICIO'): Observable<Anexo> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    formData.append('tipo', tipo);
    return this.http.post<Anexo>(`${this.baseUrl}/anexos`, formData);
  }

  /**
   * Gera um PDF de ofício padrão a partir do que já foi preenchido na tela
   * (Dados do Documento + Itens) e o salva como anexo — alternativa ao
   * upload manual quando o Parceiro/Sindicato não tem um documento próprio.
   */
  gerarModelo(dados: GerarOficioModeloRequest): Observable<Anexo> {
    return this.http.post<Anexo>(`${this.baseUrl}/anexos/gerar-modelo`, dados);
  }

  buscarMetadados(anexoId: string): Observable<AnexoMetadados> {
    return this.http.get<AnexoMetadados>(`${this.baseUrl}/anexos/${anexoId}`);
  }

  /**
   * Baixa o PDF como Blob autenticado (o interceptor HTTP anexa o Bearer token).
   * Necessário porque um <iframe>/<a> apontando direto para a API não envia o
   * cabeçalho Authorization — o visualizador embutido depende deste método.
   */
  baixarComoBlob(anexoId: string, inline = true): Observable<Blob> {
    const sufixo = inline ? '?inline=1' : '';
    return this.http.get(`${this.baseUrl}/anexos/${anexoId}/download${sufixo}`, {
      responseType: 'blob',
    });
  }
}
