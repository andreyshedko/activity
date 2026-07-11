# Public API

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](./constitution.md), [`product.md`](./product.md)

## 1. Назначение

Определяет полный публичный API, предоставляемый Activity Platform.

Этот документ — единственный источник истины о том, что разработчику разрешено использовать.

Всё, что здесь не описано, считается внутренним.

## 2. Цели дизайна

Публичный API ОБЯЗАН:

- быть независимым от фреймворка
- быть независимым от storage
- быть полностью типизированным
- поддерживать tree-shaking
- минимизировать необходимую конфигурацию
- оставаться стабильным между minor-релизами

## 3. Публичные пакеты

Version 1.0 экспортирует следующие пакеты:

| Пакет | Назначение |
|---|---|
| `@activity/core` | Core engine и публичный API |
| `@activity/react` | React UI-компоненты |
| `@activity/postgres` | PostgreSQL storage adapter |

Приложения НЕ ДОЛЖНЫ импортировать внутренние пакеты.

## 4. Публичная точка входа

Приложения создают ровно один инстанс `Activity`.

```ts
import { createActivity } from "@activity/core";
```

**Требование:**

- **PUBAPI-001** — SDK ОБЯЗАН предоставлять ровно одну фабричную функцию: `createActivity(...)`. Никакие дополнительные фабричные функции не допускаются в v1 (проверка: unit-тест).

## 5. `createActivity()`

```ts
const activity = createActivity({
    adapter,
    logger?,
    clock?,
});
```

Возвращает: `Activity`.

**Требования:**

- **PUBAPI-002** — `createActivity()` НЕ ДОЛЖЕН подключаться к базе данных. Установление соединения делегируется адаптеру (см. [`storage.md`](./storage.md)).
- **PUBAPI-003** — `createActivity()` ОБЯЗАН быть синхронным.
- **PUBAPI-004** — `createActivity()` ОБЯЗАН быть свободным от побочных эффектов.

## 6. Интерфейс `Activity`

Возвращаемый объект ОБЯЗАН предоставлять следующие методы:

```ts
interface Activity {
    track(...): Promise<ActivityRecord>
    query(...)
}
```

Version 1.0 намеренно предоставляет только две операции.

**Требование:**

- **PUBAPI-010** — Публичный интерфейс `Activity` ОБЯЗАН оставаться минимальным. Version 1.0 ОБЯЗАНА предоставлять не более пяти публичных методов.

## 7. `track()`

**Назначение:** создать одну Activity Entry.

```ts
activity.track(input)
```

Возвращает: `Promise<ActivityRecord>`.

Fire-and-forget usage допускается только явно:

```ts
void activity.track(input);
```

**Требования:**

- **PUBAPI-020** — `track()` ОБЯЗАН представлять ровно одну пользовательскую операцию (реализует **PROD-005**, см. [`constitution.md`](./constitution.md)).
- **PUBAPI-021** — `track()` ОБЯЗАН валидировать вход (см. [`engine.md`](./engine.md) §6, Stage 1).
- **PUBAPI-022** — `track()` ОБЯЗАН выбрасывать описательные ошибки.
- **PUBAPI-023** — `track()` НЕ ДОЛЖЕН мутировать входные объекты.

**Пример:**

```ts
const record = await activity.track({
    resource: {
        type: "invoice",
        id: "inv_123",
    },
    actor: currentUser,
    action: "update",
    changes: [...]
});
```

## 8. `query()`

**Назначение:** читать Activity Entries.

```ts
activity.query(options)
```

Возвращает: `Promise<ActivityEntry[]>`.

**Требования:**

- **PUBAPI-030** — `query()` ОБЯЗАН быть асинхронным.
- **PUBAPI-031** — Результаты ОБЯЗАНЫ сортироваться по timestamp по убыванию по умолчанию (согласуется с [`query-api.md`](./query-api.md) §8).
- **PUBAPI-032** — Пагинация ОБЯЗАНА поддерживаться.
- **PUBAPI-033** — Фильтрация ОБЯЗАНА поддерживаться.
- **PUBAPI-034** — Поиск ОБЯЗАН поддерживаться.

**Пример:**

```ts
const entries = await activity.query({
    resource: {
        type: "invoice",
        id: "inv_123",
    },
});
```

> **Примечание:** `query()` возвращает `Promise<ActivityEntry[]>` напрямую, тогда как `StorageAdapter.query()` (см. [`storage.md`](./storage.md) §6) возвращает `Promise<QueryResult>` (содержащий `entries`, `total`, `hasMore`). Публичный `Activity.query()` — упрощённая проекция поверх внутреннего `QueryResult`; `total`/`hasMore` на этом уровне не экспонируются в v1.

## 9. Query Options

Поддерживаемые опции:

```ts
resource
search
actor
actions
from
to
limit
offset
```

Неизвестные опции ОБЯЗАНЫ игнорироваться.

> Соответствует `QueryOptions` из [`storage.md`](./storage.md) §7, за исключением именования: публичный API использует `actor`, внутренний `StorageAdapter` — `actorId` (маппинг — деталь реализации Engine).

## 10. React-пакет

React-пакет НЕ ДОЛЖЕН создавать инстансы `Activity`.

React потребляет уже существующий инстанс `Activity`.

**Требование:**

- **PUBAPI-040** — Engine владеет данными. React владеет только рендерингом (реализует **ARCH-002/ARCH-003**, см. [`constitution.md`](./constitution.md)).

> **Это решает OPEN-001** (см. [`rfc/RFC-001-react-integration.md`](./rfc/RFC-001-react-integration.md)): React-слой использует прямые инстансы `Activity`, передаваемые явно, а не паттерн `ActivityProvider`/контекст. Приложение создаёт `Activity` через `createActivity()` (вне React) и передаёт его как prop.

## 11. `ActivityPanel`

Основной UI-компонент.

```tsx
<ActivityPanel
    activity={activity}
    resource={{
        type: "invoice",
        id: "inv_123",
    }}
/>
```

**Требования:**

- **PUBAPI-050** — prop `activity` ОБЯЗАТЕЛЕН.
- **PUBAPI-051** — prop `resource` ОБЯЗАТЕЛЕН.
- **PUBAPI-052** — `ActivityPanel` ОБЯЗАН самостоятельно загружать свои данные. Приложения НЕ ДОЛЖНЫ вручную загружать Activity Entries для реализации по умолчанию.

> **Это решает OPEN-002** (см. [`rfc/RFC-002-query-execution-model.md`](./rfc/RFC-002-query-execution-model.md)): именно `ActivityPanel` выполняет запросы самостоятельно в режиме по умолчанию — отдельный обязательный хук для выполнения запроса не требуется. Это подтверждает предположение, сделанное ранее в [`activity-panel.md`](./activity-panel.md) на основе наличия controlled-режима.

## 12. Controlled Mode

Приложения МОГУТ обойти автоматическую загрузку:

```tsx
<ActivityPanel
    entries={entries}
/>
```

**Требование:**

- **PUBAPI-060** — Когда передан `entries`, `ActivityPanel` НЕ ДОЛЖЕН выполнять запросы (согласуется с [`activity-panel.md`](./activity-panel.md) §5).

## 13. Публичные типы

Следующие типы публичны:

```ts
Activity
ActivityEntry
Resource
Actor
Change
BuiltInAction
Action
ActivityRecord
QueryOptions
TrackInput
```

Все остальные типы — внутренние.

## 14. Модель ошибок

Каждая публичная ошибка ОБЯЗАНА предоставлять:

```ts
code
message
```

Stack traces — деталь реализации, не часть публичного контракта.

> Согласуется с моделью ошибок `StorageError` ([`storage.md`](./storage.md) §11) и типизированными ошибками Engine ([`engine.md`](./engine.md) §10).

## 15. Версионирование

| Изменение | Тип |
|---|---|
| Добавление опциональных свойств | Совместимо |
| Добавление методов | Совместимо |
| Удаление методов | Breaking |
| Переименование методов | Breaking |
| Изменение сигнатур методов | Breaking |

## 16. Примеры

**Минимальная установка:**

```ts
const activity = createActivity({
    adapter: postgresAdapter(...)
});
```

**Минимальный трекинг:**

```ts
activity.track(...);
```

**Минимальный рендеринг:**

```tsx
<ActivityPanel
    activity={activity}
    resource={{
        type: "invoice",
        id: invoice.id,
    }}
/>
```

## 17. Non-Goals

Version 1.0 НЕ ДОЛЖНА предоставлять:

- ORM-специфичные API
- SQL builders
- React-хуки, привязанные к storage
- Event bus
- Plugin registry
- Обязательную Provider-based архитектуру

Последний пункт — прямое следствие решения по OPEN-001 (раздел 10 выше): `ActivityProvider` не является обязательной частью архитектуры v1.

## 18. Приёмка

- ✓ Одна фабрика
- ✓ Один инстанс Activity
- ✓ Один метод трекинга
- ✓ Один метод запроса
- ✓ Стабильные публичные типы
- ✓ Полностью типизировано
- ✓ Независимо от фреймворка

## 19. Связанные документы

Конкретные поверхности публичного API также описаны в:

- [`engine.md`](./engine.md) — внутренняя реализация Engine, вызываемая через `track()`/`query()`
- [`query-api.md`](./query-api.md) — детальная семантика `query()`
- [`react-api.md`](./react-api.md) — модель интеграции React и публичные компоненты `ActivityEntry`, `ActivitySearch`, `ActivityFilters`
- [`activity-panel.md`](./activity-panel.md) — компонент `ActivityPanel`
- [`storage.md`](./storage.md) — контракт `StorageAdapter`

> **Статус:** публичный API полностью специфицирован для v1.0, включая решение OPEN-001 и OPEN-002. Breaking changes по-прежнему требуют RFC — см. процесс в [`rfc/README.md`](./rfc/README.md).
