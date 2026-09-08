import { ConflictException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { SolicitacaoStateMachineService } from './solicitacao-state-machine.service';
import { Solicitacao } from './entities/solicitacao.entity';
import { ItemSolicitacao } from './entities/item-solicitacao.entity';
import { Tramitacao } from './entities/tramitacao.entity';
import { AssinaturaDigital } from './entities/assinatura-digital.entity';
import { Devolutiva } from '../devolutivas/entities/devolutiva.entity';
import { FakeRepository } from '../../test-utils/fake-repository';
import {
  AcaoTramitacao,
  ResultadoDevolutiva,
  StatusItem,
  StatusMacro,
  TipoItem,
} from '../../common/enums/solicitacao.enum';
import { Papel } from '../../common/enums/papel.enum';
import { UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';

function criarUsuario(papel: Papel): UsuarioAutenticado {
  return { id: uuid(), nome: `Usuário ${papel}`, email: 'teste@esenar.org.br', papel };
}

function criarSolicitacao(itens: Partial<ItemSolicitacao>[]): Solicitacao {
  const solicitacaoId = uuid();
  return {
    id: solicitacaoId,
    statusMacro: StatusMacro.EM_ANALISE_REGIONAL,
    etapaAtual: 'Análise do Regional',
    itens: itens.map((i) => ({
      id: uuid(),
      solicitacaoId,
      statusItem: StatusItem.PENDENTE,
      ...i,
    })) as ItemSolicitacao[],
  } as Solicitacao;
}

describe('SolicitacaoStateMachineService', () => {
  let service: SolicitacaoStateMachineService;
  let solicitacaoRepo: FakeRepository<Solicitacao>;
  let itemRepo: FakeRepository<ItemSolicitacao>;
  let tramitacaoRepo: FakeRepository<Tramitacao>;
  let assinaturaRepo: FakeRepository<AssinaturaDigital>;
  let devolutivaRepo: FakeRepository<Devolutiva>;
  const notificacoesFake = {
    notificarAssessoria: jest.fn().mockResolvedValue(undefined),
    notificarSuperintendente: jest.fn().mockResolvedValue(undefined),
    notificarDiretores: jest.fn().mockResolvedValue(undefined),
    notificarCoordenadorRegional: jest.fn().mockResolvedValue(undefined),
    notificarGestorDaArea: jest.fn().mockResolvedValue(undefined),
    notificarCoordenadorDesignado: jest.fn().mockResolvedValue(undefined),
    notificarCoordenadorEncaminhado: jest.fn().mockResolvedValue(undefined),
    notificarMobilizadorEPresidente: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    solicitacaoRepo = new FakeRepository<Solicitacao>();
    itemRepo = new FakeRepository<ItemSolicitacao>();
    tramitacaoRepo = new FakeRepository<Tramitacao>();
    assinaturaRepo = new FakeRepository<AssinaturaDigital>();
    devolutivaRepo = new FakeRepository<Devolutiva>();

    service = new SolicitacaoStateMachineService(
      solicitacaoRepo as any,
      itemRepo as any,
      tramitacaoRepo as any,
      assinaturaRepo as any,
      devolutivaRepo as any,
      notificacoesFake as any,
    );
  });

  // ------------------------------------------------------------------ HU02
  it('HU02 — dá ciência e avança para Análise da Assessoria', async () => {
    const solicitacao = criarSolicitacao([{ tipo: TipoItem.CONVITE }]);
    const coordenador = criarUsuario(Papel.COORDENADOR_REGIONAL);

    await service.darCiencia(solicitacao, coordenador, false);

    expect(solicitacao.statusMacro).toBe(StatusMacro.EM_ANALISE_ASSESSORIA);
    expect(solicitacao.cienciaAutomatica).toBe(false);
    expect(solicitacao.dataCienciaRegional).toBeInstanceOf(Date);

    const tramitacoes = await tramitacaoRepo.find();
    expect(tramitacoes).toHaveLength(1);
    expect(tramitacoes[0].acao).toBe(AcaoTramitacao.CIENCIA);
  });

  it('HU02 — avanço automático após 24h registra ciencia_automatica=true e usuário nulo', async () => {
    const solicitacao = criarSolicitacao([{ tipo: TipoItem.CONVITE }]);

    await service.darCiencia(solicitacao, null, true);

    expect(solicitacao.cienciaAutomatica).toBe(true);
    const [tramitacao] = await tramitacaoRepo.find();
    expect(tramitacao.acao).toBe(AcaoTramitacao.CIENCIA_AUTOMATICA);
    expect(tramitacao.usuarioNome).toBe('Sistema (automático)');
  });

  it('HU02 — não permite dar ciência duas vezes (estado inconsistente)', async () => {
    const solicitacao = criarSolicitacao([{ tipo: TipoItem.CONVITE }]);
    const coordenador = criarUsuario(Papel.COORDENADOR_REGIONAL);

    await service.darCiencia(solicitacao, coordenador, false);
    await expect(service.darCiencia(solicitacao, coordenador, false)).rejects.toThrow(ConflictException);
  });

  // ------------------------------------------------------------------ HU03
  it('HU03 — recusa exige motivo e cancela a solicitação', async () => {
    const solicitacao = criarSolicitacao([{ tipo: TipoItem.PATROCINIO }]);
    solicitacao.statusMacro = StatusMacro.EM_ANALISE_ASSESSORIA;
    const assessor = criarUsuario(Papel.ASSESSOR);

    await service.analisarAssessoria(solicitacao, assessor, 'RECUSAR', 'Fora do prazo mínimo de antecedência.');

    expect(solicitacao.statusMacro).toBe(StatusMacro.CANCELADO);
    expect(solicitacao.motivoDevolucaoOuRecusa).toContain('prazo mínimo');
  });

  it('HU03 — aprovação avança para despacho da Superintendência', async () => {
    const solicitacao = criarSolicitacao([{ tipo: TipoItem.PATROCINIO }]);
    solicitacao.statusMacro = StatusMacro.EM_ANALISE_ASSESSORIA;
    const assessor = criarUsuario(Papel.ASSESSOR);

    await service.analisarAssessoria(solicitacao, assessor, 'APROVAR');

    expect(solicitacao.statusMacro).toBe(StatusMacro.EM_DESPACHO);
  });

  // ------------------------------------------------------------- HU08/HU09
  it('HU08/HU09 — status macro é derivado e fica PARCIALMENTE_ATENDIDO quando os itens divergem', async () => {
    const solicitacao = criarSolicitacao([
      { tipo: TipoItem.ACAO_ATIVIDADE, statusItem: StatusItem.EM_ANALISE },
      { tipo: TipoItem.CONVITE, statusItem: StatusItem.EM_ANALISE },
    ]);
    solicitacao.statusMacro = StatusMacro.EM_EXECUCAO;
    await itemRepo.save(solicitacao.itens[0]);
    await itemRepo.save(solicitacao.itens[1]);

    const coordenador = criarUsuario(Papel.COORDENADOR);

    await service.registrarDevolutiva(solicitacao.itens[0], solicitacao, coordenador, {
      resultado: ResultadoDevolutiva.ATENDIDO,
    });
    expect(solicitacao.statusMacro).toBe(StatusMacro.EM_EXECUCAO); // ainda falta o 2º item

    await service.registrarDevolutiva(solicitacao.itens[1], solicitacao, coordenador, {
      resultado: ResultadoDevolutiva.NAO_ATENDIDO,
      justificativa: 'Fora da área de atuação deste programa no período solicitado.',
    });

    expect(solicitacao.statusMacro).toBe(StatusMacro.PARCIALMENTE_ATENDIDO);
    expect(solicitacao.itens[0].statusItem).toBe(StatusItem.ATENDIDO);
    expect(solicitacao.itens[1].statusItem).toBe(StatusItem.NAO_ATENDIDO);
  });

  it('HU09 — todos os itens atendidos consolidam o macro como ATENDIDO', async () => {
    const solicitacao = criarSolicitacao([{ tipo: TipoItem.CONVITE, statusItem: StatusItem.EM_ANALISE }]);
    solicitacao.statusMacro = StatusMacro.EM_EXECUCAO;
    await itemRepo.save(solicitacao.itens[0]);
    const coordenador = criarUsuario(Papel.COORDENADOR);

    await service.registrarDevolutiva(solicitacao.itens[0], solicitacao, coordenador, {
      resultado: ResultadoDevolutiva.ATENDIDO,
      numeroEventoTurma: '2026080183',
      numeroProcessoAceiteFluig: '9703264',
    });

    expect(solicitacao.statusMacro).toBe(StatusMacro.ATENDIDO);
    const devolutiva = await devolutivaRepo.findOne({ where: { itemSolicitacaoId: solicitacao.itens[0].id } });
    expect(devolutiva?.numeroEventoTurma).toBe('2026080183');
  });
});
