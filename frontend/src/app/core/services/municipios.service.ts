import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of, shareReplay } from 'rxjs';
import { Municipio } from '../models';

interface MunicipioIbge {
  id: number;
  nome: string;
}

/**
 * Lista de municípios por UF — usada nos campos "UF" + "Município" de Dados do
 * Documento (Protocolar Ofício / Converter Pré-Protocolo). Busca na API pública
 * do IBGE (fonte oficial, mesma usada por praticamente todo formulário de
 * endereço brasileiro) em vez de embutir todos os ~5.570 municípios do país no
 * bundle do frontend. Resultado cacheado em memória por UF — trocar de UF e
 * voltar não refaz a chamada.
 */
@Injectable({ providedIn: 'root' })
export class MunicipiosService {
  private readonly cache = new Map<string, Observable<Municipio[]>>();

  constructor(private readonly http: HttpClient) {}

  porUf(uf: string): Observable<Municipio[]> {
    const sigla = uf.trim().toUpperCase();
    if (!sigla) return of([]);

    const existente = this.cache.get(sigla);
    if (existente) return existente;

    const requisicao = this.http
      .get<MunicipioIbge[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/municipios`)
      .pipe(
        map((lista) => lista.map((m) => ({ id: String(m.id), nome: m.nome })).sort((a, b) => a.nome.localeCompare(b.nome))),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.cache.set(sigla, requisicao);
    return requisicao;
  }
}
