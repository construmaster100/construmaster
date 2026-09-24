Option Explicit
Dim xl, book, sheet, fso, folder, file, files, map, row, lastRow, name, key, imagePath, jsonPath, text, startPos, endPos, productJson, nameKey
Dim sourcePath, catalogPath, imagesPath
sourcePath = "F:\Modelo de Presupuesto\Presupuesto de obra\pages\catalogo comfer\V1 Construmaster.xlsm"
catalogPath = "F:\Modelo de Presupuesto\Presupuesto de obra\pages\catalogo comfer\catalogo_comfer.xlsx"
imagesPath = "F:\Modelo de Presupuesto\Presupuesto de obra\pages\catalogo comfer\imagenes"
jsonPath = "F:\Modelo de Presupuesto\Presupuesto de obra\pages\catalogo comfer\js\productos_v1.js"
Set fso = CreateObject("Scripting.FileSystemObject")
Set map = CreateObject("Scripting.Dictionary")
Set folder = fso.GetFolder(imagesPath)
For Each file In folder.Files
  If LCase(fso.GetExtensionName(file.Name)) = "svg" Then
    key = Slug(fso.GetBaseName(file.Name))
    If Not map.Exists(key) Then map.Add key, "imagenes/" & file.Name
  End If
Next
Set xl = CreateObject("Excel.Application")
xl.DisplayAlerts = False
xl.Visible = False
Set book = xl.Workbooks.Open(sourcePath, False, True)
Set sheet = book.Worksheets("COMFER")
lastRow = sheet.Cells(sheet.Rows.Count, 1).End(-4162).Row
text = "window.PRODUCTOS_V1 = ["
For row = 5 To lastRow
  name = sheet.Cells(row, 1).Value
  If Len(Trim(CStr(name))) > 0 Then
    key = Slug(CStr(name))
    imagePath = ""
    If map.Exists(key) Then imagePath = map(key)
    text = text & "{""nombre"": """ & JsonEscape(CStr(name)) & """, ""precio"": " & NumberText(sheet.Cells(row, 2).Value) & ", ""categoria"": ""V1 Construmaster"", ""subcategoria"": ""Listado general"", ""imagen"": """ & imagePath & """, ""urlOriginal"": """", ""nota"": ""Importado desde la hoja COMFER de V1 Construmaster.""},"
  End If
Next
If Right(text, 1) = "," Then text = Left(text, Len(text) - 1)
text = text & "];" 
Set file = fso.CreateTextFile(jsonPath, True, True)
file.Write text & vbCrLf
file.Close
book.Close False
Set book = xl.Workbooks.Open(catalogPath)
Set sheet = book.Worksheets("Listado V1")
lastRow = sheet.Cells(sheet.Rows.Count, 1).End(-4162).Row
For row = 2 To lastRow
  name = sheet.Cells(row, 1).Value
  key = Slug(CStr(name))
  sheet.Cells(row, 5).Value = ""
  If map.Exists(key) Then sheet.Cells(row, 5).Value = map(key)
Next
book.Save
book.Close False
xl.Quit
WScript.Echo "Fotos vinculadas"

Function Slug(value)
  value = LCase(value)
  value = Replace(value, "á", "a")
  value = Replace(value, "é", "e")
  value = Replace(value, "í", "i")
  value = Replace(value, "ó", "o")
  value = Replace(value, "ú", "u")
  value = Replace(value, "ñ", "n")
  value = Replace(value, "ü", "u")
  Dim re
  Set re = New RegExp
  re.Global = True
  re.Pattern = "[^a-z0-9]+"
  Slug = re.Replace(value, "-")
  Do While Left(Slug, 1) = "-": Slug = Mid(Slug, 2): Loop
  Do While Right(Slug, 1) = "-": Slug = Left(Slug, Len(Slug) - 1): Loop
End Function

Function JsonEscape(value)
  value = Replace(value, "\", "\\")
  value = Replace(value, Chr(34), "\" & Chr(34))
  JsonEscape = value
End Function

Function NumberText(value)
  NumberText = Replace(CStr(value), ",", ".")
End Function
