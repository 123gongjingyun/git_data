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
import { Lead } from "./lead.entity";
import { User } from "./user.entity";
import { SolutionVersion } from "./solution-version.entity";

export type OpportunityStage =
  | "discovery"
  | "solution_design"
  | "proposal"
  | "bidding"
  | "negotiation"
  | "won"
  | "lost";

export type ApprovalSummaryStatus =
  | "draft"
  | "pending"
  | "in_review"
  | "approved"
  | "rejected";

@Entity({ name: "opportunities" })
export class Opportunity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "varchar", length: 50 })
  stage!: OpportunityStage;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  expectedValue?: string;

  @Column({ type: "date", nullable: true })
  expectedCloseDate?: string;

  @Column({ type: "int", nullable: true })
  probability?: number;

  @Column({ type: "varchar", length: 24, nullable: true })
  approvalStatus?: ApprovalSummaryStatus | null;

  @Column({ type: "varchar", length: 24, nullable: true })
  bizApprovalStatus?: "pending" | "approved" | "rejected" | null;

  @Column({ type: "varchar", length: 24, nullable: true })
  techApprovalStatus?: "pending" | "approved" | "rejected" | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  requirementBriefDocName?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  researchDocName?: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  solutionOwnerUsername?: string | null;

  @Column({ type: "text", nullable: true })
  approvalOpinion?: string | null;

  @Column({ type: "int", nullable: true })
  currentApprovalInstanceId?: number | null;

  @ManyToOne(() => Customer, (customer) => customer.opportunities, {
    nullable: true,
  })
  customer?: Customer | null;

  @ManyToOne(() => Lead, (lead) => lead.opportunities, {
    nullable: true,
  })
  lead?: Lead | null;

  @ManyToOne(() => User, (user) => user.ownedOpportunities, {
    nullable: true,
  })
  owner?: User | null;

  @OneToMany(() => SolutionVersion, (solution) => solution.opportunity)
  solutionVersions!: SolutionVersion[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
