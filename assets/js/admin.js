/* Admin dashboard. API remains inactive until a development backend is configured. */
(() => {
"use strict";
const API_BASE=window.FAS_API_BASE||"";
const $=id=>document.getElementById(id);
const loginPanel=$("login-panel"),adminPanel=$("admin-panel"),form=$("scholarship-form");
let records=[];
function msg(id,text,type=""){const el=$(id);el.textContent=text;el.className="message"+(type?" "+type:"");}
async function api(path,options={}){
 const response=await fetch(API_BASE+path,{method:options.method||"GET",credentials:"include",headers:options.body?{"Content-Type":"application/json"}:{},body:options.body?JSON.stringify(options.body):undefined});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"Request failed.");
 return data;
}
function splitCsv(value){return value.split(",").map(x=>x.trim()).filter(Boolean);}
function formData(){
 return {title:$("title").value.trim(),provider:$("provider").value.trim(),destination_country:$("destination").value.trim(),study_levels:splitCsv($("levels").value),subject_areas:splitCsv($("subjects").value),funding_type:$("funding").value,funding_details:$("funding-details").value.trim(),eligibility_summary:$("eligibility").value.trim(),application_deadline:$("deadline").value,official_url:$("official-url").value.trim(),source_checked_at:$("checked").value,verification_status:$("verification").value,publication_status:$("publication").value};
}
function clearForm(){
 form.reset();$("record-id").value="";$("checked").value=new Date().toISOString().slice(0,10);$("form-title").textContent="Add scholarship";$("save-button").textContent="Save scholarship";msg("form-message","");
}
function fillForm(item){
 $("record-id").value=item.id;$("title").value=item.title;$("provider").value=item.provider;$("destination").value=item.destination_country;
 $("levels").value=JSON.parse(item.study_levels||"[]").join(", ");$("subjects").value=JSON.parse(item.subject_areas||"[]").join(", ");
 $("funding").value=item.funding_type;$("funding-details").value=item.funding_details||"";$("eligibility").value=item.eligibility_summary;
 $("deadline").value=item.application_deadline||"";$("checked").value=item.source_checked_at;$("official-url").value=item.official_url;
 $("verification").value=item.verification_status;$("publication").value=item.publication_status;
 $("form-title").textContent="Edit scholarship";$("save-button").textContent="Update scholarship";window.scrollTo({top:0,behavior:"smooth"});
}
function cell(text){const td=document.createElement("td");td.textContent=text||"—";return td;}
async function renderFieldReviews(candidate,container){
 let extracted={};try{extracted=JSON.parse(candidate.extracted_data_json||"{}");}catch{}
 const groups=[];
 const rule=extracted.structured_suggestions||{};
 for(const [key,items] of [["funding",rule.funding],["study_levels",rule.study_levels],["eligibility",rule.eligibility],["deadlines",rule.deadline_phrases]]){
  for(const item of Array.isArray(items)?items:[])groups.push({field:key,value:typeof item==="string"?item:item.value,evidence:typeof item==="string"?item:item.evidence,confidence:item.confidence||"rule-based"});
 }
 const ai=extracted.ai_review||{};
 for(const key of ["funding","study_levels","eligibility","deadlines"]){
  for(const item of Array.isArray(ai[key])?ai[key]:[])groups.push({field:key,value:item.value,evidence:item.evidence,confidence:item.confidence||"low",origin:"AI"});
 }
 const wrap=document.createElement("details");wrap.style.marginTop="8px";
 const heading=document.createElement("summary");heading.textContent="Review individual extracted fields ("+groups.length+")";wrap.append(heading);
 const list=document.createElement("div");list.style.marginTop="8px";
 if(!groups.length){const note=document.createElement("p");note.textContent="No structured field suggestions yet. Run Extract details or AI-assisted review first.";list.append(note);}
 groups.forEach((item,index)=>{
  if(!item.value||!item.evidence)return;
  const card=document.createElement("div");card.style.borderTop="1px solid #ddd";card.style.padding="8px 0";
  const label=document.createElement("strong");label.textContent=item.field.replace("_"," ")+" · "+(item.origin||"rule-based")+" · "+item.confidence;card.append(label);
  const value=document.createElement("p");value.textContent="Suggestion: "+item.value;card.append(value);
  const evidence=document.createElement("p");evidence.textContent="Evidence: “"+item.evidence+"”";card.append(evidence);
  const decision=document.createElement("span");decision.style.marginRight="8px";
  for(const choice of ["approved","rejected"]){
   const button=document.createElement("button");button.className="btn "+(choice==="rejected"?"danger":"secondary");button.type="button";button.textContent=choice==="approved"?"Approve evidence":"Reject suggestion";button.style.margin="3px";
   button.addEventListener("click",async()=>{
    button.disabled=true;
    try{
     const result=await api("/api/admin/discovery/candidates/"+candidate.id+"/field-reviews",{method:"POST",body:{field_key:item.field,suggested_value:item.value,evidence_text:item.evidence,source_url:candidate.official_url,decision:choice}});
     decision.textContent="Recorded: "+choice+". "+result.message;msg("candidate-message",result.message,"success");
    }catch(error){msg("candidate-message",error.message,"error");button.disabled=false;}
   });
   decision.append(button);
  }
  card.append(decision);list.append(card);
 });
 const historyButton=document.createElement("button");historyButton.className="btn secondary";historyButton.type="button";historyButton.textContent="View field review history";historyButton.style.marginTop="8px";
 historyButton.addEventListener("click",async()=>{
  try{const data=await api("/api/admin/discovery/candidates/"+candidate.id+"/field-reviews");const history=document.createElement("pre");history.style.whiteSpace="pre-wrap";history.style.fontSize="12px";history.textContent=JSON.stringify(data.reviews||[],null,2);list.append(history);historyButton.disabled=true;}
  catch(error){msg("candidate-message",error.message,"error");}
 });
 list.append(historyButton);wrap.append(list);container.append(wrap);
}

function render(){
 const body=$("records");body.replaceChildren();
 if(!records.length){const tr=document.createElement("tr"),td=cell("No scholarship records yet.");td.colSpan=6;tr.append(td);body.append(tr);return;}
 for(const item of records){
  const tr=document.createElement("tr");
  const name=cell(item.title+" · "+item.provider);tr.append(name,cell(item.destination_country),cell(item.application_deadline),cell(item.verification_status),cell(item.publication_status));
  const actions=cell("");
  const edit=document.createElement("button");edit.className="btn secondary";edit.type="button";edit.textContent="Edit";edit.addEventListener("click",()=>fillForm(item));
  const archive=document.createElement("button");archive.className="btn danger";archive.type="button";archive.textContent="Archive";archive.style.marginLeft="6px";archive.addEventListener("click",()=>archiveRecord(item.id));
  actions.append(edit,archive);tr.append(actions);body.append(tr);
 }
}
async function loadRecords(){
 if(!API_BASE){msg("list-message","Preview only: connect a development API to load records.");return;}
 msg("list-message","Loading…");
 try{const data=await api("/api/admin/scholarships");records=data.scholarships||[];render();msg("list-message",records.length+" record(s) loaded.","success");}
 catch(error){msg("list-message",error.message,"error");}
}
async function archiveRecord(id){
 if(!confirm("Archive this scholarship? It will no longer appear in the public directory."))return;
 try{await api("/api/admin/scholarships/"+id,{method:"DELETE"});await loadRecords();}
 catch(error){msg("list-message",error.message,"error");}
}
$("login-form").addEventListener("submit",async event=>{
 event.preventDefault();if(!API_BASE){msg("login-message","Admin sign-in is not active until the backend is configured.","error");return;}
 try{await api("/api/auth/login",{method:"POST",body:{email:$("email").value.trim(),password:$("password").value}});const me=await api("/api/auth/me");if(me.user.role!=="admin")throw new Error("This account does not have administrator permissions.");loginPanel.classList.add("hidden");adminPanel.classList.remove("hidden");await loadRecordsWithDiscovery();}
 catch(error){msg("login-message",error.message,"error");}
});
form.addEventListener("submit",async event=>{
 event.preventDefault();if(!API_BASE){msg("form-message","Save is disabled until the development backend is connected.","error");return;}
 const id=$("record-id").value;const button=$("save-button");button.disabled=true;msg("form-message","Saving…");
 try{await api(id?"/api/admin/scholarships/"+id:"/api/admin/scholarships",{method:id?"PATCH":"POST",body:formData()});clearForm();msg("form-message","Scholarship saved.","success");await loadRecords();}
 catch(error){msg("form-message",error.message,"error");}
 finally{button.disabled=false;}
});
$("reset-button").addEventListener("click",clearForm);
$("refresh-button").addEventListener("click",loadRecords);
$("logout-button").addEventListener("click",async()=>{
 try{await api("/api/auth/logout",{method:"POST"});}catch{}
 adminPanel.classList.add("hidden");loginPanel.classList.remove("hidden");$("password").value="";msg("login-message","Signed out.");
});
clearForm();

async function loadSources(){
 if(!API_BASE){msg("source-message","Preview only: backend is not configured.");return;}
 try{const data=await api("/api/admin/discovery/sources");const body=$("sources");body.replaceChildren();for(const s of data.sources||[]){const tr=document.createElement("tr");for(const value of [s.name,s.official_domain,s.source_type,s.country,s.last_checked_at])tr.append(cell(value));const action=cell("");const scan=document.createElement("button");scan.className="btn secondary";scan.type="button";scan.textContent="Check source";scan.addEventListener("click",()=>scanSource(s.id,scan));action.append(scan);tr.append(action);body.append(tr);}msg("source-message",(data.sources||[]).length+" source(s) registered.","success");}
 catch(error){msg("source-message",error.message,"error");}
}
async function scanSource(id,button){if(!confirm("Fetch this registered official page now and look for scholarship-related links? Only same-domain links will enter the private review queue."))return;button.disabled=true;button.textContent="Checking…";try{const result=await api("/api/admin/discovery/sources/"+id+"/check",{method:"POST",body:{}});msg("source-message","Scan complete: "+result.candidates_found+" new candidate(s), "+result.duplicates+" duplicate(s). Nothing was published.","success");await loadCandidates();await loadRuns();}catch(error){msg("source-message",error.message,"error");}finally{button.disabled=false;button.textContent="Check source";}}
async function loadRuns(){if(!API_BASE)return;try{const data=await api("/api/admin/discovery/runs");const body=$("discovery-runs");if(!body)return;body.replaceChildren();for(const run of data.runs||[]){const tr=document.createElement("tr");for(const value of [run.source_name,run.status,run.started_at,run.candidates_found,run.error_summary])tr.append(cell(value));body.append(tr);}}catch(error){msg("candidate-message",error.message,"error");}}
async function loadCandidates(){
 if(!API_BASE){msg("candidate-message","Preview only: backend is not configured.");return;}
 const status=$("candidate-filter").value;const query=status?"?status="+encodeURIComponent(status):"";
 try{const data=await api("/api/admin/discovery/candidates"+query);const body=$("candidates");body.replaceChildren();for(const c of data.candidates||[]){const tr=document.createElement("tr");tr.append(cell(c.title+" · "+c.provider),cell(c.source_name),cell(c.application_deadline));const sourceStatus=cell(c.last_source_check_at?("Checked: "+c.last_source_check_at+(c.latest_source_changed?" · CHANGED — review required":" · no change detected")):"Not checked yet");tr.append(sourceStatus);const linkCell=cell("");const link=document.createElement("a");link.href=c.official_url;link.target="_blank";link.rel="noopener noreferrer";link.textContent="Open official page";linkCell.append(link);tr.append(linkCell);const review=cell("");const select=document.createElement("select");for(const [value,label] of [["pending","Pending"],["needs_review","Needs review"],["accepted","Accepted"],["rejected","Rejected"],["duplicate","Duplicate"]]){const option=document.createElement("option");option.value=value;option.textContent=label;select.append(option);}select.value=c.review_status;select.addEventListener("change",async()=>{try{await api("/api/admin/discovery/candidates/"+c.id,{method:"PATCH",body:{review_status:select.value,review_notes:c.review_notes||""}});msg("candidate-message","Review status updated. No public listing was created.","success");await loadCandidates();}catch(error){msg("candidate-message",error.message,"error");select.value=c.review_status;}});review.append(select);const extract=document.createElement("button");extract.className="btn secondary";extract.type="button";extract.textContent="Extract details";extract.style.marginTop="6px";extract.addEventListener("click",async()=>{if(!confirm("Inspect this candidate page on its registered official domain and save suggested details for review?"))return;extract.disabled=true;try{const result=await api("/api/admin/discovery/candidates/"+c.id+"/extract",{method:"POST",body:{}});const e=result.extracted||{};const details=document.createElement("details");const summary=document.createElement("summary");summary.textContent="View extracted suggestions";const pre=document.createElement("pre");pre.style.whiteSpace="pre-wrap";pre.style.fontSize="12px";pre.textContent=JSON.stringify(e,null,2);details.append(summary,pre);review.append(details);msg("candidate-message","Suggestions extracted. Refreshing the queue so each field can be reviewed individually.","success");await loadCandidates();}catch(error){msg("candidate-message",error.message,"error");}finally{extract.disabled=false;}});review.append(document.createElement("br"),extract);const aiExtract=document.createElement("button");aiExtract.className="btn secondary";aiExtract.type="button";aiExtract.textContent="AI-assisted review";aiExtract.style.marginTop="6px";aiExtract.addEventListener("click",async()=>{if(!confirm("Send text from this registered official page to the configured Workers AI model for evidence-backed suggestions? Review the quotations manually. Nothing will be published."))return;aiExtract.disabled=true;try{const result=await api("/api/admin/discovery/candidates/"+c.id+"/ai-extract",{method:"POST",body:{}});const details=document.createElement("details");details.open=true;const heading=document.createElement("summary");heading.textContent="AI-assisted suggestions · "+(result.extracted?.model||"model");const pre=document.createElement("pre");pre.style.whiteSpace="pre-wrap";pre.style.fontSize="12px";pre.textContent=JSON.stringify(result.extracted||{},null,2);details.append(heading,pre);review.append(details);msg("candidate-message",result.message||"AI suggestions returned. Refreshing the queue for field-level review.","success");await loadCandidates();}catch(error){msg("candidate-message",error.message,"error");}finally{aiExtract.disabled=false;}});review.append(document.createElement("br"),aiExtract);const history=document.createElement("button");history.className="btn secondary";history.type="button";history.textContent="Source history";history.style.marginTop="6px";history.addEventListener("click",async()=>{try{const data=await api("/api/admin/discovery/candidates/"+c.id+"/history");const details=document.createElement("details");details.open=true;const heading=document.createElement("summary");heading.textContent="Official page check history ("+(data.snapshots||[]).length+")";const pre=document.createElement("pre");pre.style.whiteSpace="pre-wrap";pre.style.fontSize="12px";pre.textContent=JSON.stringify(data.snapshots||[],null,2);details.append(heading,pre);review.append(details);}catch(error){msg("candidate-message",error.message,"error");}});review.append(document.createElement("br"),history);renderFieldReviews(c,review);if(c.review_status==="accepted"&&!c.scholarship_id){const draft=document.createElement("button");draft.className="btn secondary";draft.type="button";draft.textContent="Create draft";draft.style.marginTop="6px";draft.addEventListener("click",async()=>{if(!confirm("Create an unpublished scholarship draft? All eligibility and funding details will remain unverified."))return;draft.disabled=true;try{const result=await api("/api/admin/discovery/candidates/"+c.id+"/create-draft",{method:"POST",body:{}});msg("candidate-message",result.message,"success");await loadRecords();await loadCandidates();}catch(error){msg("candidate-message",error.message,"error");draft.disabled=false;}});review.append(document.createElement("br"),draft);}else if(c.scholarship_id){review.append(document.createElement("small")).textContent="Draft created";}tr.append(review);body.append(tr);}msg("candidate-message",(data.candidates||[]).length+" candidate(s) loaded.","success");}
 catch(error){msg("candidate-message",error.message,"error");}
}
$("source-form").addEventListener("submit",async event=>{event.preventDefault();if(!API_BASE){msg("source-message","Registration is disabled until the backend is configured.","error");return;}const button=$("source-save");button.disabled=true;try{const data={name:$("source-name").value,official_domain:$("source-domain").value,source_url:$("source-url").value,source_type:$("source-type").value,country:$("source-country").value,check_frequency_days:Number($("source-frequency").value),notes:$("source-notes").value};await api("/api/admin/discovery/sources",{method:"POST",body:data});event.target.reset();$("source-frequency").value="14";msg("source-message","Official source registered. No scan was started.","success");await loadSources();}catch(error){msg("source-message",error.message,"error");}finally{button.disabled=false;}});
$("source-refresh").addEventListener("click",loadSources);
$("candidate-refresh").addEventListener("click",loadCandidates);
$("candidate-filter").addEventListener("change",loadCandidates);

const originalLoadRecords=loadRecords;
const loadRecordsWithDiscovery=async()=>{await originalLoadRecords();await loadSources();await loadCandidates();await loadRuns();};
})();