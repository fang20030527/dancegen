import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = "/Users/cathug/Documents/ai舞蹈生成器/模版收集/社媒舞蹈视频采集";
const csvPath = `${root}/social_dance_videos_100_one_year.csv`;
const outputPath = `${root}/一年内高互动短视频舞蹈视频100条.xlsx`;
const previewPath = `${root}/xlsx_work/preview_top100.png`;
const notesPreviewPath = `${root}/xlsx_work/preview_notes_100.png`;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function toNumber(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

const csvText = await fs.readFile(csvPath, "utf8");
const rows = parseCsv(csvText);
rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
const dataRows = rows.slice(1);
const platformCounts = dataRows.reduce((acc, row) => {
  acc[row[0]] = (acc[row[0]] || 0) + 1;
  return acc;
}, {});
const platformSummary = Object.entries(platformCounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([platform, count]) => `${platform} ${count} 条`)
  .join("；");
const typedRows = rows.map((row, rowIndex) => {
  if (rowIndex === 0) return row;
  return row.map((value, colIndex) => {
    if ([1, 2, 8, 9, 10].includes(colIndex)) return toNumber(value);
    if (colIndex === 6) return toDate(value);
    return value;
  });
});

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Top 100");
sheet.getRangeByIndexes(0, 0, typedRows.length, typedRows[0].length).values = typedRows;
sheet.showGridLines = false;

const used = sheet.getUsedRange();
used.format = {
  font: { name: "Aptos", size: 10, color: "#111827" },
  wrapText: false,
};

const header = sheet.getRange("A1:M1");
header.format = {
  fill: "#111827",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
header.format.rowHeightPx = 34;

sheet.freezePanes.freezeRows(1);
sheet.tables.add(`A1:M${typedRows.length}`, true, "DanceVideosTable");

sheet.getRange("B:C").format.numberFormat = "#,##0";
sheet.getRange("I:J").format.numberFormat = "#,##0";
sheet.getRange("K:K").format.numberFormat = "#,##0";
sheet.getRange("G:G").format.numberFormat = "yyyy-mm-dd";

const widths = {
  A: 18,
  B: 12,
  C: 12,
  D: 24,
  E: 32,
  F: 34,
  G: 14,
  H: 70,
  I: 14,
  J: 12,
  K: 10,
  L: 34,
  M: 32,
};
for (const [col, width] of Object.entries(widths)) {
  sheet.getRange(`${col}:${col}`).format.columnWidth = width;
}
sheet.getRange("E:F").format.wrapText = true;
sheet.getRange("H:H").format.wrapText = true;
sheet.getRange("L:M").format.wrapText = true;
sheet.getRange(`A2:M${typedRows.length}`).format.rowHeightPx = 56;
sheet.getRange(`A2:M${typedRows.length}`).format = {
  verticalAlignment: "top",
  borders: {
    insideHorizontal: { style: "thin", color: "#E5E7EB" },
  },
};
sheet.getRange(`E2:F${typedRows.length}`).format.wrapText = false;
sheet.getRange(`H2:H${typedRows.length}`).format.wrapText = true;
sheet.getRange(`L2:M${typedRows.length}`).format.wrapText = true;
sheet.getRange(`A2:A${typedRows.length}`).format.font = { bold: true };

const notes = workbook.worksheets.add("说明");
notes.showGridLines = false;
notes.getRange("A1:B1").merge();
notes.getRange("A1:B1").values = [["一年内高互动短视频舞蹈视频采集说明"]];
notes.getRange("A1").format = {
  fill: "#111827",
  font: { bold: true, color: "#FFFFFF", size: 14 },
};
notes.getRange("A1:B1").format.rowHeightPx = 32;
notes.getRange("A3:B12").values = [
  ["采集日期", "2026-06-28"],
  ["时间范围", "一年内：2025-06-28 至 2026-06-28。保留原 50 条，并新增 50 条不重复视频；新增批次优先选择可公开下载的 TikTok 视频。"],
  ["筛选口径", "单人或多人面对镜头的竖屏舞蹈/编舞/舞蹈挑战/舞队表演/短视频舞蹈趋势；按点赞数和评论数加权排序，并剔除明显非真人舞蹈、游戏/动画、儿童、擦边和非舞蹈内容。"],
  ["平台分布", platformSummary],
  ["互动字段", "点赞数、评论数来自公开视频页面或公开 embed/元数据接口；采集后可能继续变化。"],
  ["封面字段", "视频封面为公开封面 URL，部分平台 URL 会过期。"],
  ["使用提醒", "这些链接和封面适合内部调研，不建议直接搬运原视频作为落地页素材。"],
  ["数据文件", csvPath],
  ["输出文件", outputPath],
  ["备注", "Instagram 公开页面常不暴露视频文件地址；本次新增下载批次优先选择无需登录即可解析的视频。"],
];
notes.getRange("A3:A12").format = {
  fill: "#F3F4F6",
  font: { bold: true },
};
notes.getRange("A3:B12").format = {
  borders: {
    insideHorizontal: { style: "thin", color: "#E5E7EB" },
    outside: { style: "thin", color: "#D1D5DB" },
  },
  wrapText: true,
  verticalAlignment: "top",
};
notes.getRange("A:A").format.columnWidth = 18;
notes.getRange("B:B").format.columnWidth = 92;

const inspect = await workbook.inspect({
  kind: "table",
  range: "Top 100!A1:M8",
  include: "values",
  tableMaxRows: 8,
  tableMaxCols: 13,
});
console.log(inspect.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "Top 100",
  range: "A1:M16",
  scale: 1,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const notesPreview = await workbook.render({
  sheetName: "说明",
  range: "A1:B12",
  scale: 1,
  format: "png",
});
await fs.writeFile(notesPreviewPath, new Uint8Array(await notesPreview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, previewPath, notesPreviewPath }));
