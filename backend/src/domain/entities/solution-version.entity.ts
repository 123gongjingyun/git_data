import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Opportunity } from "./opportunity.entity";
import { User } from "./user.entity";
import { ReviewRecord } from "./review-record.entity";

export type SolutionStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "archived";

@Entity({ name: "solution_versions" })
export class SolutionVersion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  versionTag?: string;

  @Column({ type: "varchar", length: 50 })
  status!: SolutionStatus;

  @Column({ type: "text", nullable: true })
  summary?: string;

  @Column({ type: "varchar", length: 24, nullable: true })
  approvalStatus?: "draft" | "pending" | "in_review" | "approved" | "rejected" | null;

  @Column({ type: "int", nullable: true })
  currentApprovalInstanceId?: number | null;

  @ManyToOne(() => Opportunity, (opportunity) => opportunity.solutionVersions, {
    nullable: false,
  })
  opportunity!: Opportunity;

  @ManyToOne(() => User, (user) => user.createdSolutions, {
    nullable: true,
  })
  createdBy?: User | null;

  @OneToMany(() => ReviewRecord, (review) => review.solutionVersion)
  reviewRecords!: ReviewRecord[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
