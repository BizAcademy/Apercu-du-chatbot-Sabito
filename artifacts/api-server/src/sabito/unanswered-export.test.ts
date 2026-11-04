import test from "node:test";
import assert from "node:assert/strict";
import { unansweredCsv } from "./unanswered-export";

test("CSV exports every row, French UTF-8 headers, quoted delimiters and multiline text",()=>{
  const rows=Array.from({length:125},(_,i)=>({
    id:String(i),question:i===0?'Où est le dépôt ; "Wave" ?\nDeuxième ligne':`Question ${i}`,
    statut:"a_traiter",nombre_de_fois_posee:i+1,
    date_creation:new Date("2026-11-04T00:00:00Z"),derniere_date:"2026-11-04 01:00:00",
    utilisateur_id:"PRIVATE_MEMBER_ID",
  }));
  const csv=unansweredCsv(rows);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"Où est le dépôt ; ""Wave"" ?\nDeuxième ligne"'));
  assert.ok(csv.includes('"Question 124"'));
  assert.ok(csv.includes('"2026-11-04T00:00:00.000Z"'));
  assert.ok(!csv.includes("PRIVATE_MEMBER_ID"));
});

test("CSV neutralizes spreadsheet formulas, including leading whitespace",()=>{
  for(const question of ["=1+1","+SUM(A1)","-1+1","@SUM(A1)","  =1+1","\t=1+1","\r=1+1","\n=1+1"]){
    const csv=unansweredCsv([{id:"1",question,statut:"traite",nombre_de_fois_posee:1,
      date_creation:"",derniere_date:""}]);
    assert.ok(csv.includes(`"'${question}"`));
    assert.ok(csv.includes('"Traitée"'));
  }
});

test("An empty CSV is still a valid header-only file",()=>{
  const csv=unansweredCsv([]);
  assert.equal(csv.trim().split("\r\n").length,1);
  assert.ok(csv.includes("Nombre de fois posée"));
});
