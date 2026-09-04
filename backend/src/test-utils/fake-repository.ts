import { v4 as uuid } from 'uuid';

/**
 * Repositório em memória compatível com o subconjunto de `Repository<T>` do TypeORM usado
 * pela camada de domínio (`create`, `save`, `update`, `find`, `findOne`, `count`). Permite
 * testar a máquina de estados sem depender de um banco de dados real.
 */
export class FakeRepository<T extends { id?: string }> {
  private readonly registros = new Map<string, T>();

  create(partial: Partial<T>): T {
    return { ...(partial as T) };
  }

  merge(destino: T, origem: Partial<T>): T {
    return Object.assign(destino, origem);
  }

  async save(entidade: T | T[]): Promise<any> {
    if (Array.isArray(entidade)) {
      return Promise.all(entidade.map((item) => this.save(item)));
    }
    if (!entidade.id) {
      entidade.id = uuid();
    }
    this.registros.set(entidade.id, entidade);
    return entidade;
  }

  async update(id: string, partial: Partial<T>): Promise<any> {
    const registro = this.registros.get(id);
    if (registro) {
      Object.assign(registro, partial);
    }
    return { affected: registro ? 1 : 0 };
  }

  async findOne(options: { where: Partial<T> }): Promise<T | null> {
    for (const registro of this.registros.values()) {
      if (this.combina(registro, options.where)) return registro;
    }
    return null;
  }

  async find(options?: { where?: Partial<T> }): Promise<T[]> {
    const todos = [...this.registros.values()];
    if (!options?.where) return todos;
    return todos.filter((registro) => this.combina(registro, options.where!));
  }

  async count(): Promise<number> {
    return this.registros.size;
  }

  private combina(registro: T, where: Partial<T>): boolean {
    return Object.entries(where).every(([chave, valor]) => (registro as any)[chave] === valor);
  }
}
