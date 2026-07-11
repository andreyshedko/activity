# Data Model

> **Status:** ✅ Accepted
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](./constitution.md), [`product.md`](./product.md)

## 1. Назначение

Определяет каноническую модель данных Activity.

Каждая реализация storage ОБЯЗАНА реализовывать эту модель (см. [`database.md`](./database.md), [`storage.md`](./storage.md)).

React UI ОБЯЗАН зависеть от этой модели (см. [`react-api.md`](./react-api.md), [`activity-panel.md`](./activity-panel.md)).

Tracking API ОБЯЗАН производить эту модель (см. [`tracking-api.md`](./tracking-api.md)).

## 2. Обзор

Каноническая модель содержит пять сущностей:

```text
ActivityEntry
      ↓
   Actor · Resource · Change[] · Metadata
```

## 3. `ActivityEntry`

Представляет ровно одну пользовательскую операцию.

| Поле | Тип | Обязательно |
|---|---|---|
| `id` | string | ДА |
| `resource` | Resource | ДА |
| `action` | Action | ДА |
| `actor` | Actor | ДА |
| `timestamp` | Date | ДА |
| `changes` | Change[] | НЕТ |
| `content` | Content | НЕТ |
| `metadata` | Metadata | ДА |

**Требования:**

- **MODEL-001** — `ActivityEntry.id` ОБЯЗАН быть глобально уникальным. *(Unit Test)*
- **MODEL-002** — `ActivityEntry` ОБЯЗАН принадлежать ровно одному Resource.
- **MODEL-003** — `ActivityEntry` ОБЯЗАН содержать ровно одного Actor.
- **MODEL-004** — `ActivityEntry` ОБЯЗАН содержать один timestamp.
- **MODEL-005** — Timestamp ОБЯЗАН быть неизменяемым.
- **MODEL-006** — `ActivityEntry` ОБЯЗАН быть неизменяемым после создания. SDK НЕ ДОЛЖЕН поддерживать редактирование истории.
- **MODEL-007** — Удаление Activity Entries НЕ ДОЛЖНО поддерживаться. Soft-удаление МОЖЕТ быть реализовано приложениями.

> **MODEL-007 и каскадное удаление в схеме БД:** [`database.md`](./database.md) §5 определяет `SCHEMA-013` — каскадное удаление `activity_changes` при удалении `activity_entries`. Это не противоречие: `MODEL-007` запрещает **SDK** предоставлять публичный механизм удаления, а `SCHEMA-013` — техническая гарантия ссылочной целостности на случай ручного/административного удаления вне SDK (см. пояснение в `database.md`).

## 4. `Resource`

Представляет бизнес-объект.

| Поле | Тип |
|---|---|
| `type` | string |
| `id` | string |
| `title` | string |

**Требования:**

- **RESOURCE-001** — `Resource.type` ОБЯЗАН быть application-defined. SDK НЕ ДОЛЖЕН хардкодить значения.
- **RESOURCE-002** — `Resource.id` ОБЯЗАН уникально идентифицировать ресурс в рамках `Resource.type`.
- **RESOURCE-003** — `Resource.title` ДОЛЖЕН (SHOULD) быть человекочитаемым.

Пример:

```json
{
    "type": "invoice",
    "id": "inv_124",
    "title": "Invoice INV-124"
}
```

## 5. `Actor`

Представляет того, кто инициировал действие.

| Поле | Тип |
|---|---|
| `type` | ActorType |
| `id` | string |
| `name` | string |
| `avatarUrl` | string? |

`ActorType`: `user`, `system`, `api`, `agent`.

**Требования:**

- **ACTOR-001** — `Actor.type` ОБЯЗАН быть одним из поддерживаемых значений.
- **ACTOR-002** — `Actor.name` ОБЯЗАН быть человекочитаемым.
- **ACTOR-003** — `avatarUrl` МОЖЕТ быть опущен.
- **ACTOR-004** — Приложения МОГУТ определять дополнительные метаданные actor'а; SDK ОБЯЗАН игнорировать неизвестные поля.

## 6. `Change`

Представляет одно изменённое поле.

| Поле | Тип |
|---|---|
| `field` | string |
| `label` | string |
| `before` | unknown |
| `after` | unknown |
| `valueType` | ValueType |

**Требования:**

- **CHANGE-001** — `field` ОБЯЗАН быть стабильным (пример: `status`, не `Status`).
- **CHANGE-002** — `label` ОБЯЗАН локализовываться приложением.
- **CHANGE-003** — `before` МОЖЕТ быть `null`.
- **CHANGE-004** — `after` МОЖЕТ быть `null`.
- **CHANGE-005** — `Change` НЕ ДОЛЖЕН содержать логику презентации.

**Поддерживаемые `ValueType`:** `string`, `number`, `boolean`, `date`, `currency`, `user`, `enum`, `json`, `custom`.

Примеры: `status` (Draft → Approved), `amount` (120 → 90), `owner` (John → Sarah).

## 7. `Content`

Представляет пользовательский контент.

Поддерживаемые типы: `comment`, `attachment`, `custom`.

- **Comment:** поле `text`.
- **Attachment:** поля `fileName`, `mimeType`, `size`, `url`.

**Требования:**

- **CONTENT-001** — Только Content Entries МОГУТ содержать Content.
- **CONTENT-002** — Update Entries НЕ ДОЛЖНЫ содержать Content.
- **CONTENT-003** — Lifecycle Entries НЕ ДОЛЖНЫ содержать Content.

## 8. `Metadata`

Представляет техническую metadata. Metadata НЕ ДОЛЖНА влиять на рендеринг.

Поля: `source`, `version`, `requestId`, `ipAddress`, `custom`.

**Требования:**

- **META-001** — Metadata ОБЯЗАНА быть опциональной.
- **META-002** — Metadata НЕ ДОЛЖНА рендериться в свёрнутых записях.
- **META-003** — Metadata МОЖЕТ рендериться в развёрнутых записях.

## 9. Инварианты

- **INV-001** — Каждая `ActivityEntry` ОБЯЗАНА иметь ровно один Resource.
- **INV-002** — Каждая `ActivityEntry` ОБЯЗАНА иметь ровно одного Actor.
- **INV-003** — Каждая `ActivityEntry` ОБЯЗАНА иметь ровно одно Action.
- **INV-004** — Каждая `ActivityEntry` ОБЯЗАНА принадлежать одному timestamp.
- **INV-005** — Changes ОБЯЗАНЫ сохранять порядок; приложения НЕ ДОЛЖНЫ переупорядочивать changes.
- **INV-006** — `ActivityEntry` ОБЯЗАНА оставаться неизменяемой.

## 10. Правила по Action

| Action | Допустимые дополнительные поля |
|---|---|
| `create` | Resource, Actor, Timestamp |
| `update` | Changes[] |
| `comment` | Content |
| `attachment` | Content |
| `archive` | Metadata |
| `restore` | Metadata |
| `delete` | Metadata |

Согласуется с правилами валидации Tracking API (см. [`tracking-api.md`](./tracking-api.md) §13).

## 11. Сериализация

Каноническая модель ОБЯЗАНА сериализоваться в JSON.

- Никаких функций.
- Никаких классов.
- Никаких `Date` вне ISO8601-сериализации.

## 12. Версионирование

Каноническая модель ОБЯЗАНА оставаться обратно совместимой.

Breaking-изменения полей требуют: RFC, Migration Guide, Major Version.

## 13. Приёмка

- ✓ Неизменяема
- ✓ Сериализуема
- ✓ Полностью типизирована
- ✓ Независима от фреймворка
- ✓ Независима от базы данных
- ✓ Независима от UI
