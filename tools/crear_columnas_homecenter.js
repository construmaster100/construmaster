const XLSX = require('xlsx');

const ARCHIVO = 'D:\\Modelo de Presupuesto\\Presupuesto de obra\\pages\\catalogo homecenter\\docs\\catalogo HOMECENTER.xlsx';

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['NOMBRE PRODUCTO', 'PRECIO', 'CATEGORIA', 'IMAGEN'],
]);
ws['!cols'] = [{ wch: 55 }, { wch: 16 }, { wch: 30 }, { wch: 35 }];
XLSX.utils.book_append_sheet(wb, ws, 'Catalogo Homecenter');
XLSX.writeFile(wb, ARCHIVO);

console.log('OK ->', ARCHIVO);
