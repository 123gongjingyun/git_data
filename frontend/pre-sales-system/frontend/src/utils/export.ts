import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface ExportColumn {
  key: string;
  title: string;
  width?: number;
}

/**
 * 导出为Excel
 */
export const exportToExcel = (
  data: any[],
  columns: ExportColumn[],
  fileName: string = 'export.xlsx'
) => {
  // 转换数据格式
  const exportData = data.map((item) => {
    const row: any = {};
    columns.forEach((col) => {
      row[col.title] = item[col.key] || '';
    });
    return row;
  });

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // 设置列宽
  ws['!cols'] = columns.map((col) => ({
    wch: col.width || 20,
  }));

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  // 导出文件
  XLSX.writeFile(wb, fileName);
};

/**
 * 导出为PDF
 */
export const exportToPDF = (
  data: any[],
  columns: ExportColumn[],
  fileName: string = 'export.pdf',
  title?: string
) => {
  const doc = new jsPDF();

  // 设置标题
  if (title) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 15);
  }

  // 准备表头和数据
  const headers = columns.map((col) => col.title);
  const rows = data.map((item) =>
    columns.map((col) => {
      let value = item[col.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'number') {
        return value.toLocaleString();
      }
      if (typeof value === 'boolean') {
        return value ? '是' : '否';
      }
      return String(value);
    })
  );

  // 生成表格
  (doc as any).autoTable({
    head: [headers],
    body: rows,
    startY: title ? 25 : 15,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [24, 144, 255],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // 保存文件
  doc.save(fileName);
};

/**
 * 导出项目数据
 */
export const exportProjects = (data: any[]) => {
  const columns: ExportColumn[] = [
    { key: 'projectNo', title: '项目编号', width: 18 },
    { key: 'name', title: '项目名称', width: 25 },
    { key: 'customerName', title: '客户名称', width: 20 },
    { key: 'status', title: '状态', width: 12 },
    { key: 'currentStage', title: '当前阶段', width: 15 },
    { key: 'priority', title: '优先级', width: 12 },
    { key: 'budget', title: '预算', width: 15 },
    { key: 'expectedValue', title: '预期价值', width: 15 },
    { key: 'expectedCloseDate', title: '预计关闭日期', width: 18 },
    { key: 'createdAt', title: '创建时间', width: 18 },
  ];

  exportToExcel(data, columns, `项目列表_${new Date().getTime()}.xlsx`);
  exportToPDF(data, columns, `项目列表_${new Date().getTime()}.pdf`, '项目列表');
};

/**
 * 导出商机数据
 */
export const exportOpportunities = (data: any[]) => {
  const columns: ExportColumn[] = [
    { key: 'opportunityNo', title: '商机编号', width: 18 },
    { key: 'name', title: '商机名称', width: 25 },
    { key: 'status', title: '状态', width: 12 },
    { key: 'stage', title: '阶段', width: 15 },
    { key: 'winProbability', title: '赢的概率', width: 12 },
    { key: 'expectedValue', title: '预期价值', width: 15 },
    { key: 'weightedValue', title: '加权价值', width: 15 },
    { key: 'expectedCloseDate', title: '预计关闭日期', width: 18 },
  ];

  exportToExcel(data, columns, `商机列表_${new Date().getTime()}.xlsx`);
};

/**
 * 导出解决方案数据
 */
export const exportSolutions = (data: any[]) => {
  const columns: ExportColumn[] = [
    { key: 'solutionNo', title: '方案编号', width: 18 },
    { key: 'name', title: '方案名称', width: 25 },
    { key: 'version', title: '版本', width: 12 },
    { key: 'status', title: '状态', width: 12 },
    { key: 'approvalStatus', title: '审批状态', width: 15 },
    { key: 'createdAt', title: '创建时间', width: 18 },
  ];

  exportToExcel(data, columns, `解决方案列表_${new Date().getTime()}.xlsx`);
};

/**
 * 导出投标数据
 */
export const exportTenders = (data: any[]) => {
  const columns: ExportColumn[] = [
    { key: 'tenderNo', title: '招标编号', width: 18 },
    { key: 'name', title: '招标名称', width: 25 },
    { key: 'tenderType', title: '招标类型', width: 15 },
    { key: 'bidPrice', title: '投标价格', width: 15 },
    { key: 'status', title: '状态', width: 12 },
    { key: 'result', title: '结果', width: 12 },
    { key: 'submissionDate', title: '投标截止日期', width: 18 },
  ];

  exportToExcel(data, columns, `投标列表_${new Date().getTime()}.xlsx`);
};

/**
 * 导出合同数据
 */
export const exportContracts = (data: any[]) => {
  const columns: ExportColumn[] = [
    { key: 'contractNo', title: '合同编号', width: 18 },
    { key: 'name', title: '合同名称', width: 25 },
    { key: 'contractValue', title: '合同金额', width: 15 },
    { key: 'status', title: '状态', width: 12 },
    { key: 'approvalStatus', title: '审批状态', width: 15 },
    { key: 'signDate', title: '签约日期', width: 18 },
    { key: 'startDate', title: '开始日期', width: 18 },
    { key: 'endDate', title: '结束日期', width: 18 },
  ];

  exportToExcel(data, columns, `合同列表_${new Date().getTime()}.xlsx`);
};

/**
 * 导出文档数据
 */
export const exportDocuments = (data: any[]) => {
  const columns: ExportColumn[] = [
    { key: 'title', title: '文档标题', width: 25 },
    { key: 'fileName', title: '文件名', width: 25 },
    { key: 'category', title: '分类', width: 15 },
    { key: 'fileType', title: '文件类型', width: 12 },
    { key: 'status', title: '状态', width: 12 },
    { key: 'createdAt', title: '创建时间', width: 18 },
  ];

  exportToExcel(data, columns, `文档列表_${new Date().getTime()}.xlsx`);
};
