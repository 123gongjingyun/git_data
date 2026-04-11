import { message, type InputRef } from "antd";
import { useEffect, useRef, useState } from "react";
import { buildApiUrl } from "../../shared/api";
import { KnowledgeCategoryManagementPanel } from "./SettingsExtendedPanels";

interface KnowledgeCategoryTreeNode {
  id: string;
  name: string;
  icon: string;
  description: string;
  subCategories: { value: string; label: string }[];
}

interface SettingsKnowledgeRuntimePanelProps {
  canDeleteKnowledgeCategories: boolean;
  canEditKnowledge: boolean;
  defaultKnowledgeCategoryTree: KnowledgeCategoryTreeNode[];
  initialKnowledgeCategoryTree: KnowledgeCategoryTreeNode[];
}

const KNOWLEDGE_TREE_STORAGE_KEY = "knowledgeCategoryTreeConfig";

export function SettingsKnowledgeRuntimePanel(
  props: SettingsKnowledgeRuntimePanelProps,
) {
  const {
    canDeleteKnowledgeCategories,
    canEditKnowledge,
    defaultKnowledgeCategoryTree,
    initialKnowledgeCategoryTree,
  } = props;

  const [knowledgeTree, setKnowledgeTree] = useState<KnowledgeCategoryTreeNode[]>(
    initialKnowledgeCategoryTree,
  );
  const [knowledgeTreeError, setKnowledgeTreeError] = useState<string | null>(null);
  const [knowledgeSelectedId, setKnowledgeSelectedId] = useState<string | null>(
    initialKnowledgeCategoryTree[0]?.id ?? null,
  );
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const knowledgeImportInputRef = useRef<InputRef | null>(null);

  const selectedKnowledgeGroup =
    knowledgeTree.find((g) => g.id === knowledgeSelectedId) || knowledgeTree[0] || null;

  const loadKnowledgeTree = async () => {
    setKnowledgeLoading(true);
    try {
      const resp = await fetch(buildApiUrl("/knowledge/categories/tree"));
      if (!resp.ok) {
        setKnowledgeTreeError(
          "未能从后端加载知识库目录配置，请检查 /knowledge/categories/tree 接口是否可用。",
        );
        return;
      }
      const data = (await resp.json()) as KnowledgeCategoryTreeNode[];
      if (Array.isArray(data) && data.length > 0) {
        setKnowledgeTree(data);
        setKnowledgeTreeError(null);
        setKnowledgeSelectedId((prev) => prev || data[0]?.id || null);
      }
    } catch {
      setKnowledgeTreeError(
        "未能从后端加载知识库目录配置，请检查 /knowledge/categories/tree 接口是否可用。",
      );
    } finally {
      setKnowledgeLoading(false);
    }
  };

  useEffect(() => {
    void loadKnowledgeTree();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KNOWLEDGE_TREE_STORAGE_KEY, JSON.stringify(knowledgeTree));
      const event = new CustomEvent("knowledgeTreeUpdated", { detail: knowledgeTree });
      window.dispatchEvent(event);
    } catch {
      // ignore storage errors
    }
  }, [knowledgeTree]);

  const handleUpdateKnowledgeGroup = (
    groupId: string,
    patch: Partial<KnowledgeCategoryTreeNode>,
  ) => {
    setKnowledgeTree((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g)));
  };

  const handleUpdateKnowledgeSubCategory = (
    groupId: string,
    index: number,
    patch: Partial<{ value: string; label: string }>,
  ) => {
    setKnowledgeTree((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const nextSubs = [...g.subCategories];
        const original = nextSubs[index];
        if (!original) return g;
        nextSubs[index] = { ...original, ...patch };
        return { ...g, subCategories: nextSubs };
      }),
    );
  };

  const handleAddKnowledgeSubCategory = (groupId: string) => {
    setKnowledgeTree((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          subCategories: [
            ...g.subCategories,
            { value: `${g.name} / 新子分类`, label: "新子分类" },
          ],
        };
      }),
    );
  };

  const handleRemoveKnowledgeSubCategory = (groupId: string, index: number) => {
    setKnowledgeTree((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          subCategories: g.subCategories.filter((_, i) => i !== index),
        };
      }),
    );
  };

  const handleDeleteKnowledgeGroup = (group: KnowledgeCategoryTreeNode) => {
    import("antd").then(({ Modal }) => {
      Modal.confirm({
        title: `确认删除一级知识库「${group.name}」？`,
        content: "删除后该一级知识库及其全部子分类会一起移除。",
        okText: "删除",
        okButtonProps: { danger: true },
        cancelText: "取消",
        onOk: () => {
          setKnowledgeTree((prev) => prev.filter((g) => g.id !== group.id));
          if (selectedKnowledgeGroup && selectedKnowledgeGroup.id === group.id) {
            setKnowledgeSelectedId((prev) => (prev === group.id ? null : prev));
          }
          message.success(`已删除知识库：${group.name}`);
        },
      });
    });
  };

  const handleConfirmRemoveKnowledgeSubCategory = (
    groupId: string,
    index: number,
    label: string,
  ) => {
    import("antd").then(({ Modal }) => {
      Modal.confirm({
        title: `确认删除子分类「${label || "未命名子分类"}」？`,
        content: "删除后该子分类会从当前知识库目录中移除。",
        okText: "删除",
        okButtonProps: { danger: true },
        cancelText: "取消",
        onOk: () => {
          handleRemoveKnowledgeSubCategory(groupId, index);
          message.success(`已删除子分类：${label || "未命名子分类"}`);
        },
      });
    });
  };

  const handleAddKnowledgeGroup = () => {
    if (!canEditKnowledge) {
      message.warning("当前账号无权新增知识库目录。");
      return;
    }
    const newId = `custom_${Date.now()}`;
    const newGroup: KnowledgeCategoryTreeNode = {
      id: newId,
      name: "自定义知识库",
      icon: "📚",
      description: "自定义知识库，可根据需要调整名称与子分类。",
      subCategories: [],
    };
    setKnowledgeTree((prev) => [...prev, newGroup]);
    setKnowledgeSelectedId(newId);
  };

  const handleSaveKnowledgeTreeToServer = async () => {
    if (!canEditKnowledge) {
      message.warning("当前账号无权保存知识库目录。");
      return;
    }
    try {
      const resp = await fetch(buildApiUrl("/knowledge/categories/tree"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(knowledgeTree),
      });
      if (resp.ok) {
        message.success("已将知识库目录配置保存到服务器。");
      } else if (resp.status === 404) {
        message.warning(
          "服务器未接受目录保存请求：404，请检查是否实现 POST /knowledge/categories/tree。",
        );
      } else {
        message.info(`服务器未接受目录保存请求（状态码 ${resp.status}），已在本地保存配置。`);
      }
    } catch {
      message.info("未检测到可用的知识库目录保存接口，仅在当前页面内保存配置。");
    }
  };

  const handleResetKnowledgeTree = async () => {
    if (!canEditKnowledge) {
      message.warning("当前账号无权重置知识库目录。");
      return;
    }
    setKnowledgeTree(defaultKnowledgeCategoryTree);
    setKnowledgeSelectedId(defaultKnowledgeCategoryTree[0]?.id ?? null);
    try {
      await fetch(buildApiUrl("/knowledge/categories/tree"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaultKnowledgeCategoryTree),
      });
    } catch {
      // ignore backend failures and keep local reset
    }
  };

  const handleExportKnowledgeTree = () => {
    try {
      const blob = new Blob([JSON.stringify(knowledgeTree, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "knowledge-category-tree.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success("已导出知识库目录配置为 JSON 文件。");
    } catch {
      message.error("导出目录配置时出现错误。");
    }
  };

  const handleImportKnowledgeTreeFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!canEditKnowledge) {
      message.warning("当前账号无权导入知识库目录。");
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const parsed = JSON.parse(text) as KnowledgeCategoryTreeNode[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          message.warning("导入的目录配置为空或格式不正确。");
          return;
        }
        setKnowledgeTree(parsed);
        setKnowledgeSelectedId(parsed[0]?.id ?? null);
        message.success("已从 JSON 文件导入知识库目录配置。");
      } catch {
        message.error("解析导入的目录配置失败，请确认文件格式。");
      } finally {
        event.target.value = "";
      }
    };
    reader.onerror = () => {
      message.error("读取目录配置文件失败。");
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  const handleMoveKnowledgeGroup = (groupId: string, direction: "up" | "down") => {
    if (!canEditKnowledge) {
      message.warning("当前账号无权编辑知识库目录。");
      return;
    }
    setKnowledgeTree((prev) => {
      const index = prev.findIndex((g) => g.id === groupId);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleMoveKnowledgeSubCategory = (
    groupId: string,
    index: number,
    direction: "up" | "down",
  ) => {
    if (!canEditKnowledge) {
      message.warning("当前账号无权编辑知识库目录。");
      return;
    }
    setKnowledgeTree((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (index < 0 || index >= g.subCategories.length) return g;
        if (direction === "up" && index === 0) return g;
        if (direction === "down" && index === g.subCategories.length - 1) return g;
        const subs = [...g.subCategories];
        const [moved] = subs.splice(index, 1);
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        subs.splice(targetIndex, 0, moved);
        return { ...g, subCategories: subs };
      }),
    );
  };

  return (
    <KnowledgeCategoryManagementPanel
      canEditKnowledge={canEditKnowledge}
      canDeleteKnowledgeCategories={canDeleteKnowledgeCategories}
      knowledgeImportInputRef={knowledgeImportInputRef as never}
      knowledgeTreeError={knowledgeTreeError}
      knowledgeLoading={knowledgeLoading}
      knowledgeTree={knowledgeTree}
      selectedKnowledgeGroup={selectedKnowledgeGroup}
      onImportKnowledgeTreeFileChange={handleImportKnowledgeTreeFileChange}
      onLoadKnowledgeTree={loadKnowledgeTree}
      onAddKnowledgeGroup={handleAddKnowledgeGroup}
      onExportKnowledgeTree={handleExportKnowledgeTree}
      onResetKnowledgeTree={handleResetKnowledgeTree}
      onSaveKnowledgeTreeToServer={handleSaveKnowledgeTreeToServer}
      onSelectKnowledgeGroup={setKnowledgeSelectedId}
      onMoveKnowledgeGroup={handleMoveKnowledgeGroup}
      onDeleteKnowledgeGroup={handleDeleteKnowledgeGroup}
      onUpdateKnowledgeGroup={handleUpdateKnowledgeGroup}
      onAddKnowledgeSubCategory={handleAddKnowledgeSubCategory}
      onUpdateKnowledgeSubCategory={handleUpdateKnowledgeSubCategory}
      onMoveKnowledgeSubCategory={handleMoveKnowledgeSubCategory}
      onConfirmRemoveKnowledgeSubCategory={handleConfirmRemoveKnowledgeSubCategory}
      onWarnNoKnowledgeImportPermission={() => message.warning("当前账号无权导入知识库目录。")}
      onWarnNoKnowledgeDeletePermission={() => message.warning("当前账号无权删除知识库目录。")}
    />
  );
}
