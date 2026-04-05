import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { WorkflowNode } from "./workflow-node.entity";

export type WorkflowTargetType = "opportunity" | "solution";

@Entity({ name: "workflow_definitions" })
export class WorkflowDefinition {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  code?: string | null;

  @Column({ type: "varchar", length: 32 })
  targetType!: WorkflowTargetType;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  applicableOpportunity?: string | null;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "boolean", default: false })
  isDefault!: boolean;

  @Column({ type: "int", default: 1 })
  version!: number;

  @OneToMany(() => WorkflowNode, (node) => node.workflowDefinition, {
    cascade: true,
  })
  nodes!: WorkflowNode[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
