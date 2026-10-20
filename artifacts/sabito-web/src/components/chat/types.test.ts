import assert from "node:assert/strict";
import { test } from "node:test";
import { applyComplete, fromHistory, type CompleteEvent } from "./types.ts";

test("animate new answers but never replay history or duplicate events", () => {
  const event:CompleteEvent={conversationId:"conversation",messageId:"reply",content:"Bonjour"};
  assert.equal(applyComplete([],event)[0].animate,true);
  assert.equal(applyComplete([], {...event,replayed:true})[0].animate,false);
  const history=fromHistory([{id:"reply",role:"assistant",content:"Bonjour",status:"completed"}]);
  assert.equal(applyComplete(history,event)[0].animate,undefined);
  const live=applyComplete([{id:"reply",role:"assistant",content:"",pending:true,animate:true}],event);
  assert.equal(live[0].animate,true);
  assert.equal(applyComplete(live,event).length,1);
});
