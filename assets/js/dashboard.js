/* Student dashboard. API_BASE is intentionally unset until backend configuration. */
(() => {
  "use strict";
  const API_BASE = window.FAS_API_BASE || "";
  const $ = id => document.getElementById(id);
  let activeTab = "saved";
  let saved = [];
  let applications = [];
  const status = $("status");
  function message(text, error = false) {
    status.textContent = text;
    status.className = "message" + (error ? " error" : "");
  }
  async function api(path, options = {}) {
    const response = await fetch(API_BASE + path, {
      method: options.method || "GET",
      credentials: "include",
      headers: options.body ? { "Content-Type": "application/json" } : {},
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to load this section.");
    return data;
  }
  function safeDate(value) {
    if (!value) return "Deadline not stated";
    const date = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function officialLink(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return null;
      const link = node("a", "", "Official scholarship information ↗");
      link.href = parsed.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return link;
    } catch { return null; }
  }
  function renderSaved() {
    const root = $("saved-list");
    root.replaceChildren();
    if (!saved.length) {
      root.append(node("p", "empty", "You have not saved any scholarships yet. Explore the directory to find opportunities."));
      return;
    }
    for (const item of saved) {
      const card = node("article", "item");
      card.append(node("h3", "", item.title), node("div", "meta", item.provider + " · " + item.destination_country + " · Deadline: " + safeDate(item.application_deadline)));
      const actions = node("div", "actions");
      const link = officialLink(item.official_url);
      if (link) actions.append(link);
      const track = node("button", "btn", "Add to tracker");
      track.type = "button";
      track.addEventListener("click", async () => {
        track.disabled = true;
        try {
          await api("/api/student/applications", { method: "POST", body: { scholarship_id: item.id } });
          await loadApplications();
          message("Scholarship added to your application tracker.");
        } catch (error) { message(error.message, true); }
        finally { track.disabled = false; }
      });
      const remove = node("button", "btn secondary", "Remove saved");
      remove.type = "button";
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        try {
          await api("/api/student/saved/" + encodeURIComponent(item.id), { method: "DELETE" });
          saved = saved.filter(x => x.id !== item.id);
          renderSaved();
          message("Saved scholarship removed.");
        } catch (error) { message(error.message, true); }
        finally { remove.disabled = false; }
      });
      actions.append(track, remove);
      card.append(actions);
      root.append(card);
    }
  }
  function renderApplications() {
    const root = $("apps-list");
    root.replaceChildren();
    if (!applications.length) {
      root.append(node("p", "empty", "Your application tracker is empty. Add a scholarship from your saved list."));
      return;
    }
    for (const item of applications) {
      const card = node("article", "item");
      card.append(node("h3", "", item.title), node("div", "meta", item.provider + " · " + item.destination_country + " · Deadline: " + safeDate(item.application_deadline)));
      const actions = node("div", "actions");
      const select = document.createElement("select");
      select.setAttribute("aria-label", "Application status for " + item.title);
      for (const value of ["interested", "preparing", "submitted", "accepted", "rejected", "withdrawn"]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value.charAt(0).toUpperCase() + value.slice(1);
        option.selected = item.status === value;
        select.append(option);
      }
      select.addEventListener("change", async () => {
        try {
          await api("/api/student/applications/" + encodeURIComponent(item.id), { method: "PATCH", body: { status: select.value } });
          item.status = select.value;
          message("Application status updated.");
        } catch (error) { message(error.message, true); }
      });
      const notes = document.createElement("textarea");
      notes.maxLength = 2000;
      notes.placeholder = "Private notes for your application (optional)";
      notes.value = item.notes || "";
      const save = node("button", "btn secondary", "Save notes");
      save.type = "button";
      save.addEventListener("click", async () => {
        try {
          await api("/api/student/applications/" + encodeURIComponent(item.id), { method: "PATCH", body: { notes: notes.value } });
          item.notes = notes.value;
          message("Your notes have been saved.");
        } catch (error) { message(error.message, true); }
      });
      actions.append(select);
      card.append(actions, notes, save);
      const link = officialLink(item.official_url);
      if (link) card.append(link);
      root.append(card);
    }
  }
  async function loadSaved() {
    const data = await api("/api/student/saved");
    saved = data.scholarships || [];
    renderSaved();
  }
  async function loadApplications() {
    const data = await api("/api/student/applications");
    applications = data.applications || [];
    renderApplications();
  }
  function showTab(tab) {
    activeTab = tab;
    $("saved-tab").setAttribute("aria-selected", String(tab === "saved"));
    $("apps-tab").setAttribute("aria-selected", String(tab === "apps"));
    $("saved-list").classList.toggle("hidden", tab !== "saved");
    $("apps-list").classList.toggle("hidden", tab !== "apps");
  }
  $("saved-tab").addEventListener("click", () => showTab("saved"));
  $("apps-tab").addEventListener("click", () => showTab("apps"));
  async function init() {
    if (!API_BASE) {
      $("profile-line").textContent = "Student account features are not connected yet.";
      message("Development preview only. The API and database have not been configured; saved scholarships and tracking are not live.", true);
      return;
    }
    try {
      const me = await api("/api/auth/me");
      $("welcome").textContent = "Welcome, " + me.user.full_name.split(" ")[0];
      $("profile-line").textContent = me.user.email + (me.user.country_of_residence ? " · " + me.user.country_of_residence : "");
      await Promise.all([loadSaved(), loadApplications()]);
      showTab(activeTab);
      message("Your private student workspace is ready.");
    } catch (error) {
      $("profile-line").textContent = "Please sign in to continue.";
      message(error.message + " Open the account page to sign in.", true);
    }
  }
  init();
})();