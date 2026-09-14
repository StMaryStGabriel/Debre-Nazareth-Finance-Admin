import * as XLSX from "xlsx";

export const downloadExcel = (rows, fileName, sheetName = "Export") => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const columnWidths = Object.keys(rows[0]).map((key) => ({
    wch: Math.min(
      40,
      Math.max(
        key.length + 2,
        ...rows.map((row) => String(row[key] ?? "").length + 2),
      ),
    ),
  }));

  worksheet["!cols"] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(
    workbook,
    fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`,
  );
};
