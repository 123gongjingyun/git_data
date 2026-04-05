import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

export type FeishuBindingSource = "manual" | "import" | "self_claimed";
export type FeishuBindingStatus = "active" | "disabled" | "pending";

@Entity({ name: "feishu_user_bindings" })
@Unique("uk_feishu_open_id", ["feishuOpenId"])
@Unique("uk_platform_user_id", ["platformUserId"])
export class FeishuUserBinding {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 128 })
  feishuOpenId!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  feishuUnionId?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  feishuUserId?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  feishuName?: string | null;

  @Column({ type: "int" })
  platformUserId!: number;

  @ManyToOne(() => User, { nullable: false })
  platformUser!: User;

  @Column({ type: "varchar", length: 128 })
  platformUsername!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  department?: string | null;

  @Column({ type: "varchar", length: 32, default: "manual" })
  bindingSource!: FeishuBindingSource;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: FeishuBindingStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
