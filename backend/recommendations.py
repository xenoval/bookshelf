"""Рекомендации книг на основе оценок пользователя.

Идея простая:
1. Берём книги, которым пользователь поставил 4 или 5 звёзд.
2. Узнаём в Open Library их темы (например, «антиутопия»).
3. Ищем книги с самым высоким рейтингом на эти темы.
4. Убираем то, что уже есть на полке.
"""

import asyncio
from itertools import zip_longest

import httpx

from . import models, openlibrary
from .schemas import Recommendation, Recommendations

MIN_LIKED_RATING = 4
MAX_LIKED_BOOKS = 3
SUBJECTS_PER_BOOK = 2
LIMIT = 12

# Служебные темы Open Library, которые ничего не говорят о содержании книги
SKIP_SUBJECTS = {
    "fiction", "literature", "classic literature", "accessible book",
    "protected daisy", "in library", "large type books", "history",
}
SKIP_WORDS = ("adaptation", "criticism", "general", "translation", "texts", "nyt:")


def _useful_subjects(subjects: list[str]) -> list[str]:
    useful = []
    for subject in subjects:
        lower = subject.lower()
        if lower in SKIP_SUBJECTS or any(word in lower for word in SKIP_WORDS):
            continue
        useful.append(subject)

    # Жанровые темы («Fiction, psychological») точнее общих («Employees»),
    # поэтому ставим их первыми. sorted сохраняет исходный порядок внутри групп.
    useful = sorted(useful, key=lambda subject: "fiction" not in subject.lower())
    return useful[:SUBJECTS_PER_BOOK]


async def _candidates_for(book: models.Book) -> list[Recommendation]:
    """Книги, похожие на одну понравившуюся книгу."""
    try:
        subjects = _useful_subjects(await openlibrary.get_subjects(book.ol_key))
        found = await asyncio.gather(*(openlibrary.books_by_subject(s) for s in subjects))
    except httpx.HTTPError:
        # Ошибка по одной книге не должна ломать всю подборку
        return []

    # Чередуем результаты разных тем, чтобы подборка была разнообразнее
    mixed = [r for group in zip_longest(*found) for r in group if r]
    return [Recommendation(**r.model_dump(), similar_to=book.title) for r in mixed]


def _is_new(item: Recommendation, shelf: list[models.Book], seen: set[str]) -> bool:
    """Отсеиваем книги с полки, повторы и другие издания той же книги."""
    title = item.title.casefold()
    if item.ol_key in seen or title in seen:
        return False
    for book in shelf:
        if item.ol_key == book.ol_key or title == book.title.casefold():
            return False
        if item.author and book.author and item.author == book.author:
            return False
    return True


async def recommend(shelf: list[models.Book]) -> Recommendations:
    liked = sorted(
        (b for b in shelf if b.rating and b.rating >= MIN_LIKED_RATING),
        key=lambda b: (b.rating, b.added_at),
        reverse=True,
    )[:MAX_LIKED_BOOKS]

    if not liked:
        items = [Recommendation(**r.model_dump()) for r in await openlibrary.trending(LIMIT * 2)]
        personal = False
    else:
        groups = await asyncio.gather(*(_candidates_for(book) for book in liked))
        items = [r for group in zip_longest(*groups) for r in group if r]
        personal = True

    result, seen = [], set()
    for item in items:
        if _is_new(item, shelf, seen):
            result.append(item)
            seen.update({item.ol_key, item.title.casefold()})
        if len(result) == LIMIT:
            break

    return Recommendations(
        personal=personal,
        based_on=[book.title for book in liked],
        items=result,
    )
