# Product

> **Status:** ✅ Accepted
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](./constitution.md)

## 1. Назначение

Определяет функциональный scope продукта Activity.

Эта спецификация определяет, **ЧТО** продукт должен делать. Она не определяет реализацию.

## 2. Обзор проекта

Activity Platform — Local-First платформа, предоставляющая переиспользуемые **Business Capabilities** для SaaS-приложений.

Первая capability — **Activity History**.

Мы **не строим** Activity SDK — мы строим **Activity Engine**. Activity History — лишь первый продукт, построенный поверх него.

```text
Activity Platform
      ↓
Activity Engine
      ↓
Business Capabilities
      ├── Activity
      ├── Timeline
      ├── Audit
      ├── Import
      ├── Comments
      └── Approval
```

## 3. Миссия

Дать разработчикам возможность добавить корпоративного уровня Activity History в любое SaaS-приложение менее чем за 15 минут, с production-quality UX из коробки.

## 4. Scope продукта

Продукт состоит из:

- Tracking SDK (см. [`tracking-api.md`](./tracking-api.md))
- Activity Engine (см. [`engine.md`](./engine.md))
- Storage (см. [`storage.md`](./storage.md), [`database.md`](./database.md))
- React UI (см. [`react-api.md`](./react-api.md), [`activity-panel.md`](./activity-panel.md))

### Вне scope этой спецификации

Эта спецификация не определяет:

- схему базы данных
- REST API
- реализацию React-компонентов
- вёрстку UI
- реализацию storage

Это покрывается отдельными спецификациями.

## 5. Определения

- **Resource** — бизнес-объект, которому принадлежат Activity Entries (примеры: Invoice, Customer, Contract, Ticket, Project).
- **Activity Entry** — одна запись, представляющая одну пользовательскую операцию.
- **Actor** — сущность, ответственная за операцию. Допустимые типы: User, System, API, Agent.
- **Change** — изменение одного поля (пример: Status: Draft → Approved).

Полная модель данных — в [`data-model.md`](./data-model.md).

## 6. Функциональные требования

> **Примечание о нумерации:** в исходном черновике эти требования были пронумерованы как `PROD-001`…`PROD-013`. Здесь они переименованы в **`FUNC-xxx`**, чтобы не конфликтовать с governance-правилами `PROD-xxx` из [`constitution.md`](./constitution.md) §4 (другой набор требований под тем же префиксом). Содержание не изменено.

- **FUNC-001** *(Critical)* — Каждая Activity Entry ОБЯЗАНА принадлежать ровно одному Resource. *(Integration Test)*
- **FUNC-002** — Каждый Resource МОЖЕТ содержать ноль или более Activity Entries. *(Integration Test)*
- **FUNC-003** — Activity Entries ОБЯЗАНЫ упорядочиваться по timestamp по убыванию по умолчанию. *(Integration Test)*
- **FUNC-004** — Каждая Activity Entry ОБЯЗАНА содержать ровно один Action (create, update, delete, archive, restore, comment, attachment, custom). *(Unit Test)*
- **FUNC-005** — Имена Action ОБЯЗАНЫ быть стабильными идентификаторами; лейблы отображения НЕ ДОЛЖНЫ использоваться как идентификаторы (хорошо: `update`; плохо: `"Invoice Updated"`). *(Code Review)*
- **FUNC-006** — Каждая Activity Entry ОБЯЗАНА содержать одного Actor. *(Integration Test)*
- **FUNC-007** — Каждая Activity Entry ОБЯЗАНА содержать один timestamp. *(Integration Test)*
- **FUNC-008** — Каждая Activity Entry ОБЯЗАНА ссылаться ровно на один Resource. *(Integration Test)*
- **FUNC-009** — Action `update` ОБЯЗАН содержать одно или более изменений полей. *(Integration Test)*
- **FUNC-010** — Action `create` НЕ ДОЛЖЕН требовать изменений полей. *(Integration Test)*
- **FUNC-011** — Action `comment` ОБЯЗАН содержать content комментария. *(Integration Test)*
- **FUNC-012** — Action `attachment` ОБЯЗАН ссылаться на одно вложение. *(Integration Test)*
- **FUNC-013** — Кастомные actions ОБЯЗАНЫ поддерживаться. *(Example Application)*

## 7. Activity Families

Продукт определяет три визуальных семейства записей:

- **Update** — представляет одну операцию сохранения (Status changed, Amount changed, Owner changed). Одна Update Entry МОЖЕТ содержать несколько изменений полей.
- **Content** — представляет пользовательский контент (Comment, Attachment).
- **Lifecycle** — представляет жизненный цикл объекта (Created, Deleted, Archived, Restored).

Детальный рендеринг каждого семейства — в [`activity-panel.md`](./activity-panel.md) §13–15.

## 8. Требования к поиску

- **SEARCH-001** — Продукт ОБЯЗАН поддерживать полнотекстовый поиск. *(Integration Test)*
- **SEARCH-002** — Поиск ОБЯЗАН включать: заголовок Resource, имя Actor, лейблы полей, значения before/after, текст комментария. *(Integration Test)*

Детальная семантика — в [`query-api.md`](./query-api.md) §7 и [`database.md`](./database.md) §8.

## 9. Требования к фильтрации

- **FILTER-001** — Фильтрация по Action ОБЯЗАНА поддерживаться. *(Integration Test)*
- **FILTER-002** — Фильтрация по Actor ОБЯЗАНА поддерживаться. *(Integration Test)*
- **FILTER-003** — Фильтрация по диапазону дат ОБЯЗАНА поддерживаться. *(Integration Test)*

## 10. Расширяемость

- **EXT-001** — Приложения МОГУТ определять кастомные типы Resource. *(Example Application)*
- **EXT-002** — Приложения МОГУТ определять кастомные Actions. *(Example Application)*
- **EXT-003** — Приложения НЕ ДОЛЖНЫ модифицировать исходный код SDK для поддержки кастомных ресурсов. *(Architecture Review)*

## 11. Нефункциональные требования

- **NFR-001** — SDK ОБЯЗАН работать без доступа к интернету. *(Manual Test)*
- **NFR-002** — Облачные сервисы НЕ ДОЛЖНЫ быть обязательными. *(Manual Test)*
- **NFR-003** — Продукт ОБЯЗАН поддерживать тёмную тему. *(Storybook)*
- **NFR-004** — Продукт ОБЯЗАН поддерживать локализацию. *(Example Application)*
- **NFR-005** — Все публичные API ОБЯЗАНЫ быть полностью типизированы. *(TypeScript Build)*

## 12. MVP Scope

**Version 1.0 ОБЯЗАНА включать:**

- ✓ Ручной трекинг (Manual tracking)
- ✓ PostgreSQL adapter
- ✓ React Activity Panel
- ✓ Search
- ✓ Filters
- ✓ Inline expansion
- ✓ Loading state
- ✓ Empty state
- ✓ Error state

**Version 1.0 НЕ ДОЛЖНА включать:**

- ✗ Глобальная Activity-лента (см. также **PROD-004** в [`constitution.md`](./constitution.md))
- ✗ Notifications
- ✗ Realtime синхронизация
- ✗ Approval workflows (запланировано отдельно как Approval SDK, см. §14 ниже)
- ✗ Import engine (запланировано отдельно как Import Engine, см. §14)
- ✗ Audit reports (запланировано отдельно как Audit SDK, см. §14)
- ✗ AI summaries
- ✗ Multi-tenant облачный backend

## 13. Текущий статус проекта

**Завершено:** продуктовое направление, высокоуровневая архитектура, концепция Engine и Pipeline, решение о Local-First, roadmap будущих продуктов, спецификации constitution/product/data-model/tracking-api (Accepted).

**В работе:** остальные спецификации (public-api, engine, storage, database, query-api, react-api, activity-panel — все статус Draft).

**Не начато:** реализация, test suite, сайт документации.

## 14. Будущие продукты

- **Timeline SDK** — визуальный таймлайн поверх Activity Engine.
- **Audit SDK** — compliance-ориентированный неизменяемый audit trail.
- **Import Engine** — отслеживание импортов: валидация, маппинг, история выполнения.
- **Comments SDK** — тредированные обсуждения, привязанные к Resource.
- **Approval SDK** — workflow согласований на общем Activity Engine.

## 15. Приёмка

Эта спецификация принята, когда:

- ✓ Все функциональные требования (`FUNC-xxx`) реализованы
- ✓ Интеграционные тесты проходят
- ✓ Документация существует для каждого публичного API
- ✓ Пример-приложение демонстрирует все поддерживаемые actions
