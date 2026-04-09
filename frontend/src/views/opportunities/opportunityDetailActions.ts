export function getNextOpportunityStage(stage?: string) {
  const flow = [
    "discovery",
    "solution_design",
    "proposal",
    "bidding",
    "negotiation",
    "won",
  ] as const;
  const currentIndex = stage ? flow.indexOf(stage as (typeof flow)[number]) : -1;
  if (currentIndex === -1) {
    return flow[0];
  }
  if (currentIndex >= flow.length - 1) {
    return null;
  }
  return flow[currentIndex + 1];
}

export function triggerOpportunityDocumentDownload(fileName: string) {
  if (typeof window === "undefined") {
    return;
  }
  const blob = new Blob(
    [`文档文件：${fileName}\n\n当前环境暂未接入真实文件服务，文件入口已预留。`],
    { type: "text/plain;charset=utf-8" },
  );
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".txt") ? fileName : `${fileName}.txt`;
  link.click();
  window.URL.revokeObjectURL(url);
}
