import { StatusMacro, TipoItem } from './enums';

export interface MetricasFiltro {
  dataInicio?: string;
  dataFim?: string;
  parceiroId?: string;
  regionalId?: string;
}

export interface MetricaPorStatus {
  status: StatusMacro;
  total: number;
}

export interface MetricaPorTipoItem {
  tipo: TipoItem;
  total: number;
}

export interface MetricaPorArea {
  areaProgramaId: string;
  nome: string;
  total: number;
  atendidos: number;
  parciais: number;
  naoAtendidos: number;
}

export interface MetricaPorParceiro {
  parceiroId: string;
  nome: string;
  total: number;
}

export interface MetricaSerieTemporal {
  data: string;
  total: number;
}

export interface Metricas {
  periodo: { dataInicio: string; dataFim: string };
  totalSolicitacoes: number;
  porStatus: MetricaPorStatus[];
  totalAtendido: number;
  totalParcialmenteAtendido: number;
  totalNaoAtendido: number;
  totalCancelado: number;
  totalEmAndamento: number;
  taxaAtendimentoPercentual: number | null;
  slaCiencia: {
    totalComCiencia: number;
    automaticas: number;
    percentualAutomatica: number | null;
    tempoMedioHoras: number | null;
  };
  porTipoItem: MetricaPorTipoItem[];
  porArea: MetricaPorArea[];
  porParceiro: MetricaPorParceiro[];
  serieTemporal: MetricaSerieTemporal[];
  comparativoPeriodoAnterior: {
    totalAtual: number;
    totalAnterior: number;
    variacaoPercentual: number | null;
  };
}
