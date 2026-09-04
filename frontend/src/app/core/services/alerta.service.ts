import { Injectable, signal } from '@angular/core';

export type AlertaTipo = 'sucesso' | 'erro' | 'aviso' | 'info';

export interface AlertaEstado {
  tipo: AlertaTipo;
  mensagem: string;
}

/**
 * Alerta global no topo da tela (fora do fluxo do Material Snackbar, que fica
 * discreto no canto) — usado para toda ação relevante do usuário (salvar,
 * cancelar, aprovar, recusar, etc.), com uma cor por tipo de resultado.
 * O componente <app-alerta-topo> (montado uma única vez no shell) é quem lê
 * este estado; qualquer parte do app só precisa chamar sucesso()/erro()/...
 */
@Injectable({ providedIn: 'root' })
export class AlertaService {
  private readonly _estado = signal<AlertaEstado | null>(null);
  readonly estado = this._estado.asReadonly();

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  sucesso(mensagem: string, duracaoMs = 4500): void {
    this.mostrar('sucesso', mensagem, duracaoMs);
  }

  erro(mensagem: string, duracaoMs = 7000): void {
    this.mostrar('erro', mensagem, duracaoMs);
  }

  aviso(mensagem: string, duracaoMs = 5500): void {
    this.mostrar('aviso', mensagem, duracaoMs);
  }

  info(mensagem: string, duracaoMs = 4500): void {
    this.mostrar('info', mensagem, duracaoMs);
  }

  fechar(): void {
    this._estado.set(null);
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private mostrar(tipo: AlertaTipo, mensagem: string, duracaoMs: number): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this._estado.set({ tipo, mensagem });
    this.timeoutId = setTimeout(() => this.fechar(), duracaoMs);
  }
}
