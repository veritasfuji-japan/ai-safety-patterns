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

test("malformed inputs fail closed", () => {
  const a = {actor:"a",action:"transfer",target:"x",amount:100};
  for(const invalid of [null,undefined,{}, {...a, amount:true}, {...a, amount:0}, {...a,amount:2**53}, {...a,target:""}]) {
    for(const improved of [true,false]) {
      assert.equal(m.bound(invalid,a,improved),"DENY");
      assert.equal(m.bound(a,invalid,improved),"DENY");
    }
  }
  for(const order of [null,undefined,"typo","",{},1]) {
    for(const improved of [true,false]) assert.equal(m.revocation(order,improved),"DENY");
  }
  assert.equal(m.approval(true,"false",true),"DENY");
  assert.equal(m.approval(true,null,false),"DENY");
  assert.equal(m.outcome("true","matching",true),"UNKNOWN");
  assert.equal(m.outcome(true,"invalid",false),"UNKNOWN");
  assert.equal(m.bound(a,a,undefined),"DENY");
});

test("Prompt Injection positive, negative and malformed cases", () => {
  for(const [args,bad,good] of [[["injected-command",false],"ALLOW","DENY"],[["ordinary-data",false],"DENY","DENY"],[["ordinary-data",true],"ALLOW","ALLOW"],[["injected-command",true],"ALLOW","ALLOW"]]) {
    assert.equal(m.injection(...args,false),bad);
    assert.equal(m.injection(...args,true),good);
  }
  for(const args of [["bad",true],["injected-command","true"],[null,true]]) for(const improved of [true,false]) assert.equal(m.injection(...args,improved),"DENY");
  assert.equal(m.injection(...["injected-command",false],"true"),"DENY");
});
test("Replay Attack positive, negative and malformed cases", () => {
  for(const [args,bad,good] of [[[true,true],"ALLOW","DENY"],[[true,false],"ALLOW","ALLOW"],[[false,false],"DENY","DENY"],[[false,true],"DENY","DENY"]]) {
    assert.equal(m.replay(...args,false),bad);
    assert.equal(m.replay(...args,true),good);
  }
  for(const args of [["true",false],[true,"false"],[null,false]]) for(const improved of [true,false]) assert.equal(m.replay(...args,improved),"DENY");
  assert.equal(m.replay(...[true,true],"true"),"DENY");
});
test("Policy Drift positive, negative and malformed cases", () => {
  for(const [args,bad,good] of [[["v1","v2",true],"ALLOW","DENY"],[["v1","v1",true],"ALLOW","ALLOW"],[["v2","v2",true],"ALLOW","ALLOW"],[["v1","v1",false],"DENY","DENY"]]) {
    assert.equal(m.policyDrift(...args,false),bad);
    assert.equal(m.policyDrift(...args,true),good);
  }
  for(const args of [["","v1",true],["v1","bad",true],["v1","v1","true"]]) for(const improved of [true,false]) assert.equal(m.policyDrift(...args,improved),"DENY");
  assert.equal(m.policyDrift(...["v1","v2",true],"true"),"DENY");
});
test("Trust Boundary positive, negative and malformed cases", () => {
  for(const [args,bad,good] of [[[true,false],"ALLOW","DENY"],[[true,true],"ALLOW","ALLOW"],[[false,true],"DENY","DENY"],[[false,false],"DENY","DENY"]]) {
    assert.equal(m.trustBoundary(...args,false),bad);
    assert.equal(m.trustBoundary(...args,true),good);
  }
  for(const args of [["true",true],[true,"true"],[true,null]]) for(const improved of [true,false]) assert.equal(m.trustBoundary(...args,improved),"DENY");
  assert.equal(m.trustBoundary(...[true,false],"true"),"DENY");
});
test("Effect Uncertainty positive, negative and malformed cases", () => {
  for(const [args,bad,good] of [[["unknown",true],"RETRY","HOLD"],[["not-applied",true],"RETRY","RETRY"],[["applied",true],"STOP","STOP"],[["not-applied",false],"HOLD","HOLD"],[["unknown",false],"HOLD","HOLD"]]) {
    assert.equal(m.effectUncertainty(...args,false),bad);
    assert.equal(m.effectUncertainty(...args,true),good);
  }
  for(const args of [["bad",true],["unknown","true"],[null,true]]) for(const improved of [true,false]) assert.equal(m.effectUncertainty(...args,improved),"HOLD");
  assert.equal(m.effectUncertainty(...["unknown",true],"true"),"HOLD");
});
