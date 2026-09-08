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

/**
 * Sindicatos Parceiros e Mobilizadores reais, sincronizados a partir da
 * planilha do RM/ACORP (fonte oficial). FAEG já é o Parceiro de exemplo
 * criado acima, por isso não aparece de novo aqui.
 */
const SINDICATOS_REAIS: { rmCodigo: string; nome: string }[] = [
  { rmCodigo: "680", nome: "ASSOC. DOS PROD. RURAIS DA COMUNIDADE DE PASSA QUATRO DO BOM JESUS" },
  { rmCodigo: "1121", nome: "CENTRO DE APOIO DESENVOLVIMENTO LOCAL E AGRICULTURA SUSTENTAVEL - CEADLAS" },
  { rmCodigo: "21084", nome: "ESPETO BAMBU" },
  { rmCodigo: "21085", nome: "ESTACAO VERAO" },
  { rmCodigo: "22175", nome: "GYNPEC CONSULTORIA E REPRESENTACOES" },
  { rmCodigo: "459", nome: "SENAR/AR-GO" },
  { rmCodigo: "1025", nome: "SIND. DOS PROD. RURAIS DE ACREÚNA" },
  { rmCodigo: "164", nome: "SIND. DOS PROD. RURAIS DE ALEXÂNIA" },
  { rmCodigo: "889", nome: "SIND. DOS PROD. RURAIS DE IACIARA" },
  { rmCodigo: "775", nome: "SIND. DOS PROD. RURAIS DE PARANAIGUARA E SÃO SIMÃO" },
  { rmCodigo: "1451", nome: "SIND. DOS TRAB. RURAIS DE FAZENDA NOVA" },
  { rmCodigo: "754", nome: "SIND. DOS TRAB. RURAIS DE NOVO BRASIL" },
  { rmCodigo: "15639", nome: "SIND. RURAL DE ÁGUA FRIA DE GOIÁS" },
  { rmCodigo: "150", nome: "SIND. RURAL DE ALTO PARAÍSO DE GOIAS" },
  { rmCodigo: "738", nome: "SIND. RURAL DE ANÁPOLIS" },
  { rmCodigo: "859", nome: "SIND. RURAL DE ANICUNS" },
  { rmCodigo: "2923", nome: "SIND. RURAL DE APORÉ" },
  { rmCodigo: "146", nome: "SIND. RURAL DE ARAGUAPAZ" },
  { rmCodigo: "793", nome: "SIND. RURAL DE ARENÓPOLIS" },
  { rmCodigo: "7535", nome: "SIND. RURAL DE AURILÂNDIA" },
  { rmCodigo: "122", nome: "SIND. RURAL DE BARRO ALTO" },
  { rmCodigo: "707", nome: "SIND. RURAL DE BELA VISTA DE GOIÁS" },
  { rmCodigo: "123", nome: "SIND. RURAL DE BOM JARDIM DE GOIAS" },
  { rmCodigo: "1147", nome: "SIND. RURAL DE BOM JESUS DE GOIAS" },
  { rmCodigo: "708", nome: "SIND. RURAL DE BRITÂNIA E ARUANÃ" },
  { rmCodigo: "7461", nome: "SIND. RURAL DE BURITI ALEGRE" },
  { rmCodigo: "686", nome: "SIND. RURAL DE CABECEIRAS" },
  { rmCodigo: "1132", nome: "SIND. RURAL DE CACHOEIRA ALTA" },
  { rmCodigo: "709", nome: "SIND. RURAL DE CAÇU" },
  { rmCodigo: "762", nome: "SIND. RURAL DE CAIAPÔNIA" },
  { rmCodigo: "151", nome: "SIND. RURAL DE CALDAS NOVAS E RIO QUENTE" },
  { rmCodigo: "710", nome: "SIND. RURAL DE CAMPINORTE" },
  { rmCodigo: "6529", nome: "SIND. RURAL DE CAMPO ALEGRE DE GOIÁS" },
  { rmCodigo: "1931", nome: "SIND. RURAL DE CAMPOS BELOS" },
  { rmCodigo: "1115", nome: "SIND. RURAL DE CARMO DO RIO VERDE" },
  { rmCodigo: "156", nome: "SIND. RURAL DE CATALÃO" },
  { rmCodigo: "5978", nome: "SIND. RURAL DE CAVALCANTE" },
  { rmCodigo: "157", nome: "SIND. RURAL DE CERES" },
  { rmCodigo: "835", nome: "SIND. RURAL DE CEZARINA" },
  { rmCodigo: "763", nome: "SIND. RURAL DE CHAPADÃO DO CÉU" },
  { rmCodigo: "846", nome: "SIND. RURAL DE COCALZINHO DE GOIÁS" },
  { rmCodigo: "711", nome: "SIND. RURAL DE CORUMBÁ DE GOIÁS" },
  { rmCodigo: "903", nome: "SIND. RURAL DE CORUMBAÍBA" },
  { rmCodigo: "994", nome: "SIND. RURAL DE CRISTALINA" },
  { rmCodigo: "125", nome: "SIND. RURAL DE CRIXÁS" },
  { rmCodigo: "921", nome: "SIND. RURAL DE CROMÍNIA" },
  { rmCodigo: "165", nome: "SIND. RURAL DE DOVERLÂNDIA" },
  { rmCodigo: "764", nome: "SIND. RURAL DE EDÉIA" },
  { rmCodigo: "127", nome: "SIND. RURAL DE FAZENDA NOVA" },
  { rmCodigo: "1116", nome: "SIND. RURAL DE FIRMINÓPOLIS" },
  { rmCodigo: "1268", nome: "SIND. RURAL DE FORMOSA" },
  { rmCodigo: "158", nome: "SIND. RURAL DE GOIANDIRA" },
  { rmCodigo: "128", nome: "SIND. RURAL DE GOIANESIA" },
  { rmCodigo: "767", nome: "SIND. RURAL DE GOIÂNIA" },
  { rmCodigo: "812", nome: "SIND. RURAL DE GOIÁS" },
  { rmCodigo: "145", nome: "SIND. RURAL DE GOIATUBA" },
  { rmCodigo: "1409", nome: "SIND. RURAL DE GOUVELÂNDIA" },
  { rmCodigo: "840", nome: "SIND. RURAL DE GUAPÓ" },
  { rmCodigo: "8977", nome: "SIND. RURAL DE HIDROLÂNDIA" },
  { rmCodigo: "1368", nome: "SIND. RURAL DE INACIOLÂNDIA" },
  { rmCodigo: "159", nome: "SIND. RURAL DE INDIARA" },
  { rmCodigo: "3691", nome: "SIND. RURAL DE INHUMAS" },
  { rmCodigo: "687", nome: "SIND. RURAL DE IPAMERI" },
  { rmCodigo: "796", nome: "SIND. RURAL DE IPORÁ" },
  { rmCodigo: "160", nome: "SIND. RURAL DE ITABERAÍ" },
  { rmCodigo: "4065", nome: "SIND. RURAL DE ITAGUARU" },
  { rmCodigo: "688", nome: "SIND. RURAL DE ITAJÁ" },
  { rmCodigo: "995", nome: "SIND. RURAL DE ITAPACI" },
  { rmCodigo: "161", nome: "SIND. RURAL DE ITAPIRAPUÃ" },
  { rmCodigo: "129", nome: "SIND. RURAL DE ITAPURANGA" },
  { rmCodigo: "770", nome: "SIND. RURAL DE ITARUMÃ" },
  { rmCodigo: "3395", nome: "SIND. RURAL DE ITAUÇU" },
  { rmCodigo: "152", nome: "SIND. RURAL DE ITUMBIARA" },
  { rmCodigo: "130", nome: "SIND. RURAL DE JARAGUÁ" },
  { rmCodigo: "712", nome: "SIND. RURAL DE JATAÍ" },
  { rmCodigo: "797", nome: "SIND. RURAL DE JAUPACI" },
  { rmCodigo: "131", nome: "SIND. RURAL DE JOVIÂNIA" },
  { rmCodigo: "132", nome: "SIND. RURAL DE JUSSARA" },
  { rmCodigo: "5208", nome: "SIND. RURAL DE LEOPOLDO DE BULHÕES" },
  { rmCodigo: "4588", nome: "SIND. RURAL DE LUZIÂNIA" },
  { rmCodigo: "6064", nome: "SIND. RURAL DE MARA ROSA" },
  { rmCodigo: "798", nome: "SIND. RURAL DE MATRINCHÃ" },
  { rmCodigo: "2850", nome: "SIND. RURAL DE MINAÇU" },
  { rmCodigo: "713", nome: "SIND. RURAL DE MINEIROS" },
  { rmCodigo: "135", nome: "SIND. RURAL DE MONTE ALEGRE DE GOIÁS" },
  { rmCodigo: "136", nome: "SIND. RURAL DE MONTES CLAROS DE GOIÁS" },
  { rmCodigo: "714", nome: "SIND. RURAL DE MONTIVIDIU" },
  { rmCodigo: "133", nome: "SIND. RURAL DE MORRINHOS" },
  { rmCodigo: "134", nome: "SIND. RURAL DE MOSSÂMEDES" },
  { rmCodigo: "689", nome: "SIND. RURAL DE MOZARLÂNDIA" },
  { rmCodigo: "920", nome: "SIND. RURAL DE MUTUNÓPOLIS" },
  { rmCodigo: "7858", nome: "SIND. RURAL DE NAZÁRIO" },
  { rmCodigo: "813", nome: "SIND. RURAL DE NIQUELÂNDIA" },
  { rmCodigo: "823", nome: "SIND. RURAL DE NOVA CRIXÁS" },
  { rmCodigo: "772", nome: "SIND. RURAL DE ORIZONA" },
  { rmCodigo: "1122", nome: "SIND. RURAL DE PALESTINA DE GOIÁS" },
  { rmCodigo: "799", nome: "SIND. RURAL DE PALMEIRAS DE GOIÁS" },
  { rmCodigo: "715", nome: "SIND. RURAL DE PANAMÁ" },
  { rmCodigo: "143", nome: "SIND. RURAL DE PARAÚNA" },
  { rmCodigo: "996", nome: "SIND. RURAL DE PETROLINA DE GOIÁS" },
  { rmCodigo: "153", nome: "SIND. RURAL DE PIRACANJUBA" },
  { rmCodigo: "137", nome: "SIND. RURAL DE PIRANHAS" },
  { rmCodigo: "166", nome: "SIND. RURAL DE PIRENÓPOLIS" },
  { rmCodigo: "716", nome: "SIND. RURAL DE PIRES DO RIO" },
  { rmCodigo: "1315", nome: "SIND. RURAL DE PONTALINA" },
  { rmCodigo: "717", nome: "SIND. RURAL DE PORANGATU" },
  { rmCodigo: "142", nome: "SIND. RURAL DE PORTELÂNDIA" },
  { rmCodigo: "162", nome: "SIND. RURAL DE POSSE" },
  { rmCodigo: "1557", nome: "SIND. RURAL DE QUIRINÓPOLIS" },
  { rmCodigo: "690", nome: "SIND. RURAL DE RIO VERDE" },
  { rmCodigo: "163", nome: "SIND. RURAL DE RUBIATABA" },
  { rmCodigo: "3686", nome: "SIND. RURAL DE SANCLERLÂNDIA" },
  { rmCodigo: "1447", nome: "SIND. RURAL DE SANTA CRUZ DE GOIAS" },
  { rmCodigo: "884", nome: "SIND. RURAL DE SANTA FÉ DE GOIAS" },
  { rmCodigo: "718", nome: "SIND. RURAL DE SANTA HELENA DE GOIÁS" },
  { rmCodigo: "719", nome: "SIND. RURAL DE SANTA RITA DO ARAGUAIA" },
  { rmCodigo: "6230", nome: "SIND. RURAL DE SANTO ANTÔNIO DO DESCOBERTO" },
  { rmCodigo: "1070", nome: "SIND. RURAL DE SÃO DOMINGOS" },
  { rmCodigo: "800", nome: "SIND. RURAL DE SÃO FRANCISCO DE GOIÁS" },
  { rmCodigo: "842", nome: "SIND. RURAL DE SÃO JOÃO DA PARAÚNA" },
  { rmCodigo: "138", nome: "SIND. RURAL DE SÃO JOÃO DALIANÇA" },
  { rmCodigo: "779", nome: "SIND. RURAL DE SÃO LUÍS DE MONTES BELOS" },
  { rmCodigo: "139", nome: "SIND. RURAL DE SÃO MIGUEL DO ARAGUAIA" },
  { rmCodigo: "691", nome: "SIND. RURAL DE SERRANÓPOLIS" },
  { rmCodigo: "841", nome: "SIND. RURAL DE SILVÂNIA" },
  { rmCodigo: "720", nome: "SIND. RURAL DE TRINDADE" },
  { rmCodigo: "167", nome: "SIND. RURAL DE TROMBAS" },
  { rmCodigo: "141", nome: "SIND. RURAL DE URUAÇU" },
  { rmCodigo: "781", nome: "SIND. RURAL DE VARJÃO" },
  { rmCodigo: "140", nome: "SIND. RURAL DE VIANÓPOLIS" },
  { rmCodigo: "784", nome: "SIND. RURAL DE VICENTINÓPOLIS" },
  { rmCodigo: "19925", nome: "SINDICATO RURAL DE ALVORADA DO NORTE, BURITINÓPOLIS E SIMOLÂNDIA" },
  { rmCodigo: "20357", nome: "SINDICATO RURAL DE PALMINÓPOLIS" },
  { rmCodigo: "16471", nome: "SINDICATO RURAL DE URUANA" },
];

/**
 * Coordenadores Regionais reais, por Regional (planilha "Coordenadores Regionais
 * por região" — 1 linha por município do estado, com a Regional e o Coordenador
 * que a atende). Ao contrário da planilha antiga "dos sindicatos" (que listava
 * várias pessoas diferentes por sindicato e por isso não dava pra usar), esta
 * é inequívoca: 1 Regional = 1 Coordenador, e cobre todos os municípios de Goiás.
 * `codigo` é só a chave interna usada para ligar Parceiro -> Regional abaixo.
 */
const COORDENADORES_REGIONAIS_REAIS: { codigo: string; regional: string; nome: string }[] = [
  { codigo: "CENTRO_LESTE", regional: "Centro Leste", nome: "Leonardo Brandao Goncalves Bizinoto" },
  { codigo: "CENTRO_NORTE", regional: "Centro Norte", nome: "Douglas Vila Verde" },
  { codigo: "EXTREMO_SUDOESTE", regional: "Extremo Sudoeste", nome: "Nelio Castro Lima" },
  { codigo: "LESTE", regional: "Leste", nome: "Vanessa Batista Vaz" },
  { codigo: "MEDIO_NORTE", regional: "Médio Norte", nome: "Helio Germano Junior" },
  { codigo: "METROPOLITANA", regional: "Metropolitana", nome: "Saudio Vieira Peixoto" },
  { codigo: "NORDESTE", regional: "Nordeste", nome: "Elias Antonio de Almeida Neto" },
  { codigo: "NORTE", regional: "Norte", nome: "Leticia Aurelio dos Santos" },
  { codigo: "OESTE", regional: "Oeste", nome: "Ilson Ghellar Junior" },
  { codigo: "SUDOESTE", regional: "Sudoeste", nome: "Renildo Marques Teixeira" },
  { codigo: "SUL", regional: "Sul", nome: "Thiago Francisco Rosa" },
  { codigo: "VALE_DO_ARAGUAIA", regional: "Vale do Araguaia", nome: "Walysson Bernardo Rodrigues Santos" },
];

/**
 * Regional (codigo acima) de cada Sindicato, resolvida cruzando o município do
 * nome do Sindicato (em SINDICATOS_REAIS) com o município na planilha de
 * Coordenadores Regionais por região. Sindicatos que cobrem mais de um
 * município (ex.: "…DE ALVORADA DO NORTE, BURITINÓPOLIS E SIMOLÂNDIA") só
 * entram aqui quando todos os municípios caem na mesma Regional (é o caso de
 * todos eles). Os que não aparecem (SENAR/AR-GO e outros Parceiros
 * institucionais que não são "o sindicato de um município") ficam com a
 * Regional padrão (Metropolitana/Goiânia, sede do SENAR-GO) — ver `seed()`.
 */
const REGIAO_POR_SINDICATO_RM_CODIGO: Record<string, string> = {
  "122": "MEDIO_NORTE",
  "123": "OESTE",
  "125": "MEDIO_NORTE",
  "127": "OESTE",
  "128": "MEDIO_NORTE",
  "129": "CENTRO_NORTE",
  "130": "CENTRO_NORTE",
  "131": "SUL",
  "132": "VALE_DO_ARAGUAIA",
  "133": "SUL",
  "134": "VALE_DO_ARAGUAIA",
  "135": "NORDESTE",
  "136": "VALE_DO_ARAGUAIA",
  "137": "OESTE",
  "138": "NORDESTE",
  "139": "NORTE",
  "140": "CENTRO_LESTE",
  "141": "MEDIO_NORTE",
  "142": "EXTREMO_SUDOESTE",
  "143": "SUDOESTE",
  "145": "SUL",
  "146": "VALE_DO_ARAGUAIA",
  "150": "NORDESTE",
  "151": "SUL",
  "152": "SUL",
  "153": "SUL",
  "156": "LESTE",
  "157": "MEDIO_NORTE",
  "158": "LESTE",
  "159": "SUDOESTE",
  "160": "CENTRO_NORTE",
  "161": "VALE_DO_ARAGUAIA",
  "162": "NORDESTE",
  "163": "MEDIO_NORTE",
  "164": "CENTRO_LESTE",
  "165": "OESTE",
  "166": "CENTRO_LESTE",
  "167": "NORTE",
  "680": "METROPOLITANA",
  "686": "NORDESTE",
  "687": "LESTE",
  "688": "EXTREMO_SUDOESTE",
  "689": "VALE_DO_ARAGUAIA",
  "690": "SUDOESTE",
  "691": "EXTREMO_SUDOESTE",
  "707": "METROPOLITANA",
  "708": "VALE_DO_ARAGUAIA",
  "709": "EXTREMO_SUDOESTE",
  "710": "NORTE",
  "711": "CENTRO_LESTE",
  "712": "EXTREMO_SUDOESTE",
  "713": "EXTREMO_SUDOESTE",
  "714": "SUDOESTE",
  "715": "SUL",
  "716": "LESTE",
  "717": "NORTE",
  "718": "SUDOESTE",
  "719": "EXTREMO_SUDOESTE",
  "720": "METROPOLITANA",
  "738": "CENTRO_LESTE",
  "754": "VALE_DO_ARAGUAIA",
  "762": "OESTE",
  "763": "EXTREMO_SUDOESTE",
  "764": "SUDOESTE",
  "767": "METROPOLITANA",
  "770": "EXTREMO_SUDOESTE",
  "772": "LESTE",
  "775": "EXTREMO_SUDOESTE",
  "779": "OESTE",
  "781": "METROPOLITANA",
  "784": "SUL",
  "793": "OESTE",
  "796": "OESTE",
  "797": "OESTE",
  "798": "VALE_DO_ARAGUAIA",
  "799": "METROPOLITANA",
  "800": "CENTRO_NORTE",
  "812": "VALE_DO_ARAGUAIA",
  "813": "MEDIO_NORTE",
  "823": "VALE_DO_ARAGUAIA",
  "835": "METROPOLITANA",
  "840": "METROPOLITANA",
  "841": "CENTRO_LESTE",
  "842": "OESTE",
  "846": "CENTRO_LESTE",
  "859": "CENTRO_NORTE",
  "884": "VALE_DO_ARAGUAIA",
  "889": "NORDESTE",
  "903": "SUL",
  "920": "NORTE",
  "921": "SUL",
  "994": "LESTE",
  "995": "MEDIO_NORTE",
  "996": "CENTRO_LESTE",
  "1025": "SUDOESTE",
  "1070": "NORDESTE",
  "1115": "CENTRO_NORTE",
  "1116": "OESTE",
  "1122": "OESTE",
  "1132": "EXTREMO_SUDOESTE",
  "1147": "SUL",
  "1268": "NORDESTE",
  "1315": "SUL",
  "1368": "SUDOESTE",
  "1409": "SUDOESTE",
  "1447": "LESTE",
  "1451": "OESTE",
  "1557": "SUDOESTE",
  "1931": "NORDESTE",
  "2850": "NORTE",
  "2923": "EXTREMO_SUDOESTE",
  "3395": "CENTRO_NORTE",
  "3686": "VALE_DO_ARAGUAIA",
  "3691": "CENTRO_NORTE",
  "4065": "CENTRO_NORTE",
  "4588": "LESTE",
  "5208": "CENTRO_LESTE",
  "5978": "NORDESTE",
  "6064": "NORTE",
  "6230": "CENTRO_LESTE",
  "6529": "LESTE",
  "7461": "SUL",
  "7535": "OESTE",
  "7858": "METROPOLITANA",
  "8977": "METROPOLITANA",
  "15639": "NORDESTE",
  "16471": "CENTRO_NORTE",
  "19925": "NORDESTE",
  "20357": "METROPOLITANA",
};

/**
 * Presidentes reais por Sindicato (planilha "presidentes.xlsx", fonte oficial
 * FAEG). Só cobre os sindicatos cujo nome deu match exato (após normalizar
 * acentos/abreviações) com o nome vindo da planilha do RM — os demais
 * sindicatos ficam com o Presidente placeholder criado acima.
 */
const PRESIDENTES_REAIS: { rmCodigo: string; nome: string; email: string | null }[] = [
  { rmCodigo: "889", nome: "Edvaldo Santos Da Silva", email: "iaciara@sistemafaeg.com.br" },
  { rmCodigo: "15639", nome: "Danilo Zarur Marques", email: "danilozarurmarques@gmail.com" },
  { rmCodigo: "738", nome: "Ubirajara Jose Carneiro Junior", email: "anapolis@sistemafaeg.com.br" },
  { rmCodigo: "2923", nome: "Eldo De Assis Carvalho", email: "apore@faeg.com.br" },
  { rmCodigo: "146", nome: "Margareth Alves Irineu", email: "margareth.irineu@sistemafaeg.com.br" },
  { rmCodigo: "793", nome: "Vanderlan Alves De Menez", email: "arenopolis@sistemafaeg.com.br" },
  { rmCodigo: "122", nome: "Eliene Ferreira Da Silva", email: "barroalto@faeg.com" },
  { rmCodigo: "707", nome: "Antonio Cesar Fernandes", email: "belavista@sistemafaeg.com.br" },
  { rmCodigo: "123", nome: "Rauffer Rogeris Guedes Queiroz", email: "raufferguedes@bol.com.br" },
  { rmCodigo: "1147", nome: "Dulio Cesar De Sousa", email: "duliocsousa@bol.com.br" },
  { rmCodigo: "708", nome: "Wagner Marchesi", email: "britania@sistemafaeg.com.br" },
  { rmCodigo: "7461", nome: "Luanna Oliveira Inacio De Moraes", email: "luainacio@hotmail.com" },
  { rmCodigo: "686", nome: "Joaquim Pereira Cardoso", email: "joaquimcardoso0405@gmail.com / cabeceiras@sistemafaeg.com.br" },
  { rmCodigo: "1132", nome: "Renato Ferreira De Araujo", email: "renatoferreiradearaujo068@gmail.com" },
  { rmCodigo: "709", nome: "Neuton Jose Da Silva", email: "cacu@sistemafaeg.com.br" },
  { rmCodigo: "762", nome: "Vinicius Santos Silva Carvalho", email: "viniciu@saneago.com.br" },
  { rmCodigo: "710", nome: "Luiz Carlos Da Silva", email: "jlmadeiras.uruacu@gmail.com" },
  { rmCodigo: "6529", nome: "Rogivaldo Jose Da Silva", email: "rogivaldo.branco@icloud.com" },
  { rmCodigo: "1931", nome: "Orlando Goncalves Junior", email: "camposbelos@sistemafaeg.com.br" },
  { rmCodigo: "1115", nome: "Admilson Clemente Da Silva", email: "escritorio_clemente@hotmail.com" },
  { rmCodigo: "156", nome: "Ricardo Pires Monteiro", email: "catalao@sistemafaeg.com.br" },
  { rmCodigo: "5978", nome: "Denise Lopes Da Silva Rodrigues", email: "denise.rodrigues@senar-go.com.br" },
  { rmCodigo: "157", nome: "Ademar Jose Da Silva Junior", email: "juniorrodeio@hotmail.com" },
  { rmCodigo: "835", nome: "Castor Esteves Almeida Vieira", email: "castoresteves82@gmail.com" },
  { rmCodigo: "763", nome: "Thomas David Taylor Peixoto", email: "thomastpeixoto@gmail.com" },
  { rmCodigo: "846", nome: "Silvio Jose Coelho", email: "sirleitosta8@gmail.com" },
  { rmCodigo: "711", nome: "Rudolfo Xavier Pereira", email: "rudolfoxpereira@hotmail.com" },
  { rmCodigo: "994", nome: "Nilson Fogolin", email: "malvalucia@hotmail.com" },
  { rmCodigo: "125", nome: "Walker Goncalves Cardoso", email: "walkercrixas@hotmail.com" },
  { rmCodigo: "921", nome: "Hedgar De Jean E Helen", email: "h3dgar@gmail.com" },
  { rmCodigo: "165", nome: "Fernando Machado Mendonca", email: "fmachado.ti@gmail.com" },
  { rmCodigo: "764", nome: "Rogerio Martins Esteves", email: "rogeriovet@hotmail.com.br" },
  { rmCodigo: "127", nome: "Dionisio Gomes Dias", email: "fazendanova@sistemafaeg.com.br" },
  { rmCodigo: "1116", nome: "Cleberson Costa Dos Santos", email: "klebercosta@hotmail.com" },
  { rmCodigo: "1268", nome: "Ivan Ornelas", email: "formosa@sistemafaeg.com.br" },
  { rmCodigo: "158", nome: "Francelino Vitorino Borges Junior", email: "juninhocarapreta@hotmail.com" },
  { rmCodigo: "128", nome: "Joao Pedro Braollos Neto", email: "jpcerejeira@gmail.com" },
  { rmCodigo: "767", nome: "Aires Manoel De Souza", email: "airesvet@gmail.com" },
  { rmCodigo: "812", nome: "Valdivino Ferreira Pinto", email: "goias@sistemafaeg.com.br" },
  { rmCodigo: "145", nome: "Ricardo Ladeia Da Cunha", email: "goiatuba@sistemafaeg.com.br" },
  { rmCodigo: "840", nome: "Carlos Aimar Favero", email: "naopossui@gmail.com" },
  { rmCodigo: "8977", nome: "Fernando Guedes Pereira", email: "f.guedes_p@hotmail.com" },
  { rmCodigo: "1368", nome: "Nelcy Palhares Ribeiro De Gois", email: "nelcypalhares@gmail.com" },
  { rmCodigo: "159", nome: "Henrique Marques De Almeida", email: "henriquemarquesalmeida65@gmail.com" },
  { rmCodigo: "3691", nome: "Robledo Soares Soyer", email: "rsoyer.agro@hotmail.com" },
  { rmCodigo: "687", nome: "Fabio Mamoni Barduchi", email: "fabiobarduchi@bol.com.br" },
  { rmCodigo: "796", nome: "Iron Manoel Campos Filho", email: "iron.compos.filho@gmail.com" },
  { rmCodigo: "160", nome: "Marciel Reis Da Costa Chaves", email: "marcielreis@icloud.com" },
  { rmCodigo: "688", nome: "Pedro Felipe Sobrinho De Freitas", email: "pedro._felipe@hotmail.com" },
  { rmCodigo: "995", nome: "Joao Batista Ricardo Dos Santos", email: "joaosantos3t@gmail.com" },
  { rmCodigo: "161", nome: "Edgard Scatena Filho", email: "edgard.filho@sistemafaeg.com.br" },
  { rmCodigo: "129", nome: "Ronam Antonio Azzi Filho", email: "ronamadv@hotmail.com" },
  { rmCodigo: "770", nome: "Itamir Antonio Fernandes Valle", email: "itamir.girolando@yahoo.com" },
  { rmCodigo: "3395", nome: "Marcus Vinicius Rodrigues Souza Lino", email: "marcusviniciusjuventude@hotmail.com" },
  { rmCodigo: "152", nome: "Gilson Pereira Da Silva", email: "gilson03mariano@gmail.com" },
  { rmCodigo: "130", nome: "Mauricio Sulino Pinto", email: "marciamendes2003@bol.com.br" },
  { rmCodigo: "712", nome: "Aline Rezende Vilela", email: "srural.jatai@gmail.com" },
  { rmCodigo: "131", nome: "Sebastiao Ronis Goncalves", email: "sg.agrosantaterezinha@gmail.com" },
  { rmCodigo: "132", nome: "Arthur Oscar Vaz De Almeida Filho", email: "arthur.junqueira2011@gmail.com" },
  { rmCodigo: "5208", nome: "Carlos Antonio Borges", email: "carlos@gmail.com" },
  { rmCodigo: "4588", nome: "Francisco Martins Reis", email: "sistema1@terra.com.br" },
  { rmCodigo: "6064", nome: "Wuelitom Silverio Do Vale", email: "wuelitondovale@hotmail.com" },
  { rmCodigo: "798", nome: "Jose Luiz Garcias", email: "josegarcias.luiz@gmail.com" },
  { rmCodigo: "2850", nome: "Bruno De Queiroz Barros", email: "brunoqueiroz2707@hotmail.com" },
  { rmCodigo: "713", nome: "Antonio Vieira De Carvalho", email: "mineiros@sistemafaeg.com.br" },
  { rmCodigo: "133", nome: "Arthur Traldi Chiari", email: "arthur.chiari@hotmail.com" },
  { rmCodigo: "134", nome: "Marcos Caetano Queiroz", email: "marcoscaequeiorz429@gmail.com" },
  { rmCodigo: "920", nome: "Rangiely Oliveira Costa", email: "rangielyoliveira@gmail.com" },
  { rmCodigo: "7858", nome: "Thays Lorranny Magalhaes Da Silva", email: "advthaysmagalhaes@hotmail.com" },
  { rmCodigo: "813", nome: "Felipe Gomes Rodrigues", email: "mariaceciliard21@hotmail.com" },
  { rmCodigo: "823", nome: "Inacio Pereira De Assuncao Filho", email: "inacioassuncaofilho@gmail.com" },
  { rmCodigo: "772", nome: "Geovando Vieira Pereira", email: "orizona@sistemafaeg.com.br" },
  { rmCodigo: "799", nome: "Ataides De Paula Macedo Neto", email: "ataides.depaula@gmail.com" },
  { rmCodigo: "715", nome: "Ismail Luiz Gomes", email: "ismailpanama@yahoo.com" },
  { rmCodigo: "143", nome: "Rogerio Martins Silva Caetano", email: "rogerio.martins@sistemafaeg.com.br" },
  { rmCodigo: "996", nome: "Hermis Jose Gomes", email: "hermis.gomes@sistemafaeg.com.br" },
  { rmCodigo: "153", nome: "Gustavo Elias Filho", email: "eliasgustavo4@hotmail.com" },
  { rmCodigo: "137", nome: "Alexandro Moreira Leite", email: "piranhas@faeg.com.br" },
  { rmCodigo: "166", nome: "Adeilton Pinheiro Barros", email: "adeiltonpinheirobarros47266@gmail.com" },
  { rmCodigo: "716", nome: "Fernando Andre Guiotti De Gregorio", email: "fagregorio@hotmail.com" },
  { rmCodigo: "1315", nome: "Sergio Barbosa Maia Andrade", email: "sergiobarbosamaianadrade@gmail.com" },
  { rmCodigo: "717", nome: "Ana Amelia Avelar Ferreira Paulino", email: "anapaulino@brturbo.com.br" },
  { rmCodigo: "142", nome: "Vitor Luiz Ferrari", email: "portelandia@sistemafaeg.com.br" },
  { rmCodigo: "162", nome: "Alzira De Fatima De Campos Azeredo", email: "posse@sistemafaeg.com.br" },
  { rmCodigo: "1557", nome: "Rodrigo Galan Gouveia", email: "rodriggouveia@hotmail.com" },
  { rmCodigo: "690", nome: "Everaldo Barboza Pereira", email: "livia.ataides@agrocerradao.com" },
  { rmCodigo: "163", nome: "Antonio Carlos Sobrinho", email: "antonioarriel2@hotmail.com" },
  { rmCodigo: "3686", nome: "Jair Nunes Carneiro", email: "jair.carneiro@sistemafaeg.com.br" },
  { rmCodigo: "1447", nome: "Esley Augusto Damaso", email: "patyediley@gmail.com" },
  { rmCodigo: "884", nome: "Tarley Falcucci Beraldo", email: "tarleyfalcucci@hotmail.com" },
  { rmCodigo: "718", nome: "Bruno Cardozo Braz", email: "bcbbrunobraz@gmail.com" },
  { rmCodigo: "719", nome: "Fernando Acacio Vieira", email: "bthyenando@gmail.com" },
  { rmCodigo: "6230", nome: "Roberto Ronney De Castro", email: "roberto_ronney@hotmail.com" },
  { rmCodigo: "1070", nome: "Marcio Arlei Dierings", email: "marciodierings@hotmail.com" },
  { rmCodigo: "800", nome: "Watson Arantes Gama", email: "watson.gama@sistemafaeg.com.br   -  asonagama@gmail.com" },
  { rmCodigo: "779", nome: "Rafael Morato Silva", email: "rafaelmoratosilvaa@gmail.com" },
  { rmCodigo: "139", nome: "Neuton Santos Guimaraes", email: "saomiguel@sistemafaeg.com.br" },
  { rmCodigo: "691", nome: "Claudio Perdoncini", email: "serranopolis@sistemafaeg.com.br" },
  { rmCodigo: "720", nome: "Joao Tome De Melo", email: "jlalvesmelo@hotmail.com" },
  { rmCodigo: "167", nome: "Jadir Jose Da Silva", email: "trombas@sistemafaeg.com.br" },
  { rmCodigo: "141", nome: "Tulio Santos Garcia", email: "uruacu@sistemafaeg.com.br" },
  { rmCodigo: "781", nome: "Gabriel Dos Santos Cabral", email: "gabriel.s.cabral@hotmail.com" },
  { rmCodigo: "140", nome: "Ney Martins Dos Santos", email: "ney.vianopolis@gmail.com" },
  { rmCodigo: "784", nome: "Leonardo Divino Bessa Do Carmo", email: "leonardodbc2000@hotmail.com" },
  { rmCodigo: "19925", nome: "Nilson Pereira Da Rocha", email: "alvoradadonorte@sistemafaeg.com.br" },
  { rmCodigo: "20357", nome: "Kleber Vaz Ferreira", email: "kleber.ferreira@sistemafaeg.com.br" },
  { rmCodigo: "16471", nome: "Sandro Batista De Andrade", email: "cntr_sandro@hotmail.com" },
  // Presidentes reais adicionais ("lista dos presidentes dos sindicatos.txt", mesma
  // fonte oficial FAEG, sem coluna de e-mail) — cruzados por localidade, ignorando
  // a diferença de sigla/tipo entre as planilhas (ex.: "SIND. DOS PROD. RURAIS DE" no
  // RM vs "SINDICATO RURAL DE" na planilha de presidentes referem-se ao mesmo sindicato).
  { rmCodigo: "841", nome: "Dalmo Savio Martins Pereira", email: null },
  { rmCodigo: "1025", nome: "Diones Rufino Leao", email: null },
  { rmCodigo: "164", nome: "Geni Gabriel Ribeiro", email: null },
  { rmCodigo: "775", nome: "Marcos Antonio Alves Capanema", email: null },
];

const MOBILIZADORES_REAIS: { nome: string; email: string }[] = [
  { nome: "Paulo Gorgen", email: "paulo.gorgen@sistemafaeg.com.br" },
  { nome: "Wilma Menezes", email: "wilma.menezes@sistemafaeg.com.br" },
  { nome: "Ana Rodrigues", email: "ana.rodrigues@sistemafaeg.com.br" },
  { nome: "Alex Castro", email: "alex.castro@sistemafaeg.com.br" },
  { nome: "Antonio Aguiar", email: "antonio.aguiar@sistemafaeg.com.br" },
  { nome: "Carla Arantes", email: "carla.arantes@sistemafaeg.com.br" },
  { nome: "Arthur Silva", email: "arthur.silva@sistemafaeg.com.br" },
  { nome: "Antonio Ribeiro", email: "antonio.ribeiro@sistemafaeg.com.br" },
  { nome: "Arthur Borges", email: "arthur.borges@sistemafaeg.com.br" },
  { nome: "Sandro Porto", email: "sandro.porto@sistemafaeg.com.br" },
  { nome: "Dinalva Paz", email: "dinalva.paz@sistemafaeg.com.br" },
  { nome: "Julia Lopes", email: "julia.lopes@sistemafaeg.com.br" },
  { nome: "Sirlene Silva", email: "sirlene.silva@sistemafaeg.com.br" },
  { nome: "Deusimar Faria", email: "deusimar.faria@sistemafaeg.com.br" },
  { nome: "Luiz Souza", email: "luiz.souza@sistemafaeg.com.br" },
  { nome: "Aparecido Santana", email: "aparecido.santana@sistemafaeg.com.br" },
  { nome: "Elson Martins", email: "elson.martins@sistemafaeg.com.br" },
  { nome: "Mara Silva", email: "mara.silva@sistemafaeg.com.br" },
  { nome: "Enigleyd Freitas", email: "enigleyd.freitas@sistemafaeg.com.br" },
  { nome: "Cristiane Aparecida", email: "cristiane.aparecida@sistemafaeg.com.br" },
  { nome: "Leonel Araujo", email: "leonel.araujo@sistemafaeg.com.br" },
  { nome: "Cristiane Costa", email: "cristiane.costa@sistemafaeg.com.br" },
  { nome: "Gutemberg Silva", email: "gutemberg.silva@sistemafaeg.com.br" },
  { nome: "Danila Rocha", email: "danila.rocha@sistemafaeg.com.br" },
  { nome: "Monikelly Rezende", email: "monikelly.rezende@sistemafaeg.com.br" },
  { nome: "Jorge Nascimento", email: "jorge.nascimento@sistemafaeg.com.br" },
  { nome: "Claudia Rezende", email: "claudia.rezende@sistemafaeg.com.br" },
  { nome: "Carlos Melo", email: "carlos.melo@sistemafaeg.com.br" },
  { nome: "Marcia Camargo", email: "marcia.camargo@sistemafaeg.com.br" },
  { nome: "Helton Pena", email: "helton.pena@sistemafaeg.com.br" },
  { nome: "Marcos Meireles", email: "marcos.meireles@sistemafaeg.com.br" },
  { nome: "Rogerio Silva", email: "rogerio.silva@sistemafaeg.com.br" },
  { nome: "Clarimundo Menezes", email: "clarimundo.menezes@sistemafaeg.com.br" },
  { nome: "Wellington Filho", email: "wellington.filho@sistemafaeg.com.br" },
  { nome: "Natalia Vieira", email: "natalia.vieira@sistemafaeg.com.br" },
  { nome: "Wesley Silva", email: "wesley.silva@sistemafaeg.com.br" },
  { nome: "Liliane Azevedo", email: "liliane.azevedo@sistemafaeg.com.br" },
  { nome: "Messias Veloso", email: "messias.veloso@sistemafaeg.com.br" },
  { nome: "Maria Botelho", email: "maria.botelho@sistemafaeg.com.br" },
  { nome: "Clara Guimaraes", email: "clara.guimaraes@sistemafaeg.com.br" },
  { nome: "Eliana Araujo", email: "eliana.araujo@sistemafaeg.com.br" },
  { nome: "Edivaldo Souza", email: "edivaldo.souza@sistemafaeg.com.br" },
  { nome: "Pedrohl", email: "pedrohl-1@faeg.com.br" },
  { nome: "Nelio Lima", email: "nelio.lima-1@senar-go.com.br" },
  { nome: "Rafael Rosa", email: "rafael.rosa-1@senar-go.com.br" },
  { nome: "Odilon Neto", email: "odilon.neto-1@senar-go.com.br" },
  { nome: "Dirceu", email: "dirceu-1@senar-go.com.br" },
  { nome: "Vanessa Vaz", email: "vanessa.vaz-1@senar-go.com.br" },
  { nome: "Geysa Ribeiro", email: "geysa.ribeiro-1@senar-go.com.br" },
  { nome: "Leonardo Bizinoto", email: "leonardo.bizinoto-1@senar-go.com.br" },
  { nome: "Renildo", email: "renildo-1@senar-go.com.br" },
  { nome: "Claudia Campos", email: "claudia.campos@sistemafaeg.com.br" },
  { nome: "Cleiton Nerys", email: "cleiton.nerys@sistemafaeg.com.br" },
  { nome: "Itamar Nascimento", email: "itamar.nascimento@sistemafaeg.com.br" },
  { nome: "Jose Milton", email: "jose.milton@sistemafaeg.com.br" },
  { nome: "Kassia Silva", email: "kassia.silva@sistemafaeg.com.br" },
  { nome: "Maria Barros", email: "maria.barros@sistemafaeg.com.br" },
  { nome: "Cristina Silva", email: "cristina.silva@sistemafaeg.com.br" },
  { nome: "Marco Santos", email: "marco.santos-1@faeg.com.br" },
  { nome: "Weberth Oliveira", email: "weberth.oliveira-1@faeg.com.br" },
  { nome: "Tallyta Beraldo", email: "tallyta.beraldo@sistemafaeg.com.br" },
  { nome: "Priscilla Guardiano", email: "priscilla.guardiano@sistemafaeg.com.br" },
  { nome: "Jocelia Oliveira", email: "jocelia.oliveira-1@senar-go.com.br" },
  { nome: "Maxwell Gomes", email: "maxwell.gomes@sistemafaeg.com.br" },
  { nome: "Daniel Fattah", email: "daniel.fattah@sistemafaeg.com.br" },
  { nome: "Driely Fernandes", email: "driely.fernandes@sistemafaeg.com.br" },
  { nome: "Rafael Ciriaco", email: "rafael.ciriaco@sistemafaeg.com.br" },
  { nome: "Marcos Leite", email: "marcos.leite@sistemafaeg.com.br" },
  { nome: "Francielly Dutra", email: "francielly.dutra@sistemafaeg.com.br" },
  { nome: "Claudia Castro", email: "claudia.castro-1@senar-go.com.br" },
  { nome: "Tiago Tirloni", email: "tiago.tirloni@sistemafaeg.com.br" },
  { nome: "Ivan Passos", email: "ivan.passos@sistemafaeg.com.br" },
  { nome: "Sabastiao Barbosa", email: "sabastiao.barbosa@sistemafaeg.com.br" },
  { nome: "Eleomar Duarte", email: "eleomar.duarte@sistemafaeg.com.br" },
  { nome: "Anonimo", email: "anonimo@sistemafaeg.com.br" },
  { nome: "Rinelle Gomes", email: "rinelle.gomes@sistemafaeg.com.br" },
  { nome: "Gerinaldo Costa", email: "gerinaldo.costa-1@faeg.com.br" },
  { nome: "Alexa Rezende", email: "alexa.rezende@sistemafaeg.com.br" },
  { nome: "Huiara Silva", email: "huiara.silva@sistemafaeg.com.br" },
  { nome: "Andreia Peixoto", email: "andreia.peixoto-1@senar-go.com.br" },
  { nome: "Juliana Silva", email: "juliana.silva@sistemafaeg.com.br" },
  { nome: "Kirla Colloca", email: "kirla.colloca@sistemafaeg.com.br" },
  { nome: "Jessica Almeida", email: "jessica.almeida@sistemafaeg.com.br" },
  { nome: "Cleidiane Rodrigues", email: "cleidiane.rodrigues@sistemafaeg.com.br" },
  { nome: "Alessandra Faria", email: "alessandra.faria@sistemafaeg.com.br" },
  { nome: "Djalma Barroso", email: "djalma.barroso@sistemafaeg.com.br" },
  { nome: "Laiane Apolinario", email: "laiane.apolinario@sistemafaeg.com.br" },
  { nome: "Watson Gama", email: "watson.gama@sistemafaeg.com.br" },
  { nome: "Vinicius", email: "vinicius-1@senar-go.com.br" },
  { nome: "Fernando", email: "fernando-1@senar-go.com.br" },
  { nome: "Kelly Baliano", email: "kelly.baliano-1@senar-go.com.br" },
  { nome: "Alessandro Pimenta", email: "alessandro.pimenta@sistemafaeg.com.br" },
  { nome: "Leonardo Rodrigues", email: "leonardo.rodrigues@sistemafaeg.com.br" },
  { nome: "Wagner Souza", email: "wagner.souza@sistemafaeg.com.br" },
  { nome: "Daniel Costa", email: "daniel.costa-1@senar-go.com.br" },
  { nome: "Jaqueline Santos", email: "jaqueline.santos@sistemafaeg.com.br" },
  { nome: "Leonardo Santos", email: "leonardo.santos@sistemafaeg.com.br" },
  { nome: "Alex Freitas", email: "alex.freitas@sistemafaeg.com.br" },
  { nome: "Irene Rosa", email: "irene.rosa@sistemafaeg.com.br" },
];

/**
 * Mobilizadores reais POR sindicato (arquivo "lista de mobilizadores.txt",
 * fonte oficial FAEG) — cobre só os sindicatos confirmados nesse arquivo;
 * os demais continuam com a distribuição proporcional de MOBILIZADORES_REAIS
 * (não há, ainda, o vínculo real deles por sindicato).
 */
const MOBILIZADORES_POR_SINDICATO_REAIS: {
  rmCodigo: string;
  mobilizadores: { nome: string; email: string }[];
}[] = [
  { rmCodigo: "1025", mobilizadores: [{ nome: "Diones Rufino Leão", email: "diones.rufino.leao@senar-go.com.br" }, { nome: "Lais Bernardes Souza", email: "lais.bernardes.souza@senar-go.com.br" }] },
  { rmCodigo: "164", mobilizadores: [{ nome: "Armando Leite Rollemberg Neto", email: "armando.leite.rollemberg.neto@senar-go.com.br" }, { nome: "Luiz Ricardo De Araujo", email: "luiz.ricardo.de.araujo@senar-go.com.br" }, { nome: "Matheus De Godo! Lima Dos Santos", email: "matheus.de.godo.lima.dos.santos@senar-go.com.br" }] },
  { rmCodigo: "889", mobilizadores: [{ nome: "Edvaldo Santos Da Silva", email: "edvaldo.santos.da.silva@senar-go.com.br" }, { nome: "Kailany Campelo De Miranda", email: "kailany.campelo.de.miranda@senar-go.com.br" }, { nome: "Nalbert Da Silva Melo", email: "nalbert.da.silva.melo@senar-go.com.br" }] },
  { rmCodigo: "775", mobilizadores: [{ nome: "Joelma Alves Da Silva", email: "joelma.alves.da.silva@senar-go.com.br" }, { nome: "Marcos Antônio Alves Capanema", email: "marcos.antanio.alves.capanema@senar-go.com.br" }, { nome: "Marta Julia Gouveia Capanema", email: "marta.julia.gouveia.capanema@senar-go.com.br" }] },
  { rmCodigo: "1451", mobilizadores: [{ nome: "Alex Martins De Freitas", email: "alex.martins.de.freitas@senar-go.com.br" }, { nome: "Orcídio Carlos De Oliveira", email: "orcadio.carlos.de.oliveira@senar-go.com.br" }] },
  { rmCodigo: "15639", mobilizadores: [{ nome: "Adaianny Aparecida Araujo", email: "adaianny.aparecida.araujo@senar-go.com.br" }, { nome: "Danilo Zarur Marques", email: "danilo.zarur.marques@senar-go.com.br" }, { nome: "Jaíne Lélia Dos Santos", email: "jaane.lalia.dos.santos@senar-go.com.br" }] },
  { rmCodigo: "150", mobilizadores: [{ nome: "Jerson Paulo Nagel", email: "jerson.paulo.nagel@senar-go.com.br" }] },
  { rmCodigo: "19925", mobilizadores: [{ nome: "Nilson Pereira Da Rocha", email: "nilson.pereira.da.rocha@senar-go.com.br" }, { nome: "Sandra Da Silva Sousa", email: "sandra.da.silva.sousa@senar-go.com.br" }] },
  { rmCodigo: "738", mobilizadores: [{ nome: "Lays Regina Teixeira Campos", email: "lays.regina.teixeira.campos@senar-go.com.br" }, { nome: "Pedro Henrique Fleury Curado", email: "pedro.henrique.fleury.curado@senar-go.com.br" }, { nome: "Rafael Victor Mendonça Ciriaco", email: "rafael.victor.mendonaa.ciriaco@senar-go.com.br" }, { nome: "Ubirajara Jose Carneiro Junior", email: "ubirajara.jose.carneiro.junior@senar-go.com.br" }] },
  { rmCodigo: "2923", mobilizadores: [{ nome: "Eldo De Assis Carvalho", email: "eldo.de.assis.carvalho@senar-go.com.br" }, { nome: "Luiz Antônio Nunes De Souza", email: "luiz.antanio.nunes.de.souza@senar-go.com.br" }] },
  { rmCodigo: "146", mobilizadores: [{ nome: "Arianna Lopes Santos", email: "arianna.lopes.santos@senar-go.com.br" }, { nome: "Margareth Alves Irineu", email: "margareth.alves.irineu@senar-go.com.br" }] },
  { rmCodigo: "793", mobilizadores: [{ nome: "Gutemberg Eugenio Da Silva", email: "gutemberg.eugenio.da.silva@senar-go.com.br" }, { nome: "Vanderlan Alves De Menez", email: "vanderlan.alves.de.menez@senar-go.com.br" }] },
];

/** Mobilizadores reais adicionais da própria FAEG (mesmo arquivo acima). */
const FAEG_MOBILIZADORES_ADICIONAIS: { nome: string; email: string }[] = [
  { nome: "Laylla Eduarda Mady Ramos", email: "laylla.eduarda.mady.ramos@senar-go.com.br" },
  { nome: "Leila Oliveira Carvalho", email: "leila.oliveira.carvalho@senar-go.com.br" },
  { nome: "Luciana Alves Da Silva", email: "luciana.alves.da.silva@senar-go.com.br" },
  { nome: "Manuella Trindade Porto", email: "manuella.trindade.porto@senar-go.com.br" },
  { nome: "Marco Aurélio Gesteira Santos", email: "marco.auralio.gesteira.santos@senar-go.com.br" },
  { nome: "Marcos Paulo Machado De Vasconcelo", email: "marcos.paulo.machado.de.vasconcelo@senar-go.com.br" },
  { nome: "Marks Alexandre Pereira Dos Santos", email: "marks.alexandre.pereira.dos.santos@senar-go.com.br" },
  { nome: "Mauricio Malheiros Da Rocha", email: "mauricio.malheiros.da.rocha@senar-go.com.br" },
  { nome: "Mickaelly Rodrigues Costa", email: "mickaelly.rodrigues.costa@senar-go.com.br" },
  { nome: "Pedro Candido Dos Santos Junior", email: "pedro.candido.dos.santos.junior@senar-go.com.br" },
  { nome: "Raquel Rosa Dos Santos Costa", email: "raquel.rosa.dos.santos.costa@senar-go.com.br" },
  { nome: "Sonia Maria Faustino", email: "sonia.maria.faustino@senar-go.com.br" },
  { nome: "Susane Alves Dos Santos", email: "susane.alves.dos.santos@senar-go.com.br" },
  { nome: "Thiago Soares De Araujo", email: "thiago.soares.de.araujo@senar-go.com.br" },
  { nome: "Victor Pereira Barbosa", email: "victor.pereira.barbosa@senar-go.com.br" },
  { nome: "Vitor Hugo Ribeiro Da Silva", email: "vitor.hugo.ribeiro.da.silva@senar-go.com.br" },
  { nome: "Wanderley Marques Ferreira", email: "wanderley.marques.ferreira@senar-go.com.br" },
  { nome: "Ygor Da Silva Protasio Evangelista", email: "ygor.da.silva.protasio.evangelista@senar-go.com.br" },
];

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

  // Coordenadores Regionais reais, 1 por Regional (planilha "Coordenadores
  // Regionais por região": município -> Regional -> Coordenador — sem
  // ambiguidade, ao contrário da planilha antiga "dos sindicatos"). Cria os
  // registros aqui e guarda por código de Regional; cada sindicato real é
  // ligado ao seu abaixo, via REGIAO_POR_SINDICATO_RM_CODIGO.
  const coordenadoresRegionaisPorCodigo = new Map<string, CoordenadorRegional>();
  for (const cr of COORDENADORES_REGIONAIS_REAIS) {
    const registro = await coordenadorRepo.save(
      coordenadorRepo.create({ rmCodigo: `CR-${cr.codigo}`, nome: cr.nome }),
    );
    coordenadoresRegionaisPorCodigo.set(cr.codigo, registro);
  }
  // Metropolitana (Goiânia, sede do SENAR-GO) é o padrão para Parceiros que não
  // são "o sindicato de um município" (FAEG de exemplo, SENAR/AR-GO e afins) e
  // para o login de exemplo de Coordenador Regional mais abaixo.
  const coordenadorRegional = coordenadoresRegionaisPorCodigo.get('METROPOLITANA')!;

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
      cnpj: '33.638.735/0001-02',
      endereco: 'Rua Professor Jurandir, quadra 26, lote 1D, Centro, Hidrolândia/GO. CEP 75.340-000',
      telefone: '(62) 99356-5501',
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

  // Um Parceiro tem 1 ou mais Mobilizadores — um segundo aqui só para deixar
  // isso visível em desenvolvimento (o login de exemplo usa o Marcos Santos).
  await mobilizadorRepo.save(
    mobilizadorRepo.create({
      rmCodigo: 'MOB-002',
      nome: 'Juliana Ferreira',
      email: 'juliana.ferreira@faeg.com.br',
      parceiroId: parceiro.id,
    }),
  );

  const senhaPadrao = await bcrypt.hash('senar@123', 10);

  // Login para cada Coordenador Regional real — exceto Metropolitana, que já
  // ganha o login de exemplo mais abaixo (reaproveitando o mesmo registro).
  for (const cr of COORDENADORES_REGIONAIS_REAIS) {
    if (cr.codigo === 'METROPOLITANA') continue;
    const registro = coordenadoresRegionaisPorCodigo.get(cr.codigo)!;
    await usuarioRepo.save(
      usuarioRepo.create({
        nome: registro.nome,
        email: `coordenador.regional.${slug(cr.regional)}@senar-go.com.br`,
        senhaHash: senhaPadrao,
        papel: Papel.COORDENADOR_REGIONAL,
        rmCodigoReferencia: registro.rmCodigo,
      }),
    );
  }

  // ---------------------------------------------------------------------
  // Sindicatos Parceiros, Presidentes e Mobilizadores reais (planilhas do
  // RM/FAEG, sem FAEG — já criado acima como o Parceiro de exemplo). Cada
  // Sindicato precisa de 1 Presidente vinculado (obrigatório no schema): os
  // que deram match com PRESIDENTES_REAIS recebem o nome real; os demais
  // recebem um Presidente placeholder só para satisfazer o vínculo. Cada
  // sindicato é ligado ao Coordenador Regional da sua Regional (ver
  // REGIAO_POR_SINDICATO_RM_CODIGO); os poucos sem município (SENAR/AR-GO e
  // afins) ficam sob o Coordenador Regional padrão (Metropolitana).
  // Presidente e Mobilizador têm a mesma autonomia de login (ver
  // PAPEIS_PARCEIRO) — por isso cada um recebe também um Usuario, para
  // aparecer no Modo debug da tela de login.
  // ---------------------------------------------------------------------
  const presidentesReaisPorRmCodigo = new Map(PRESIDENTES_REAIS.map((p) => [p.rmCodigo, p]));

  const novosParceiros = await Promise.all(
    SINDICATOS_REAIS.map(async (sindicato) => {
      const presidenteReal = presidentesReaisPorRmCodigo.get(sindicato.rmCodigo);
      const presidenteRegistro = await presidenteRepo.save(
        presidenteRepo.create({
          rmCodigo: `PRES-RM-${sindicato.rmCodigo}`,
          nome: presidenteReal?.nome ?? `Presidente — ${sindicato.nome}`,
          email: presidenteReal?.email ?? undefined,
        }),
      );
      await usuarioRepo.save(
        usuarioRepo.create({
          nome: presidenteRegistro.nome,
          email: presidenteReal?.email ?? `presidente.rm-${sindicato.rmCodigo}@senar-go.com.br`,
          senhaHash: senhaPadrao,
          papel: Papel.PRESIDENTE,
          rmCodigoReferencia: presidenteRegistro.rmCodigo,
        }),
      );
      return parceiroRepo.save(
        parceiroRepo.create({
          rmCodigo: `RM-${sindicato.rmCodigo}`,
          sigla: sindicato.nome,
          razaoSocial: sindicato.nome,
          coordenadorRegionalId:
            coordenadoresRegionaisPorCodigo.get(REGIAO_POR_SINDICATO_RM_CODIGO[sindicato.rmCodigo] ?? '')
              ?.id ?? coordenadorRegional.id,
          presidenteId: presidenteRegistro.id,
        }),
      );
    }),
  );

  async function criarMobilizadorComLogin(
    parceiroId: string,
    rmCodigo: string,
    dados: { nome: string; email: string },
  ) {
    const mobilizadorRegistro = await mobilizadorRepo.save(
      mobilizadorRepo.create({
        rmCodigo,
        nome: dados.nome,
        email: dados.email,
        parceiroId,
      }),
    );
    await usuarioRepo.save(
      usuarioRepo.create({
        nome: mobilizadorRegistro.nome,
        email: mobilizadorRegistro.email,
        senhaHash: senhaPadrao,
        papel: Papel.MOBILIZADOR,
        rmCodigoReferencia: mobilizadorRegistro.rmCodigo,
      }),
    );
  }

  // Sindicatos com vínculo real e confirmado de mobilizador (arquivo "lista de
  // mobilizadores.txt") — esses ficam de fora da distribuição proporcional
  // abaixo, que é só um preenchimento provisório para os sindicatos ainda
  // sem esse vínculo real.
  const parceirosPorRmCodigo = new Map(SINDICATOS_REAIS.map((s, i) => [s.rmCodigo, novosParceiros[i]]));
  await Promise.all(
    MOBILIZADORES_POR_SINDICATO_REAIS.flatMap((grupo) => {
      const parceiroDestino = parceirosPorRmCodigo.get(grupo.rmCodigo)!;
      return grupo.mobilizadores.map((m, i) =>
        criarMobilizadorComLogin(parceiroDestino.id, `MOB-RM-SIND-${grupo.rmCodigo}-${i + 1}`, m),
      );
    }),
  );
  await Promise.all(
    FAEG_MOBILIZADORES_ADICIONAIS.map((m, i) =>
      criarMobilizadorComLogin(parceiro.id, `MOB-RM-FAEG-${i + 1}`, m),
    ),
  );

  // Distribui os mobilizadores reais (sem vínculo por sindicato confirmado)
  // proporcionalmente pelos sindicatos que ainda não têm um vínculo real
  // (não há, na planilha de origem, indicação de qual mobilizador pertence
  // a qual sindicato — mais mobilizadores do que sindicatos exigiria que 1
  // mobilizador pertencesse a mais de 1 Parceiro, o que a regra de negócio
  // não permite, então cada mobilizador é atribuído a exatamente 1 sindicato).
  const rmCodigosComVinculoReal = new Set(MOBILIZADORES_POR_SINDICATO_REAIS.map((g) => g.rmCodigo));
  const parceirosSemVinculoReal = novosParceiros.filter(
    (_, i) => !rmCodigosComVinculoReal.has(SINDICATOS_REAIS[i].rmCodigo),
  );
  await Promise.all(
    MOBILIZADORES_REAIS.map((mobilizadorReal, indice) => {
      const parceiroDestino =
        parceirosSemVinculoReal[
          Math.floor((indice * parceirosSemVinculoReal.length) / MOBILIZADORES_REAIS.length)
        ];
      return criarMobilizadorComLogin(parceiroDestino.id, `MOB-RM-${indice + 1}`, mobilizadorReal);
    }),
  );

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

    // O Gestor só consegue agir sobre os itens da própria área se o próprio
    // usuário dele também tiver areaProgramaId preenchido (é isso que o RBAC
    // compara em exigirMesmaArea) — sem isso, `gestorId` na Área aponta pra
    // ele, mas ele mesmo não "pertence" a nenhuma área do ponto de vista do JWT.
    gestorUsuario.areaProgramaId = area.id;
    await usuarioRepo.save(gestorUsuario);

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
  // Diretores Educacionais reais — o Superintendente pode designar mais de um
  // Diretor responsável por uma mesma solicitação (HU04), cada um
  // encaminhando os itens do time dele; por isso são vários usuários aqui.
  // `departamento` é só informativo (exibido em Gerenciar Usuários) — a
  // maioria ainda não foi desenhada/atribuída a um departamento específico.
  const diretoresEducacionaisDefinicao = [
    { nome: 'Leonnardo Furquin', departamento: 'Ação/Atividade' },
    { nome: 'Marcelo José da Silva Pires', departamento: 'Ainda não desenhado para o departamento' },
    { nome: 'Flavio Henrique Silva', departamento: 'Ainda não desenhado para o departamento' },
    { nome: 'Viviane Maria de Oliveira Arruda', departamento: 'Ainda não desenhado para o departamento' },
    { nome: 'Pedro Henrique Lemes Camilo', departamento: 'Ainda não desenhado para o departamento' },
    { nome: 'Michelly Mancinelli Gonçalves', departamento: 'Ainda não desenhado para o departamento' },
  ];

  const diretoresEducacionais: Usuario[] = [];
  for (const def of diretoresEducacionaisDefinicao) {
    const diretor = await usuarioRepo.save(
      usuarioRepo.create({
        nome: def.nome,
        email: `${slug(def.nome)}@senar-go.com.br`,
        senhaHash: senhaPadrao,
        papel: Papel.DIRETOR_EDUCACIONAL,
        departamento: def.departamento,
      }),
    );
    usuariosPorNome.set(def.nome, diretor);
    diretoresEducacionais.push(diretor);
  }
  const diretorEducacional = diretoresEducacionais[0];
  const diretorEducacional2 = diretoresEducacionais[1];
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
  // Presidente do Sindicato — mesma autonomia do Mobilizador (pedido do cliente),
  // login vinculado ao Presidente já sincronizado do RM.
  await usuarioRepo.save(
    usuarioRepo.create({
      nome: presidente.nome,
      email: 'eduardo.araujo@senar-go.com.br',
      senhaHash: senhaPadrao,
      papel: Papel.PRESIDENTE,
      rmCodigoReferencia: presidente.rmCodigo,
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

  /** Mesmo formato AAAAMMDD + sequência do dia usado por SolicitacoesService.gerarNumeroProcesso. */
  const contadoresNumeroProcessoPorDia = new Map<string, number>();
  function numeroProcessoDe(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const chave = `${ano}${mes}${dia}`;
    const sequencia = (contadoresNumeroProcessoPorDia.get(chave) ?? 0) + 1;
    contadoresNumeroProcessoPorDia.set(chave, sequencia);
    return `${chave}${String(sequencia).padStart(3, '0')}`;
  }

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
        usuarioPapel: dados.usuario?.papel ?? null,
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
        numeroProcesso: numeroProcessoDe(dataSolicitacao),
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
        numeroProcesso: numeroProcessoDe(dataSolicitacao),
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

  // 2.5) Em Despacho — aprovado pela Assessoria, aguardando o Superintendente
  // escolher os Diretores responsáveis (HU04). Tem 2 itens de naturezas
  // diferentes de propósito, para demonstrar a bifurcação por item entre
  // Diretores/Áreas distintas assim que o despacho for feito pela UI.
  {
    const anexo = await criarAnexoOficio('oficio-0025-2026.pdf');
    const dataSolicitacao = new Date(agora - 3 * 24 * HORA);
    const dataCiencia = new Date(agora - 3 * 24 * HORA + 2 * HORA);
    const dataAprovacao = new Date(agora - 2 * 24 * HORA);

    const solicitacao = await solicitacaoRepo.save(
      solicitacaoRepo.create({
        numeroDocumento: '0025/2026',
        numeroProcesso: numeroProcessoDe(dataSolicitacao),
        idDocumento: '2359325',
        parceiroId: parceiro.id,
        mobilizadorId: mobilizador.id,
        municipio: 'Jataí',
        assunto: 'Curso de Formação Profissional e visita técnica ATeG',
        observacao: 'Duas frentes de trabalho: uma turma de formação e uma visita técnica.',
        dataDocumento: dataSolicitacao.toISOString().slice(0, 10),
        anexoOficioId: anexo.id,
        statusMacro: StatusMacro.EM_DESPACHO,
        etapaAtual: 'Superintendência — Despacho',
        dataSolicitacao,
        prazoCienciaRegional: new Date(dataSolicitacao.getTime() + 24 * HORA),
        dataCienciaRegional: dataCiencia,
        cienciaAutomatica: false,
        criadoPor: mobilizador.nome,
        alteradoPor: assessor.nome,
        itens: [
          itemRepo.create({
            tipo: TipoItem.ACAO_ATIVIDADE,
            tipoEvento: 'Campo em Ordem - FPR',
            acaoAtividade: 'FPRPE - Programas Especiais',
            disciplina: 'Formação Profissional Rural',
            turno: Turno.MANHA,
            statusItem: StatusItem.PENDENTE,
          }),
          itemRepo.create({
            tipo: TipoItem.ACAO_ATIVIDADE,
            tipoEvento: 'ATeG',
            acaoAtividade: 'Visita técnica a propriedades rurais',
            disciplina: 'Assistência Técnica e Gerencial',
            turno: Turno.TARDE,
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
    await registrarTramitacao(solicitacao, {
      deEtapa: 'Análise da Assessoria',
      paraEtapa: 'Superintendência — Despacho',
      acao: AcaoTramitacao.APROVAR,
      usuario: assessor,
      criadoEm: dataAprovacao,
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
        numeroProcesso: numeroProcessoDe(dataSolicitacao),
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
        numeroProcesso: numeroProcessoDe(dataSolicitacao),
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
