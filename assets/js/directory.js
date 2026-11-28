/* Public verified scholarship directory. */
(() => {
"use strict";
const API_BASE=window.FAS_API_BASE||"https://fund-africa-scholars-api.jamesrono96.workers.dev";
const $=id=>document.getElementById(id);
const PAGE_SIZE=20;
let currentOffset=0;
let hasMore=false;
$("year").textContent=new Date().getFullYear();
const initialParams=new URLSearchParams(window.location.search);
for(const key of ["q","country","level","subject","funding","deadline","eligibility"]){const value=initialParams.get(key);if(value!==null&&$(key))$(key).value=value;}
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function safeArray(value){try{const parsed=JSON.parse(value||"[]");return Array.isArray(parsed)?parsed:[];}catch{return [];}}
function render(items, rootId="results", countId="count"){
 const root=$(rootId);root.replaceChildren();if(countId)$(countId).textContent=items.length+" opportunities";
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
async function loadRecommendations(){
 try{
  const response=await fetch(API_BASE+"/api/student/recommendations",{headers:{Accept:"application/json"},credentials:"include"});
  if(response.status===402){
   $("recommendations").classList.remove("hidden");
   $("recommendation-note").textContent="Personalised recommendations are a premium feature. Scholarship browsing and searching remain free; a one-time USD $5 lifetime membership unlocks all five premium tools. Payment activation is not available yet.";
   return;
  }
  if(!response.ok)return;
  const data=await response.json();
  if(!Array.isArray(data.scholarships)||!data.scholarships.length){
   if(data.message){$("recommendations").classList.remove("hidden");$("recommendation-note").textContent=data.message+" You can update these in your student dashboard.";}
   return;
  }
  $("recommendations").classList.remove("hidden");
  $("recommendation-note").textContent="Matched to your preferred destinations: "+(data.based_on||[]).join(", ")+". These are destination matches, not an eligibility assessment.";
  render(data.scholarships,"recommended-results",null);
 }catch{/* Recommendations are optional; public directory remains available. */}
}
async function search(event, offset=0){
 if(event)event.preventDefault();
 currentOffset=offset;
 const params=new URLSearchParams();
 const values={q:$("q").value.trim(),country:$("country").value.trim(),level:$("level").value,subject:$("subject").value.trim(),funding:$("funding").value,deadline:$("deadline").value,eligibility:$("eligibility").value.trim()};
 for(const [key,value] of Object.entries(values)){if(value)params.set(key,value);}
 params.set("limit",String(PAGE_SIZE));
 params.set("offset",String(currentOffset));
 $("status").textContent="Searching verified listings…";$("count").textContent="";$("results").replaceChildren(node("div","Searching…","empty"));
 try{
  const response=await fetch(API_BASE+"/api/scholarships?"+params.toString(),{headers:{Accept:"application/json"},credentials:"omit"});
  if(!response.ok)throw new Error(response.status===404?"The scholarship API is not connected yet.":"Scholarship listings are temporarily unavailable.");
  const data=await response.json();const items=Array.isArray(data.scholarships)?data.scholarships:[];
  hasMore=Boolean(data.has_more);
  render(items);
  $("pagination").hidden=!items.length;
  $("previous-page").disabled=currentOffset===0;
  $("next-page").disabled=!hasMore;
  $("page-label").textContent="Page "+(Math.floor(currentOffset/PAGE_SIZE)+1);
  $("status").textContent=items.length?"Showing verified opportunities. Confirm details on each official provider website.":"No published verified scholarships are available for this search yet.";
 }catch(error){$("results").replaceChildren(node("div","The directory is being prepared. Scholarship records will appear here once the database and API are connected.","empty"));$("status").textContent=error.message;}
}
$("filter-form").addEventListener("submit",event=>search(event,0));
$("previous-page").addEventListener("click",()=>search(null,Math.max(0,currentOffset-PAGE_SIZE)));
$("next-page").addEventListener("click",()=>{if(hasMore)search(null,currentOffset+PAGE_SIZE);});
search();
loadRecommendations();
})();