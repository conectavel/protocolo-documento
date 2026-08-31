import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const buildDatabaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: Number(config.get('DB_PORT', '5432')),
  username: config.get<string>('DB_USER', 'postgres'),
  password: config.get<string>('DB_PASSWORD', 'postgres'),
  database: config.get<string>('DB_NAME', 'protocolo_oficio'),
  autoLoadEntities: true,
  synchronize: config.get<string>('NODE_ENV') !== 'production', // dev/homologação apenas; produção usa migrations
});
