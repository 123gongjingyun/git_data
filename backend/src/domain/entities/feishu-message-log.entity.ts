import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type FeishuMessageDirection = "outbound" | "inbound";
export type FeishuMessageType = "text" | "interactive" | "post";
export type FeishuReceiverType = "open_id" | "user_id" | "chat_id";
export type FeishuSendStatus = "pending" | "sent" | "failed";

@Entity({ name: "feishu_message_logs" })
export class FeishuMessageLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 16 })
  messageDirection!: FeishuMessageDirection;

  @Column({ type: "varchar", length: 32 })
  messageType!: FeishuMessageType;

  @Column({ type: "varchar", length: 32 })
  receiverType!: FeishuReceiverType;

  @Column({ type: "varchar", length: 128 })
  receiverId!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  eventId?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  requestId?: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  businessType?: string | null;

  @Column({ type: "bigint", nullable: true })
  businessId?: number | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  templateKey?: string | null;

  @Column({ type: "simple-json" })
  payloadJson!: Record<string, unknown>;

  @Column({ type: "simple-json", nullable: true })
  responseJson?: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 24, default: "pending" })
  sendStatus!: FeishuSendStatus;

  @Column({ type: "varchar", length: 500, nullable: true })
  errorMessage?: string | null;

  @Column({ type: "datetime", nullable: true })
  sentAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
