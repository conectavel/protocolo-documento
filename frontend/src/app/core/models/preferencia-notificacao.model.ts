export interface TipoNotificacao {
  codigo: string;
  titulo: string;
  descricao: string;
}

export interface PreferenciasNotificacao {
  canalSistema: boolean;
  canalPush: boolean;
  tiposAtivos: string[];
  tiposDisponiveis: TipoNotificacao[];
  atualizadoEm?: string;
}

export interface AtualizarPreferenciasRequest {
  canalSistema: boolean;
  canalPush: boolean;
  tiposAtivos: string[];
}
