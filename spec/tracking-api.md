# Tracking API

> **Status:** ✅ Accepted
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](./constitution.md), [`product.md`](./product.md), [`data-model.md`](./data-model.md)

## 1. Назначение

Определяет публичный Tracking API — основной интерфейс разработчика.

Developer Experience имеет приоритет выше, чем простота реализации.

## 2. Цели

API ОБЯЗАН удовлетворять следующим целям:

- читаемость
- строгая типизация
- независимость от фреймворка
- независимость от storage
- предсказуемость

## 3. Non-Goals

Tracking API НЕ ДОЛЖЕН экспонировать:

- SQL
- реализацию storage
- React
- ORM-специфичные типы

## 4. Принципы

- **TRACK-001** — Tracking API ОБЯЗАН возвращать `Promise<ActivityRecord>`. Приложения ДОЛЖНЫ `await track()` там, где failure должен быть observable. Fire-and-forget usage допускается только явно через `void activity.track(input)`. См. [`../SPEC_CLARIFICATIONS.md`](../SPEC_CLARIFICATIONS.md) §1.
- **TRACK-002** — Приложения НЕ ДОЛЖНЫ конструировать `ActivityEntry` вручную. Только SDK создаёт объекты `ActivityEntry` (соответствует [`engine.md`](./engine.md) §7 — `EntryFactory`).
- **TRACK-003** — API ОБЯЗАН принимать бизнес-объекты, а не требовать внутренние типы Engine.

  Хорошо:
  ```ts
  activity.track({ ... })
  ```

  Плохо:
  ```ts
  new ActivityEntry(...)
  ```

- **TRACK-004** — API ОБЯЗАН валидировать весь вход. Некорректные payload'ы ОБЯЗАНЫ выбрасывать описательные ошибки.
- **TRACK-005** — API ОБЯЗАН быть полностью типизированным. Перегрузки, возвращающие `any`, не допускаются.

> **Примечание об именовании требований:** в исходном документе эти пункты были пронумерованы как `API-001`…`API-033`. В этой спецификации они переименованы в `TRACK-xxx`, чтобы не конфликтовать с нумерацией требований в [`public-api.md`](./public-api.md). Семантика `TRACK-001` обновлена через принятое уточнение [`SPEC_CLARIFICATIONS.md`](../SPEC_CLARIFICATIONS.md) §1.

## 5. Точка входа

SDK предоставляет ровно один сервис трекинга:

```ts
activity.track(...)
```

Дополнительные хелперы МОГУТ существовать. `track()` остаётся основным API.

## 6. `track()`

```ts
activity.track(input: TrackInput): Promise<ActivityRecord>
```

```ts
interface TrackInput {
    resource: ResourceInput
    actor: ActorInput
    action: Action
    changes?: ChangeInput[]
    content?: ContentInput
    metadata?: MetadataInput
    timestamp?: Date
}
```

`timestamp` опционален. Если не передан, SDK ОБЯЗАН сгенерировать его (согласуется с [`engine.md`](./engine.md) §6, Stage 3 — Enrichment).

## 7. `ResourceInput`

```ts
interface ResourceInput {
    type: string
    id: string
    title?: string
}
```

**Требования:**

- **TRACK-010** — `type` НЕ ДОЛЖЕН быть пустым.
- **TRACK-011** — `id` НЕ ДОЛЖЕН быть пустым.
- **TRACK-012** — `title` МОЖЕТ быть опущен.

Соответствует **Resource** из [`data-model.md`](./data-model.md) §4 (**RESOURCE-001**).

## 8. `ActorInput`

```ts
interface ActorInput {
    type: "user" | "system" | "api" | "agent"
    id: string
    name: string
    avatarUrl?: string
}
```

**Требования:**

- **TRACK-020** — Тип Actor ОБЯЗАН валидироваться.
- **TRACK-021** — `name` НЕ ДОЛЖЕН быть пустым.

Соответствует **Actor** из [`data-model.md`](./data-model.md) §5 (**ACTOR-001**); значения `type` совпадают с поддерживаемыми типами Actor.

## 9. `Action`

```ts
type BuiltInAction =
    | "create"
    | "update"
    | "delete"
    | "archive"
    | "restore"
    | "comment"
    | "attachment";

type Action = BuiltInAction | (string & {});
```

SDK ОБЯЗАН распознавать built-in actions и ОБЯЗАН принимать custom string actions.

Built-in actions получают default rendering. Custom actions используют generic rendering, если приложение не предоставило custom renderer.

См. [`../SPEC_CLARIFICATIONS.md`](../SPEC_CLARIFICATIONS.md) §2.

## 10. `ChangeInput`

```ts
interface ChangeInput {
    field: string
    label: string
    before?: unknown
    after?: unknown
    valueType?: ValueType
}
```

**Требования:**

- **TRACK-030** — `field` ОБЯЗАН быть стабильным (пример: `status`, а не `Status`).
- **TRACK-031** — `label` ОБЯЗАН быть человекочитаемым.
- **TRACK-032** — `before` МОЖЕТ быть `undefined`.
- **TRACK-033** — `after` МОЖЕТ быть `undefined`.

Соответствует изменениям полей, отображаемым в [`activity-panel.md`](./activity-panel.md) §13 и хранимым в таблице `activity_changes` (см. [`database.md`](./database.md) §5 — `field`/`label`/`before_value`/`after_value` напрямую соответствуют этим полям).

## 11. `ContentInput`

```ts
type ContentInput =
    | CommentContent
    | AttachmentContent
    | CustomContent
```

Соответствует Content-записям из [`activity-panel.md`](./activity-panel.md) §14 (Comment / Attachment / Custom).

## 12. `MetadataInput`

Metadata специфична для приложения.

SDK ОБЯЗАН сохранять неизвестные metadata без изменений (согласуется с [`engine.md`](./engine.md) §6, Stage 4 — Middleware МОЖЕТ обогащать metadata, но не обязан её понимать).

## 13. Правила валидации

| Action | Требование |
|---|---|
| `update` | `changes` ОБЯЗАТЕЛЬНЫ |
| `comment` | `content` ОБЯЗАТЕЛЕН |
| `attachment` | `content` ОБЯЗАТЕЛЕН |
| `create` | `changes` опциональны |
| `delete` | `changes` опциональны |

## 14. Примеры

**Create:**

```ts
activity.track({
    resource: {
        type: "invoice",
        id: invoice.id,
        title: invoice.number
    },
    actor: currentUser,
    action: "create"
})
```

**Update:**

```ts
activity.track({
    resource: invoice,
    actor: currentUser,
    action: "update",
    changes: [
        {
            field: "status",
            label: "Status",
            before: "Draft",
            after: "Approved"
        },
        {
            field: "amount",
            label: "Amount",
            before: 120,
            after: 90
        }
    ]
})
```

**Comment:**

```ts
activity.track({
    resource: invoice,
    actor: currentUser,
    action: "comment",
    content: {
        type: "comment",
        text: "Customer confirmed."
    }
})
```

**Attachment:**

```ts
activity.track({
    resource: invoice,
    actor: currentUser,
    action: "attachment",
    content: {
        type: "attachment",
        fileName: "contract.pdf",
        mimeType: "application/pdf",
        size: 241002
    }
})
```

Attachment tracking ОБЯЗАНО валидировать соответствие `action` и `content.type`,
неотрицательный конечный `size`, непустые `fileName`/`mimeType`, настроенную MIME
policy и URL protocol policy. По умолчанию absolute URL разрешает только HTTPS;
root-relative URL разрешён для application-owned download endpoints.

## 15. Ошибки

Ошибки валидации ОБЯЗАНЫ содержать: `code`, `message`, `field`.

```ts
{
    code: "INVALID_ACTION",
    message: "...",
    field: "action"
}
```

> Дополняет модель ошибок из [`public-api.md`](./public-api.md) §14 (`code`/`message`) полем `field`, специфичным для ошибок валидации входа трекинга.

## 16. События

SDK МОЖЕТ эмитировать lifecycle-события: `beforeTrack`, `afterTrack`, `trackFailed`.

Приложения МОГУТ подписываться.

Соответствует событиям Engine из [`engine.md`](./engine.md) §6, Stage 6.

## 17. Потокобезопасность

Tracking API ОБЯЗАН поддерживать конкурентные вызовы. Глобальное изменяемое состояние не допускается (согласуется с [`engine.md`](./engine.md) §12).

## 18. Обратная совместимость

| Изменение | Тип |
|---|---|
| Добавление опциональных свойств | Совместимо |
| Удаление свойств | Breaking |
| Переименование свойств | Breaking |
| Изменение типов | Breaking |

## 19. Приёмка

- ✓ Полностью типизировано
- ✓ Независимо от фреймворка
- ✓ Независимо от ORM
- ✓ Независимо от storage
- ✓ Local First
- ✓ Zero React dependency
- ✓ Zero SQL dependency
- ✓ Валидация входа
- ✓ Стабильный публичный API

> **Статус:** первый документ проекта со статусом Accepted — детальная схема `track()`/`TrackInput` зафиксирована. Открыт один нетривиальный вопрос: механизм типизации кастомных Actions (см. раздел 9).
