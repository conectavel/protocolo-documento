import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Usuario } from '../../modules/usuarios/entities/usuario.entity';
import { AreaPrograma } from '../../modules/parceiros/entities/area-programa.entity';

/**
 * Desativa os 2 Diretores Educacionais "placeholder" que existiam antes dos
 * 6 nomes reais pedidos pelo cliente (ver seed-diretores-educacionais.ts).
 * Usa `ativo=false` em vez de excluir a linha: solicitações antigas que já
 * referenciam esses ids em `diretoresDesignadosIds` continuam resolvendo o
 * nome corretamente, só não aparecem mais no modo debug nem conseguem logar.
 */
const EMAILS_PARA_DESATIVAR = [
  'diretor.educacional@senar-go.com.br',
  'patricia.nogueira@senar-go.com.br',
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

  for (const email of EMAILS_PARA_DESATIVAR) {
    const usuario = await usuarioRepo.findOne({ where: { email } });
    if (usuario) {
      usuario.ativo = false;
      await usuarioRepo.save(usuario);
      console.log(`Desativado: ${usuario.nome} <${email}>`);
    } else {
      console.log(`Não encontrado (ok, já não existe): ${email}`);
    }
  }

  await dataSource.destroy();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
