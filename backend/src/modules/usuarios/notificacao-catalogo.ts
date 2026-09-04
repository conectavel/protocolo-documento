import { Papel } from '../../common/enums/papel.enum';

export interface TipoNotificacao {
  codigo: string;
  titulo: string;
  descricao: string;
}

/**
 * Catálogo dos eventos de notificação pertinentes a cada papel — usado para montar a tela
 * de Configurações (ver requirements.md HU02–HU09: cada papel só é acionado nas etapas em
 * que efetivamente atua no fluxo).
 */
// Mobilizador e Presidente do Sindicato têm a mesma autonomia (pedido do cliente) —
// por isso compartilham exatamente o mesmo catálogo de notificações.
const NOTIFICACOES_PAPEL_PARCEIRO: TipoNotificacao[] = [
  {
    codigo: 'DEVOLUTIVA_FINAL',
    titulo: 'Devolutiva final da solicitação',
    descricao: 'Quando sua solicitação recebe a resposta final (atendida, parcial ou não atendida).',
  },
  {
    codigo: 'SOLICITACAO_DEVOLVIDA_AJUSTE',
    titulo: 'Solicitação devolvida para ajuste',
    descricao: 'Quando a Assessoria devolve sua solicitação para complementação de informações.',
  },
];

export const CATALOGO_NOTIFICACOES: Record<Papel, TipoNotificacao[]> = {
  [Papel.MOBILIZADOR]: NOTIFICACOES_PAPEL_PARCEIRO,
  [Papel.PRESIDENTE]: NOTIFICACOES_PAPEL_PARCEIRO,
  [Papel.COORDENADOR_REGIONAL]: [
    {
      codigo: 'NOVA_SOLICITACAO_CIENCIA',
      titulo: 'Nova solicitação para ciência',
      descricao: 'Quando uma solicitação de um Parceiro da sua regional chega para ciência.',
    },
    {
      codigo: 'PRAZO_CIENCIA_PROXIMO',
      titulo: 'Prazo de ciência próximo do vencimento',
      descricao: 'Aviso quando faltam poucas horas para o prazo de 24h de ciência (HU02).',
    },
  ],
  [Papel.ASSESSOR]: [
    {
      codigo: 'NOVA_SOLICITACAO_ANALISE',
      titulo: 'Nova solicitação para análise',
      descricao: 'Quando uma solicitação chega para sua análise inicial (HU03).',
    },
  ],
  [Papel.SUPERINTENDENTE]: [
    {
      codigo: 'SOLICITACAO_APROVADA_DESPACHO',
      titulo: 'Solicitação aguardando despacho',
      descricao: 'Quando a Assessoria aprova uma solicitação e ela aguarda sua decisão (HU04).',
    },
  ],
  [Papel.DIRETOR_EDUCACIONAL]: [
    {
      codigo: 'SOLICITACAO_DESPACHADA',
      titulo: 'Solicitação aguardando direcionamento',
      descricao: 'Quando o Superintendente despacha uma solicitação para a Diretoria Educacional (HU05).',
    },
  ],
  [Papel.GESTOR]: [
    {
      codigo: 'ITEM_AGUARDANDO_COORDENADOR',
      titulo: 'Item aguardando designação de coordenador',
      descricao: 'Quando um item é direcionado à sua área e precisa de um coordenador designado (HU06).',
    },
  ],
  [Papel.COORDENADOR]: [
    {
      codigo: 'ITEM_DESIGNADO',
      titulo: 'Item designado a você',
      descricao: 'Quando um item é designado para você atender (HU07).',
    },
    {
      codigo: 'ITEM_ENCAMINHADO_PARA_MIM',
      titulo: 'Item encaminhado de outra área',
      descricao: 'Quando outro coordenador encaminha um item para a sua área (HU07/HU08).',
    },
  ],
  [Papel.ADMIN]: [
    {
      codigo: 'FALHA_SINCRONIZACAO_RM',
      titulo: 'Falha na sincronização com o RM',
      descricao: 'Quando a sincronização com o RM Middleware falha (ver integracao-rm-fluig.md).',
    },
  ],
};
