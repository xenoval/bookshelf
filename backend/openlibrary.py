"""Работа с внешним API Open Library (https://openlibrary.org/developers/api)."""

import time

import httpx

from .schemas import SearchResult

BASE_URL = "https://openlibrary.org"
# Просим только нужные поля, чтобы ответ был меньше и быстрее
FIELDS = "key,title,author_name,first_publish_year,cover_i"

# Простой кэш в памяти: одинаковые запросы не отправляем повторно в течение часа.
# Open Library отвечает не мгновенно, а рекомендации делают сразу несколько запросов.
CACHE_SECONDS = 60 * 60
_cache: dict[str, tuple[float, object]] = {}


async def _get_json(path: str, params: dict | None = None) -> dict:
    cache_key = path + str(sorted((params or {}).items()))
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[0] < CACHE_SECONDS:
        return cached[1]

    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        response = await client.get(BASE_URL + path, params=params)
        response.raise_for_status()

    data = response.json()
    _cache[cache_key] = (time.time(), data)
    return data


def _to_result(doc: dict) -> SearchResult:
    """Переводит книгу из формата Open Library в наш формат."""
    authors = doc.get("author_name") or []
    return SearchResult(
        ol_key=doc["key"],
        title=doc.get("title", "Без названия"),
        author=", ".join(authors[:2]) or None,
        year=doc.get("first_publish_year"),
        cover_id=doc.get("cover_i"),
    )


async def search_books(query: str, limit: int = 12, sort: str | None = None) -> list[SearchResult]:
    params = {"q": query, "limit": limit, "fields": FIELDS}
    if sort:
        params["sort"] = sort
    data = await _get_json("/search.json", params)
    return [_to_result(doc) for doc in data.get("docs", [])]


async def get_subjects(ol_key: str) -> list[str]:
    """Темы книги, например ["Fiction, dystopian", "Political fiction"]."""
    data = await _get_json(f"{ol_key}.json")
    return data.get("subjects", [])


async def books_by_subject(subject: str, limit: int = 10) -> list[SearchResult]:
    """Книги на заданную тему, сначала с самым высоким рейтингом."""
    return await search_books(f'subject:"{subject}"', limit=limit, sort="rating")


async def trending(limit: int = 12) -> list[SearchResult]:
    """Книги, популярные на Open Library сегодня."""
    data = await _get_json("/trending/daily.json", {"limit": limit})
    return [_to_result(doc) for doc in data.get("works", [])]
