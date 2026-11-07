/* Student account interface. Configure API_BASE only when a backend is deployed. */
(() => {
  "use strict";
  const API_BASE = window.FAS_API_BASE || "";
  const $ = (id) => document.getElementById(id);
  const authPanel = $("auth-panel");
  const dashboard = $("dashboard");
  const loginForm = $("login-form");
  const registerForm = $("register-form");
  const message = $("auth-message");

  $("year").textContent = new Date().getFullYear();

  function setMessage(element, text, type = "") {
    element.textContent = text;
    element.className = "message" + (type ? " " + type : "");
  }

  function showTab(tab) {
    const login = tab === "login";
    $("login-tab").setAttribute("aria-selected", String(login));
    $("register-tab").setAttribute("aria-selected", String(!login));
    loginForm.classList.toggle("hidden", !login);
    registerForm.classList.toggle("hidden", login);
    setMessage(message, "");
  }

  $("login-tab").addEventListener("click", () => showTab("login"));
  $("register-tab").addEventListener("click", () => showTab("register"));

  async function api(path, options = {}) {
    const response = await fetch(API_BASE + path, {
      method: options.method || "GET",
      credentials: "include",
      headers: options.body ? { "Content-Type": "application/json" } : {},
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
    return data;
  }

  function showDashboard(user) {
    authPanel.classList.add("hidden");
    dashboard.style.display = "block";
    $("profile-name").textContent = user.full_name;
    $("profile-email").textContent = user.email;
    $("profile-country").textContent = user.country_of_residence || "Country not provided";
  }

  async function checkSession() {
    if (!API_BASE) {
      setMessage(message, "Account preview only: the API has not been connected yet.");
      return;
    }
    try {
      const data = await api("/api/auth/me");
      showDashboard(data.user);
    } catch {
      // Not signed in, or API is not yet available. Keep the sign-in screen visible.
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!API_BASE) return setMessage(message, "Sign-in will be enabled after the backend is configured.", "error");
    const button = loginForm.querySelector("button[type=submit]");
    button.disabled = true;
    setMessage(message, "Signing in…");
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { email: $("login-email").value.trim(), password: $("login-password").value }
      });
      showDashboard(data.user);
    } catch (error) {
      setMessage(message, error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!API_BASE) return setMessage(message, "Registration will be enabled after the backend is configured.", "error");
    const button = registerForm.querySelector("button[type=submit]");
    button.disabled = true;
    setMessage(message, "Creating your account…");
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: {
          full_name: $("full-name").value.trim(),
          email: $("register-email").value.trim(),
          country_of_residence: $("country").value.trim() || null,
          password: $("register-password").value
        }
      });
      showDashboard(data.user);
    } catch (error) {
      setMessage(message, error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  $("logout-button").addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
      dashboard.style.display = "none";
      authPanel.classList.remove("hidden");
      loginForm.reset();
      registerForm.reset();
      showTab("login");
      setMessage(message, "You have signed out.", "success");
    } catch (error) {
      setMessage($("dashboard-message"), error.message, "error");
    }
  });

  checkSession();
})();
