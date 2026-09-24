const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "data.json"), "utf-8"));

async function main() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventario");

  sheet.columns = [
    { header: "NOMBRE DEL PRODUCTO", key: "nombre", width: 45 },
    { header: "PRECIO", key: "precio", width: 18 },
    { header: "CATEGORIA", key: "categoria", width: 25 },
    { header: "IMAGEN", key: "imagen", width: 60 },
  ];

  data.sort((a, b) =>
    a.categoria === b.categoria
      ? a.nombre.localeCompare(b.nombre)
      : a.categoria.localeCompare(b.categoria)
  );

  for (const item of data) {
    const row = sheet.addRow({
      nombre: item.nombre,
      precio: item.precio,
      categoria: item.categoria,
      imagen: item.imagen,
    });
    const imgCell = row.getCell(4);
    imgCell.value = { text: item.imagen, hyperlink: item.imagen };
    imgCell.font = { color: { argb: "FF0563C1" }, underline: true };
  }

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  sheet.autoFilter = { from: "A1", to: "D1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const outPath = path.join(__dirname, "inventario_corona.xlsx");
  await workbook.xlsx.writeFile(outPath);
  console.log(`Excel generado: ${outPath} (${data.length} productos)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
