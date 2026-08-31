import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CoordenadorRegional } from '../../modules/parceiros/entities/coordenador-regional.entity';
import { Presidente } from '../../modules/parceiros/entities/presidente.entity';
import { Mobilizador } from '../../modules/parceiros/entities/mobilizador.entity';
import { Parceiro } from '../../modules/parceiros/entities/parceiro.entity';
import { AreaPrograma } from '../../modules/parceiros/entities/area-programa.entity';
import { Usuario } from '../../modules/usuarios/entities/usuario.entity';
import { Anexo } from '../../modules/anexos/entities/anexo.entity';
import { Solicitacao } from '../../modules/solicitacoes/entities/solicitacao.entity';
import { ItemSolicitacao } from '../../modules/solicitacoes/entities/item-solicitacao.entity';
import { Tramitacao } from '../../modules/solicitacoes/entities/tramitacao.entity';
import { Devolutiva } from '../../modules/devolutivas/entities/devolutiva.entity';
import { PreProtocolo } from '../../modules/pre-protocolos/entities/pre-protocolo.entity';
import { Papel } from '../../common/enums/papel.enum';
import {
  AcaoTramitacao,
  ResultadoDevolutiva,
  StatusItem,
  StatusMacro,
  TipoItem,
  Turno,
} from '../../common/enums/solicitacao.enum';

dotenv.config();

const HORA = 60 * 60 * 1000;

/**
 * Popula o ambiente de desenvolvimento com os dados de exemplo do PDF
 * (Parceiro FAEG, Presidente Eduardo Araújo, Mobilizador Marcos Santos), os usuários
 * internos das áreas descritas em HU05 (FPR, PS, Educação Formação, ATeG) e 4
 * solicitações de exemplo, cada uma parada em uma etapa diferente do fluxo, para
 * facilitar entender visualmente o processo completo (Análise Regional → Análise
 * da Assessoria → Execução → Atendido).
 * Execução: `npm run seed` (com o backend já com `synchronize` aplicado ou migrations executadas).
 */
async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '5432'),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'protocolo_oficio',
    entities: [
      CoordenadorRegional,
      Presidente,
      Mobilizador,
      Parceiro,
      AreaPrograma,
      Usuario,
      Anexo,
      Solicitacao,
      ItemSolicitacao,
      Tramitacao,
      Devolutiva,
      PreProtocolo,
    ],
    synchronize: true,
  });

  await dataSource.initialize();

  // Seed é reexecutável em desenvolvimento: limpa os dados antes de recriar,
  // para permitir trocar domínio de e-mail/senha padrão sem violar unicidade.
  await dataSource.query(
    `TRUNCATE TABLE
      tramitacoes, devolutivas, itens_solicitacao, solicitacoes, anexos,
      pre_protocolos, substituicoes_usuario, preferencias_notificacao,
      usuarios, areas_programa, parceiros, mobilizadores, presidentes,
      coordenadores_regionais, sincronizacoes_rm
    RESTART IDENTITY CASCADE`,
  );

  const coordenadorRepo = dataSource.getRepository(CoordenadorRegional);
  const presidenteRepo = dataSource.getRepository(Presidente);
  const mobilizadorRepo = dataSource.getRepository(Mobilizador);
  const parceiroRepo = dataSource.getRepository(Parceiro);
  const areaRepo = dataSource.getRepository(AreaPrograma);
  const usuarioRepo = dataSource.getRepository(Usuario);
  const anexoRepo = dataSource.getRepository(Anexo);
  const solicitacaoRepo = dataSource.getRepository(Solicitacao);
  const itemRepo = dataSource.getRepository(ItemSolicitacao);
  const tramitacaoRepo = dataSource.getRepository(Tramitacao);
  const devolutivaRepo = dataSource.getRepository(Devolutiva);

  const coordenadorRegional = await coordenadorRepo.save(
    coordenadorRepo.create({ rmCodigo: 'CR-GO-01', nome: 'Coordenador Regional Goiás' }),
  );

  const presidente = await presidenteRepo.save(
    presidenteRepo.create({
      rmCodigo: 'PRES-001',
      nome: 'Eduardo Araújo',
      email: 'eduardo.araujo@faeg.com.br',
    }),
  );

  const parceiro = await parceiroRepo.save(
    parceiroRepo.create({
      rmCodigo: 'PARC-FAEG',
      sigla: 'FAEG',
      razaoSocial: 'Federação da Agricultura e Pecuária do Estado de Goiás',
      coordenadorRegionalId: coordenadorRegional.id,
      presidenteId: presidente.id,
    }),
  );

  const mobilizador = await mobilizadorRepo.save(
    mobilizadorRepo.create({
      rmCodigo: 'MOB-001',
      nome: 'Marcos Santos',
      email: 'marcos.santos@faeg.com.br',
      parceiroId: parceiro.id,
    }),
  );

  parceiro.mobilizadorId = mobilizador.id;
  await parceiroRepo.save(parceiro);

  const senhaPadrao = await bcrypt.hash('senar@123', 10);

  const areasDefinicao = [
    { codigo: 'FPR', nome: 'FPR', gestor: 'Carol', coordenadores: ['Claudimeire', 'Yanuze', 'Tatiana'] },
    { codigo: 'PS', nome: 'PS', gestor: 'Simone', coordenadores: ['Marcus', 'Isabela'] },
    {
      codigo: 'EDU_FORM',
      nome: 'Educação Formação / Curso Técnico',
      gestor: 'Rafael Rosa',
      coordenadores: ['Nara', 'Andreia', 'Bartolomeu'],
    },
    {
      codigo: 'ATEG',
      nome: 'ATeG',
      gestor: 'Guilherme Bizinotto',
      coordenadores: ['Eder', 'Bruna', 'Rena'],
    },
  ];

  const usuariosPorNome = new Map<string, Usuario>();
  const areasPorCodigo = new Map<string, AreaPrograma>();

  for (const def of areasDefinicao) {
    const gestorUsuario = await usuarioRepo.save(
      usuarioRepo.create({
        nome: def.gestor,
        email: `${slug(def.gestor)}@senar-go.com.br`,
        senhaHash: senhaPadrao,
        papel: Papel.GESTOR,
      }),
    );
    usuariosPorNome.set(def.gestor, gestorUsuario);

    const area = await areaRepo.save(
      areaRepo.create({ codigo: def.codigo, nome: def.nome, gestorId: gestorUsuario.id }),
    );
    areasPorCodigo.set(def.codigo, area);

    for (const nomeCoordenador of def.coordenadores) {
      const coordenadorUsuario = await usuarioRepo.save(
        usuarioRepo.create({
          nome: nomeCoordenador,
          email: `${slug(nomeCoordenador)}@senar-go.com.br`,
          senhaHash: senhaPadrao,
          papel: Papel.COORDENADOR,
          areaProgramaId: area.id,
        }),
      );
      usuariosPorNome.set(nomeCoordenador, coordenadorUsuario);
    }
  }

  const assessor = await usuarioRepo.save(
    usuarioRepo.create({
      nome: 'Assessor(a) do Superintendente',
      email: 'assessor@senar-go.com.br',
      senhaHash: senhaPadrao,
      papel: Papel.ASSESSOR,
    }),
  );
  const superintendente = await usuarioRepo.save(
    usuarioRepo.create({
      nome: 'Superintendente',
      email: 'superintendente@senar-go.com.br',
      senhaHash: senhaPadrao,
      papel: Papel.SUPERINTENDENTE,
    }),
  );
  const diretorEducacional = await usuarioRepo.save(
    usuarioRepo.create({
      nome: 'Diretor Educacional',
      email: 'diretor.educacional@senar-go.com.br',
      senhaHash: senhaPadrao,
      papel: Papel.DIRETOR_EDUCACIONAL,
    }),
  );
  await usuarioRepo.save(
    usuarioRepo.create({
      nome: 'Administrador',
      email: 'admin@senar-go.com.br',
      senhaHash: senhaPadrao,
      papel: Papel.ADMIN,
    }),
  );
  // Login local vinculado ao Coordenador Regional/Mobilizador sincronizados do RM.
  const coordenadorRegionalUsuario = await usuarioRepo.save(
    usuarioRepo.create({
      nome: coordenadorRegional.nome,
      email: 'coordenador.regional@senar-go.com.br',
      senhaHash: senhaPadrao,
      papel: Papel.COORDENADOR_REGIONAL,
      rmCodigoReferencia: coordenadorRegional.rmCodigo,
    }),
  );
  await usuarioRepo.save(
    usuarioRepo.create({
      nome: mobilizador.nome,
      email: 'marcos.santos@senar-go.com.br',
      senhaHash: senhaPadrao,
      papel: Papel.MOBILIZADOR,
      rmCodigoReferencia: mobilizador.rmCodigo,
    }),
  );

  // ---------------------------------------------------------------------
  // 4 solicitações de exemplo, uma parada em cada etapa do fluxo (macro),
  // para servir de referência visual do processo completo.
  // ---------------------------------------------------------------------
  const areaFpr = areasPorCodigo.get('FPR')!;
  const carol = usuariosPorNome.get('Carol')!;
  const claudimeire = usuariosPorNome.get('Claudimeire')!;

  const agora = Date.now();

  async function criarAnexoOficio(nomeArquivo: string): Promise<Anexo> {
    const uploadDir = process.env.UPLOAD_DIR ?? './storage/anexos';
    fs.mkdirSync(uploadDir, { recursive: true });
    const caminho = path.join(uploadDir, `seed-${nomeArquivo}`);
    fs.writeFileSync(caminho, gerarPdfExemplo(nomeArquivo));
    return anexoRepo.save(
      anexoRepo.create({
        tipo: 'OFICIO',
        nomeArquivo,
        caminhoStorage: caminho,
        tamanhoBytes: fs.statSync(caminho).size,
        mimeType: 'application/pdf',
      }),
    );
  }

  async function registrarTramitacao(
    solicitacao: Solicitacao,
    dados: {
      itemSolicitacaoId?: string;
      deEtapa?: string;
      paraEtapa: string;
      acao: AcaoTramitacao;
      usuario?: Usuario;
      motivo?: string;
      criadoEm: Date;
    },
  ) {
    const tramitacao = await tramitacaoRepo.save(
      tramitacaoRepo.create({
        solicitacaoId: solicitacao.id,
        itemSolicitacaoId: dados.itemSolicitacaoId,
        deEtapa: dados.deEtapa,
        paraEtapa: dados.paraEtapa,
        acao: dados.acao,
        motivo: dados.motivo,
        usuarioId: dados.usuario?.id,
        usuarioNome: dados.usuario?.nome ?? 'Sistema (automático)',
      }),
    );
    // @CreateDateColumn sempre grava a data real do insert — sobrescreve depois
    // via SQL para que o histórico de exemplo pareça distribuído ao longo do tempo.
    await dataSource.query('UPDATE tramitacoes SET criado_em = $1 WHERE id = $2', [
      dados.criadoEm,
      tramitacao.id,
    ]);
    return tramitacao;
  }

  // 1) Em Análise (Regional) — recém protocolado, aguardando ciência do Coordenador Regional.
  {
    const anexo = await criarAnexoOficio('oficio-0001-2026.pdf');
    const dataSolicitacao = new Date(agora - 2 * HORA);
    const solicitacao = await solicitacaoRepo.save(
      solicitacaoRepo.create({
        numeroDocumento: '0001/2026',
        numeroProcesso: '980001',
        idDocumento: '2359301',
        parceiroId: parceiro.id,
        mobilizadorId: mobilizador.id,
        municipio: 'Goiânia',
        assunto: 'Solicitação de curso de Formação Profissional Rural',
        observacao: 'Precisamos iniciar a turma ainda neste semestre.',
        dataDocumento: new Date(agora - 2 * HORA).toISOString().slice(0, 10),
        anexoOficioId: anexo.id,
        statusMacro: StatusMacro.EM_ANALISE_REGIONAL,
        etapaAtual: 'Análise do Regional',
        dataSolicitacao,
        prazoCienciaRegional: new Date(dataSolicitacao.getTime() + 24 * HORA),
        criadoPor: mobilizador.nome,
        alteradoPor: mobilizador.nome,
        itens: [
          itemRepo.create({
            tipo: TipoItem.ACAO_ATIVIDADE,
            tipoEvento: 'Campo em Ordem - FPR',
            acaoAtividade: 'FPR - Formação Profissional Rural',
            disciplina: 'Formação Profissional Rural: Bovinocultura de Leite',
            turno: Turno.MANHA,
            statusItem: StatusItem.PENDENTE,
          }),
        ],
      }),
    );
    await anexoRepo.update({ id: anexo.id }, { solicitacaoId: solicitacao.id });
  }

  // 2) Em Análise (Assessoria) — Regional já deu ciência, aguardando parecer da Assessoria.
  {
    const anexo = await criarAnexoOficio('oficio-0002-2026.pdf');
    const dataSolicitacao = new Date(agora - 30 * HORA);
    const dataCiencia = new Date(agora - 10 * HORA);
    const solicitacao = await solicitacaoRepo.save(
      solicitacaoRepo.create({
        numeroDocumento: '0002/2026',
        numeroProcesso: '980002',
        idDocumento: '2359302',
        parceiroId: parceiro.id,
        mobilizadorId: mobilizador.id,
        municipio: 'Rio Verde',
        assunto: 'Solicitação de patrocínio para evento Saúde da Terra',
        observacao: 'Evento com presença de autoridades estaduais.',
        dataDocumento: new Date(agora - 30 * HORA).toISOString().slice(0, 10),
        anexoOficioId: anexo.id,
        statusMacro: StatusMacro.EM_ANALISE_ASSESSORIA,
        etapaAtual: 'Análise da Assessoria',
        dataSolicitacao,
        prazoCienciaRegional: new Date(dataSolicitacao.getTime() + 24 * HORA),
        dataCienciaRegional: dataCiencia,
        cienciaAutomatica: false,
        criadoPor: mobilizador.nome,
        alteradoPor: coordenadorRegionalUsuario.nome,
        itens: [
          itemRepo.create({
            tipo: TipoItem.PATROCINIO,
            titulo: 'Aluguel de estrutura para o evento',
            resumo: 'Precisamos de patrocínio para alugar tendas e cadeiras para o evento.',
            statusItem: StatusItem.PENDENTE,
          }),
        ],
      }),
    );
    await anexoRepo.update({ id: anexo.id }, { solicitacaoId: solicitacao.id });
    await registrarTramitacao(solicitacao, {
      deEtapa: 'Análise do Regional',
      paraEtapa: 'Análise da Assessoria',
      acao: AcaoTramitacao.CIENCIA,
      usuario: coordenadorRegionalUsuario,
      criadoEm: dataCiencia,
    });
  }

  // 3) Em Execução — aprovado, despachado e direcionado; Coordenador da FPR já designado.
  {
    const anexo = await criarAnexoOficio('oficio-0003-2026.pdf');
    const dataSolicitacao = new Date(agora - 5 * 24 * HORA);
    const dataCiencia = new Date(agora - 5 * 24 * HORA + 4 * HORA);
    const dataAprovacao = new Date(agora - 4 * 24 * HORA);
    const dataDespacho = new Date(agora - 3 * 24 * HORA);
    const dataDirecionamento = new Date(agora - 2 * 24 * HORA);

    const solicitacao = await solicitacaoRepo.save(
      solicitacaoRepo.create({
        numeroDocumento: '0003/2026',
        numeroProcesso: '980003',
        idDocumento: '2359303',
        parceiroId: parceiro.id,
        mobilizadorId: mobilizador.id,
        municipio: 'Anápolis',
        assunto: 'Solicitação de curso e convite de abertura',
        observacao: 'Preciso que esse ofício seja atendido urgentemente.',
        dataDocumento: dataSolicitacao.toISOString().slice(0, 10),
        anexoOficioId: anexo.id,
        statusMacro: StatusMacro.EM_EXECUCAO,
        etapaAtual: 'FPR — Execução',
        dataSolicitacao,
        prazoCienciaRegional: new Date(dataSolicitacao.getTime() + 24 * HORA),
        dataCienciaRegional: dataCiencia,
        cienciaAutomatica: false,
        areaProgramaId: areaFpr.id,
        coordenadorDesignadoId: claudimeire.id,
        criadoPor: mobilizador.nome,
        alteradoPor: diretorEducacional.nome,
        itens: [
          itemRepo.create({
            tipo: TipoItem.ACAO_ATIVIDADE,
            tipoEvento: 'Campo em Ordem - FPR',
            acaoAtividade: 'FPRPE - Programas Especiais',
            disciplina: 'Lideragro: Ambiente Institucional do Agronegócio',
            turno: Turno.TARDE,
            statusItem: StatusItem.EM_ANALISE,
            areaProgramaId: areaFpr.id,
            coordenadorResponsavelId: claudimeire.id,
          }),
        ],
      }),
    );
    await anexoRepo.update({ id: anexo.id }, { solicitacaoId: solicitacao.id });

    await registrarTramitacao(solicitacao, {
      deEtapa: 'Análise do Regional',
      paraEtapa: 'Análise da Assessoria',
      acao: AcaoTramitacao.CIENCIA,
      usuario: coordenadorRegionalUsuario,
      criadoEm: dataCiencia,
    });
    await registrarTramitacao(solicitacao, {
      deEtapa: 'Análise da Assessoria',
      paraEtapa: 'Superintendência — Despacho',
      acao: AcaoTramitacao.APROVAR,
      usuario: assessor,
      criadoEm: dataAprovacao,
    });
    await registrarTramitacao(solicitacao, {
      deEtapa: 'Superintendência — Despacho',
      paraEtapa: 'Diretor Educacional — Direcionamento',
      acao: AcaoTramitacao.DESPACHAR,
      usuario: superintendente,
      motivo: 'Diretoria destino: EDUCACIONAL',
      criadoEm: dataDespacho,
    });
    await registrarTramitacao(solicitacao, {
      deEtapa: 'Diretor Educacional — Direcionamento',
      paraEtapa: 'FPR — Execução',
      acao: AcaoTramitacao.DIRECIONAR,
      usuario: diretorEducacional,
      motivo: 'Área/Programa: FPR',
      criadoEm: dataDirecionamento,
    });
  }

  // 4) Atendido — fluxo completo, com devolutiva registrada pelo Coordenador.
  {
    const anexo = await criarAnexoOficio('oficio-0004-2026.pdf');
    const dataSolicitacao = new Date(agora - 12 * 24 * HORA);
    const dataCiencia = new Date(agora - 12 * 24 * HORA + 3 * HORA);
    const dataAprovacao = new Date(agora - 11 * 24 * HORA);
    const dataDespacho = new Date(agora - 10 * 24 * HORA);
    const dataDirecionamento = new Date(agora - 9 * 24 * HORA);
    const dataDevolutiva = new Date(agora - 2 * 24 * HORA);

    const solicitacao = await solicitacaoRepo.save(
      solicitacaoRepo.create({
        numeroDocumento: '0004/2026',
        numeroProcesso: '980004',
        idDocumento: '2359304',
        parceiroId: parceiro.id,
        mobilizadorId: mobilizador.id,
        municipio: 'Goiânia',
        assunto: 'Solicitação de curso — LIDERAGRO',
        observacao: 'Turma para produtores da regional metropolitana.',
        dataDocumento: dataSolicitacao.toISOString().slice(0, 10),
        anexoOficioId: anexo.id,
        statusMacro: StatusMacro.ATENDIDO,
        etapaAtual: 'Concluído — devolutiva consolidada disponível',
        dataSolicitacao,
        prazoCienciaRegional: new Date(dataSolicitacao.getTime() + 24 * HORA),
        dataCienciaRegional: dataCiencia,
        cienciaAutomatica: false,
        areaProgramaId: areaFpr.id,
        coordenadorDesignadoId: claudimeire.id,
        criadoPor: mobilizador.nome,
        alteradoPor: claudimeire.nome,
        itens: [
          itemRepo.create({
            tipo: TipoItem.ACAO_ATIVIDADE,
            tipoEvento: 'Campo em Ordem - FPR',
            acaoAtividade: 'Campo em Ordem - FPR',
            disciplina: 'LIDERAGRO: Ambiente Institucional do Agronegócio',
            turno: Turno.MANHA,
            statusItem: StatusItem.ATENDIDO,
            areaProgramaId: areaFpr.id,
            coordenadorResponsavelId: claudimeire.id,
          }),
        ],
      }),
    );
    await anexoRepo.update({ id: anexo.id }, { solicitacaoId: solicitacao.id });

    const [item] = solicitacao.itens;
    await devolutivaRepo.save(
      devolutivaRepo.create({
        itemSolicitacaoId: item.id,
        resultado: ResultadoDevolutiva.ATENDIDO,
        dataEvento: new Date(agora + 5 * 24 * HORA).toISOString().slice(0, 10),
        horario: '08:00',
        local: 'Auditório SENAR-GO — Goiânia',
        numeroEventoTurma: '2026080183',
        numeroProcessoAceiteFluig: '9703264',
        registradoPorId: claudimeire.id,
        registradoPorNome: claudimeire.nome,
      }),
    );

    await registrarTramitacao(solicitacao, {
      deEtapa: 'Análise do Regional',
      paraEtapa: 'Análise da Assessoria',
      acao: AcaoTramitacao.CIENCIA,
      usuario: coordenadorRegionalUsuario,
      criadoEm: dataCiencia,
    });
    await registrarTramitacao(solicitacao, {
      deEtapa: 'Análise da Assessoria',
      paraEtapa: 'Superintendência — Despacho',
      acao: AcaoTramitacao.APROVAR,
      usuario: assessor,
      criadoEm: dataAprovacao,
    });
    await registrarTramitacao(solicitacao, {
      deEtapa: 'Superintendência — Despacho',
      paraEtapa: 'Diretor Educacional — Direcionamento',
      acao: AcaoTramitacao.DESPACHAR,
      usuario: superintendente,
      motivo: 'Diretoria destino: EDUCACIONAL',
      criadoEm: dataDespacho,
    });
    await registrarTramitacao(solicitacao, {
      deEtapa: 'Diretor Educacional — Direcionamento',
      paraEtapa: 'FPR — Execução',
      acao: AcaoTramitacao.DIRECIONAR,
      usuario: diretorEducacional,
      motivo: 'Área/Programa: FPR',
      criadoEm: dataDirecionamento,
    });
    await registrarTramitacao(solicitacao, {
      itemSolicitacaoId: item.id,
      deEtapa: 'Em execução',
      paraEtapa: `Devolutiva: ${ResultadoDevolutiva.ATENDIDO}`,
      acao: AcaoTramitacao.REGISTRAR_DEVOLUTIVA,
      usuario: claudimeire,
      criadoEm: dataDevolutiva,
    });
  }

  // ---------------------------------------------------------------------
  // Pré Protocolo de exemplo — solicitação recebida por e-mail em
  // superintendencia@senar-go.com.br, aguardando revisão do Assessor.
  // ---------------------------------------------------------------------
  {
    const preProtocoloRepo = dataSource.getRepository(PreProtocolo);
    const anexo = await criarAnexoOficio('oficio-recebido-por-email.pdf');
    await preProtocoloRepo.save(
      preProtocoloRepo.create({
        remetente: 'presidencia@faeg.com.br',
        assunto: 'Solicitação de curso de Bovinocultura de Corte — Regional Sudoeste',
        corpo:
          'Prezados, encaminho em anexo o ofício solicitando a realização de curso de ' +
          'Bovinocultura de Corte para produtores da nossa regional. Aguardamos retorno.',
        anexoOficioId: anexo.id,
        status: 'PENDENTE',
      }),
    );
  }

  // eslint-disable-next-line no-console
  console.log('Seed concluído. Senha padrão de todos os usuários: senar@123');
  // eslint-disable-next-line no-console
  console.log(
    '4 solicitações de exemplo criadas (0001/2026 Análise Regional, 0002/2026 Análise Assessoria, ' +
      '0003/2026 Em Execução, 0004/2026 Atendido).',
  );
  await dataSource.destroy();
}

const DIACRITICOS = new RegExp('[̀-ͯ]', 'g');

function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(/[^a-z0-9]+/g, '.');
}

/** Gera um PDF mínimo e válido, apenas para que o botão "Baixar ofício" tenha um arquivo real. */
function gerarPdfExemplo(titulo: string): Buffer {
  const texto = `Oficio de exemplo - ${titulo}`.replace(/[()]/g, '');
  const conteudoStream = `BT /F1 16 Tf 20 100 Td (${texto}) Tj ET`;
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/MediaBox[0 0 400 200]/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length ${conteudoStream.length}>>
stream
${conteudoStream}
endstream
endobj
trailer<</Root 1 0 R>>
%%EOF`;
  return Buffer.from(pdf, 'utf-8');
}

seed().catch((erro) => {
  // eslint-disable-next-line no-console
  console.error('Falha ao executar o seed:', erro);
  process.exit(1);
});
