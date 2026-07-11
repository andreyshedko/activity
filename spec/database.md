# Database

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](./constitution.md), [`data-model.md`](./data-model.md), [`engine.md`](./engine.md)

## 1. Назначение

Определяет каноническую реляционную схему базы данных.

Эта спецификация определяет **логическую** схему. Реализации Storage МОГУТ использовать разные физические оптимизации при условии, что все требования соблюдены.

## 2. Цели дизайна

Схема ОБЯЗАНА:

- сохранять неизменяемую историю (**MODEL-006**, см. [`constitution.md`](./constitution.md))
- поддерживать эффективные запросы по Resource
- поддерживать пагинацию (см. [`query-api.md`](./query-api.md), §9)
- поддерживать полнотекстовый поиск (см. [`query-api.md`](./query-api.md), §7)
- поддерживать будущее партиционирование

## 3. Таблицы

Version 1.0 определяет две обязательные таблицы:

- `activity_entries`
- `activity_changes`

Будущие версии МОГУТ вводить дополнительные таблицы.

## 4. `activity_entries`

Представляет одну Activity Entry (соответствует Activity Record из [`data-model.md`](./data-model.md)).

| Колонка | Тип | Nullable |
|---|---|---|
| `id` | uuid | No |
| `resource_type` | text | No |
| `resource_id` | text | No |
| `resource_title` | text | Yes |
| `action` | text | No |
| `actor_type` | text | No |
| `actor_id` | text | No |
| `actor_name` | text | No |
| `actor_avatar_url` | text | Yes |
| `content_type` | text | Yes |
| `content_json` | jsonb | Yes |
| `metadata_json` | jsonb | Yes |
| `created_at` | timestamptz | No |

Соответствие модели данных ([`data-model.md`](./data-model.md)):

- `resource_type` / `resource_id` / `resource_title` → **Resource** (см. `data-model.md` §4)
- `actor_type` / `actor_id` / `actor_name` / `actor_avatar_url` → **Actor** (см. `data-model.md` §5)
- `action` → **Action** (см. `data-model.md` §10)
- `content_type` / `content_json` → Content-записи (comment/attachment/custom, см. [`activity-panel.md`](./activity-panel.md) §14)
- `metadata_json` → вторичный контент (см. [`ui/overview.md`](./ui/overview.md))

### Ограничения (Constraints)

- **SCHEMA-001** — Первичный ключ: `id`.
- **SCHEMA-002** — `(resource_type, resource_id)` НЕ ДОЛЖНЫ быть NULL.
- **SCHEMA-003** — `created_at` НЕ ДОЛЖЕН быть NULL.
- **SCHEMA-004** — `action` НЕ ДОЛЖЕН быть NULL.
- **SCHEMA-005** — `actor_type` НЕ ДОЛЖЕН быть NULL.

## 5. `activity_changes`

Представляет одно изменение поля, принадлежащее Activity Entry.

| Колонка | Тип | Nullable |
|---|---|---|
| `id` | uuid | No |
| `entry_id` | uuid | No |
| `position` | integer | No |
| `field` | text | No |
| `label` | text | No |
| `before_value` | jsonb | Yes |
| `after_value` | jsonb | Yes |
| `value_type` | text | No |

Используется для рендеринга изменений полей в [`activity-panel.md`](./activity-panel.md) §13 («Update Entry Rendering» — collapsed показывает первые три `position`, остальное сворачивается в `+N more changes`).

### Ограничения (Constraints)

- **SCHEMA-010** — `entry_id` ОБЯЗАН ссылаться на `activity_entries(id)`.
- **SCHEMA-011** — `position` ОБЯЗАН начинаться с 0.
- **SCHEMA-012** — Порядок `(field, position)` ОБЯЗАН сохраняться.
- **SCHEMA-013** — Удаление Activity Entry ОБЯЗАНО каскадно удалять `activity_changes`.

> Каскадное удаление (SCHEMA-013) — техническая мера ссылочной целостности БД. Она не противоречит **MODEL-006** (иммутабельность истории): SDK не предоставляет публичного API для удаления Activity Entries (см. [`activity-panel.md`](./activity-panel.md) §1 — «не отвечает за удаление»); правило существует на случай ручного administrative-удаления вне SDK.

## 6. Связи

```text
activity_entries
        1
        ↓
        N
activity_changes
```

Каждый Change принадлежит ровно одной Activity Entry.

## 7. Индексы

**Обязательные индексы:**

| ID | Индекс | Назначение |
|---|---|---|
| **IDX-001** | `(resource_type, resource_id, created_at DESC)` | Запрос timeline по умолчанию |
| **IDX-002** | `(actor_id)` | Фильтрация по actor |
| **IDX-003** | `(action)` | Фильтрация по action |
| **IDX-004** | `(created_at DESC)` | Глобальная сортировка |

**Рекомендуемые индексы:**

| ID | Индекс |
|---|---|
| **IDX-005** | `GIN(metadata_json)` |
| **IDX-006** | `GIN(content_json)` |

## 8. Поиск (Search)

Реализация Storage ОБЯЗАНА поддерживать поиск по:

- `actor_name`
- `resource_title`
- field labels
- `before_value`
- `after_value`
- тексту комментария

Реализации МОГУТ использовать:

- PostgreSQL Full Text Search
- Trigram-индексы
- Внешние поисковые движки

Публичный API ([`query-api.md`](./query-api.md) §7) ОБЯЗАН оставаться неизменным независимо от выбранной техники поиска.

## 9. Сортировка (Ordering)

- Основная сортировка: `created_at DESC`
- Вторичная сортировка: `id DESC`

Это гарантирует детерминированный порядок при равных timestamp'ах — соответствует **QUERY-110/111** ([`query-api.md`](./query-api.md) §8).

## 10. Пагинация

- Offset-пагинация ОБЯЗАНА поддерживаться (соответствует решению по **OPEN-003**, см. [`query-api.md`](./query-api.md) §9 и [`rfc/RFC-003-pagination-strategy.md`](./rfc/RFC-003-pagination-strategy.md)).
- Cursor-пагинация МОЖЕТ быть добавлена в будущей версии (V2, см. [`query-api.md`](./query-api.md) §10).
- Публичный API ОБЯЗАН скрывать storage-специфичные детали реализации.

## 11. Иммутабельность

- Персистентные строки НЕ ДОЛЖНЫ обновляться (UPDATE запрещён на уровне схемы для `activity_entries`/`activity_changes`).
- Исправления создают новые Activity Entries.
- История — append-only.

Это прямая реализация **MODEL-006** ([`constitution.md`](./constitution.md)) на уровне схемы БД.

## 12. Хранение данных (Retention)

- SDK НЕ ДОЛЖЕН автоматически удалять исторические записи.
- Приложения МОГУТ определять собственные retention policies.
- Логика retention находится вне scope SDK.

## 13. Транзакции

Вставка одной Activity Entry и всех соответствующих Changes ОБЯЗАНА происходить в единой транзакции.

Частичная запись (partial writes) НЕ ДОЛЖНА быть возможна.

Это техническая гарантия **PROD-005** ([`constitution.md`](./constitution.md) — одно действие = одна запись) на уровне персистентности.

## 14. Правила миграций

Изменения схемы ОБЯЗАНЫ использовать forward-only миграции.

Деструктивные миграции требуют:

- RFC
- Migration Guide
- Major Version

(согласуется с общей политикой breaking changes из [`public-api.md`](./public-api.md)).

## 15. Целевые показатели производительности

| Метрика | Значение |
|---|---|
| Timeline query | ≤ 100 мс |
| Датасет | 100 000 записей |

**Допущения:**

- присутствуют рекомендуемые индексы
- warm cache
- PostgreSQL 16+

Согласуется с целевыми показателями сложности из [`query-api.md`](./query-api.md) §14 (O(log n + k)) и требованием производительности `ActivityPanel` из [`activity-panel.md`](./activity-panel.md) §21 (100 000+ записей с виртуализацией).

## 16. Чек-лист приёмки

- [ ] Каноническая схема реализована
- [ ] Foreign keys обеспечены
- [ ] Обязательные индексы созданы
- [ ] Транзакционные вставки проверены
- [ ] Сортировка проверена
- [ ] Пагинация проверена
- [ ] Бенчмарк производительности завершён

## 17. Будущие адаптеры (вне scope V1)

Эта каноническая схема описывает **PostgreSQL Adapter** — единственный адаптер, входящий в scope Version 1 (см. [`product.md`](./product.md), раздел «Включено в V1»).

Прочие адаптеры, перечисленные в [`storage.md`](./storage.md), вне scope V1:

- SQLite
- MySQL
- Supabase
- Custom

Для каждого из них потребуется собственная логическая схема, удовлетворяющая тем же требованиям («Цели дизайна» выше), после того как будет принято решение об их реализации.
