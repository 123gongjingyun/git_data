import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

export type FeishuCallbackType = "event" | "card_action";
export type FeishuCallbackStatus =
  | "received"
  | "processed"
  | "ignored"
  | "failed";

@Entity({ name: "feishu_callback_logs" })
export class FeishuCallbackLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 32 })
  callbackType!: FeishuCallbackType;

  @Column({ type: "varchar", length: 128, nullable: true })
  eventId?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  actionToken?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  operatorOpenId?: string | null;

  @Column({ type: "int", nullable: true })
  operatorPlatformUserId?: number | null;

  @ManyToOne(() => User, { nullable: true })
  operatorPlatformUser?: User | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  businessType?: string | null;

  @Column({ type: "bigint", nullable: true })
  businessId?: number | null;

  @Column({ type: "simple-json" })
  requestJson!: Record<string, unknown>;

  @Column({ type: "simple-json", nullable: true })
  resultJson?: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 24, default: "received" })
  status!: FeishuCallbackStatus;

  @Column({ type: "varchar", length: 500, nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
