"""Точка входа: FastAPI-приложение с API и раздачей фронтенда."""

from datetime import datetime
from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from . import models, openlibrary, recommendations
from .database import Base, engine, get_db
from .schemas import (
    BookCreate,
    BookOut,
    BookUpdate,
    NoteCreate,
    NoteOut,
    Recommendations,
    SearchResult,
    Stats,
    Status,
)

# Создаём таблицы при старте, если их ещё нет
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Книжная полка", description="Трекер чтения с поиском по Open Library")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


def get_book_or_404(book_id: int, db: Session) -> models.Book:
    book = db.get(models.Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Книга не найдена")
    return book


@app.get("/api/search", response_model=list[SearchResult])
async def search(q: str = Query(min_length=2)):
    """Ищет книги во внешнем API Open Library."""
    try:
        return await openlibrary.search_books(q)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Open Library сейчас недоступна")


@app.get("/api/recommendations", response_model=Recommendations)
async def get_recommendations(db: Session = Depends(get_db)):
    """Подборка на основе книг, которые пользователь оценил на 4–5 звёзд."""
    shelf = db.scalars(select(models.Book)).all()
    try:
        return await recommendations.recommend(shelf)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Open Library сейчас недоступна")


@app.get("/api/books", response_model=list[BookOut])
def list_books(status: Status | None = None, db: Session = Depends(get_db)):
    query = (
        select(models.Book)
        # Загружаем заметки всех книг одним запросом, а не отдельным на каждую книгу
        .options(selectinload(models.Book.notes))
        .order_by(models.Book.added_at.desc())
    )
    if status:
        query = query.where(models.Book.status == status)
    return db.scalars(query).all()


@app.post("/api/books", response_model=BookOut, status_code=201)
def add_book(data: BookCreate, db: Session = Depends(get_db)):
    exists = db.scalar(select(models.Book).where(models.Book.ol_key == data.ol_key))
    if exists:
        raise HTTPException(status_code=409, detail="Эта книга уже на полке")

    book = models.Book(**data.model_dump())
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@app.patch("/api/books/{book_id}", response_model=BookOut)
def update_book(book_id: int, data: BookUpdate, db: Session = Depends(get_db)):
    book = get_book_or_404(book_id, db)

    # exclude_unset: обновляем только поля, которые клиент действительно прислал
    changes = data.model_dump(exclude_unset=True)
    if "review" in changes:
        # Пустой отзыв сохраняем как «отзыва нет»
        changes["review"] = changes["review"] or None
        book.reviewed_at = datetime.now() if changes["review"] else None

    for field, value in changes.items():
        setattr(book, field, value)
    db.commit()
    db.refresh(book)
    return book


@app.delete("/api/books/{book_id}", status_code=204)
def delete_book(book_id: int, db: Session = Depends(get_db)):
    db.delete(get_book_or_404(book_id, db))
    db.commit()


@app.post("/api/books/{book_id}/notes", response_model=NoteOut, status_code=201)
def add_note(book_id: int, data: NoteCreate, db: Session = Depends(get_db)):
    book = get_book_or_404(book_id, db)
    note = models.Note(book=book, text=data.text)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@app.delete("/api/notes/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(models.Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")
    db.delete(note)
    db.commit()


@app.get("/api/stats", response_model=Stats)
def stats(db: Session = Depends(get_db)):
    rows = db.execute(
        select(models.Book.status, func.count()).group_by(models.Book.status)
    ).all()
    counts = {"want": 0, "reading": 0, "read": 0}
    counts.update(dict(rows))
    return counts


# Фронтенд подключаем последним, чтобы он не перехватывал пути /api/...
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
