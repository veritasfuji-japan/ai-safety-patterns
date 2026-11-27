const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("./demo/model.js");
test("binding compares all four fields", () => {
  const a = {actor:"a",action:"transfer",target:"x",amount:100};
  assert.equal(m.bound(a,a,true),"ALLOW");
  for(const [k,v] of [["actor","b"],["action","delete"],["target","y"],["amount",999]]) {
    assert.equal(m.bound(a,{...a,[k]:v},false),"ALLOW");
    assert.equal(m.bound(a,{...a,[k]:v},true),"DENY");
  }
});
test("reservation order", () => {
  assert.equal(m.revocation("revoke-first",false),"ALLOW");
  assert.equal(m.revocation("revoke-first",true),"DENY");
  assert.equal(m.revocation("dispatch-first",true),"ALLOW");
});
test("approval independent of advice", () => {
  for(const rec of [true,false]) for(const approval of [true,false])
    assert.equal(m.approval(rec,approval,true),approval?"ALLOW":"DENY");
  assert.equal(m.approval(true,false,false),"ALLOW");
});
test("unknown is not confirmed", () => {
  for(const observation of ["missing","mismatched"]) {
    assert.equal(m.outcome(true,observation,false),"CONFIRMED");
    assert.equal(m.outcome(true,observation,true),"UNKNOWN");
  }
  assert.equal(m.outcome(true,"matching",true),"CONFIRMED");
  assert.equal(m.outcome(false,"missing",true),"UNKNOWN");
});
