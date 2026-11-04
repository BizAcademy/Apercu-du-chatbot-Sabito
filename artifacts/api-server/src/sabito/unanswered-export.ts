type ExportRow = {
  id: string; question: string; statut: string; nombre_de_fois_posee: number;
  date_creation: string | Date; derniere_date: string | Date;
};

function cell(value: unknown) {
  let text=value instanceof Date?value.toISOString():String(value??"");
  // Quoting alone does not stop Excel/LibreOffice from executing formulas.
  if(/^[\s\u0000-\u001f]*[=+\-@]|^[\t\r\n]/u.test(text))text="'"+text;
  return `"${text.replace(/"/g,'""')}"`;
}

/** Excludes member/conversation columns. Free-text questions may still contain private data. */
export function unansweredCsv(rows: ExportRow[]) {
  const lines=[
    ["Identifiant question","Question","Statut","Nombre de fois posée","Première occurrence","Dernière occurrence"],
    ...rows.map(row=>[row.id,row.question,row.statut==="traite"?"Traitée":"À traiter",
      row.nombre_de_fois_posee,row.date_creation,row.derniere_date]),
  ];
  return "\uFEFF"+lines.map(line=>line.map(cell).join(";")).join("\r\n")+"\r\n";
}
