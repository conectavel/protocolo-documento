import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.obterToken();

  const requisicao = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(requisicao).pipe(
    catchError((erro: HttpErrorResponse) => {
      // 401 em qualquer chamada autenticada = sessão expirada/token inválido.
      // Sem isso, cada tela mostrava um erro genérico ("não foi possível salvar",
      // "não foi possível enviar o ofício"...) sem explicar a causa real.
      if (erro.status === 401 && token) {
        auth.logout();
        router.navigate(['/login'], { queryParams: { sessaoExpirada: '1' } });
      }
      return throwError(() => erro);
    }),
  );
};
