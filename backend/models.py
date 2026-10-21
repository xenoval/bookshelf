"""Таблицы базы данных."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Уникальный ключ книги в Open Library, например "/works/OL45804W".
    # Не даёт добавить одну и ту же книгу на полку дважды.
    ol_key: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    author: Mapped[str | None] = mapped_column(String, nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cover_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # want — хочу прочитать, reading — читаю, read — прочитано
    status: Mapped[str] = mapped_column(String, default="want")
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Отзыв пишут к прочитанной книге
    review: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    added_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Заметки, которые пишут по ходу чтения. Удаляются вместе с книгой.
    notes: Mapped[list["Note"]] = relationship(
        back_populates="book",
        cascade="all, delete-orphan",
        order_by="Note.created_at.desc()",
    )


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    book: Mapped[Book] = relationship(back_populates="notes")
