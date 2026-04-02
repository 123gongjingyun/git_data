import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Customer } from "./customer.entity";
import { Opportunity } from "./opportunity.entity";

export type LeadStatus = "new" | "qualified" | "disqualified" | "converted";

export type LeadSource = "crm" | "manual" | "import" | "other";

@Entity({ name: "leads" })
export class Lead {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "varchar", length: 50 })
  status!: LeadStatus;

  @Column({ type: "varchar", length: 50, nullable: true })
  source?: LeadSource;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  estimatedValue?: string;

  @ManyToOne(() => Customer, (customer) => customer.leads, {
    nullable: true,
  })
  customer?: Customer | null;

  @OneToMany(() => Opportunity, (opportunity) => opportunity.lead)
  opportunities!: Opportunity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

