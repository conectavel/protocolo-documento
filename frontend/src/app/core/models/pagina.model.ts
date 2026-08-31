/**
 * Envelope de listagem padrão do backend (api-contract.md):
 * { data: T[], total, page, pageSize }
 */
export interface Pagina<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
