import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { KnowledgeCategory } from "./knowledge-category.entity";

@Entity({ name: "knowledge_category_groups" })
export class KnowledgeCategoryGroup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  code!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => KnowledgeCategory, (category) => category.group)
  categories!: KnowledgeCategory[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

