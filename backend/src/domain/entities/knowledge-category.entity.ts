import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { KnowledgeCategoryGroup } from "./knowledge-category-group.entity";

@Entity({ name: "knowledge_categories" })
export class KnowledgeCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    () => KnowledgeCategoryGroup,
    (group) => group.categories,
    { onDelete: "CASCADE" },
  )
  group!: KnowledgeCategoryGroup;

  @Column()
  label!: string;

  @Column({ unique: true })
  value!: string;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

