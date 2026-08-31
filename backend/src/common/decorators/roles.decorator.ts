import { SetMetadata } from '@nestjs/common';
import { Papel } from '../enums/papel.enum';

export const ROLES_KEY = 'roles';

/** Restringe o endpoint aos papéis informados. Combinar sempre com JwtAuthGuard + RolesGuard. */
export const Roles = (...papeis: Papel[]) => SetMetadata(ROLES_KEY, papeis);
