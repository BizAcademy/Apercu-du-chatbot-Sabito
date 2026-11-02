import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
import {webcrypto} from "node:crypto";

const code=await readFile(new URL("../../artifacts/sabito-web/public/widget/sabito-chat.js",import.meta.url),"utf8");
const projectId="f816caa4-94b1-4fbd-bc81-b14b581d08cd";
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
function setup({dataset={},provider,status=200,draggable=true}={}){
  const requests=[],messages=[],timeouts=[],intervals=[];
  class Element {
    style={};events={};children=[];attributes={};
    classList={add(){},remove(){},toggle(){}};
    addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
    emit(name,event={}){for(const fn of this.events[name]??[])fn(event);}
    setAttribute(k,v){this.attributes[k]=v;}
    appendChild(child){this.children.push(child);}
    insertBefore(child){this.children.push(child);}
    remove(){}
    focus(){}
    getBoundingClientRect(){
      const left=parseFloat(this.style.left)||800,top=parseFloat(this.style.top)||700;
      const width=this===elements[".btn"]?180:380,height=this===elements[".btn"]?46:620;
      return {left,top,right:left+width,bottom:top+height,width,height};
    }
    setPointerCapture(id){this.capture=id;}
    hasPointerCapture(id){return this.capture===id;}
    releasePointerCapture(){this.capture=null;}
  }
  const elements=Object.fromEntries([".btn",".panel",".err",".msg",".avatar",".retry",".close"].map(s=>[s,new Element()]));
  const root={querySelector:s=>elements[s],innerHTML:""};
  const host=new Element();host.attachShadow=()=>root;
  const doc=new Element();
  doc.currentScript={dataset:{apiUrl:"https://sabito.example",productCode:"bca",...dataset}};
  doc.body=new Element();doc.documentElement=doc.body;doc.querySelector=()=>null;
  doc.createElement=tag=>{
    if(tag==="div")return host;
    const e=new Element();e.contentWindow={postMessage(m){messages.push(m);}};
    return e;
  };
  const win=new Element();win.console=console;win.innerWidth=1024;win.innerHeight=768;
  if(provider)win.SabitoWidgetSession=provider;
  const fetch=async(url,options={})=>{
    requests.push({url:String(url),options});
    if(String(url).includes("/config"))return Response.json({project_id:projectId,draggable});
    if(status!==200&&!String(url).includes("/v1/widget/"))return new Response("missing",{status});
    return Response.json({access_token:"test-token",external_user_id:"widget-guest:test",expires_in:900,identity_type:"guest"});
  };
  runInNewContext(code,{window:win,document:doc,location:{href:"https://bca.example/dashboard",origin:"https://bca.example"},
    URL,AbortController,Uint8Array,crypto:webcrypto,console,fetch,
    setInterval:fn=>{intervals.push(fn);return intervals.length;},
    setTimeout:(fn,delay)=>{timeouts.push({fn,delay});return timeouts.length;},clearTimeout(){}});
  const send=type=>{
    const iframe=elements[".panel"].children.at(-1);
    // insertBefore appends the frame in this minimal DOM.
    const url=new URL(iframe.src);
    win.emit("message",{origin:"https://sabito.example",source:iframe.contentWindow,
      data:{type,channel:url.searchParams.get("channel")}});
  };
  return {win,root,elements,requests,messages,send,intervals,timeouts};
}
test("Product-only public embed resolves its tenant and never calls a missing host session route",async()=>{
  const f=setup();await settle();f.win.SabitoWidget.open();f.send("sabito:session-request");await settle();
  assert.ok(f.requests.some(r=>r.url.endsWith(`/v1/widget/${projectId}/session`)));
  assert.ok(!f.requests.some(r=>r.url.includes("/api/sabito/session")));
  assert.equal(f.messages.at(-1).type,"sabito:session");
  assert.equal(f.messages.at(-1).session.visitor,true);
});
test("An explicit member session URL wins over projectId; 404 never silently becomes a guest",async()=>{
  const f=setup({dataset:{projectId,sessionUrl:"/api/v2/sabito/session"},status:404});
  await settle();f.win.SabitoWidget.open();f.send("sabito:session-request");await settle();
  assert.ok(f.requests.some(r=>r.url==="https://bca.example/api/v2/sabito/session"));
  assert.ok(!f.requests.some(r=>r.url.includes(`/v1/widget/${projectId}/session`)));
  const error=f.messages.at(-1);
  assert.equal(error.code,"member_session_missing");assert.equal(error.canVisit,true);
  assert.match(error.message,/route de session membre/);
  f.send("sabito:visitor-request");await settle();
  assert.ok(f.requests.some(r=>r.url.includes(`/v1/widget/${projectId}/session`)));
  assert.equal(f.messages.at(-1).session.visitor,true);
});
test("A custom member adapter is retained and authentication rejection does not fall back",async()=>{
  let calls=0;
  const f=setup({dataset:{projectId},provider:async()=>{calls++;return new Response("",{status:401});}});
  await settle();f.win.SabitoWidget.open();f.send("sabito:session-request");await settle();
  assert.equal(calls,1);assert.equal(f.messages.at(-1).code,"unauthenticated");
  assert.ok(!f.requests.some(r=>r.url.includes("/session")));
});
test("Pointer dragging is bounded, does not open on release, and server disable restores fixed placement",async()=>{
  const f=setup();await settle();
  const btn=f.elements[".btn"];
  assert.equal(btn.style.touchAction,"none");
  const event={isPrimary:true,button:0,pointerId:1,clientX:820,clientY:710,preventDefault(){}};
  btn.emit("pointerdown",event);
  btn.emit("pointermove",{...event,clientX:40,clientY:40});
  assert.equal(btn.style.left,"20px");assert.equal(btn.style.top,"30px");
  btn.emit("pointermove",{...event,clientX:3000,clientY:-500});
  assert.equal(btn.style.left,"836px");assert.equal(btn.style.top,"8px");
  btn.emit("pointerup",event);btn.emit("click",{preventDefault(){}});
  assert.equal(btn.attributes["aria-expanded"],undefined);
  for(const timer of f.timeouts.filter(t=>t.delay===0))timer.fn();
  btn.emit("click",{preventDefault(){}});
  assert.equal(btn.attributes["aria-expanded"],"true");
  // A second instance represents a platform whose administrator disabled movement.
  const fixed=setup({draggable:false});await settle();
  const fixedBtn=fixed.elements[".btn"];
  fixedBtn.emit("pointerdown",event);fixedBtn.emit("pointermove",{...event,clientX:1,clientY:1});
  assert.equal(fixedBtn.style.left,"");assert.equal(fixedBtn.style.touchAction,"");
  assert.equal(fixed.requests.length,1);
});
