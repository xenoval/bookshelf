// ---------- Переводы интерфейса ----------
// Строка — обычный текст, функция — текст с подстановкой значений

// В русском три формы множественного числа: 1 заметка, 2 заметки, 5 заметок
const ruPlurals = new Intl.PluralRules("ru");
function ruPlural(n, one, few, many) {
  const forms = { one, few, many };
  return `${n} ${forms[ruPlurals.select(n)] ?? many}`;
}

const translations = {
  ru: {
    "app.title": "Полка — трекер чтения",
    "logo": "Полка",
    "summary.empty": "Ваш личный трекер чтения",
    "summary": ({ total, reading, read }) => `${total} на полке · ${reading} читаю · ${read} прочитано`,

    "settings.open": "Настройки",
    "settings.title": "Настройки",
    "settings.theme": "Тема",
    "settings.lang": "Язык",
    "theme.system": "Как в системе",
    "theme.light": "Светлая",
    "theme.dark": "Тёмная",
    "theme.cream": "Кремовая",
    "theme.night": "Звёздная",
    "close": "Закрыть",

    "search.label": "Найти книгу",
    "search.placeholder": "Найти книгу по названию или автору",
    "search.loading": "Ищем…",
    "search.found": ({ n }) => `Найдено в Open Library: ${n}`,
    "search.none": "Ничего не нашлось. Попробуйте другой запрос",

    "nav.home": "Подборка",
    "nav.want": "Хочу",
    "nav.reading": "Читаю",
    "nav.read": "Прочитано",

    "status.want": "Хочу прочитать",
    "status.reading": "Читаю",
    "status.read": "Прочитано",

    "empty.want": "Здесь будут книги, которые вы хотите прочитать.",
    "empty.reading": "Сейчас вы ничего не читаете.",
    "empty.read": "Отмечайте прочитанные книги, ставьте оценки и пишите отзывы — так подборка станет точнее.",

    "recs.personal.title": "Вам может понравиться",
    "recs.personal.subtitle": ({ titles }) => `На основе ваших оценок: ${titles}`,
    "recs.popular.title": "Популярное сейчас",
    "recs.popular.subtitle": "Поставьте прочитанным книгам 4 или 5 звёзд — и здесь появится личная подборка",
    "recs.similar": ({ title }) => `Похоже на «${title}»`,
    "quote": ({ text }) => `«${text}»`,

    "card.add": "+ На полку",
    "card.added": "Уже на полке",
    "rating": ({ n }) => `Оценка ${n}`,

    "detail.status": "Статус",
    "detail.wantHint": "Отметьте книгу как «Читаю», чтобы вести заметки по ходу чтения.",
    "detail.remove": "Убрать с полки",
    "detail.confirmRemove": "Убрать книгу с полки? Заметки и отзыв тоже удалятся.",
    "detail.confirmYes": "Да, убрать",
    "detail.cancel": "Отмена",

    "notes.title": "Заметки",
    "notes.count": ({ n }) => ruPlural(n, "заметка", "заметки", "заметок"),
    "notes.placeholder": "Мысль, цитата или впечатление…",
    "notes.add": "Добавить заметку",
    "notes.hint": "Ctrl + Enter — добавить",
    "notes.delete": "Удалить",
    "notes.empty": "Пока нет заметок.",

    "review.title": "Отзыв",
    "review.placeholder": "Что вы думаете о книге?",
    "review.save": "Сохранить отзыв",
    "review.saved": ({ date }) => `Сохранено ${date}`,

    "toast.added": ({ title }) => `«${title}» — в списке «Хочу прочитать»`,
    "toast.removed": "Книга убрана с полки",
    "toast.reviewSaved": "Отзыв сохранён",

    "error.generic": "Что-то пошло не так",
    "error.404": "Не найдено",
    "error.409": "Эта книга уже на полке",
    "error.502": "Open Library сейчас недоступна",
    "error.loadShelf": "Не удалось загрузить полку",
  },

  en: {
    "app.title": "Shelf — reading tracker",
    "logo": "Shelf",
    "summary.empty": "Your personal reading tracker",
    "summary": ({ total, reading, read }) => `${total} on the shelf · ${reading} reading · ${read} read`,

    "settings.open": "Settings",
    "settings.title": "Settings",
    "settings.theme": "Theme",
    "settings.lang": "Language",
    "theme.system": "System",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.cream": "Cream",
    "theme.night": "Starry",
    "close": "Close",

    "search.label": "Find a book",
    "search.placeholder": "Search by title or author",
    "search.loading": "Searching…",
    "search.found": ({ n }) => `Found on Open Library: ${n}`,
    "search.none": "Nothing found. Try another search",

    "nav.home": "For you",
    "nav.want": "Want",
    "nav.reading": "Reading",
    "nav.read": "Read",

    "status.want": "Want to read",
    "status.reading": "Reading",
    "status.read": "Read",

    "empty.want": "Books you want to read will appear here.",
    "empty.reading": "You're not reading anything right now.",
    "empty.read": "Mark books as read, rate them and write reviews to get better recommendations.",

    "recs.personal.title": "You might like",
    "recs.personal.subtitle": ({ titles }) => `Based on your ratings: ${titles}`,
    "recs.popular.title": "Trending now",
    "recs.popular.subtitle": "Rate the books you've read 4 or 5 stars to get personal recommendations",
    "recs.similar": ({ title }) => `Similar to “${title}”`,
    "quote": ({ text }) => `“${text}”`,

    "card.add": "+ Add to shelf",
    "card.added": "On your shelf",
    "rating": ({ n }) => `Rating ${n}`,

    "detail.status": "Status",
    "detail.wantHint": "Mark the book as Reading to keep notes as you go.",
    "detail.remove": "Remove from shelf",
    "detail.confirmRemove": "Remove this book? Its notes and review will be deleted too.",
    "detail.confirmYes": "Yes, remove",
    "detail.cancel": "Cancel",

    "notes.title": "Notes",
    "notes.count": ({ n }) => `${n} ${n === 1 ? "note" : "notes"}`,
    "notes.placeholder": "A thought, a quote or an impression…",
    "notes.add": "Add note",
    "notes.hint": "Ctrl + Enter to add",
    "notes.delete": "Delete",
    "notes.empty": "No notes yet.",

    "review.title": "Review",
    "review.placeholder": "What did you think of the book?",
    "review.save": "Save review",
    "review.saved": ({ date }) => `Saved ${date}`,

    "toast.added": ({ title }) => `“${title}” added to Want to read`,
    "toast.removed": "Book removed from the shelf",
    "toast.reviewSaved": "Review saved",

    "error.generic": "Something went wrong",
    "error.404": "Not found",
    "error.409": "This book is already on your shelf",
    "error.502": "Open Library is unavailable right now",
    "error.loadShelf": "Couldn't load your shelf",
  },
};

let currentLang = "ru";

function setLanguage(lang) {
  currentLang = translations[lang] ? lang : "ru";
  document.documentElement.lang = currentLang;
}

function t(key, params = {}) {
  const value = translations[currentLang][key] ?? translations.ru[key] ?? key;
  return typeof value === "function" ? value(params) : value;
}

// Переводит текст в HTML-разметке, помеченный атрибутами data-i18n
function translatePage() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  // title — всплывающая подсказка при наведении
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.title = t("app.title");
}

function formatDate(iso) {
  return new Intl.DateTimeFormat(currentLang, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
