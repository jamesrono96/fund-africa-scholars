/* Public verified scholarship directory. */
(() => {
"use strict";
const API_BASE=window.FAS_API_BASE||"";
const $=id=>document.getElementById(id);
$("year").textContent=new Date().getFullYear();
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function safeArray(value){try{const parsed=JSON.parse(value||"[]");return Array.isArray(parsed)?parsed:[];}catch{return [];}}
function render(items){
 const root=$("results");root.replaceChildren();$("count").textContent=items.length+" opportunities";
 if(!items.length){root.append(node("div","No verified scholarships match these filters yet. Try another search later.","empty"));return;}
 for(const item of items){
  const card=node("article",undefined,"card");
  card.append(node("span",item.funding_type.replaceAll("_"," "),"tag"));
  const titleLink=node("a",item.title);
  titleLink.href="scholarship.html?id="+encodeURIComponent(item.id);
  titleLink.className="detail-link";
  const titleHeading=node("h3");
  titleHeading.append(titleLink);
  card.append(titleHeading);
  card.append(node("div",item.provider,"provider"));
  const meta=node("div",undefined,"meta");
  const destination=node("div");destination.append(node("strong","DESTINATION"),document.createTextNode(item.destination_country||"Not specified"));
  const level=node("div");level.append(node("strong","STUDY LEVEL"),document.createTextNode(safeArray(item.study_levels).join(", ")||"See provider"));
  const deadline=node("div");deadline.append(node("strong","DEADLINE"),document.createTextNode(item.application_deadline||"Check provider"));
  const funding=node("div");funding.append(node("strong","FUNDING"),document.createTextNode(item.funding_details||item.funding_type.replaceAll("_"," ")));
  meta.append(destination,level,deadline,funding);card.append(meta);
  card.append(node("p",item.eligibility_summary,"summary"));
  const foot=node("div",undefined,"cardfoot");
  const link=node("a","Official application ↗","official");link.href=item.official_url;link.target="_blank";link.rel="noopener noreferrer";
  const checked=node("span","Source checked: "+(item.source_checked_at||"not recorded"),"checked");
  foot.append(link,checked);card.append(foot);root.append(card);
 }
}
async function search(event){
 if(event)event.preventDefault();
 const params=new URLSearchParams();
 const values={q:$("q").value.trim(),country:$("country").value.trim(),level:$("level").value,subject:$("subject").value.trim(),funding:$("funding").value,deadline:$("deadline").value,eligibility:$("eligibility").value.trim()};
 for(const [key,value] of Object.entries(values)){if(value)params.set(key,value);}
 params.set("limit","50");
 $("status").textContent="Searching verified listings…";$("count").textContent="";$("results").replaceChildren(node("div","Searching…","empty"));
 try{
  const response=await fetch(API_BASE+"/api/scholarships?"+params.toString(),{headers:{Accept:"application/json"},credentials:"omit"});
  if(!response.ok)throw new Error(response.status===404?"The scholarship API is not connected yet.":"Scholarship listings are temporarily unavailable.");
  const data=await response.json();const items=Array.isArray(data.scholarships)?data.scholarships:[];
  render(items);$("status").textContent=items.length?"Showing verified opportunities. Confirm details on each official provider website.":"No published verified scholarships are available for this search yet.";
 }catch(error){$("results").replaceChildren(node("div","The directory is being prepared. Scholarship records will appear here once the database and API are connected.","empty"));$("status").textContent=error.message;}
}
$("filter-form").addEventListener("submit",search);
search();
})();