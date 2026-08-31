import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    // Define o locale da aplicação como pt-BR — o MAT_DATE_LOCALE do datepicker herda este
    // valor por padrão, o que já basta para o NativeDateAdapter exibir o calendário e
    // formatar/interpretar o texto digitado no padrão brasileiro (dd/mm/aaaa).
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    // Rótulo sempre acima do campo (nunca sobreposto ao texto) — alinhado à
    // identidade visual SENAR-GO (referência: sistemafaeg.org.br).
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      // subscriptSizing: 'dynamic' — não reserva a faixa de espaço para
      // hint/erro quando ela está vazia; sem isso, a altura real do
      // mat-form-field fica maior que a caixa visível do input, o que
      // desalinha qualquer botão colocado ao lado (ex.: busca + "Buscar").
      useValue: { appearance: 'outline', floatLabel: 'always', subscriptSizing: 'dynamic' },
    },
  ],
};
