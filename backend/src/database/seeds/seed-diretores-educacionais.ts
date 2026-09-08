import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../../modules/usuarios/entities/usuario.entity';
import { AreaPrograma } from '../../modules/parceiros/entities/area-programa.entity';
import { Papel } from '../../common/enums/papel.enum';

const DIACRITICOS = /[̀-ͯ]/g;
function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(/[^a-z0-9]+/g, '.');
}

/**
 * Insere/atualiza (por e-mail, idempotente) os Diretores Educacionais reais
 * pedidos pelo cliente — NÃO toca em nenhuma outra tabela nem apaga nada,
 * ao contrário de `seed.ts` (que faz TRUNCATE em tudo). Uso: quando só é
 * preciso corrigir a lista de Diretores num banco que já tem dados reais/de
 * teste que não podem ser perdidos.
 *
 * Execução: `npx ts-node -r tsconfig-paths/register src/database/seeds/seed-diretores-educacionais.ts`
 */
const DIRETORES = [
  { nome: 'Leonnardo Furquin', departamento: 'Ação/Atividade' },
  { nome: 'Marcelo José da Silva Pires', departamento: 'Ainda não desenhado para o departamento' },
  { nome: 'Flavio Henrique Silva', departamento: 'Ainda não desenhado para o departamento' },
  { nome: 'Viviane Maria de Oliveira Arruda', departamento: 'Ainda não desenhado para o departamento' },
  { nome: 'Pedro Henrique Lemes Camilo', departamento: 'Ainda não desenhado para o departamento' },
  { nome: 'Michelly Mancinelli Gonçalves', departamento: 'Ainda não desenhado para o departamento' },
];

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '5432'),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'protocolo_oficio',
    entities: [Usuario, AreaPrograma],
    synchronize: false,
  });

  await dataSource.initialize();
  const usuarioRepo = dataSource.getRepository(Usuario);
  const senhaHash = await bcrypt.hash('senar@123', 10);

  for (const def of DIRETORES) {
    const email = `${slug(def.nome)}@senar-go.com.br`;
    const existente = await usuarioRepo.findOne({ where: { email } });
    if (existente) {
      existente.nome = def.nome;
      existente.papel = Papel.DIRETOR_EDUCACIONAL;
      existente.departamento = def.departamento;
      existente.ativo = true;
      await usuarioRepo.save(existente);
      console.log(`Atualizado: ${def.nome} <${email}>`);
    } else {
      await usuarioRepo.save(
        usuarioRepo.create({
          nome: def.nome,
          email,
          senhaHash,
          papel: Papel.DIRETOR_EDUCACIONAL,
          departamento: def.departamento,
        }),
      );
      console.log(`Criado: ${def.nome} <${email}>`);
    }
  }

  await dataSource.destroy();
  console.log('Concluído — nenhuma outra tabela foi alterada.');
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
