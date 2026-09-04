import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { GerarOficioModeloDto } from './dto/gerar-oficio-modelo.dto';
import { TipoItem, Turno } from '../../common/enums/solicitacao.enum';

const TIPO_ITEM_LABELS: Record<TipoItem, string> = {
  [TipoItem.ACAO_ATIVIDADE]: 'Ação/Atividade',
  [TipoItem.PATROCINIO]: 'Patrocínio',
  [TipoItem.SOLICITACAO_ITENS]: 'Solicitação de Itens',
  [TipoItem.CONVITE]: 'Convite',
};

const TURNO_LABELS: Record<Turno, string> = {
  [Turno.MANHA]: 'Manhã',
  [Turno.TARDE]: 'Tarde',
  [Turno.NOITE]: 'Noite',
  [Turno.INTEGRAL]: 'Integral',
};

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' });
const CINZA = '#555555';

/**
 * Monta um PDF de ofício "padrão" a partir dos dados já preenchidos na tela —
 * alternativa para quando o Parceiro/Sindicato não tem um documento próprio
 * pronto para anexar. Segue o formato usado nos ofícios reais dos sindicatos
 * rurais (número, destinatário, local/data, assunto, corpo justificado com
 * recuo de parágrafo, assinatura e rodapé institucional) — cada Parceiro
 * imprime as SUAS próprias informações (nome, CNPJ, endereço, telefone),
 * vindas do vínculo do Mobilizador/Presidente que está protocolando.
 * Não é um substituto do PDF oficial do Parceiro: é um modelo simples,
 * gerado localmente, servindo como o próprio anexo obrigatório do protocolo
 * (ver AnexosService.salvar — o resultado entra no fluxo normal de anexos,
 * como se tivesse sido enviado por upload).
 */
@Injectable()
export class GeradorOficioService {
  async gerarPdf(dados: GerarOficioModeloDto): Promise<Buffer> {
    const documento = new PDFDocument({ size: 'A4', margin: 56 });
    const pedacos: Buffer[] = [];
    documento.on('data', (pedaco) => pedacos.push(pedaco));

    const fechamento = new Promise<Buffer>((resolve) => {
      documento.on('end', () => resolve(Buffer.concat(pedacos)));
    });

    this.montarConteudo(documento, dados);
    documento.end();

    return fechamento;
  }

  private montarConteudo(documento: PDFKit.PDFDocument, dados: GerarOficioModeloDto): void {
    const dataDocumento = dados.dataDocumento ? new Date(dados.dataDocumento) : new Date();

    // Cabeçalho — identificação do Parceiro/Sindicato remetente.
    documento
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(dados.parceiroSigla || 'Parceiro/Sindicato');

    if (dados.coordenadorRegionalNome) {
      documento
        .font('Helvetica')
        .fontSize(10)
        .fillColor(CINZA)
        .text(`Coordenadoria Regional: ${dados.coordenadorRegionalNome}`)
        .fillColor('#000000');
    }
    documento.moveDown(2);

    // Número do ofício + destinatário institucional do fluxo.
    const rotuloOficio = dados.numeroDocumento ? `Ofício nº ${dados.numeroDocumento}` : 'Ofício';
    documento.font('Helvetica').fontSize(11).text(rotuloOficio);
    documento.moveDown(0.8);
    documento.text('Ao Senhor(a),');
    documento.font('Helvetica-Bold').text('Superintendente do SENAR-GO');
    documento.moveDown(1.5);

    // Local e data, alinhados à direita.
    const localData = [dados.municipio, FORMATADOR_DATA.format(dataDocumento)].filter(Boolean).join(', ');
    documento.font('Helvetica').fontSize(11).text(`${localData}.`, { align: 'right' });
    documento.moveDown(1.5);

    // Assunto.
    documento.font('Helvetica').fontSize(11).text('Assunto: ', { continued: true });
    documento.font('Helvetica-Bold').text(dados.assunto);
    documento.moveDown(1.2);

    // Corpo — recuo de primeira linha (padrão de ofício formal) + justificado.
    const corpo =
      dados.resumoObservacoes?.trim() ||
      'Vimos por meio deste solicitar a análise e o encaminhamento dos itens relacionados abaixo, ' +
        'referentes ao Parceiro identificado neste documento.';
    documento.font('Helvetica').fontSize(11).text(corpo, { align: 'justify', indent: 28 });
    documento.moveDown(1.3);

    // Lista de itens solicitados.
    documento.font('Helvetica-Bold').fontSize(11).text('Itens solicitados:');
    documento.moveDown(0.5);

    dados.itens.forEach((item, indice) => {
      const titulo = item.titulo || item.acaoAtividade || '—';
      documento
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .text(`${indice + 1}. [${TIPO_ITEM_LABELS[item.tipo]}] ${titulo}`);

      const detalhes: string[] = [];
      if (item.resumo) detalhes.push(item.resumo);
      if (item.disciplina) detalhes.push(`Disciplina: ${item.disciplina}`);
      if (item.turno) detalhes.push(`Turno: ${TURNO_LABELS[item.turno]}`);
      if (item.dataInicio) {
        const periodo = item.dataFim
          ? `${FORMATADOR_DATA.format(new Date(item.dataInicio))} a ${FORMATADOR_DATA.format(new Date(item.dataFim))}`
          : FORMATADOR_DATA.format(new Date(item.dataInicio));
        detalhes.push(`Período: ${periodo}`);
      }

      if (detalhes.length > 0) {
        documento.font('Helvetica').fontSize(10).text(detalhes.join(' — '), { indent: 14 });
      }
      documento.moveDown(0.6);
    });

    documento.moveDown(1);
    documento
      .font('Helvetica')
      .fontSize(11)
      .text(
        'Certos de podermos contar com a valiosa colaboração, desde já elevamos nossos sinceros votos de apreço e consideração.',
        { align: 'justify', indent: 28 },
      );
    documento.moveDown(2);

    documento.text('Atenciosamente,');
    documento.moveDown(2.5);

    // Assinaturas.
    if (dados.presidenteNome) {
      documento.font('Helvetica-Bold').fontSize(11).text(dados.presidenteNome, { align: 'center' });
      documento
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(CINZA)
        .text('Presidente', { align: 'center' })
        .fillColor('#000000');
      documento.moveDown(1);
    }
    if (dados.mobilizadorNome) {
      documento.font('Helvetica-Bold').fontSize(11).text(dados.mobilizadorNome, { align: 'center' });
      documento
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(CINZA)
        .text('Mobilizador', { align: 'center' })
        .fillColor('#000000');
    }

    this.desenharRodape(documento, dados);
  }

  /**
   * Rodapé institucional do Parceiro/Sindicato — nome, CNPJ, endereço e
   * telefone, fixado perto da base da página (mesmo padrão dos ofícios reais
   * usados como referência). Só aparece o que o Parceiro realmente tiver
   * cadastrado no RM; nenhum dado é inventado.
   */
  private desenharRodape(documento: PDFKit.PDFDocument, dados: GerarOficioModeloDto): void {
    const linhas = [
      dados.parceiroSigla,
      dados.cnpj ? `CNPJ: ${dados.cnpj}` : undefined,
      dados.endereco,
      dados.telefone ? `Telefone: ${dados.telefone}` : undefined,
    ].filter((linha): linha is string => !!linha);

    if (linhas.length === 0) return;

    const larguraUtil = documento.page.width - documento.page.margins.left - documento.page.margins.right;
    const yRodape = documento.page.height - documento.page.margins.bottom - linhas.length * 12;
    // Se o conteúdo já escreveu além de onde o rodapé ficaria, não sobrepõe —
    // só continua o fluxo normal (evita texto por cima de texto em ofícios
    // com muitos itens).
    const y = documento.y < yRodape ? yRodape : documento.y + 12;

    documento
      .fontSize(8.5)
      .fillColor(CINZA)
      .text(linhas.join('\n'), documento.page.margins.left, y, {
        width: larguraUtil,
        align: 'center',
      })
      .fillColor('#000000');
  }
}
