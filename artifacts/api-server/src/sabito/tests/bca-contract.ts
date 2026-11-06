import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { pool } from "../database";
import { createConversation } from "../conversations";
import { handleIntent } from "../intents";
import { bcaReadOperations } from "../bca-contract";
import { bcaSourceDrafts } from "../bca-source-drafts";
import { bcaDialogueDrafts } from "../bca-dialogue-rules";
import { bcaNovemberDrafts } from "../bca-november-questions";

/** Real Sabito/MySQL bridge with a deliberately simulated BCA worker.
 * Real Eloquent handlers are tested separately by the supplied PHP tests.
 */
export async function verifyBcaContract({app,adminKey,projectIds}:any) {
  const created=await request(app).post("/v1/admin/projects").set("X-Admin-Key",adminKey).send({
    slug:`bca-contract-${randomUUID()}`,name:"BCA",assistant_name:"Sabito",
    system_prompt:"Réponses issues exclusivement des références approuvées.",
  }).expect(201);
  const {project,credentials}=created.body.data;projectIds.push(project.id);
  const claims={sub:project.id,clientId:credentials.clientId,externalUserId:"101",scope:["chat:connect","member:verified"]};
  const url=`/v1/admin/projects/${project.id}/assistant-settings`;
  const initial=(await request(app).get(url).set("X-Admin-Key",adminKey).expect(200)).body;
  const settings=initial.settings;
  settings.intents.forEach((intent:any,index:number)=>{intent.triggers=[`consultation contractuelle operation ${index}`];});
  await request(app).put(url).set("X-Admin-Key",adminKey).send({settings,expected_revision:initial.revision}).expect(200);
  const poll=(operations:readonly string[]=bcaReadOperations)=>request(app).post("/v1/backend/jobs/poll")
    .auth(credentials.clientId,credentials.clientSecret).send({operations});
  async function finish(pending:Promise<string|null>,result:any) {
    let jobs:any[]=[];
    for(let attempt=0;attempt<100&&!jobs.length;attempt++) {
      jobs=(await poll().expect(200)).body.jobs;
      if(!jobs.length)await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert.equal(jobs.length,1);
    assert.equal(jobs[0].external_user_id,"101");
    await request(app).post(`/v1/backend/jobs/${jobs[0].id}/result`)
      .auth(credentials.clientId,credentials.clientSecret).send({result}).expect(200);
    return {answer:String(await pending),job:jobs[0]};
  }
  async function start(operation:string,external=claims) {
    const definition=settings.intents.find((i:any)=>i.backend_function===operation);
    const conversation=await createConversation(project.id,external.externalUserId);
    const first=await handleIntent(external,conversation,definition.triggers[0]);
    return {conversation,definition,first};
  }
  const drafts=await pool.query(`SELECT d.title,d.status FROM sabito_core.knowledge_documents d
    JOIN sabito_core.knowledge_reviews r ON r.document_id=d.id AND r.project_id=d.project_id WHERE d.project_id=$1`,[project.id]);
  for(const draft of bcaSourceDrafts)assert.ok(drafts.rows.some(row=>row.title===draft.title&&row.status==="pending"));
  const approval=(await pool.query("SELECT id FROM sabito_core.knowledge_documents WHERE project_id=$1 AND title=$2",
    [project.id,bcaSourceDrafts[0].title])).rows[0];
  await request(app).post(`/v1/admin/projects/${project.id}/knowledge-review/${approval.id}/decision`)
    .set("X-Admin-Key",adminKey).send({decision:"approve"}).expect(200);
  const untouched=await pool.query("SELECT COUNT(*) AS n FROM sabito_core.knowledge_documents WHERE project_id=$1 AND status='pending'",[project.id]);
   assert.equal(Number(untouched.rows[0].n),bcaSourceDrafts.length+bcaDialogueDrafts.length+bcaNovemberDrafts.length-1);
  await poll().expect(200);
  for(const operation of bcaReadOperations) {
    const guest=await start(operation,{...claims,externalUserId:"widget-guest:fixture",scope:["chat:connect"]});
    assert.match(String(guest.first),/connectez/i);
    assert.deepEqual((await poll().expect(200)).body.jobs,[]);
    const {conversation,definition}=await start(operation);
    let pending=handleIntent(claims,conversation,"oui");
    if(definition.fields.length) {
      assert.match(String(await pending),new RegExp(definition.fields[0].prompt.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
      pending=handleIntent(claims,conversation,operation==="digital_product_review"?"71":"FIXTURE-REFERENCE");
    }
    const data=operation==="wallet_balance"?{statut:"Soldes du compte",solde_principal:10,solde_usd:1,devise_principale:"XAF",devise_usd:"USD"}:
      operation==="referral_code"?{statut:"Code de parrainage",code_parrain:"FIXTURE-CODE"}:
      operation==="leader_reward_status"?{statut:"Récompense confirmée",periode:"2026-11-01",montant_credite:10}:
      operation==="digital_product_review"?{statut:"approved",reference:"71",produit:"Formation"}:
      operation==="referral_commissions_recent"?{statut:"consultation effectuée",nombre:1,commissions:"Commission 1 — paid"}:
      operation==="ads_publisher_status"?{statut:"active",test_valide:true,taux_configure:0.6}:
      operation==="bca_catalogue_current"?{statut:"consultation effectuée",catalogue:"Formations : Catalogue de test"}:
      {statut:"Lecture confirmée",reference:"FIXTURE-REFERENCE",montant:10};
    const result=await finish(pending,{status:"confirmed",data});
    assert.equal(result.job.operation,operation);
    assert.deepEqual(result.job.fields,definition.fields.length?{[definition.fields[0].name]:operation==="digital_product_review"?"71":"FIXTURE-REFERENCE"}:{});
    assert.doesNotMatch(result.answer,/ticket|indisponible|ne peux pas/i);
  }
  for(const result of [
    {status:"pending",data:{statut:"pending",reference:"71",produit:"Formation"}},
    {status:"ok",data:{statut:"rejected",reference:"71",produit:"Formation",motif:"Lien de livraison inaccessible"}},
    {status:"ok",data:{statut:"rejected",reference:"71",produit:"Formation",motif:null}},
    {status:"not_found"},
    {status:"forbidden"},
    {status:"error"},
  ]) {
    const check=await start("digital_product_review");
    await handleIntent(claims,check.conversation,"oui");
    const finished=await finish(handleIntent(claims,check.conversation,"71"),result);
    if(result.data?.statut==="pending")assert.match(finished.answer,/aucun délai/i);
    if(result.data?.motif)assert.match(finished.answer,/Lien de livraison inaccessible/);
    if(result.data?.statut==="rejected"&&!result.data.motif)assert.match(finished.answer,/motif.*fourni|inventer/i);
    if(!result.data||result.data.statut==="rejected"&&!result.data.motif)
      assert.equal((await pool.query("SELECT status FROM sabito_core.support_tickets WHERE conversation_id=$1",
        [check.conversation])).rows[0]?.status,"ouvert");
  }
  const emptyCommissions=await start("referral_commissions_recent");
  const empty=await finish(handleIntent(claims,emptyCommissions.conversation,"oui"),{status:"not_found"});
  assert.doesNotMatch(empty.answer,/0 F|zéro commission|aucune commission due/i);
  assert.equal((await pool.query("SELECT status FROM sabito_core.support_tickets WHERE conversation_id=$1",
    [emptyCommissions.conversation])).rows[0]?.status,"ouvert");
  const {conversation}=await start("deposit_status");
  await handleIntent(claims,conversation,"oui");
  const missing=await finish(handleIntent(claims,conversation,"WRONG"),{status:"not_found"});
  assert.match(missing.answer,/renvoyez/);
  assert.equal((await pool.query("SELECT status FROM sabito_core.support_tickets WHERE conversation_id=$1",[conversation])).rows[0]?.status,"ouvert");
  const corrected=await finish(handleIntent(claims,conversation,"CORRECT"),{status:"confirmed",data:{statut:"Dépôt reçu",reference:"CORRECT",montant:10}});
  assert.match(corrected.answer,/Dépôt reçu/);
  assert.equal((await pool.query("SELECT status FROM sabito_core.support_tickets WHERE conversation_id=$1",[conversation])).rows[0]?.status,"ferme");
  for(const status of ["error","forbidden","confirmed"]) {
    const check=await start("wallet_balance");
    const result=await finish(handleIntent(claims,check.conversation,"oui"),{status});
    assert.match(result.answer,/ne signifie pas.*échoué/);
    assert.equal((await pool.query("SELECT status FROM sabito_core.support_tickets WHERE conversation_id=$1",[check.conversation])).rows[0]?.status,"ouvert");
  }
  await poll([]).expect(200);
  const unsupported=await start("wallet_balance");
  assert.match(String(await handleIntent(claims,unsupported.conversation,"oui")),/n’est pas annoncée/);
  assert.deepEqual((await poll([]).expect(200)).body.jobs,[]);
  // No worker replies to this job: exercise the actual 20-second timeout.
  await poll().expect(200);
  const timeout=await start("wallet_balance");
  assert.match(String(await handleIntent(claims,timeout.conversation,"oui")),/ne signifie pas.*échoué/);
}
