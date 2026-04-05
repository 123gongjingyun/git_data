import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Lead } from "./lead.entity";
import { Opportunity } from "./opportunity.entity";

@Entity({ name: "customers" })
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  industry?: string;

  @Column({ nullable: true })
  level?: string;

  @Column({ nullable: true })
  contactName?: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ nullable: true })
  crmId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Lead, (lead) => lead.customer)
  leads!: Lead[];

  @OneToMany(() => Opportunity, (opportunity) => opportunity.customer)
  opportunities!: Opportunity[];
}

