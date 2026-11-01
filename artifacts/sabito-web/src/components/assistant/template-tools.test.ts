import assert from "node:assert/strict";
import test from "node:test";
import { blankIntent } from "./validate";
import { appendIntentTemplates, backendInstallationExample } from "./template-tools";

test("Adding missing templates preserves custom and disabled operations, collisions and removals", () => {
  const existing={...blankIntent([]),id:"wallet_balance",backend_function:"custom_balance",enabled:true};
  const template={...blankIntent([]),id:"wallet_balance",backend_function:"wallet_balance"};
  const result=appendIntentTemplates([existing],[template]);
  assert.equal(result[0],existing);
  assert.equal(result[1].id,"wallet_balance_2");
  assert.equal(result[1].enabled,false);
  assert.deepEqual(appendIntentTemplates(result,[template]),result);
  result[1].triggers.push("personnalisé");
  assert.equal(template.triggers.includes("personnalisé"),false);
  const full=Array.from({length:100},(_,i)=>({...existing,id:`intent_${i}`,backend_function:`operation_${i}`}));
  assert.equal(appendIntentTemplates(full,[template]).length,100);
});

test("Connector examples contain actual enabled handlers and exact collection fields only", () => {
  const template={...blankIntent([]),id:"transfer_status",backend_function:"transfer_status",enabled:true,
    name:"Transfert\n// exemple",fields:[{name:"transfer_reference",prompt:"Référence",type:"text" as const,min_length:1,max_length:128}]};
  const disabled={...template,id:"activity_reward_status",backend_function:"activity_reward_status",enabled:false};
  const example=backendInstallationExample([template,{...template,id:"other_transfer"},disabled]);
  assert.equal((example.match(/async transfer_status/g)??[]).length,1);
  assert.match(example,/job.fields.transfer_reference/);
  assert.doesNotMatch(example,/async activity_reward_status|async account_activation/);
  assert.match(example,/Laravel/);
  assert.match(example,/throw new Error/);
});
