import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";
import { ApprovalInstance } from "./approval-instance.entity";
import { ApprovalInstanceNode } from "./approval-instance-node.entity";

export type ApprovalActionType =
  | "submit"
  | "approve"
  | "reject"
  | "cancel"
  | "upload"
  | "assign";

@Entity({ name: "approval_actions" })
export class ApprovalAction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => ApprovalInstance,
    (approvalInstance) => approvalInstance.actions,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  approvalInstance!: ApprovalInstance;

  @ManyToOne(
    () => ApprovalInstanceNode,
    (approvalInstanceNode) => approvalInstanceNode.actions,
    {
      nullable: true,
      onDelete: "SET NULL",
    },
  )
  approvalInstanceNode?: ApprovalInstanceNode | null;

  @Column({ type: "varchar", length: 24 })
  actionType!: ApprovalActionType;

  @ManyToOne(() => User, { nullable: true })
  operator?: User | null;

  @Column({ type: "text", nullable: true })
  comment?: string | null;

  @Column({ type: "simple-json", nullable: true })
  payload?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
