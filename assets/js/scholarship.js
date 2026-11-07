/* Public verified scholarship detail view and optional signed-in student actions. */
(() => {
"use strict";
const API_BASE=window.FAS_API_BASE||"";
const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get("id");
function say(text,error=false){$("status").textContent=text;$("status").className="status"+(error?" error":"");}
function arrayText(value){try{const a=JSON.parse(value||"[]");return Array.isArray(a)?a.join(", "):"Not specified";}catch{return "Not specified";}}
function fact(label,value){const box=document.createElement("div");box.className="fact";const strong=document.createElement("strong");strong.textContent=label;const span=document.createElement("span");span.textContent=value||"Not specified";box.append(strong,span);$("facts").append(box);}
async function api(path,options={}){const response=await fetch(API_BASE+path,{method:options.method||"GET",credentials:"include",headers:options.body?{"Content-Type":"application/json"}:{},body:options.body?JSON.stringify(options.body):undefined});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Request failed.");return data;}
function safeUrl(value){try{const u=new URL(value);return u.protocol==="https:"?u.href:null;}catch{return null;}}
async function init(){
 if(!id){$("title").textContent="Scholarship not found";say("No scholarship identifier was provided.",true);return;}
 if(!API_BASE){$("title").textContent="Scholarship details";say("The scholarship API is not connected yet. Details will appear when the database is configured.",true);return;}
 try{
  const data=await api("/api/scholarships/"+encodeURIComponent(id));const s=data.scholarship;
  document.title=s.title+" | Fund Africa Scholars";$("title").textContent=s.title;$("provider").textContent=s.provider;$("funding-tag").textContent=(s.funding_type||"Scholarship").replaceAll("_"," ");
  fact("Destination",s.destination_country);fact("Study levels",arrayText(s.study_levels));fact("Deadline",s.application_deadline||"Check official provider");fact("Funding type",(s.funding_type||"Unspecified").replaceAll("_"," "));fact("Source last checked",s.source_checked_at||"Not recorded");
  $("description").textContent=s.description||"Refer to the official provider website for the full opportunity description.";
  $("eligibility").textContent=s.eligibility_summary||"See the official provider website.";
  $("subjects").textContent=arrayText(s.subject_areas)+" · "+arrayText(s.study_levels);
  $("funding").textContent=s.funding_details||"Funding details have not been specified. Confirm directly with the provider.";
  $("source").textContent="Official source: "+s.official_url+"\nLast checked: "+(s.source_checked_at||"Not recorded")+"\nVerification status: Verified";
  const href=safeUrl(s.official_url);if(href)$("official-link").href=href;else $("official-link").classList.add("hidden");
  $("save-button").addEventListener("click",async()=>{try{await api("/api/student/saved",{method:"POST",body:{scholarship_id:s.id}});say("Scholarship saved to your account.");}catch(e){say(e.message+" Sign in first if you have not already.",true);}});
  $("track-button").addEventListener("click",async()=>{try{await api("/api/student/applications",{method:"POST",body:{scholarship_id:s.id}});say("Scholarship added to your application tracker.");}catch(e){say(e.message+" Sign in first if you have not already.",true);}});
 }catch(e){$("title").textContent="Scholarship unavailable";say(e.message,true);}
}
init();
})();