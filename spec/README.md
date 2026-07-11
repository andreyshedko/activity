# Activity Platform — Спецификация

> **Статус:** Living Document
> **Версия:** 1.0
> **Источник:** серия документов, полученных и синхронизированных в этом проекте

Этот каталог — рабочая спецификация проекта **Activity Platform**. Он разбит на файлы по разделам, чтобы каждый документ отвечал за одну область системы и мог развиваться независимо.

## Статус документов

| Документ | Статус |
|---|---|
| `constitution.md` | ✅ Accepted |
| `product.md` | ✅ Accepted |
| `data-model.md` | ✅ Accepted |
| `tracking-api.md` | ✅ Accepted |
| `public-api.md` | Draft |
| `engine.md` | Draft |
| `pipeline.md` | Draft |
| `storage.md` | Draft |
| `database.md` | Draft |
| `query-api.md` | Draft |
| `react-api.md` | Draft |
| `activity-panel.md` | Draft |
| `../MVP_SLICE.md` | ✅ Accepted |
| `../SPEC_CLARIFICATIONS.md` | ✅ Accepted |

## Как читать эту спецификацию

Рекомендуемый порядок чтения (совпадает с разделом «AI Instructions» в [`constitution.md`](./constitution.md) §16):

1. [`constitution.md`](./constitution.md) — governance-правила, приоритет над всеми остальными документами при конфликте
2. [`product.md`](./product.md) — продуктовое направление, функциональные требования, MVP scope, roadmap
3. [`../MVP_SLICE.md`](../MVP_SLICE.md) — implementation roadmap от нуля до Version 1.0
4. [`../SPEC_CLARIFICATIONS.md`](../SPEC_CLARIFICATIONS.md) — принятые уточнения, разрешающие implementation-critical противоречия
5. [`rfc/README.md`](./rfc/README.md) — открытые вопросы и процесс RFC (все три вопроса — Resolved)
6. [`data-model.md`](./data-model.md) — каноническая модель данных (ActivityEntry, Resource, Actor, Change, Content, Metadata)
7. [`tracking-api.md`](./tracking-api.md) — публичный Tracking API (`track()`, `TrackInput`)
8. [`public-api.md`](./public-api.md) — публичный API целиком (`createActivity`, `Activity`, `query()`)
9. [`engine.md`](./engine.md) — внутренняя архитектура Activity Engine
10. [`pipeline.md`](./pipeline.md) — Pipeline записи данных
11. [`storage.md`](./storage.md) — контракт Storage Adapter
12. [`database.md`](./database.md) — каноническая схема БД (PostgreSQL)
13. [`query-api.md`](./query-api.md) — семантика чтения/поиска/фильтрации/пагинации
14. [`react-api.md`](./react-api.md) — React-слой (`ActivityEntry`, `ActivitySearch`, `ActivityFilters`)
15. [`activity-panel.md`](./activity-panel.md) — спецификация компонента `ActivityPanel`
16. [`ui/overview.md`](./ui/overview.md) — UI-принципы
17. [`engineering/principles.md`](./engineering/principles.md) — инженерные принципы и DX

## Карта каталога

```text
/spec
    README.md            ← вы здесь
    constitution.md
    product.md
    data-model.md
    tracking-api.md
    public-api.md
    engine.md
    pipeline.md
    storage.md
    database.md
    query-api.md
    react-api.md
    activity-panel.md
    ui/
        overview.md
    engineering/
        principles.md
    rfc/
        README.md
        RFC-001-react-integration.md
        RFC-002-query-execution-model.md
        RFC-003-pagination-strategy.md
```

Root-level accepted documents:

```text
/MVP_SLICE.md
/SPEC_CLARIFICATIONS.md
/ACTIVITY_PLATFORM_SPECIFICATION.md
```

## Реестр идентификаторов требований

Полный реестр префиксов (`PROD-xxx`, `FUNC-xxx`, `ARCH-xxx`, `SCHEMA-xxx`, `PUBAPI-xxx`, `TRACK-xxx` и т.д.), включая историю переименований во избежание коллизий между документами — см. [`constitution.md`](./constitution.md) §15.

## Правила работы с документом

- Это **living document** — изменяется по мере развития проекта.
- **`constitution.md` имеет приоритет** при конфликте с любой другой спецификацией (см. `constitution.md` §1).
- **`SPEC_CLARIFICATIONS.md` имеет приоритет над более ранними Draft/Accepted формулировками**, которые он явно supersedes.
- Принятые архитектурные решения (`ARCH-xxx`) и продуктовые решения (`PROD-xxx`) **не меняются без RFC** (см. `constitution.md` §14, `DEC-001`).
- Любой ассистент (человек или AI), присоединяющийся к проекту, обязан сначала прочитать `constitution.md` и `product.md`, прежде чем предлагать архитектуру или API (см. `constitution.md` §16).
