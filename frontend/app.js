// ---------- Состояние приложения ----------
const state = {
  books: [],          // книги на полке
  view: "home",       // открытый раздел: "home", "want", "reading", "read"
  searchResults: [],  // результаты поиска
  searchHint: null,   // подсказка под поиском: { key, params }
  recs: null,         // рекомендации с сервера
  recsStale: true,    // оценки изменились, подборку пора обновить
  openBookId: null,   // книга, открытая в окне
};

// Недописанный текст в окне книги. Хранится отдельно, чтобы не пропасть,
// когда окно перерисовывается (например, после клика по звезде).
let drafts = { review: null, note: "" };

// Показан ли в окне книги вопрос «Точно убрать?»
let confirmingRemove = false;

const STATUSES = ["want", "reading", "read"];

// ---------- Ссылки на элементы страницы ----------
const searchInput = document.getElementById("search-input");
const searchHint = document.getElementById("search-hint");
const searchResultsEl = document.getElementById("search-results");
const viewHome = document.getElementById("view-home");
const viewShelf = document.getElementById("view-shelf");
const recsEl = document.getElementById("recs");
const recsTitle = document.getElementById("recs-title");
const recsSubtitle = document.getElementById("recs-subtitle");
const shelfEl = document.getElementById("shelf");
const shelfTitle = document.getElementById("shelf-title");
const empty = document.getElementById("empty");
const nav = document.getElementById("nav");
const summary = document.getElementById("summary");
const toast = document.getElementById("toast");
const settingsDialog = document.getElementById("settings-dialog");
const bookDialog = document.getElementById("book-dialog");
const bookDetail = document.getElementById("book-detail");

// ---------- Работа с нашим API ----------
async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    // Текст ошибки берём из словаря переводов по коду ответа
    const key = `error.${response.status}`;
    throw new Error(t(key) === key ? t("error.generic") : t(key));
  }
  return response.status === 204 ? null : response.json();
}

// ---------- Вспомогательные функции ----------

// Экранируем текст из внешнего API и от пользователя, чтобы он не мог вставить на страницу свой HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML.replaceAll('"', "&quot;");
}

// Под каждой обложкой лежит заглушка с названием и автором.
// Картинка проявляется поверх неё, только когда загрузится, поэтому заглушку видно,
// если обложки нет, она ещё грузится или сервер обложек недоступен.
function coverHtml(book, className) {
  const author = book.author ? `<span class="cover__author">${escapeHtml(book.author)}</span>` : "";
  const placeholder = `
    <span class="cover__placeholder">
      <span class="cover__title">${escapeHtml(book.title)}</span>
      ${author}
    </span>`;

  // default=false: если обложки нет, сервер вернёт ошибку, а не пустую картинку
  const image = book.cover_id
    ? `<img class="cover__img" src="https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg?default=false" alt="" loading="lazy">`
    : "";

  return `<div class="cover ${className}">${placeholder}${image}</div>`;
}

// События load и error не всплывают, поэтому ловим их на этапе погружения (третий аргумент true)
document.addEventListener("load", (event) => {
  if (event.target.matches?.(".cover__img")) event.target.classList.add("is-loaded");
}, true);

document.addEventListener("error", (event) => {
  if (event.target.matches?.(".cover__img")) event.target.remove();
}, true);

function metaText(book) {
  return [book.author, book.year].filter(Boolean).join(" · ");
}

function starsHtml(rating, interactive = false) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    const className = `star ${rating && i <= rating ? "is-on" : ""}`;
    html += interactive
      ? `<button class="${className}" data-rate="${i}" aria-label="${t("rating", { n: i })}">★</button>`
      : `<span class="${className}">★</span>`;
  }
  return `<div class="stars ${interactive ? "stars--interactive" : ""}">${html}</div>`;
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}

// Откладываем вызов функции, пока пользователь не перестанет печатать
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ---------- Настройки: тема и язык ----------
const SETTINGS_KEY = "shelf-settings";

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

const settings = { theme: "system", lang: "ru", ...loadSettings() };

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Хранилище недоступно (например, приватный режим) — настройки просто не запомнятся
  }
}

function applyTheme() {
  // «Как в системе» — это отсутствие атрибута: тогда работает prefers-color-scheme в CSS
  if (settings.theme === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = settings.theme;
  }
}

function applyLanguage() {
  setLanguage(settings.lang);
  translatePage();
  renderAll();
}

function renderSettings() {
  settingsDialog.querySelectorAll("[data-theme-option]").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.themeOption === settings.theme);
  });
  settingsDialog.querySelectorAll("[data-lang-option]").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.langOption === settings.lang);
  });
}

document.getElementById("settings-open").addEventListener("click", () => {
  renderSettings();
  openDialog(settingsDialog);
});

settingsDialog.addEventListener("click", (event) => {
  const theme = event.target.closest("[data-theme-option]");
  const lang = event.target.closest("[data-lang-option]");

  if (theme) {
    settings.theme = theme.dataset.themeOption;
    applyTheme();
  }
  if (lang) {
    settings.lang = lang.dataset.langOption;
    applyLanguage();
  }
  if (theme || lang) {
    saveSettings();
    renderSettings();
  }
});

function openDialog(dialog) {
  dialog.showModal();
  dialog.focus();
}

// Окна закрываются крестиком и кликом по затемнённому фону вокруг
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-close]")) dialog.close();
  });
});

// ---------- Карточка книги, которую можно добавить на полку ----------
// Используется и в поиске, и в рекомендациях

// Книги, которые сейчас показаны с кнопкой «На полку», по ключу Open Library
const candidates = new Map();

function candidateCardHtml(book, { showReason = false } = {}) {
  candidates.set(book.ol_key, book);
  const added = state.books.some((b) => b.ol_key === book.ol_key);
  const reason = showReason && book.similar_to
    ? `<p class="card__info">${escapeHtml(t("recs.similar", { title: book.similar_to }))}</p>`
    : "";

  return `
    <article class="card">
      ${coverHtml(book, "card__cover")}
      <h3 class="card__title">${escapeHtml(book.title)}</h3>
      <p class="card__meta">${escapeHtml(metaText(book))}</p>
      ${reason}
      <div class="card__actions">
        <button class="button" data-add="${escapeHtml(book.ol_key)}" ${added ? "disabled" : ""}>
          ${added ? t("card.added") : t("card.add")}
        </button>
      </div>
    </article>`;
}

async function addToShelf(olKey) {
  const book = candidates.get(olKey);
  try {
    await api("/api/books", { method: "POST", body: JSON.stringify(book) });
    showToast(t("toast.added", { title: book.title }));
    await loadShelf();
  } catch (error) {
    showToast(error.message);
  }
}

// Один обработчик кликов «+ На полку» для поиска и рекомендаций
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (button) addToShelf(button.dataset.add);
});

// ---------- Поиск ----------
async function runSearch(query) {
  query = query.trim();
  if (query.length < 2) {
    state.searchResults = [];
    state.searchHint = null;
    renderSearch();
    return;
  }

  state.searchHint = { key: "search.loading" };
  renderSearch();
  try {
    state.searchResults = await api(`/api/search?q=${encodeURIComponent(query)}`);
    const n = state.searchResults.length;
    state.searchHint = n ? { key: "search.found", params: { n } } : { key: "search.none" };
  } catch (error) {
    state.searchResults = [];
    state.searchHint = { text: error.message };
  }
  renderSearch();
}

function renderSearch() {
  const hint = state.searchHint;
  searchHint.textContent = hint ? hint.text ?? t(hint.key, hint.params) : "";
  searchResultsEl.innerHTML = state.searchResults.map((book) => candidateCardHtml(book)).join("");
}

searchInput.addEventListener("input", debounce((event) => runSearch(event.target.value), 400));

// ---------- Рекомендации ----------
function skeletonHtml(count) {
  const card = `
    <div class="card card--skeleton">
      <div class="cover card__cover"></div>
      <div class="card__line" style="width: 80%"></div>
      <div class="card__line" style="width: 50%"></div>
    </div>`;
  return card.repeat(count);
}

async function loadRecommendations() {
  state.recsStale = false;
  if (!state.recs) recsEl.innerHTML = skeletonHtml(6);

  try {
    state.recs = await api("/api/recommendations");
  } catch (error) {
    recsEl.innerHTML = "";
    recsSubtitle.textContent = error.message;
    return;
  }
  renderRecommendations();
}

function renderRecommendations() {
  const recs = state.recs;
  if (!recs) return;

  if (recs.personal) {
    recsTitle.textContent = t("recs.personal.title");
    const titles = recs.based_on.map((title) => t("quote", { text: title })).join(", ");
    recsSubtitle.textContent = t("recs.personal.subtitle", { titles });
  } else {
    recsTitle.textContent = t("recs.popular.title");
    recsSubtitle.textContent = t("recs.popular.subtitle");
  }

  // Причину под каждой книгой показываем, только если подборка собрана из нескольких книг
  const showReason = recs.based_on.length > 1;
  recsEl.innerHTML = recs.items.map((book) => candidateCardHtml(book, { showReason })).join("");
}

// ---------- Полка ----------
async function loadShelf() {
  state.books = await api("/api/books");
  renderAll();
}

function renderAll() {
  renderCounts();
  renderView();
  renderSearch(); // обновляем кнопки «Уже на полке»
  if (bookDialog.open) renderDetail();
}

function shelfCardHtml(book) {
  let extra = "";
  if (book.status === "reading" && book.notes.length) {
    extra = `<p class="card__info">${t("notes.count", { n: book.notes.length })}</p>`;
  }
  if (book.status === "read") {
    extra = (book.rating ? starsHtml(book.rating) : "")
      + (book.review ? `<p class="card__review">${escapeHtml(book.review)}</p>` : "");
  }

  return `
    <article class="card card--clickable" data-id="${book.id}" tabindex="0">
      ${coverHtml(book, "card__cover")}
      <h3 class="card__title">${escapeHtml(book.title)}</h3>
      <p class="card__meta">${escapeHtml(metaText(book))}</p>
      ${extra}
    </article>`;
}

function renderShelf() {
  const visible = state.books.filter((book) => book.status === state.view);
  shelfTitle.textContent = t(`status.${state.view}`);
  shelfEl.innerHTML = visible.map(shelfCardHtml).join("");
  empty.textContent = t(`empty.${state.view}`);
  empty.hidden = visible.length > 0;
}

function renderCounts() {
  const counts = { want: 0, reading: 0, read: 0 };
  state.books.forEach((book) => counts[book.status]++);

  document.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = counts[el.dataset.count] || "";
  });

  summary.textContent = state.books.length
    ? t("summary", { total: state.books.length, ...counts })
    : t("summary.empty");
}

// Клик или Enter по карточке на полке открывает окно книги
shelfEl.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card) openBook(Number(card.dataset.id));
});

shelfEl.addEventListener("keydown", (event) => {
  const card = event.target.closest(".card");
  if (card && event.key === "Enter") openBook(Number(card.dataset.id));
});

// ---------- Окно книги: статус, заметки, отзыв ----------
function openBookData() {
  return state.books.find((book) => book.id === state.openBookId);
}

function openBook(id) {
  state.openBookId = id;
  drafts = { review: null, note: "" };
  confirmingRemove = false;
  renderDetail();
  openDialog(bookDialog);
}

function statusSelectHtml(book) {
  const options = STATUSES
    .map((status) => `<option value="${status}" ${status === book.status ? "selected" : ""}>${t(`status.${status}`)}</option>`)
    .join("");
  return `<select class="select" data-status-select aria-label="${t("detail.status")}">${options}</select>`;
}

function reviewSectionHtml(book) {
  const review = drafts.review ?? book.review ?? "";
  const saved = book.reviewed_at
    ? `<span class="detail__muted">${t("review.saved", { date: formatDate(book.reviewed_at) })}</span>`
    : "";

  return `
    <section class="detail__section">
      <h3 class="section-label">${t("review.title")}</h3>
      ${starsHtml(book.rating, true)}
      <textarea class="textarea" data-review-input rows="5"
        placeholder="${escapeHtml(t("review.placeholder"))}">${escapeHtml(review)}</textarea>
      <div class="detail__row">
        <button class="button" data-save-review>${t("review.save")}</button>
        ${saved}
      </div>
    </section>`;
}

function notesSectionHtml(book) {
  // Новые заметки можно писать, пока книга в «Читаю». Потом они остаются для истории.
  const form = book.status === "reading"
    ? `
      <textarea class="textarea" data-note-input rows="3"
        placeholder="${escapeHtml(t("notes.placeholder"))}">${escapeHtml(drafts.note)}</textarea>
      <div class="detail__row">
        <button class="button" data-add-note>${t("notes.add")}</button>
        <span class="detail__muted">${t("notes.hint")}</span>
      </div>`
    : "";

  const list = book.notes.length
    ? book.notes.map((note) => `
        <li class="note">
          <div class="note__head">
            <time datetime="${note.created_at}">${formatDate(note.created_at)}</time>
            <button class="link" data-delete-note="${note.id}">${t("notes.delete")}</button>
          </div>
          <p class="note__text">${escapeHtml(note.text)}</p>
        </li>`).join("")
    : `<li class="detail__muted">${t("notes.empty")}</li>`;

  return `
    <section class="detail__section">
      <h3 class="section-label">${t("notes.title")}</h3>
      ${form}
      <ul class="notes">${list}</ul>
    </section>`;
}

function renderDetail() {
  const book = openBookData();
  if (!book) {
    bookDialog.close();
    return;
  }

  let sections = "";
  if (book.status === "want") {
    sections = `<p class="detail__hint">${t("detail.wantHint")}</p>`;
  }
  if (book.status === "read") {
    sections += reviewSectionHtml(book);
  }
  if (book.status === "reading" || book.notes.length) {
    sections += notesSectionHtml(book);
  }

  bookDetail.innerHTML = `
    <div class="detail__top">
      ${coverHtml(book, "detail__cover")}
      <div class="detail__info">
        <h2 class="detail__title">${escapeHtml(book.title)}</h2>
        <p class="detail__meta">${escapeHtml(metaText(book))}</p>
        ${statusSelectHtml(book)}
      </div>
    </div>
    ${sections}
    <div class="detail__footer">${removeFooterHtml()}</div>`;
}

// Удаление в два шага: сначала «Убрать с полки», потом подтверждение.
// Системный confirm() не используем: он выглядит чужеродно,
// а некоторые встроенные браузеры его вообще молча блокируют.
function removeFooterHtml() {
  if (!confirmingRemove) {
    return `<button class="link" data-remove-book>${t("detail.remove")}</button>`;
  }
  return `
    <p class="detail__confirm">${t("detail.confirmRemove")}</p>
    <div class="detail__row detail__row--start">
      <button class="button" data-remove-confirm>${t("detail.confirmYes")}</button>
      <button class="link" data-remove-cancel>${t("detail.cancel")}</button>
    </div>`;
}

async function updateBook(id, changes) {
  try {
    await api(`/api/books/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
  } catch (error) {
    showToast(error.message);
    return false;
  }
  if ("rating" in changes) state.recsStale = true;
  await loadShelf();
  return true;
}

async function addNote() {
  const text = drafts.note.trim();
  if (!text) return;

  try {
    await api(`/api/books/${state.openBookId}/notes`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    showToast(error.message);
    return;
  }
  drafts.note = "";
  await loadShelf();
  bookDetail.querySelector("[data-note-input]")?.focus();
}

async function deleteNote(noteId) {
  try {
    await api(`/api/notes/${noteId}`, { method: "DELETE" });
    await loadShelf();
  } catch (error) {
    showToast(error.message);
  }
}

async function removeBook() {
  try {
    await api(`/api/books/${state.openBookId}`, { method: "DELETE" });
  } catch (error) {
    showToast(error.message);
    return;
  }
  bookDialog.close();
  state.recsStale = true;
  showToast(t("toast.removed"));
  await loadShelf();
}

// Запоминаем текст, пока его печатают
bookDetail.addEventListener("input", (event) => {
  if (event.target.matches("[data-review-input]")) drafts.review = event.target.value;
  if (event.target.matches("[data-note-input]")) drafts.note = event.target.value;
});

bookDetail.addEventListener("change", (event) => {
  if (event.target.matches("[data-status-select]")) {
    updateBook(state.openBookId, { status: event.target.value });
  }
});

// Ctrl + Enter (или Cmd + Enter на Mac) добавляет заметку
bookDetail.addEventListener("keydown", (event) => {
  if (event.target.matches("[data-note-input]") && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    addNote();
  }
});

bookDetail.addEventListener("click", async (event) => {
  const book = openBookData();
  const star = event.target.closest("[data-rate]");
  const deleteNoteButton = event.target.closest("[data-delete-note]");

  if (star) {
    const rating = Number(star.dataset.rate);
    // Повторный клик по той же звезде сбрасывает оценку
    await updateBook(book.id, { rating: book.rating === rating ? null : rating });
  } else if (event.target.closest("[data-save-review]")) {
    const saved = await updateBook(book.id, { review: drafts.review ?? book.review ?? "" });
    if (saved) {
      drafts.review = null;
      showToast(t("toast.reviewSaved"));
    }
  } else if (event.target.closest("[data-add-note]")) {
    await addNote();
  } else if (deleteNoteButton) {
    await deleteNote(deleteNoteButton.dataset.deleteNote);
  } else if (event.target.closest("[data-remove-book]")) {
    confirmingRemove = true;
    renderDetail();
  } else if (event.target.closest("[data-remove-cancel]")) {
    confirmingRemove = false;
    renderDetail();
  } else if (event.target.closest("[data-remove-confirm]")) {
    await removeBook();
  }
});

// ---------- Переключение разделов через нижнее меню ----------
function renderView() {
  const isHome = state.view === "home";
  viewHome.hidden = !isHome;
  viewShelf.hidden = isHome;

  nav.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === state.view);
  });

  if (isHome) {
    renderRecommendations();
    if (state.recsStale) loadRecommendations();
  } else {
    renderShelf();
  }
}

nav.addEventListener("click", (event) => {
  const item = event.target.closest(".nav-item");
  if (!item) return;
  state.view = item.dataset.view;
  renderView();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---------- Старт ----------
applyTheme();
setLanguage(settings.lang);
translatePage();
loadShelf().catch(() => showToast(t("error.loadShelf")));
