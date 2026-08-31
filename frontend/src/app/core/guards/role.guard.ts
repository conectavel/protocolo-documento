import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Papel } from '../models';
import { AuthService } from '../services/auth.service';

/**
 * Fábrica de guard por papel. Uso na rota:
 * { path: 'protocolar', canActivate: [roleGuard(['MOBILIZADOR'])], ... }
 *
 * Regra de negócio (HU01): esta guard só protege a NAVEGAÇÃO de tela.
 * A ocultação de dados sensíveis (etapaAtual, tramitações, pareceres)
 * é responsabilidade exclusiva do backend — ver api-contract.md.
 */
export function roleGuard(papeisPermitidos: Papel[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const papelAtual = auth.papel();
    if (papelAtual && papeisPermitidos.includes(papelAtual)) {
      return true;
    }

    return router.createUrlTree(['/painel']);
  };
}
