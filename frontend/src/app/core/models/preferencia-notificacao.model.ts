export interface TipoNotificacao {
  codigo: string;
  titulo: string;
  descricao: string;
}

export interface PreferenciasNotificacao {
  canalSistema: boolean;
  canalPush: boolean;
  canalEmail: boolean;
  tiposAtivos: string[];
  tiposDisponiveis: TipoNotificacao[];
  atualizadoEm?: string;
}

export interface AtualizarPreferenciasRequest {
  canalSistema: boolean;
  canalPush: boolean;
  canalEmail: boolean;
  tiposAtivos: string[];
}
