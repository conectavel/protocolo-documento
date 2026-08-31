import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Papel } from '../enums/papel.enum';
import { UsuarioAutenticado } from './jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const papeisPermitidos = this.reflector.getAllAndOverride<Papel[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!papeisPermitidos || papeisPermitidos.length === 0) {
      return true; // endpoint sem restrição de papel (apenas autenticado)
    }

    const request = context.switchToHttp().getRequest();
    const usuario: UsuarioAutenticado | undefined = request.user;

    if (!usuario || !papeisPermitidos.includes(usuario.papel)) {
      throw new ForbiddenException(
        `Papel "${usuario?.papel ?? 'desconhecido'}" não tem permissão para esta ação.`,
      );
    }

    return true;
  }
}
