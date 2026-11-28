/* Student dashboard. API_BASE is intentionally unset until backend configuration. */
(() => {
  "use strict";
  const API_BASE = window.FAS_API_BASE || "https://fund-africa-scholars-api.jamesrono96.workers.dev";
  const $ = id => document.getElementById(id);
  let activeTab = "saved";
  let saved = [];
  let applications = [];
  const destinations = ["United States","United Kingdom","China","Australia","Canada","Germany","Japan","South Korea","France","Netherlands","Sweden","Switzerland","New Zealand","Ireland","Finland","Norway","Denmark","Italy","Spain","Singapore","South Africa","Kenya"];
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
  function renderDeadlineWatch() {
    const root = $("deadline-list");
    if (!root) return;
    root.replaceChildren();
    const byId = new Map();
    for (const item of [...saved, ...applications]) {
      const id = item.scholarship_id || item.id;
      if (id && item.application_deadline) byId.set(id, item);
    }
    const today = new Date();
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const entries = [...byId.values()].map(item => {
      const raw = String(item.application_deadline || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
      const parts = raw.split("-").map(Number);
      const dueUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
      const valid = new Date(dueUtc).toISOString().slice(0, 10) === raw;
      if (!valid) return null;
      return { item, days: Math.round((dueUtc - todayUtc) / 86400000) };
    }).filter(entry => entry && entry.days <= 30).sort((a,b) => a.days - b.days);
    if (!entries.length) {
      root.append(node("p", "empty", "No saved or tracked scholarships have a published deadline within the next 30 days or in the past."));
      return;
    }
    for (const entry of entries) {
      const card = node("article", "item");
      const label = entry.days < 0 ? "Deadline passed " + Math.abs(entry.days) + " day(s) ago" : entry.days === 0 ? "Deadline is today" : entry.days + " day(s) remaining";
      card.append(node("h3", "", entry.item.title), node("div", "meta", entry.item.provider + " · " + entry.item.destination_country + " · " + safeDate(entry.item.application_deadline)), node("strong", entry.days <= 7 ? "error" : "meta", label));
      const link = officialLink(entry.item.official_url);
      if (link) card.append(link);
      root.append(card);
    }
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
    renderDeadlineWatch();
  }
  async function loadApplications() {
    const data = await api("/api/student/applications");
    applications = data.applications || [];
    renderApplications();
    renderDeadlineWatch();
  }
  async function loadProfile() {
    const data = await api("/api/student/profile");
    const profile = data.profile;
    $("profile-name").value = profile.full_name || "";
    $("profile-email").value = profile.email || "";
    $("profile-country").value = profile.country_of_residence || "";
    const root = $("destination-options");
    root.replaceChildren();
    const selected = new Set(profile.preferred_destinations || []);
    for (const country of destinations) {
      const label = node("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = country;
      checkbox.checked = selected.has(country);
      checkbox.addEventListener("change", () => {
        const checked = root.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length > 10) {
          checkbox.checked = false;
          message("You can select a maximum of 10 destinations.", true);
        }
      });
      label.append(checkbox, document.createTextNode(country));
      root.append(label);
    }
  }
  $("profile-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("save-profile");
    button.disabled = true;
    const preferred_destinations = [...$("destination-options").querySelectorAll('input:checked')].map(input => input.value);
    try {
      const data = await api("/api/student/profile", { method: "PATCH", body: {
        full_name: $("profile-name").value,
        country_of_residence: $("profile-country").value,
        preferred_destinations
      }});
      $("welcome").textContent = "Welcome, " + data.profile.full_name.split(" ")[0];
      $("profile-line").textContent = data.profile.email + (data.profile.country_of_residence ? " · " + data.profile.country_of_residence : "");
      message("Your profile and study preferences have been saved.");
    } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });
  function showTab(tab) {
    activeTab = tab;
    $("saved-tab").setAttribute("aria-selected", String(tab === "saved"));
    $("apps-tab").setAttribute("aria-selected", String(tab === "apps"));
    $("profile-tab").setAttribute("aria-selected", String(tab === "profile"));
    $("saved-list").classList.toggle("hidden", tab !== "saved");
    $("apps-list").classList.toggle("hidden", tab !== "apps");
    $("profile-panel").classList.toggle("hidden", tab !== "profile");
  }
  $("saved-tab").addEventListener("click", () => showTab("saved"));
  $("apps-tab").addEventListener("click", () => showTab("apps"));
  $("profile-tab").addEventListener("click", () => showTab("profile"));
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
      const [membership] = await Promise.all([api("/api/student/membership"), loadProfile()]);
      const member = Boolean(membership.membership && membership.membership.active);
      const banner = $("membership-panel");
      if (banner) {
        banner.classList.remove("hidden");
        banner.querySelector("[data-membership-title]").textContent = member
          ? "Lifetime membership active"
          : "Unlock all five premium student tools";
        banner.querySelector("[data-membership-copy]").textContent = member
          ? "Your USD $5 lifetime membership is active. All five premium features are enabled for your account."
          : "Scholarship browsing is free. A one-time USD $5 lifetime membership will unlock saved scholarships, application tracking, deadline watch, private notes and personalised recommendations. Payments are not available yet.";
      }
      if (member) {
        await Promise.all([loadSaved(), loadApplications()]);
        message("Your lifetime member workspace is ready.");
      } else {
        const locked = "This feature is included with the USD $5 lifetime membership. Payment activation is not available yet.";
        for (const id of ["saved-list", "apps-list", "deadline-list"]) {
          const root = $(id);
          root.replaceChildren(node("p", "empty", locked));
        }
        $("saved-tab").disabled = true;
        $("apps-tab").disabled = true;
        $("saved-tab").setAttribute("aria-disabled", "true");
        $("apps-tab").setAttribute("aria-disabled", "true");
        showTab("profile");
        message("Your profile is available. Premium tools will unlock after verified lifetime membership.", false);
      }
      showTab(member ? activeTab : "profile");
    } catch (error) {
      $("profile-line").textContent = "Please sign in to continue.";
      message(error.message + " Open the account page to sign in.", true);
    }
  }
  init();
})();