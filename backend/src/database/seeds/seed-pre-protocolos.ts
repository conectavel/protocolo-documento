import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
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

/**
 * Popula a tela de Pré-Protocolo com exemplos nas duas abas — "Entrada por
 * E-mail" (status PENDENTE) e "Protocolos Iniciados" (status CONVERTIDO) —
 * sem tocar em nenhuma outra tabela além de `pre_protocolos`/`anexos` (e um
 * UPDATE aditivo em `solicitacoes.preProtocoloOrigemId`/`emailRemetenteOrigem`
 * nas poucas linhas que ganham um pré-protocolo de origem). Não faz TRUNCATE
 * em nada, ao contrário de `seed.ts` — seguro para rodar num banco com dados
 * reais/de teste em andamento.
 *
 * Execução: `npx ts-node -r tsconfig-paths/register src/database/seeds/seed-pre-protocolos.ts`
 */

function gerarPdfExemplo(titulo: string): Buffer {
  const texto = `Oficio recebido por e-mail - ${titulo}`.replace(/[()]/g, '');
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

const PENDENTES = [
  {
    remetente: 'presidencia@faeg.com.br',
    assunto: 'Convite para inauguração da nova sede do Sindicato Rural',
    corpo:
      'Prezados, temos a honra de convidar o SENAR-GO para a inauguração da nova sede ' +
      'administrativa do nosso Sindicato Rural. Segue ofício em anexo com os detalhes.',
    comAnexo: true,
  },
  {
    remetente: 'sindrural.jatai@sistemafaeg.com.br',
    assunto: 'Solicitação de patrocínio — Feira Agropecuária Regional',
    corpo:
      'Solicitamos apoio do SENAR-GO por meio de patrocínio para a realização da Feira ' +
      'Agropecuária Regional, conforme ofício anexo.',
    comAnexo: true,
  },
  {
    remetente: 'escritorio.mineiros@sistemafaeg.com.br',
    assunto: 'Pedido de curso de Manejo de Pastagens',
    corpo:
      'Encaminhamos solicitação de curso de Manejo de Pastagens para produtores da nossa ' +
      'regional, conforme detalhado no ofício em anexo.',
    comAnexo: true,
  },
  {
    remetente: 'catalao@sistemafaeg.com.br',
    assunto: 'Dia de Campo — solicitação de itens de apoio',
    corpo:
      'Bom dia, precisamos organizar um Dia de Campo e gostaríamos de solicitar itens de ' +
      'apoio (banners, materiais gráficos). Vou enviar o ofício assinado em seguida.',
    comAnexo: false,
  },
  {
    remetente: 'goias@sistemafaeg.com.br',
    assunto: 'Solicitação de curso técnico — Ordenha e Boas Práticas',
    corpo:
      'Prezada Superintendência, solicitamos a realização de curso técnico sobre Ordenha e ' +
      'Boas Práticas de manejo, atendendo pedido dos associados. Ofício em anexo.',
    comAnexo: true,
  },
];

/** numeroProcesso das solicitações já existentes que vão "ganhar" uma origem por e-mail. */
const CONVERTIDOS_PARA_NUMERO_PROCESSO = ['20260823001', '20260830001', '20260901001', '20260903001'];

async function main() {
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
    synchronize: false,
  });

  await dataSource.initialize();
  const preProtocoloRepo = dataSource.getRepository(PreProtocolo);
  const anexoRepo = dataSource.getRepository(Anexo);
  const solicitacaoRepo = dataSource.getRepository(Solicitacao);

  async function criarAnexo(nomeArquivo: string): Promise<Anexo> {
    const uploadDir = process.env.UPLOAD_DIR ?? './storage/anexos';
    fs.mkdirSync(uploadDir, { recursive: true });
    const caminho = path.join(uploadDir, `seed-preprotocolo-${Date.now()}-${nomeArquivo}`);
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

  const ASSESSOR_ID = '0614c386-e9d0-4ee2-bbaf-fbd7901386fd';

  console.log('--- Entrada por E-mail (PENDENTE) ---');
  for (const def of PENDENTES) {
    const anexo = def.comAnexo ? await criarAnexo(`oficio-${Date.now()}.pdf`) : null;
    const pp = await preProtocoloRepo.save(
      preProtocoloRepo.create({
        remetente: def.remetente,
        assunto: def.assunto,
        corpo: def.corpo,
        anexoOficioId: anexo?.id,
        status: 'PENDENTE',
      }),
    );
    console.log(`Criado (PENDENTE): "${def.assunto}" de ${def.remetente}${anexo ? '' : ' [sem anexo]'}`);
    void pp;
  }

  console.log('\n--- Protocolos Iniciados (CONVERTIDO) ---');
  for (const numeroProcesso of CONVERTIDOS_PARA_NUMERO_PROCESSO) {
    const solicitacao = await solicitacaoRepo.findOne({ where: { numeroProcesso } });
    if (!solicitacao) {
      console.log(`Solicitação ${numeroProcesso} não encontrada — pulando.`);
      continue;
    }
    const anexo = await criarAnexo(`oficio-origem-${numeroProcesso}.pdf`);
    const recebidoEm = new Date(new Date(solicitacao.dataSolicitacao).getTime() - 2 * 60 * 60 * 1000);
    const convertidoEm = new Date(new Date(solicitacao.dataSolicitacao).getTime() - 30 * 60 * 1000);
    const emailRemetente = solicitacao.mobilizadorId
      ? `mobilizador-${solicitacao.mobilizadorId.slice(0, 8)}@sistemafaeg.com.br`
      : 'origem@sistemafaeg.com.br';

    const preProtocolo = await preProtocoloRepo.save(
      preProtocoloRepo.create({
        remetente: emailRemetente,
        assunto: solicitacao.assunto,
        corpo: `Encaminho ofício referente a: ${solicitacao.assunto}.`,
        anexoOficioId: anexo.id,
        status: 'CONVERTIDO',
        solicitacaoGeradaId: solicitacao.id,
        convertidoPorId: ASSESSOR_ID,
        convertidoEm,
      }),
    );
    await dataSource.query('UPDATE pre_protocolos SET recebido_em = $1 WHERE id = $2', [
      recebidoEm,
      preProtocolo.id,
    ]);

    await solicitacaoRepo.update(solicitacao.id, {
      preProtocoloOrigemId: preProtocolo.id,
      emailRemetenteOrigem: emailRemetente,
    });
    console.log(`Criado (CONVERTIDO): "${solicitacao.assunto}" → vinculado à solicitação ${numeroProcesso}`);
  }

  await dataSource.destroy();
  console.log('\nConcluído — nenhuma outra tabela/linha foi apagada.');
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
