import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { SolutionVersion } from "./solution-version.entity";
import { User } from "./user.entity";

// 与前端 useReviewRecords 中的 ReviewDecision 保持语义一致
export type ReviewStatus =
  | "approved"
  | "rejected"
  | "needs_change"
  | "info_only";

@Entity({ name: "review_records" })
export class ReviewRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => SolutionVersion,
    (solutionVersion) => solutionVersion.reviewRecords,
    { nullable: false },
  )
  solutionVersion!: SolutionVersion;

  @ManyToOne(() => User, (user) => user.reviewRecords, { nullable: true })
  reviewer?: User | null;

  @Column({ type: "varchar", length: 50 })
  status!: ReviewStatus;

  @Column({ type: "text", nullable: true })
  comments?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
