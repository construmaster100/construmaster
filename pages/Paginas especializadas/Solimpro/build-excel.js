// COMANDO 1: Excel a partir de data.json
// Uso: copiar a la carpeta del sitio (junto a data.json) y correr `node build-excel.js`
// Requiere data.json con formato [{ nombre, precio, categoria, imagen, ... }]
// Genera inventario_<carpeta>.xlsx con columnas NOMBRE DEL PRODUCTO, PRECIO, CATEGORIA, IMAGEN.

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const DATA_PATH = path.join(__dirname, "data.json");
const SITE_NAME = path.basename(__dirname);

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventario");

  sheet.columns = [
    { header: "NOMBRE DEL PRODUCTO", key: "nombre", width: 45 },
    { header: "PRECIO", key: "precio", width: 16 },
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
      precio: item.precio || "Consultar",
      categoria: item.categoria || "SIN CATEGORIA",
      imagen: item.imagen,
    });
    const imgCell = row.getCell(4);
    if (item.imagen) {
      imgCell.value = { text: item.imagen, hyperlink: item.imagen };
      imgCell.font = { color: { argb: "FF0563C1" }, underline: true };
    }
  }

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  sheet.autoFilter = { from: "A1", to: "D1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const outPath = path.join(__dirname, `inventario_${SITE_NAME.toLowerCase()}.xlsx`);
  await workbook.xlsx.writeFile(outPath);
  console.log(`Excel generado: ${outPath} (${data.length} productos)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
