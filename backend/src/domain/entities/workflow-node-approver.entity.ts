import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { WorkflowNode } from "./workflow-node.entity";

export type WorkflowApproverType = "user" | "role" | "field";
export type WorkflowVoteRule = "any" | "all";

@Entity({ name: "workflow_node_approvers" })
export class WorkflowNodeApprover {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => WorkflowNode, (workflowNode) => workflowNode.approvers, {
    nullable: false,
    onDelete: "CASCADE",
  })
  workflowNode!: WorkflowNode;

  @Column({ type: "varchar", length: 24 })
  approverType!: WorkflowApproverType;

  @Column({ type: "varchar", length: 120 })
  approverRef!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  displayName?: string | null;

  @Column({ type: "varchar", length: 24, default: "any" })
  voteRule!: WorkflowVoteRule;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;
}
