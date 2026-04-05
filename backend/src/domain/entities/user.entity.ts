import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Opportunity } from "./opportunity.entity";
import { SolutionVersion } from "./solution-version.entity";
import { ReviewRecord } from "./review-record.entity";
import { FeishuCallbackLog } from "./feishu-callback-log.entity";
import { FeishuUserBinding } from "./feishu-user-binding.entity";
import { type UserRole } from "../../users/user-access";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column({ nullable: true })
  displayName?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true, select: false })
  passwordHash?: string | null;

  @Column({ type: "varchar", length: 50 })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  @Column("simple-array", { nullable: true })
  mainIndustry: string[] = [];

  @Column({ nullable: true })
  teamRole?: string | null;

  @Column("simple-array", { nullable: true })
  allowedMenuKeys: string[] = [];

  @Column("simple-array", { nullable: true })
  deniedMenuKeys: string[] = [];

  @Column("simple-array", { nullable: true })
  allowedActionKeys: string[] = [];

  @Column("simple-array", { nullable: true })
  deniedActionKeys: string[] = [];

  @Column({ nullable: true })
  lastLoginAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Opportunity, (opportunity) => opportunity.owner)
  ownedOpportunities!: Opportunity[];

  @OneToMany(() => SolutionVersion, (solution) => solution.createdBy)
  createdSolutions!: SolutionVersion[];

  @OneToMany(() => ReviewRecord, (review) => review.reviewer)
  reviewRecords!: ReviewRecord[];

  @OneToMany(() => FeishuUserBinding, (binding) => binding.platformUser)
  feishuBindings!: FeishuUserBinding[];

  @OneToMany(() => FeishuCallbackLog, (callbackLog) => callbackLog.operatorPlatformUser)
  feishuCallbackLogs!: FeishuCallbackLog[];
}
