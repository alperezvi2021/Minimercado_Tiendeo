import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  rutNit: string;

  @Column({ default: 'FREE' })
  activePlan: string;

  @Column({ default: '58mm' })
  ticketPaperSize: string; // '58mm' o '80mm'

  @Column({ default: false })
  ticketAutoPrint: boolean;

  @Column({ nullable: true })
  ticketHeaderMessage: string;

  @Column({ nullable: true })
  ticketFooterMessage: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  location: string;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
