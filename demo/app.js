"use strict";
const $=id=>document.getElementById(id);
const translations={
en:{tagline:"Read it. Run it. Verify it.",intro:"Five hands-on lessons about AI execution authority. Change the scenario, compare outcomes and inspect the code.",run:"Run comparison",reset:"Reset",unsafe:"Unsafe design",improved:"Improved design",choice:"Choose a scenario",limits:"What this does not prove",code:"Python examples ↗",footer:"Educational simulations only. No real external actions, API keys or production guarantees.",compare:"Results compare a toy unsafe policy with one scoped improvement.",labels:{ALLOW:"ALLOW",DENY:"DENY",CONFIRMED:"CONFIRMED",UNKNOWN:"UNKNOWN"}},
ja:{tagline:"読んで、試して、検証する。",intro:"AIの実行権限を学ぶ5つの教材。条件を変え、結果を比較し、コードを確認できます。",run:"比較を実行",reset:"リセット",unsafe:"危険な設計",improved:"改善した設計",choice:"条件を選択",limits:"保証しないこと",code:"Python実装例 ↗",footer:"教育用シミュレーションです。外部操作・APIキーは不要。本番環境の保証はありません。",compare:"危険な簡易モデルと、限定的な改善モデルの比較結果です。",labels:{ALLOW:"許可",DENY:"拒否",CONFIRMED:"確認済み",UNKNOWN:"不明"}}};
const lessons=[
{id:"01",name:["Single-Use Authority","実行権限の単回消費"],intro:["32 requests compete for one authority.","1つの権限に32件の要求が競合。"],href:"single-use.html"},
{id:"02",name:["Bound Authority","実行対象の紐付け"],intro:["Can an approved transfer be redirected or changed?","承認済みの送金の宛先や金額は変更できるか。"],choices:[["Original approved operation","承認どおりの操作"],["Replace recipient","宛先を変更"],["Increase amount","金額を増やす"],["Replace actor","実行者を変更"],["Replace action","操作を変更"]],run:(i,improved)=>{const {approved,requested}=bindingScenario(i);return SafetyModels.bound(approved,requested,improved)},bad:["Checks only that an approval exists.","承認の存在だけを確認。"],good:["Compares actor, action, target and amount to the approved fields.","実行者・操作・対象・金額を承認内容と照合。"],limits:["Assumes authentic immutable approval and typed canonical fields; does not authenticate or atomically consume it.","真正で変更不能な承認と正規化済みの型を仮定。認証や原子的消費は扱いません。"]},
{id:"03",name:["Revocation Race","取消しと送信許可の競合"],intro:["A positive check is followed by revocation or dispatch reservation.","最初の有効確認の後に、取消しまたは送信予約が成立。"],choices:[["Revocation commits first","取消しが先に確定"],["Dispatch reservation commits first","送信予約が先に確定"]],run:(i,improved)=>SafetyModels.revocation(i===0?"revoke-first":"dispatch-first",improved),bad:["Reuses the old positive check.","過去の有効確認を再利用。"],good:["Orders revocation and dispatch reservation in one modeled state transition.","取消しと送信予約を同じ状態遷移の順序で扱う。"],limits:["This models reservation only, not network send. A reservation that won first may still fail or have unknown effects. No distributed store or durable ordering is tested in the browser.","予約のみを扱い、ネットワーク送信ではありません。予約が先でも失敗や結果不明はあり得ます。ブラウザでは分散ストアや永続的順序を検証しません。"]},
{id:"04",name:["Human Approval","人間による承認"],intro:["A model recommends an operation. Does advice grant authority?","AIが操作を推奨。推奨は実行権限になるか。"],choices:[["AI recommends; human has not approved","AI推奨・人間未承認"],["AI recommends; human approved","AI推奨・人間承認済み"],["No recommendation; no approval","推奨なし・未承認"],["No recommendation; human approved","推奨なし・人間承認済み"]],run:(i,improved)=>SafetyModels.approval(i<2,i===1||i===3,improved),bad:["Treats a recommendation as permission.","推奨を実行許可として扱う。"],good:["Requires a separate approval signal.","独立した承認信号を要求する。"],limits:["The approval flag is synthetic, not evidence of human identity, intent, signature or current authorization.","承認フラグは合成データであり、人間の本人性・意思・署名・現在有効な権限の証拠ではありません。"]},
{id:"05",name:["Outcome Evidence","実行結果の証拠"],intro:["The agent reports success. Can an independent observation confirm it?","AIが成功を報告。独立した観測で確認できるか。"],choices:[["Success report only","成功報告のみ"],["Matching observation","一致する観測あり"],["Mismatched observation","不一致の観測あり"],["Timeout / no observation","タイムアウト・観測なし"],["No report; matching observation","報告なし・一致する観測あり"]],run:(i,improved)=>SafetyModels.outcome(i<3,i===1||i===4?"matching":i===2?"mismatched":"missing",improved),bad:["Promotes a self-report to confirmed effect.","自己報告を確認済み結果として扱う。"],good:["Requires matching observation; otherwise remains unknown.","一致する観測を要求。それ以外は不明のまま。"],limits:["Observation is a synthetic trusted input; real deployments need source authentication, binding, freshness and reconciliation. Unknown is not proof of failure.","観測は信頼済みと仮定した合成入力です。実運用では情報源の認証・紐付け・鮮度・調停が必要。不明は失敗の証明ではありません。"]}
];
let lang=new URLSearchParams(location.search).get("lang")==="ja"?"ja":"en",current=null,selected=0,ran=false;
const slugs={"02":"bound-authority","03":"revocation-race","04":"human-approval","05":"outcome-evidence"};
const fields=["actor","action","target","amount"];
function bindingScenario(i) {
  const approved={actor:"agent-a",action:"transfer",target:"account-a",amount:100};
  const requested={...approved};
  if(i===1)requested.target="account-b";
  if(i===2)requested.amount=1000;
  if(i===3)requested.actor="agent-b";
  if(i===4)requested.action="delete";
  return {approved,requested};
}
function renderDetails(){
  const details=$("details");details.replaceChildren();details.hidden=current.id!=="02";
  if(details.hidden)return;
  const {approved,requested}=bindingScenario(selected);
  const table=document.createElement("table");table.className="diff-table";
  const header=table.createTHead().insertRow();
  for(const name of l([["Field","Approved","Requested"],["項目","承認内容","実行要求"]])){
    const th=document.createElement("th");th.scope="col";th.textContent=name;header.append(th);
  }
  const body=table.createTBody();
  for(const k of fields){
    const row=body.insertRow();const changed=approved[k]!==requested[k];
    const th=document.createElement("th");th.scope="row";th.textContent=k;row.append(th);
    row.insertCell().textContent=String(approved[k]);
    const cell=row.insertCell();cell.textContent=String(requested[k])+(changed?l([" (changed)","（変更）"]):"");
    if(changed)cell.className="changed";
  }
  details.append(table);
}
function selectFromHash(){
  const slug=location.hash.slice(1);
  const lesson=lessons.find(item=>slugs[item.id]===slug);
  current=lesson||null;selected=0;ran=false;
  if(current){renderLab();$("lab").scrollIntoView({block:"start"});}
  else $("lab").hidden=true;
}
const l=pair=>pair[lang==="en"?0:1];
function renderCatalog(){const t=translations[lang];document.documentElement.lang=lang;$("lang").textContent=lang==="en"?"日本語":"English";for(const k of ["tagline","intro","footer"])$(k).textContent=t[k];$("catalog").replaceChildren();for(const lesson of lessons){const node=document.createElement("a");node.className="tile";node.href=lesson.href?lesson.href+(lang==="ja"?"?lang=ja":""):"#"+slugs[lesson.id];if(!lesson.href)node.onclick=e=>{if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;if(location.hash===node.hash){e.preventDefault();selectFromHash();} };const label=document.createElement("span");label.className="eyebrow";label.textContent="PATTERN "+lesson.id;const title=document.createElement("strong");title.textContent=l(lesson.name);const p=document.createElement("p");p.textContent=l(lesson.intro);node.append(label,title,p);$("catalog").append(node)}}
function renderLab(){if(!current)return;const t=translations[lang];$("lab").hidden=false;$("lab-number").textContent="PATTERN "+current.id;$("lab-title").textContent=l(current.name);$("scenario").textContent=l(current.intro);$("choice-label").textContent=t.choice;$("choice").replaceChildren();current.choices.forEach((v,i)=>{const o=document.createElement("option");o.value=i;o.textContent=l(v);$("choice").append(o)});$("choice").value=selected;renderDetails();$("run").textContent=t.run;$("reset").textContent=t.reset;$("unsafe").textContent=t.unsafe;$("improved").textContent=t.improved;$("limit-title").textContent=t.limits;$("limits").textContent=l(current.limits);$("code-link").textContent=t.code;$("bad-explanation").textContent=l(current.bad);$("good-explanation").textContent=l(current.good);const bad=ran?current.run(selected,false):null,good=ran?current.run(selected,true):null;for(const [id,result,improved] of [["bad-result",bad,false],["good-result",good,true]]){const el=$(id);el.textContent=result?t.labels[result]:"—";const tone=!result?"":result==="UNKNOWN"?"unknown":bad===good?"":improved?"protected":(bad==="ALLOW"||bad==="CONFIRMED")?"risk":"";el.className="result"+(tone?" "+tone:"")}$("verdict").textContent=ran?t.compare:""}
$("lang").onclick=()=>{lang=lang==="en"?"ja":"en";const url=new URL(location.href);if(lang==="ja")url.searchParams.set("lang","ja");else url.searchParams.delete("lang");history.replaceState(null,"",url);renderCatalog();renderLab()};$("choice").onchange=()=>{selected=Number($("choice").value);ran=false;renderLab()};$("run").onclick=()=>{ran=true;renderLab()};$("reset").onclick=()=>{selected=0;ran=false;renderLab()};renderCatalog();window.addEventListener("hashchange",selectFromHash);selectFromHash();
