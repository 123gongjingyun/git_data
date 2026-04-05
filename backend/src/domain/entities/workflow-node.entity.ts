import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { WorkflowDefinition } from "./workflow-definition.entity";
import { WorkflowNodeApprover } from "./workflow-node-approver.entity";

export type WorkflowRejectStrategy = "terminate";
export type WorkflowNodeType = "approval" | "upload" | "assignment";

@Entity({ name: "workflow_nodes" })
export class WorkflowNode {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => WorkflowDefinition,
    (workflowDefinition) => workflowDefinition.nodes,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  workflowDefinition!: WorkflowDefinition;

  @Column({ type: "varchar", length: 80 })
  nodeKey!: string;

  @Column({ type: "varchar", length: 120 })
  nodeName!: string;

  @Column({ type: "int" })
  nodeOrder!: number;

  @Column({ type: "varchar", length: 24, default: "approval" })
  nodeType!: WorkflowNodeType;

  @Column({ type: "varchar", length: 64, nullable: true })
  fieldKey?: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  fieldLabel?: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  actionButtonLabel?: string | null;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "boolean", default: true })
  canReject!: boolean;

  @Column({ type: "varchar", length: 24, default: "terminate" })
  rejectStrategy!: WorkflowRejectStrategy;

  @Column({ type: "boolean", default: false })
  rejectCommentRequired!: boolean;

  @OneToMany(() => WorkflowNodeApprover, (approver) => approver.workflowNode, {
    cascade: true,
  })
  approvers!: WorkflowNodeApprover[];
}
