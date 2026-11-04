import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import express from "express";
import request from "supertest";
import { pool } from "./database";
import { knowledgeReviewRoutes } from "./knowledge-review";
import { recordVariantCandidate } from "./variant-candidates";
import { saveKnowledge } from "./knowledge";

// HTTP/transaction contract tests with a local in-memory database double.
// These do not pretend to validate MySQL DDL or a production installation.
test("Supervised knowledge HTTP and transaction contracts",async t=>{
  const projectId=randomUUID(),documentId=randomUUID(),candidateId=randomUUID();
  const originalQuery=pool.query,originalConnect=pool.connect;
  let row:Record<string,unknown>|undefined;
  const statements:{sql:string;values?:readonly unknown[]}[]=[];
  const query:typeof pool.query=async(sql,values)=>{
    statements.push({sql,values});
    if(sql.includes("FROM sabito_core.projects"))return {rows:[{id:projectId}],rowCount:1};
    if(sql.includes("SELECT variantes_de_question"))return {rows:[{variantes_de_question:'["mon dépôt est bloqué"]'}],rowCount:1};
    if(sql.includes("SELECT d.title,v."))return {rows:[{title:"Question principale",variantes_de_question:"[]"}],rowCount:1};
    if(sql.includes("SELECT d.status")||sql.includes("SELECT v.*,d.title"))return {rows:row?[row]:[],rowCount:row?1:0};
    return {rows:[],rowCount:1};
  };
  pool.query=query;
  pool.connect=async()=>({query,release(){}});
  const app=express();app.use(express.json());
  app.use("/v1/admin",(req,res,next)=>{if(req.header("x-test-admin")!=="fixture")res.sendStatus(401);else next();});
  app.use(knowledgeReviewRoutes);
  const referenceUrl=`/v1/admin/projects/${projectId}/knowledge-review/${documentId}/decision`;
  const variantUrl=`/v1/admin/projects/${projectId}/variant-candidates/${candidateId}/decision`;
  const post=(url:string,decision:string)=>request(app).post(url).set("x-test-admin","fixture").send({decision});
  const reset=()=>{statements.length=0;};
  try{
    await t.test("Review data is administrator-only",async()=>{
      await request(app).get(`/v1/admin/projects/${projectId}/variant-candidates`).expect(401);
    });
    await t.test("Saving a new draft sets pending and stores its provenance atomically",async()=>{
      reset();
      await saveKnowledge(projectId,"Question à vérifier","Réponse rédigée à vérifier avant sa publication.",undefined,undefined,["Variante"],
        [],{category:"Compte",source:"Spécification du propriétaire",keywords:["compte"]});
      assert.ok(statements.some(item=>item.sql.includes("status='pending'")));
      assert.ok(statements.some(item=>item.sql.includes("knowledge_reviews")));
      assert.equal(statements.at(-1)?.sql,"COMMIT");
    });
    await t.test("A draft without 5 distinct variants cannot be approved",async()=>{
      reset();row={status:"pending",category:"Compte",source:"Source propriétaire documentée",keywords_json:'["compte"]',variantes_de_question:'["une seule"]'};
      await post(referenceUrl,"approve").expect(422);
      assert.ok(!statements.some(item=>item.sql.includes("SET status=$1")));
      assert.equal(statements.at(-1)?.sql,"ROLLBACK");
    });
    await t.test("Complete provenance and variants allow explicit approval only",async()=>{
      reset();row={status:"pending",category:"Compte",source:"Source propriétaire documentée",keywords_json:'["compte"]',
        variantes_de_question:JSON.stringify(["Question une","Question deux","Question trois","Question quatre","Question cinq"])};
      await post(referenceUrl,"approve").expect(200);
      const update=statements.find(item=>item.sql.includes("knowledge_documents SET status=$1"));
      assert.deepEqual(update?.values,["ready",documentId,projectId]);
      assert.ok(statements.some(item=>item.sql.includes("knowledge.approved")||item.values?.includes("knowledge.approved")));
      assert.equal(statements.at(-1)?.sql,"COMMIT");
    });
    await t.test("Rejecting knowledge leaves it inactive and invalidates the index",async()=>{
      reset();await post(referenceUrl,"reject").expect(200);
      assert.ok(statements.some(item=>item.values?.[0]==="rejected"));
      assert.ok(statements.some(item=>item.sql.includes("revision=revision+1")));
    });
    await t.test("Unknown or cross-project targets cannot be approved",async()=>{
      row=undefined;reset();await post(referenceUrl,"approve").expect(404);
      assert.ok(statements.find(item=>item.sql.includes("WHERE d.id=$1 AND d.project_id=$2"))?.values?.includes(projectId));
      await post(variantUrl,"approve").expect(404);
    });
    await t.test("Unknown decisions and malformed IDs fail before writes",async()=>{
      reset();await post(variantUrl,"publish-without-review").expect(422);
      assert.equal(statements.length,0);
    });
    await t.test("A pending candidate cannot approve a pending document",async()=>{
      reset();row={id:candidateId,document_id:documentId,title:"Question",status:"pending",document_status:"pending",formulation:"mon dépôt est bloqué"};
      await post(variantUrl,"approve").expect(422);
      assert.ok(!statements.some(item=>item.sql.startsWith("INSERT")));
    });
    await t.test("Rejected variants cannot reactivate themselves",async()=>{
      reset();row={id:candidateId,status:"rejected"};
      await post(variantUrl,"approve").expect(409);
      assert.ok(!statements.some(item=>item.sql.startsWith("INSERT")));
    });
    await t.test("A private candidate cannot become an approved reusable example",async()=>{
      reset();row={id:candidateId,document_id:documentId,title:"Question",status:"pending",document_status:"ready",
        formulation:"mon dépôt BUZZ_12345 alice@example.invalid est bloqué"};
      await post(variantUrl,"approve").expect(422);
      assert.ok(!statements.some(item=>item.sql.startsWith("INSERT")));
    });
    await t.test("Approving an existing formulation does not duplicate it",async()=>{
      reset();row={id:candidateId,document_id:documentId,title:"Question",status:"pending",document_status:"ready",
        formulation:"mon dépôt est bloqué"};
      await post(variantUrl,"approve").expect(200);
      const insert=statements.find(item=>item.sql.includes("INSERT INTO sabito_core.knowledge_question_variants"));
      assert.equal(JSON.parse(String(insert?.values?.[2])).length,1);
    });
    await t.test("A selection only stores a redacted pending candidate, not an active variant",async()=>{
      reset();
      await recordVariantCandidate(projectId,documentId,"mon dépôt BUZZ_123456 +237699123456 alice@example.invalid est bloqué","selection");
      const insert=statements.find(item=>item.sql.includes("INSERT INTO sabito_core.variant_candidates"));
      assert.ok(insert);
      assert.ok(!JSON.stringify(insert.values).includes("123456"));
      assert.ok(!JSON.stringify(insert.values).includes("alice"));
      assert.ok(!statements.some(item=>item.sql.includes("INSERT INTO sabito_core.knowledge_question_variants")));
      assert.ok(!insert.sql.includes("status='pending'"),"A duplicate must not reset a refused candidate");
    });
  }finally{pool.query=originalQuery;pool.connect=originalConnect;}
});
