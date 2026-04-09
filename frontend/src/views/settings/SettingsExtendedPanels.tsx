import { Button, Card, Col, Input as AntInput, Row, Typography } from "antd";
import type { RefObject } from "react";
import type { LogoConfig } from "../../logoConfig";

const { Text } = Typography;

interface KnowledgeCategoryTreeNode {
  id: string;
  name: string;
  icon: string;
  description: string;
  subCategories: { value: string; label: string }[];
}

export function BrandingSettingsPanel(props: {
  appName: string;
  logoConfig: LogoConfig;
  canManageSettings: boolean;
  getBrandLogoVisual: () => { background: string; text: string };
  onChangeAppName: (name: string) => void;
  onLoadBrandingFromServer: () => Promise<void> | void;
  onSaveBrandingToServer: () => Promise<void> | void;
  onNavigateToPlugins: () => void;
}) {
  const {
    appName,
    logoConfig,
    canManageSettings,
    getBrandLogoVisual,
    onChangeAppName,
    onLoadBrandingFromServer,
    onSaveBrandingToServer,
    onNavigateToPlugins,
  } = props;

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 14, color: "#595959", minWidth: 0, flex: 1 }}>
            平台品牌与 Logo 设置
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              自定义左上角平台名称与 Logo，保持登录页与主界面品牌一致。
            </Text>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button type="default" onClick={onNavigateToPlugins}>
              去图标/Logo插件库选择 Logo
            </Button>
            <Button onClick={() => void onLoadBrandingFromServer()}>
              从服务器加载
            </Button>
            <Button
              type="primary"
              disabled={!canManageSettings}
              onClick={() => void onSaveBrandingToServer()}
            >
              保存到服务器
            </Button>
          </div>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card size="small" title="当前 Logo 预览" bordered={false}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {(() => {
                  const visual = getBrandLogoVisual();
                  return (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: visual.background,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                      aria-label={logoConfig.displayName}
                    >
                      {visual.text}
                    </div>
                  );
                })()}
                <div>
                  <div style={{ fontWeight: 500 }}>{appName}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#8c8c8c",
                      marginTop: 4,
                    }}
                  >
                    {logoConfig.displayName}（{logoConfig.usageKey}）
                  </div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="平台名称设置" bordered={false}>
              <div>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>
                  平台名称
                </div>
                <AntInput
                  name="platformName"
                  autoComplete="organization"
                  value={appName}
                  disabled={!canManageSettings}
                  onChange={(e) => onChangeAppName(e.target.value)}
                  placeholder="例如：售前流程全生命周期管理系统"
                />
                <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
                  设置后将同步应用于登录页顶部与主界面左上角的系统名称展示。
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card>
        <Text type="secondary" style={{ fontSize: 12 }}>
          审批流程库已独立到左侧“审批流程库”菜单中维护。当前页面仅保留平台品牌与 Logo 相关设置。
        </Text>
      </Card>
    </>
  );
}

export function KnowledgeCategoryManagementPanel(props: {
  canEditKnowledge: boolean;
  canDeleteKnowledgeCategories: boolean;
  knowledgeImportInputRef: RefObject<HTMLInputElement | null>;
  knowledgeTreeError: string | null;
  knowledgeLoading: boolean;
  knowledgeTree: KnowledgeCategoryTreeNode[];
  selectedKnowledgeGroup: KnowledgeCategoryTreeNode | null;
  onImportKnowledgeTreeFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadKnowledgeTree: () => Promise<void> | void;
  onAddKnowledgeGroup: () => void;
  onExportKnowledgeTree: () => void;
  onResetKnowledgeTree: () => Promise<void> | void;
  onSaveKnowledgeTreeToServer: () => Promise<void> | void;
  onSelectKnowledgeGroup: (groupId: string) => void;
  onMoveKnowledgeGroup: (groupId: string, direction: "up" | "down") => void;
  onDeleteKnowledgeGroup: (group: KnowledgeCategoryTreeNode) => void;
  onUpdateKnowledgeGroup: (
    groupId: string,
    patch: Partial<KnowledgeCategoryTreeNode>,
  ) => void;
  onAddKnowledgeSubCategory: (groupId: string) => void;
  onUpdateKnowledgeSubCategory: (
    groupId: string,
    index: number,
    patch: Partial<{ value: string; label: string }>,
  ) => void;
  onMoveKnowledgeSubCategory: (
    groupId: string,
    index: number,
    direction: "up" | "down",
  ) => void;
  onConfirmRemoveKnowledgeSubCategory: (
    groupId: string,
    index: number,
    label: string,
  ) => void;
  onWarnNoKnowledgeImportPermission: () => void;
  onWarnNoKnowledgeDeletePermission: () => void;
}) {
  const {
    canEditKnowledge,
    canDeleteKnowledgeCategories,
    knowledgeImportInputRef,
    knowledgeTreeError,
    knowledgeLoading,
    knowledgeTree,
    selectedKnowledgeGroup,
    onImportKnowledgeTreeFileChange,
    onLoadKnowledgeTree,
    onAddKnowledgeGroup,
    onExportKnowledgeTree,
    onResetKnowledgeTree,
    onSaveKnowledgeTreeToServer,
    onSelectKnowledgeGroup,
    onMoveKnowledgeGroup,
    onDeleteKnowledgeGroup,
    onUpdateKnowledgeGroup,
    onAddKnowledgeSubCategory,
    onUpdateKnowledgeSubCategory,
    onMoveKnowledgeSubCategory,
    onConfirmRemoveKnowledgeSubCategory,
    onWarnNoKnowledgeImportPermission,
    onWarnNoKnowledgeDeletePermission,
  } = props;

  return (
    <Card>
      <input
        type="file"
        id="knowledge-tree-import"
        name="knowledgeTreeImport"
        ref={knowledgeImportInputRef}
        style={{ display: "none" }}
        accept="application/json"
        onChange={onImportKnowledgeTreeFileChange}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, color: "#595959", minWidth: 0, flex: 1 }}>
          知识库目录管理
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            管理“知识库”左侧目录树的一级主题与二级子分类，目前以调用
            /knowledge/categories/tree 接口为主，当前未落库。
          </Text>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Button size="small" onClick={() => void onLoadKnowledgeTree()}>
            从后端重新加载
          </Button>
          <Button size="small" disabled={!canEditKnowledge} onClick={onAddKnowledgeGroup}>
            + 新增一级知识库
          </Button>
          <Button
            size="small"
            disabled={!canEditKnowledge}
            onClick={() => {
              if (!canEditKnowledge) {
                onWarnNoKnowledgeImportPermission();
                return;
              }
              knowledgeImportInputRef.current?.click();
            }}
          >
            从 JSON 导入
          </Button>
          <Button size="small" onClick={onExportKnowledgeTree}>
            导出为 JSON
          </Button>
          <Button size="small" disabled={!canEditKnowledge} onClick={() => void onResetKnowledgeTree()}>
            恢复默认目录
          </Button>
          <Button
            size="small"
            type="primary"
            disabled={!canEditKnowledge}
            onClick={() => void onSaveKnowledgeTreeToServer()}
          >
            保存目录配置
          </Button>
        </div>
      </div>

      {knowledgeTreeError && (
        <div
          style={{
            fontSize: 12,
            color: "#fa8c16",
            marginBottom: 8,
          }}
        >
          {knowledgeTreeError}
        </div>
      )}

      <Row gutter={16}>
        <Col xs={24} md={10}>
          <Card size="small" title="一级知识库列表" bordered={false} bodyStyle={{ padding: 0 }}>
            <div
              style={{
                maxHeight: 320,
                overflowY: "auto",
                padding: 8,
              }}
            >
              {knowledgeLoading && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#8c8c8c",
                    marginBottom: 8,
                  }}
                >
                  正在从后端加载目录树...
                </div>
              )}
              {knowledgeTree.length === 0 && !knowledgeLoading && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#8c8c8c",
                  }}
                >
                  当前尚未从后端获取到知识库目录配置，可点击“新增一级知识库”
                  在本地先行配置。
                </div>
              )}
              {knowledgeTree.map((group) => {
                const isActive = selectedKnowledgeGroup
                  ? selectedKnowledgeGroup.id === group.id
                  : false;
                return (
                  <div
                    key={group.id}
                    style={{
                      padding: 8,
                      borderRadius: 4,
                      marginBottom: 4,
                      cursor: "pointer",
                      background: isActive
                        ? "color-mix(in srgb, rgba(59,130,246,0.16) 70%, var(--app-surface) 30%)"
                        : "var(--app-surface-soft)",
                      border: isActive
                        ? "1px solid rgba(59, 130, 246, 0.3)"
                        : "1px solid var(--app-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                    onClick={() => onSelectKnowledgeGroup(group.id)}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {group.icon} {group.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#8c8c8c",
                          marginTop: 2,
                        }}
                      >
                        子分类数量：{group.subCategories.length}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        alignItems: "flex-end",
                      }}
                    >
                      <div>
                        <Button
                          type="link"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveKnowledgeGroup(group.id, "up");
                          }}
                        >
                          上移
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveKnowledgeGroup(group.id, "down");
                          }}
                        >
                          下移
                        </Button>
                      </div>
                      <Button
                        type="link"
                        size="small"
                        disabled={!canDeleteKnowledgeCategories}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canDeleteKnowledgeCategories) {
                            onWarnNoKnowledgeDeletePermission();
                            return;
                          }
                          onDeleteKnowledgeGroup(group);
                        }}
                        danger
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card size="small" title="选中知识库详情与子分类" bordered={false}>
            {selectedKnowledgeGroup ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <Row gutter={12}>
                  <Col span={6}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#8c8c8c",
                        marginBottom: 4,
                      }}
                    >
                      图标 Emoji
                    </label>
                    <AntInput
                      value={selectedKnowledgeGroup.icon}
                      onChange={(e) =>
                        onUpdateKnowledgeGroup(selectedKnowledgeGroup.id, { icon: e.target.value })
                      }
                    />
                  </Col>
                  <Col span={9}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#8c8c8c",
                        marginBottom: 4,
                      }}
                    >
                      一级名称
                    </label>
                    <AntInput
                      value={selectedKnowledgeGroup.name}
                      onChange={(e) =>
                        onUpdateKnowledgeGroup(selectedKnowledgeGroup.id, { name: e.target.value })
                      }
                    />
                  </Col>
                  <Col span={9}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#8c8c8c",
                        marginBottom: 4,
                      }}
                    >
                      描述
                    </label>
                    <AntInput
                      value={selectedKnowledgeGroup.description}
                      onChange={(e) =>
                        onUpdateKnowledgeGroup(selectedKnowledgeGroup.id, {
                          description: e.target.value,
                        })
                      }
                    />
                  </Col>
                </Row>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    二级子分类
                  </div>
                  <Button
                    type="dashed"
                    size="small"
                    onClick={() => onAddKnowledgeSubCategory(selectedKnowledgeGroup.id)}
                  >
                    + 新增子分类
                  </Button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxHeight: 260,
                    overflowY: "auto",
                  }}
                >
                  {selectedKnowledgeGroup.subCategories.length === 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      当前尚未配置任何子分类，可以点击“新增子分类”添加，例如：
                      通用解决方案 / 行业解决方案 / 场景解决方案。
                    </Text>
                  )}
                  {selectedKnowledgeGroup.subCategories.map((sub, index) => (
                    <div
                      key={`${sub.value}-${index}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1.4fr auto auto",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <AntInput
                        size="small"
                        value={sub.label}
                        placeholder="显示名称，例如：销售话术"
                        onChange={(e) =>
                          onUpdateKnowledgeSubCategory(selectedKnowledgeGroup.id, index, {
                            label: e.target.value,
                          })
                        }
                      />
                      <AntInput
                        size="small"
                        value={sub.value}
                        placeholder="唯一标识，例如：销售知识库 / 销售话术"
                        onChange={(e) =>
                          onUpdateKnowledgeSubCategory(selectedKnowledgeGroup.id, index, {
                            value: e.target.value,
                          })
                        }
                      />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <Button
                          type="link"
                          size="small"
                          onClick={() =>
                            onMoveKnowledgeSubCategory(selectedKnowledgeGroup.id, index, "up")
                          }
                        >
                          上移
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          onClick={() =>
                            onMoveKnowledgeSubCategory(selectedKnowledgeGroup.id, index, "down")
                          }
                        >
                          下移
                        </Button>
                      </div>
                      <Button
                        type="link"
                        size="small"
                        danger
                        disabled={!canDeleteKnowledgeCategories}
                        onClick={() => {
                          if (!canDeleteKnowledgeCategories) {
                            onWarnNoKnowledgeDeletePermission();
                            return;
                          }
                          onConfirmRemoveKnowledgeSubCategory(
                            selectedKnowledgeGroup.id,
                            index,
                            sub.label,
                          );
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                </div>

                <Text type="secondary" style={{ fontSize: 12 }}>
                  提示：子分类的 <strong>value</strong> 字段应与文档中的 <code>category</code>
                  字段一致，例如：“销售知识库 / 销售话术”，以便在知识库页面按分类正确筛选。
                </Text>
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                请选择左侧的某个一级知识库后再进行编辑，或点击“新增一级知识库”
                创建新的主题。
              </Text>
            )}
          </Card>
        </Col>
      </Row>
    </Card>
  );
}
