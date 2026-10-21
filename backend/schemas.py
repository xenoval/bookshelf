"""Pydantic-схемы: описывают, какие данные API принимает и отдаёт."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Status = Literal["want", "reading", "read"]

# Строка, у которой обрезаны пробелы по краям
Text = Annotated[str, StringConstraints(strip_whitespace=True, max_length=10_000)]


class SearchResult(BaseModel):
    """Книга из поиска Open Library."""

    ol_key: str
    title: str
    author: str | None = None
    year: int | None = None
    cover_id: int | None = None


class BookCreate(SearchResult):
    """Данные для добавления книги на полку."""

    status: Status = "want"


class BookUpdate(BaseModel):
    """Все поля необязательные: меняем только то, что прислали."""

    status: Status | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    review: Text | None = None


class NoteCreate(BaseModel):
    text: Annotated[Text, StringConstraints(min_length=1)]


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    created_at: datetime


class BookOut(BookCreate):
    """Книга с полки в ответе API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    rating: int | None
    review: str | None
    reviewed_at: datetime | None
    added_at: datetime
    notes: list[NoteOut]


class Recommendation(SearchResult):
    """Рекомендованная книга и на какую книгу с полки она похожа."""

    similar_to: str | None = None


class Recommendations(BaseModel):
    personal: bool          # False — оценок пока нет, показываем популярное
    based_on: list[str]     # названия книг, на которых основана подборка
    items: list[Recommendation]


class Stats(BaseModel):
    want: int
    reading: int
    read: int
