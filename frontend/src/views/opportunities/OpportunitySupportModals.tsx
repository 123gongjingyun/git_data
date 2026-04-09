import { Button, Modal, Typography } from "antd";

const { Paragraph, Text } = Typography;

interface PreviewDocumentLike {
  title: string;
  fileName: string;
}

interface OpportunitySupportModalsProps {
  statsModalVisible: boolean;
  statsModalType: "expected" | "weighted" | "probability" | null;
  totalExpected: number;
  totalWeighted: number;
  avgProbability: number;
  onCloseStatsModal: () => void;
  previewDocument: PreviewDocumentLike | null;
  onClosePreview: () => void;
  onDownloadPreview: (fileName: string) => void;
}

export function OpportunitySupportModals(props: OpportunitySupportModalsProps) {
  const {
    statsModalVisible,
    statsModalType,
    totalExpected,
    totalWeighted,
    avgProbability,
    onCloseStatsModal,
    previewDocument,
    onClosePreview,
    onDownloadPreview,
  } = props;

  return (
    <>
      <Modal
        title="商机统计概览"
        open={statsModalVisible}
        onCancel={onCloseStatsModal}
        footer={
          <Button type="primary" onClick={onCloseStatsModal}>
            关闭
          </Button>
        }
      >
        {statsModalType === "expected" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Paragraph>
              当前列表总预期价值： <Text strong>{totalExpected.toLocaleString("zh-CN")}</Text>
            </Paragraph>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              该数值基于当前筛选条件下的商机预估金额汇总，后续接入后端后可按行业 / 客户 / 负责人等维度拆分展示。
            </Paragraph>
          </div>
        )}
        {statsModalType === "weighted" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Paragraph>
              当前列表总加权价值： <Text strong>{totalWeighted.toLocaleString("zh-CN")}</Text>
            </Paragraph>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              加权价值 = 预估金额 × 成功概率，用于快速评估当前商机池的“潜在签约规模”。
            </Paragraph>
          </div>
        )}
        {statsModalType === "probability" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Paragraph>
              当前列表平均成功概率： <Text strong>{avgProbability}%</Text>
            </Paragraph>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              该数值基于当前筛选条件下所有商机的平均成交概率，后续可在“数据分析”模块中按阶段 / 行业等维度进一步拆分。
            </Paragraph>
          </div>
        )}
        {!statsModalType && (
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            请选择上方的统计卡片查看对应指标说明。
          </Paragraph>
        )}
      </Modal>

      <Modal
        title={previewDocument?.title || "文档预览"}
        open={!!previewDocument}
        onCancel={onClosePreview}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <Button
              onClick={() => previewDocument?.fileName && onDownloadPreview(previewDocument.fileName)}
              disabled={!previewDocument?.fileName}
            >
              下载
            </Button>
            <Button type="primary" onClick={onClosePreview}>
              关闭
            </Button>
          </div>
        }
      >
        {previewDocument && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--app-border)",
              background: "var(--app-surface-soft)",
              color: "var(--app-text-primary)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{previewDocument.fileName}</div>
            <div style={{ fontSize: 13, color: "var(--app-text-secondary)", lineHeight: 1.8 }}>
              当前预览入口已预留。后续接入真实文件服务后，这里将展示文档内容或在线预览页面。
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
