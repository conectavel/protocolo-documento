import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

/** Área/Programa interno (FPR, PS, EDU_FORM, ATeG) — cadastro do próprio sistema, não vem do RM. */
@Entity('areas_programa')
export class AreaPrograma {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  codigo: string; // FPR | PS | EDU_FORM | ATEG

  @Column()
  nome: string;

  @Column({ name: 'gestor_id', nullable: true })
  gestorId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'gestor_id' })
  gestor: Usuario;

  @OneToMany(() => Usuario, (usuario) => usuario.areaPrograma)
  coordenadores: Usuario[];
}
