import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContextoUsuarioAdmin, Papel, ResumoTransferencia, UsuarioAdmin } from '../models';

/** Tela "Gerenciar Usuários" — exclusiva do Administrador. */
@Injectable({ providedIn: 'root' })
export class UsuariosAdminService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.baseUrl}/usuarios/admin`);
  }

  atualizarStatus(id: string, ativo: boolean): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.baseUrl}/usuarios/admin/${id}/status`, { ativo });
  }

  /** Move um usuário de qualquer outro perfil interno para `papel`. */
  alterarPapel(id: string, papel: Papel): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.baseUrl}/usuarios/admin/${id}/papel`, { papel });
  }

  buscarContexto(id: string): Observable<ContextoUsuarioAdmin> {
    return this.http.get<ContextoUsuarioAdmin>(`${this.baseUrl}/usuarios/admin/${id}/contexto`);
  }

  /** Um Coordenador pode atender mais de uma Área/Programa. */
  atualizarAreas(id: string, areasProgramaIds: string[]): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.baseUrl}/usuarios/admin/${id}/areas`, { areasProgramaIds });
  }

  atualizarDepartamento(id: string, departamento: string): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.baseUrl}/usuarios/admin/${id}/departamento`, { departamento });
  }

  /** Desligamento — transfere o trabalho em aberto do usuário para outro (ver UsuariosAdminService no backend). */
  transferirProcessos(id: string, paraUsuarioId: string): Observable<ResumoTransferencia> {
    return this.http.put<ResumoTransferencia>(`${this.baseUrl}/usuarios/admin/${id}/transferir-processos`, {
      paraUsuarioId,
    });
  }
}
