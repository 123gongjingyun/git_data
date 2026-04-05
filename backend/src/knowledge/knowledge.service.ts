import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { KnowledgeCategoryGroup } from "../domain/entities/knowledge-category-group.entity";
import { KnowledgeCategory } from "../domain/entities/knowledge-category.entity";

export interface KnowledgeSubCategoryDto {
  value: string;
  label: string;
}

export interface KnowledgeCategoryTreeNodeDto {
  id: string;
  name: string;
  icon: string;
  description: string;
  subCategories: KnowledgeSubCategoryDto[];
}

@Injectable()
export class KnowledgeService {
  // 当前作为默认配置，数据库无记录或尚未保存时会返回该配置
  private readonly defaultTree: KnowledgeCategoryTreeNodeDto[] = [
    {
      id: "experience",
      name: "经验知识库",
      icon: "📘",
      description:
        "沉淀成功案例与标准文档模板，作为售前与交付团队的经验复用入口。",
      subCategories: [
        { value: "经验知识库 / 成功案例", label: "成功案例" },
        { value: "经验知识库 / 文档模板", label: "文档模板" },
      ],
    },
    {
      id: "sales",
      name: "销售知识库",
      icon: "💼",
      description:
        "适用于销售团队的实战资料、话术脚本与一指禅速查表。",
      subCategories: [
        { value: "销售知识库 / 销售一指禅", label: "销售一指禅" },
        { value: "销售知识库 / 销售话术", label: "销售话术" },
      ],
    },
    {
      id: "solution",
      name: "解决方案知识库",
      icon: "🧩",
      description:
        "汇总通用方案、行业方案与典型场景方案，支撑售前快速选型与复用。",
      subCategories: [
        { value: "解决方案知识库 / 通用解决方案", label: "通用解决方案" },
        { value: "解决方案知识库 / 行业解决方案", label: "行业解决方案" },
        { value: "解决方案知识库 / 场景解决方案", label: "场景解决方案" },
      ],
    },
    {
      id: "product",
      name: "产品知识库",
      icon: "🧬",
      description:
        "产品白皮书、功能说明与操作手册统一收口，方便销售与售前查阅。",
      subCategories: [
        { value: "产品知识库 / 产品白皮书", label: "产品白皮书" },
        { value: "产品知识库 / 产品操作手册", label: "产品操作手册" },
      ],
    },
    {
      id: "industry",
      name: "行业知识库",
      icon: "🌐",
      description:
        "行业白皮书、政策解读与竞品分析，支撑行业洞察与标前策略制定。",
      subCategories: [
        { value: "行业知识库 / 行业白皮书", label: "行业白皮书" },
        { value: "行业知识库 / 政策解读", label: "政策解读" },
        { value: "行业知识库 / 竞品分析", label: "竞品分析" },
      ],
    },
    {
      id: "delivery",
      name: "交付实施知识库",
      icon: "🛠️",
      description:
        "项目实施模板、运维手册与巡检规范，保障交付与运维的一致性。",
      subCategories: [
        { value: "交付实施知识库 / 实施模板", label: "实施模板" },
        { value: "交付实施知识库 / 运维手册", label: "运维手册" },
      ],
    },
    {
      id: "bidding",
      name: "投标知识库",
      icon: "📄",
      description:
        "投标模板、评分标准解读等资源，提升投标命中率与规范性。",
      subCategories: [
        { value: "投标知识库 / 投标模板", label: "投标模板" },
        { value: "投标知识库 / 评分标准解读", label: "评分标准解读" },
      ],
    },
  ];

  constructor(
    @InjectRepository(KnowledgeCategoryGroup)
    private readonly groupRepo: Repository<KnowledgeCategoryGroup>,
    @InjectRepository(KnowledgeCategory)
    private readonly categoryRepo: Repository<KnowledgeCategory>,
  ) {}

  async getCategoryTree(): Promise<KnowledgeCategoryTreeNodeDto[]> {
    const groups = await this.groupRepo.find({
      where: { isActive: true },
      relations: ["categories"],
      order: {
        sortOrder: "ASC",
        id: "ASC",
      },
    });

    if (!groups.length) {
      // 尚未通过设置页面保存配置时，返回默认树
      return this.defaultTree;
    }

    return groups.map((g) => ({
      id: g.code,
      name: g.name,
      icon: g.icon || "",
      description: g.description || "",
      subCategories: (g.categories || [])
        .filter((c) => c.isActive)
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          return a.id - b.id;
        })
        .map((c) => ({
          value: c.value,
          label: c.label,
        })),
    }));
  }

  async saveCategoryTree(
    tree: KnowledgeCategoryTreeNodeDto[],
  ): Promise<{ success: boolean }> {
    // 简单实现：每次保存前清空表，再按排序重建
    await this.categoryRepo.delete({});
    await this.groupRepo.delete({});

    for (let i = 0; i < tree.length; i += 1) {
      const node = tree[i];
      const group = this.groupRepo.create({
        code: node.id,
        name: node.name,
        icon: node.icon,
        description: node.description,
        sortOrder: i,
        isActive: true,
      });
      const savedGroup = await this.groupRepo.save(group);

      const subCategories = node.subCategories || [];
      // eslint-disable-next-line no-restricted-syntax
      for (let j = 0; j < subCategories.length; j += 1) {
        const sub = subCategories[j];
        const category = this.categoryRepo.create({
          group: savedGroup,
          label: sub.label,
          value: sub.value,
          sortOrder: j,
          isActive: true,
        });
        await this.categoryRepo.save(category);
      }
    }

    return { success: true };
  }
}
