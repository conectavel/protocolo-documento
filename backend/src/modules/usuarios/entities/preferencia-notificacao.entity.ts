import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Preferências de notificação de um usuário interno (Assessor, Superintendente,
 * Diretor Educacional, Gestor, Coordenador, Admin) ou de login vinculado ao RM
 * (Mobilizador, Coordenador Regional). Um registro por usuário (1:1).
 */
@Entity('preferencias_notificacao')
export class PreferenciaNotificacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', unique: true })
  usuarioId: string;

  @Column({ name: 'canal_sistema', default: true })
  canalSistema: boolean;

  /**
   * Push do navegador (Web Notifications API). O usuário precisa conceder permissão
   * no próprio navegador; este campo guarda apenas a preferência de "quero receber".
   */
  @Column({ name: 'canal_push', default: false })
  canalPush: boolean;

  /** Códigos dos tipos de evento (ver notificacao-catalogo.ts) que o usuário quer receber. */
  @Column({ name: 'tipos_ativos', type: 'jsonb', default: () => "'[]'" })
  tiposAtivos: string[];

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamptz' })
  atualizadoEm: Date;
}
