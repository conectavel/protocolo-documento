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
 * Insere/atualiza (por e-mail, idempotente) os 2 Assessores reais que
 * atendem as demandas — visão ampla (toda a organização) já é garantida pelo
 * RBAC do papel ASSESSOR (aplicarEscopoPorPapel em solicitacoes.service.ts),
 * então ambos já enxergam todas as solicitações, inclusive as tramitadas
 * pelo colega. Não toca em nenhuma outra tabela.
 *
 * Execução: `npx ts-node -r tsconfig-paths/register src/database/seeds/seed-assessores.ts`
 */
const ASSESSORES = [
  { nome: 'Rosane Magna', email: 'rosane@senar-go.com.br' },
  { nome: 'Fabíola Araújo Croce Agostino', email: 'fabiola.croce@senar-go.com.br' },
];

const EMAIL_PLACEHOLDER_ANTIGO = 'assessor@senar-go.com.br';

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

  for (const def of ASSESSORES) {
    const email = def.email;
    const existente = await usuarioRepo.findOne({ where: { email } });
    if (existente) {
      existente.nome = def.nome;
      existente.papel = Papel.ASSESSOR;
      existente.ativo = true;
      await usuarioRepo.save(existente);
      console.log(`Atualizado: ${def.nome} <${email}>`);
    } else {
      await usuarioRepo.save(
        usuarioRepo.create({ nome: def.nome, email, senhaHash, papel: Papel.ASSESSOR }),
      );
      console.log(`Criado: ${def.nome} <${email}>`);
    }
  }

  const placeholder = await usuarioRepo.findOne({ where: { email: EMAIL_PLACEHOLDER_ANTIGO } });
  if (placeholder) {
    placeholder.ativo = false;
    await usuarioRepo.save(placeholder);
    console.log(`Desativado (placeholder antigo): ${placeholder.nome} <${EMAIL_PLACEHOLDER_ANTIGO}>`);
  }

  await dataSource.destroy();
  console.log('Concluído — nenhuma outra tabela foi alterada.');
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
