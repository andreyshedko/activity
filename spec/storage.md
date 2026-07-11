# Storage

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](./constitution.md), [`product.md`](./product.md), [`data-model.md`](./data-model.md), [`public-api.md`](./public-api.md)

## 1. Назначение

Определяет абстракцию хранения, используемую Activity Engine.

Engine ОБЯЗАН зависеть только от этой абстракции (**ARCH-004**, см. [`constitution.md`](./constitution.md)).

Реализации Storage ОБЯЗАНЫ реализовывать эту спецификацию.

## 2. Цели дизайна

Слой хранения ОБЯЗАН:

- быть независимым от базы данных
- быть заменяемым (**DB-002**)
- поддерживать транзакции
- поддерживать пагинацию
- поддерживать фильтрацию
- поддерживать полнотекстовый поиск
- поддерживать опциональные будущие расширения

## 3. Архитектура

```text
Application
      ↓
Activity
      ↓
StorageAdapter
      ↓
PostgreSQL | SQLite | MySQL | Custom
```

Engine НЕ ДОЛЖЕН знать, какая база данных используется (**ARCH-002/ARCH-003**).

## 4. Интерфейс `StorageAdapter`

Каждый адаптер ОБЯЗАН реализовывать следующий интерфейс:

```ts
interface StorageAdapter {
    insert(entry: ActivityEntry): Promise<void>
    query(options: QueryOptions): Promise<QueryResult>
}
```

Version 1.0 намеренно оставляет интерфейс минимальным.

> Это закрывает ранее открытый вопрос контракта Storage Adapter (см. [`engine.md`](./engine.md) §7 — `StorageService`/`QueryService` делегируют именно этим двум методам).

## 5. `insert()`

**Назначение:** сохранить одну неизменяемую `ActivityEntry`.

**Требования:**

- **STORE-001** — `insert()` ОБЯЗАН вставлять ровно одну `ActivityEntry` (проверка: интеграционный тест).
- **STORE-002** — `insert()` ОБЯЗАН быть атомарным (проверка: интеграционный тест). Соответствует требованию транзакционности из [`database.md`](./database.md) §13 (Entry + все Changes в одной транзакции).
- **STORE-003** — `insert()` НЕ ДОЛЖЕН модифицировать `ActivityEntry` (проверка: unit-тест).
- **STORE-004** — `insert()` ОБЯЗАН сохранять порядок Changes (проверка: интеграционный тест; соответствует **DB-012**, см. [`database.md`](./database.md)).
- **STORE-005** — `insert()` ОБЯЗАН завершаться типизированной ошибкой при сбое персистентности (проверка: интеграционный тест).

## 6. `query()`

**Назначение:** получить Activity Entries.

```ts
query(options: QueryOptions): Promise<QueryResult>
```

**Требования:**

- **STORE-010** — Результаты ОБЯЗАНЫ упорядочиваться по timestamp по убыванию, если явно не переопределено (согласуется с [`database.md`](./database.md) §9 и [`query-api.md`](./query-api.md) §8).
- **STORE-011** — Пагинация ОБЯЗАНА поддерживаться.
- **STORE-012** — Фильтрация ОБЯЗАНА поддерживаться.
- **STORE-013** — Поиск ОБЯЗАН поддерживаться.
- **STORE-014** — `query()` НЕ ДОЛЖЕН мутировать сохранённые данные.

## 7. `QueryOptions`

```ts
interface QueryOptions {
    resource: {
        type: string
        id: string
    }
    search?: string
    actorId?: string
    actions?: Action[]
    from?: Date
    to?: Date
    limit?: number
    offset?: number
}
```

Соответствие [`query-api.md`](./query-api.md) §4 (Execution Order): `resource` → «Resolve resource», `actions` → «Apply action filter», `actorId` → «Apply actor filter», `from`/`to` → «Apply date filter», `search` → «Apply search», `limit`/`offset` → «Apply pagination».

**Требования:**

- **STORE-020** — `resource` ОБЯЗАТЕЛЕН (согласуется с **QUERY-090**, см. [`query-api.md`](./query-api.md)).
- **STORE-021** — `limit` по умолчанию равен `50`.
- **STORE-022** — Максимальный `limit` по умолчанию равен `500`. Приложения МОГУТ переопределить этот лимит.
- **STORE-023** — Отрицательные `offset` ОБЯЗАНЫ отклоняться (согласуется с ошибкой `INVALID_OFFSET`, см. [`query-api.md`](./query-api.md) §15).

## 8. `QueryResult`

```ts
interface QueryResult {
    entries: ActivityEntry[]
    total: number
    hasMore: boolean
}
```

**Требования:**

- **STORE-030** — `entries` ОБЯЗАН содержать неизменяемые объекты `ActivityEntry`.
- **STORE-031** — `total` ОБЯЗАН представлять общее число подходящих записей.
- **STORE-032** — `hasMore` ОБЯЗАН указывать на наличие дополнительных страниц (согласуется с `hasMore` из [`query-api.md`](./query-api.md) §9 и **QUERY-122**).

## 9. Транзакции

**Требования:**

- **STORE-040** — Адаптер МОЖЕТ участвовать в транзакциях приложения.
- **STORE-041** — Engine НЕ ДОЛЖЕН требовать поддержку транзакций как обязательное условие работы адаптера.

## 10. Конкурентность

**Требования:**

- **STORE-050** — Конкурентные вставки ОБЯЗАНЫ поддерживаться.
- **STORE-051** — Конкурентные чтения ОБЯЗАНЫ поддерживаться.
- **STORE-052** — Операции чтения НЕ ДОЛЖНЫ блокировать другие чтения.

Согласуется с требованием потокобезопасности Engine (см. [`engine.md`](./engine.md) §12).

## 11. Ошибки

Каждая ошибка хранения ОБЯЗАНА предоставлять:

```ts
interface StorageError {
    code: string
    message: string
}
```

Адаптер МОЖЕТ предоставлять дополнительные поля.

> Соотносится с `StorageError` из [`engine.md`](./engine.md) §10 (типизированные ошибки Engine) и кодами ошибок хранения из [`query-api.md`](./query-api.md) §15 (`STORAGE_FAILURE`, `QUERY_TIMEOUT`, `CONNECTION_FAILED`).

## 12. Производительность

**Требования:**

- **STORE-060** — Адаптер ОБЯЗАН поддерживать запросы к ресурсам, содержащим не менее 100 000 Activity Entries (проверка: бенчмарк). Согласуется с [`database.md`](./database.md) §15 и [`activity-panel.md`](./activity-panel.md) §21.
- **STORE-061** — Производительность запроса ОБЯЗАНА в первую очередь опираться на индексы (см. [`database.md`](./database.md) §7 — IDX-001…006). Полное сканирование таблицы ОБЯЗАНО избегаться для обычных запросов (проверка: бенчмарк базы данных).

## 13. Расширяемость

Приложения МОГУТ реализовывать кастомные `StorageAdapter`.

Engine ОБЯЗАН обрабатывать все совместимые адаптеры одинаково (согласуется с **DB-002**).

## 14. Версионирование

| Изменение | Тип |
|---|---|
| Добавление опциональных методов | Совместимо |
| Добавление обязательных методов | Breaking |
| Изменение сигнатур существующих методов | Breaking |

Согласуется с общей политикой breaking changes из [`public-api.md`](./public-api.md): RFC + Migration Guide + Major Version.

## 15. Приёмка

- ✓ Абстракция адаптера завершена
- ✓ Engine независим от базы данных
- ✓ Поддерживается пагинация
- ✓ Поддерживается фильтрация
- ✓ Поддерживается поиск
- ✓ Поддерживается неизменяемая `ActivityEntry`
- ✓ Поддерживаются кастомные адаптеры

## 16. Планируемые адаптеры

- PostgreSQL (см. [`database.md`](./database.md)) — единственный адаптер в scope V1 (см. [`product.md`](./product.md))
- SQLite
- MySQL
- Supabase
- Custom

> **Статус:** контракт `StorageAdapter` (методы `insert`/`query`, `QueryOptions`, `QueryResult`, ошибки) полностью специфицирован. Логическая схема PostgreSQL-реализации — в [`database.md`](./database.md). Открытых вопросов по этому документу не осталось.
