export const environment = {
  production: false,
  // Relativo (não http://localhost:3000/api): o ng serve com proxy.conf.json
  // encaminha /api para o backend. Assim o mesmo túnel exposto para fora
  // (ex.: ngrok em cima da porta 4200) funciona tanto local quanto remoto —
  // um endereço absoluto para "localhost" quebraria no navegador de quem
  // acessa pelo link público.
  apiUrl: '/api',
};
