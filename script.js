const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Views
const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");

// Auth elements
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authMsg = document.getElementById("auth-msg");
const userEmail = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout");

// Todo elements
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const countEl = document.getElementById("count");
const clearBtn = document.getElementById("clear-completed");
const filterBtns = document.querySelectorAll(".filter");

let todos = [];
let filter = "all";

/* ---------- Auth ---------- */

function setMessage(text, isError = true) {
  authMsg.textContent = text;
  authMsg.classList.toggle("error", isError);
  authMsg.classList.toggle("ok", !isError);
}

async function signIn(email, password) {
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) setMessage(translateAuthError(error.message));
}

async function signUp(email, password) {
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) return setMessage(translateAuthError(error.message));
  // E-posta onayı kapalı olduğu için kayıt sonrası oturum hemen açılır.
  if (!data.session) {
    setMessage("Kayıt oluşturuldu. Şimdi giriş yapabilirsiniz.", false);
  }
}

function translateAuthError(msg) {
  if (/invalid login credentials/i.test(msg)) return "E-posta veya şifre hatalı.";
  if (/already registered/i.test(msg)) return "Bu e-posta zaten kayıtlı. Giriş yapın.";
  if (/password should be/i.test(msg)) return "Şifre en az 6 karakter olmalı.";
  return msg;
}

authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  signIn(emailInput.value.trim(), passwordInput.value);
});

authForm.querySelector('[data-action="signup"]').addEventListener("click", () => {
  if (!emailInput.value.trim() || passwordInput.value.length < 6) {
    return setMessage("Geçerli bir e-posta ve en az 6 karakterli şifre girin.");
  }
  signUp(emailInput.value.trim(), passwordInput.value);
});

logoutBtn.addEventListener("click", () => db.auth.signOut());

// Oturum durumuna göre arayüzü göster/gizle.
db.auth.onAuthStateChange((_event, session) => {
  if (session) {
    authView.hidden = true;
    appView.hidden = false;
    userEmail.textContent = session.user.email;
    authForm.reset();
    setMessage("", false);
    load();
  } else {
    appView.hidden = true;
    authView.hidden = false;
    todos = [];
  }
});

/* ---------- Todos ---------- */

async function load() {
  const { data, error } = await db
    .from("todos")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return showError(error.message);
  todos = data;
  render();
}

function showError(msg) {
  list.innerHTML = "";
  const li = document.createElement("li");
  li.className = "empty";
  li.textContent = "⚠️ " + msg;
  list.appendChild(li);
}

function render() {
  list.innerHTML = "";

  const visible = todos.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "completed") return t.done;
    return true;
  });

  if (visible.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Görev yok 🎉";
    list.appendChild(li);
  }

  visible.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.done ? " completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => toggle(todo));

    const span = document.createElement("span");
    span.className = "text";
    span.textContent = todo.text;

    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "✕";
    del.addEventListener("click", () => remove(todo.id));

    li.append(checkbox, span, del);
    list.appendChild(li);
  });

  const remaining = todos.filter((t) => !t.done).length;
  countEl.textContent = `${remaining} görev kaldı`;
}

async function addTodo(text) {
  const { data, error } = await db
    .from("todos")
    .insert({ text })
    .select()
    .single();

  if (error) return showError(error.message);
  todos.push(data);
  render();
}

async function toggle(todo) {
  const { data, error } = await db
    .from("todos")
    .update({ done: !todo.done })
    .eq("id", todo.id)
    .select()
    .single();

  if (error) return showError(error.message);
  todos = todos.map((t) => (t.id === data.id ? data : t));
  render();
}

async function remove(id) {
  const { error } = await db.from("todos").delete().eq("id", id);
  if (error) return showError(error.message);
  todos = todos.filter((t) => t.id !== id);
  render();
}

async function clearCompleted() {
  const { error } = await db.from("todos").delete().eq("done", true);
  if (error) return showError(error.message);
  todos = todos.filter((t) => !t.done);
  render();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addTodo(text);
  input.value = "";
  input.focus();
});

clearBtn.addEventListener("click", clearCompleted);

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});
