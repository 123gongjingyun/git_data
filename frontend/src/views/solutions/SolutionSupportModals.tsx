import { Button, Input, Modal, Select, Typography, Upload } from "antd";
import type { SolutionItem } from "../../shared/pipelineMock";

const { Paragraph, Text } = Typography;

type SolutionWorkflowStepLike = {
  key: string;
  title: string;
  approverLabel: string;
  statusText: string;
};

interface CreateDraft {
  name?: string;
  project?: string;
  owner?: string;
  type?: string;
  fileName?: string;
}

interface SolutionSupportModalsProps {
  createOpen: boolean;
  createDraft: CreateDraft;
  canCreateSolutions: boolean;
  ownerOptions: Array<{ value: string; label: string }>;
  onCreateDraftChange: (nextDraft: CreateDraft) => void;
  onCancelCreate: () => void;
  onSubmitCreate: () => void;
  viewOpen: boolean;
  viewSolution: SolutionItem | null;
  onCloseView: () => void;
  onOpenApproval: (solution: SolutionItem) => void;
  renderStatusTag: (status: SolutionItem["status"]) => React.ReactNode;
  getSolutionWorkflowSteps: (
    solution: SolutionItem | null,
  ) => SolutionWorkflowStepLike[];
}

export function SolutionSupportModals(props: SolutionSupportModalsProps) {
  const {
    createOpen,
    createDraft,
    canCreateSolutions,
    ownerOptions,
    onCreateDraftChange,
    onCancelCreate,
    onSubmitCreate,
    viewOpen,
    viewSolution,
    onCloseView,
    onOpenApproval,
    renderStatusTag,
    getSolutionWorkflowSteps,
  } = props;

  return (
    <>
      <Modal
        title="新建方案"
        open={createOpen}
        onCancel={onCancelCreate}
        onOk={onSubmitCreate}
        okText="保存方案"
        cancelText="取消"
        okButtonProps={{ disabled: !canCreateSolutions }}
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <Text>方案名称</Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="例如：某行业统一安全接入方案"
              value={createDraft.name}
              onChange={(e) =>
                onCreateDraftChange({ ...createDraft, name: e.target.value })
              }
            />
          </div>
          <div>
            <Text>关联项目</Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="例如：某银行数字化转型项目"
              value={createDraft.project}
              onChange={(e) =>
                onCreateDraftChange({ ...createDraft, project: e.target.value })
              }
            />
          </div>
          <div>
            <Text>解决方案负责人</Text>
            <Select
              allowClear
              style={{ marginTop: 4, width: "100%" }}
              placeholder="请选择售前负责人"
              value={createDraft.owner}
              onChange={(value) =>
                onCreateDraftChange({
                  ...createDraft,
                  owner: value || undefined,
                })
              }
              options={ownerOptions}
            />
          </div>
          <div>
            <Text>方案类型</Text>
            <Select
              allowClear
              style={{ marginTop: 4, width: "100%" }}
              placeholder="请选择方案类型"
              value={createDraft.type}
              onChange={(value) =>
                onCreateDraftChange({
                  ...createDraft,
                  type: value || undefined,
                })
              }
              options={[
                { value: "技术方案", label: "技术方案" },
                { value: "解决方案", label: "解决方案" },
                { value: "投标方案", label: "投标方案" },
              ]}
            />
          </div>
          <div>
            <Text>上传方案文件</Text>
            <div style={{ marginTop: 4 }}>
              <Upload
                showUploadList={false}
                beforeUpload={(file) => {
                  onCreateDraftChange({
                    ...createDraft,
                    fileName: file.name,
                  });
                  return false;
                }}
              >
                <Button size="small">选择文件</Button>
              </Upload>
              {createDraft.fileName && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#595959",
                  }}
                >
                  当前文件：{createDraft.fileName}
                </div>
              )}
            </div>
            <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
              当前仅记录文件名，后续接入后端后可替换为真实文件上传与下载。
            </Paragraph>
          </div>
        </div>
      </Modal>

      <Modal
        title={viewSolution ? `方案详情：${viewSolution.name}` : "方案详情"}
        open={viewOpen}
        onCancel={onCloseView}
        footer={
          <Button type="primary" onClick={onCloseView}>
            关闭
          </Button>
        }
      >
        {viewSolution && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <Text type="secondary">关联项目</Text>
              <div>{viewSolution.project}</div>
            </div>
            <div>
              <Text type="secondary">解决方案负责人</Text>
              <div>{viewSolution.owner}</div>
            </div>
            <div>
              <Text type="secondary">版本</Text>
              <div>{viewSolution.version}</div>
            </div>
            <div>
              <Text type="secondary">类型</Text>
              <div>{viewSolution.type}</div>
            </div>
            <div>
              <Text type="secondary">审批状态</Text>
              <div>{renderStatusTag(viewSolution.status)}</div>
            </div>
            <div>
              <Text type="secondary">创建时间</Text>
              <div>{viewSolution.createdAt}</div>
            </div>
            <div>
              <Text type="secondary">方案文件</Text>
              <div>{viewSolution.fileName || "尚未上传方案文件"}</div>
            </div>
            <div>
              <Text type="secondary">审批过程</Text>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {getSolutionWorkflowSteps(viewSolution).map((step, index) => (
                  <div
                    key={`view_solution_step_${step.key}`}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid var(--app-border)",
                      background: "var(--app-surface-soft)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        color: "var(--app-text-primary)",
                      }}
                    >
                      {index + 1}. {step.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--app-text-secondary)",
                      }}
                    >
                      处理人：{step.approverLabel}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--app-text-secondary)",
                      }}
                    >
                      状态：{step.statusText}
                    </div>
                  </div>
                ))}
                <Button
                  size="small"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => onOpenApproval(viewSolution)}
                >
                  查看完整审批流程
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
