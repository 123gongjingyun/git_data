import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ApprovalInstance } from "./approval-instance.entity";
import { ApprovalAction } from "./approval-action.entity";

export type ApprovalInstanceNodeStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "rejected"
  | "skipped";

@Entity({ name: "approval_instance_nodes" })
export class ApprovalInstanceNode {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => ApprovalInstance,
    (approvalInstance) => approvalInstance.nodes,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  approvalInstance!: ApprovalInstance;

  @Column({ type: "int", nullable: true })
  workflowNodeId?: number | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  nodeKeySnapshot?: string | null;

  @Column({ type: "varchar", length: 120 })
  nodeNameSnapshot!: string;

  @Column({ type: "int" })
  nodeOrder!: number;

  @Column({ type: "varchar", length: 24, nullable: true })
  nodeTypeSnapshot?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  fieldKeySnapshot?: string | null;

  @Column({ type: "text", nullable: true })
  descriptionSnapshot?: string | null;

  @Column({ type: "boolean", default: true })
  canReject!: boolean;

  @Column({ type: "boolean", default: false })
  rejectCommentRequired!: boolean;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: ApprovalInstanceNodeStatus;

  @Column({ type: "datetime", nullable: true })
  startedAt?: Date | null;

  @Column({ type: "datetime", nullable: true })
  finishedAt?: Date | null;

  @OneToMany(() => ApprovalAction, (action) => action.approvalInstanceNode)
  actions!: ApprovalAction[];
}
