import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";
import { WorkflowDefinition } from "./workflow-definition.entity";
import { ApprovalInstanceNode } from "./approval-instance-node.entity";
import { ApprovalAction } from "./approval-action.entity";

export type ApprovalBusinessType = "opportunity" | "solution";
export type ApprovalInstanceStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "rejected"
  | "cancelled";

@Entity({ name: "approval_instances" })
export class ApprovalInstance {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 32 })
  businessType!: ApprovalBusinessType;

  @Column({ type: "int" })
  businessId!: number;

  @ManyToOne(() => WorkflowDefinition, { nullable: false })
  workflowDefinition!: WorkflowDefinition;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: ApprovalInstanceStatus;

  @Column({ type: "int", nullable: true })
  currentNodeId?: number | null;

  @ManyToOne(() => User, { nullable: true })
  startedBy?: User | null;

  @Column({ type: "datetime", nullable: true })
  startedAt?: Date | null;

  @Column({ type: "datetime", nullable: true })
  finishedAt?: Date | null;

  @OneToMany(() => ApprovalInstanceNode, (node) => node.approvalInstance)
  nodes!: ApprovalInstanceNode[];

  @OneToMany(() => ApprovalAction, (action) => action.approvalInstance)
  actions!: ApprovalAction[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
