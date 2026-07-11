# Activity Platform

## Полная спецификация платформы

> **Версия документа:** 1.0
> **Дата сборки:** 8 июля 2026
> **Статусы исходных документов:** Constitution, Product, Data Model и Tracking API — **Accepted**; остальные части — **Draft**, но с полностью специфицированной семантикой и закрытыми открытыми вопросами (см. Часть XV).

> **Accepted clarifications:** root-level [`SPEC_CLARIFICATIONS.md`](./SPEC_CLARIFICATIONS.md) supersedes earlier statements in this assembled document where explicitly noted: `track()` returns `Promise<ActivityRecord>`, `Action = BuiltInAction | custom string`, MVP requirements are milestone-scoped, and React uses direct Activity instances for MVP.

---

### О документе

Это единая сборка всей спецификации Activity Platform — Engine и первой Business Capability на нём, Activity History. Документ объединяет пятнадцать ранее раздельных спецификаций в одну сквозную книгу: от управляющей конституции проекта до конкретной схемы таблиц PostgreSQL.

**Принцип сборки:** ничего не придумано заново. Каждая часть — это уже принятая или специфицированная в проекте спецификация, приведённая к единому стилю изложения, с едиными сквозными ссылками и без изменения сути требований. Там, где при слиянии обнаружились коллизии идентификаторов требований между документами (например, `PROD-xxx` одновременно использовался конституцией и продуктовой спецификацией для разных вещей), они разрешены переименованием с открытым указанием этого факта — реестр всех переименований находится в Части I, §15.

### Иерархия источника истины

При конфликте между частями этого документа действует иерархия, установленная самой Конституцией (Часть I, §1):

```text
Конституция (Часть I)
      ↓ приоритет
Продукт (Часть II) → Модель данных (Часть III) → остальные спецификации
```

### Как читать этот документ

Он рассчитан на два режима чтения:

- **Сквозное чтение** — от Части I до Части XV, в порядке зависимостей (каждая часть указывает свои `Depends on` в начале).
- **Точечный поиск** — через оглавление ниже; каждая часть и подраздел снабжены якорями.

---

## Оглавление

- [Часть I. Конституция проекта](#constitution) — governance-правила, RFC 2119, реестр идентификаторов
- [Часть II. Продукт: видение и требования](#product) — миссия, MVP scope, функциональные требования
- [Часть III. Модель данных](#data-model) — ActivityEntry, Resource, Actor, Change, Content, Metadata
- [Часть IV. Tracking API](#tracking-api) — `track()`, `TrackInput`
- [Часть V. Public API](#public-api) — `createActivity()`, `Activity`, `query()`, `ActivityPanel`
- [Часть VI. Engine: внутренняя архитектура](#engine) — pipeline из 6 стадий, внутренние сервисы
- [Часть VII. Pipeline](#pipeline) — высокоуровневый поток записи
- [Часть VIII. Storage: контракт адаптера](#storage) — `StorageAdapter`, `QueryOptions`, `QueryResult`
- [Часть IX. Database: каноническая схема](#database) — таблицы, индексы, транзакции PostgreSQL
- [Часть X. Query API](#query-api) — семантика чтения, поиска, сортировки, пагинации
- [Часть XI. React API](#react-api) — `ActivityEntry`, `ActivitySearch`, `ActivityFilters`
- [Часть XII. ActivityPanel](#activity-panel) — основной UI-компонент
- [Часть XIII. UI-принципы](#ui-overview)
- [Часть XIV. Инженерные принципы](#engineering-principles)
- [Часть XV. Процесс RFC и журнал решений](#rfc-readme)
  - [XV.1 — RFC-001: React Integration Model](#rfc-001) ✅ Resolved
  - [XV.2 — RFC-002: Query Execution Model](#rfc-002) ✅ Resolved
  - [XV.3 — RFC-003: Pagination Strategy](#rfc-003) ✅ Resolved

---
<a id="constitution"></a>

## Часть I. Конституция проекта

> **Status:** ✅ Accepted
> **Version:** 1.0.0
> **Last Updated:** 2026-07-06

### 1. Назначение

Этот документ определяет инженерные, продуктовые и архитектурные правила, управляющие всем проектом.

Каждая спецификация, RFC, реализация и pull request ОБЯЗАНЫ соответствовать этому документу.

**Если другая спецификация конфликтует с этим документом, приоритет имеет этот документ.**

### 2. Scope

Этот документ определяет:

- инженерные принципы
- продуктовые принципы
- правила документации
- архитектурные правила
- правила ревью

Он не определяет детали реализации.

### 3. Терминология

Ключевые слова **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY** трактуются согласно RFC 2119.

### 4. Продуктовые правила

- **PROD-001** *(Critical)* — Проект ОБЯЗАН решать одну бизнес-проблему. Каждая фича ОБЯЗАНА поддерживать эту проблему. *(Verification: Architecture Review)*
- **PROD-002** *(Critical)* — Первый публичный продукт ОБЯЗАН быть Activity History. *(Verification: Architecture Review)*
- **PROD-003** *(Critical)* — MVP ОБЯЗАН поддерживать Activity History ровно для одного бизнес-ресурса (примеры: Invoice, Customer, Contract, Ticket, Task, Project). *(Verification: Architecture Review)*
- **PROD-004** *(Critical)* — Глобальная activity-лента НЕ ДОЛЖНА быть реализована в MVP. *(Verification: Feature Review)*
- **PROD-005** *(Critical)* — Одна пользовательская операция ОБЯЗАНА производить одну Activity Entry. *(Verification: Integration Test)*
- **PROD-006** *(High)* — Activity ОБЯЗАНА представлять пользовательские действия. Activity НЕ ДОЛЖНА представлять SQL-операции. *(Verification: UX Review)*

> **Примечание о трактовке PROD-003:** формулировка допускает два прочтения — (а) SDK архитектурно ограничен одним типом Resource, или (б) референсное MVP-приложение/демо демонстрирует Activity History на примере одного типа ресурса, не ограничивая при этом сам SDK. Второе прочтение согласуется с остальной спецификацией: `Resource.type` объявлен application-defined (см. [`data-model.md`](#data-model) §RESOURCE-001), схема БД хранит `resource_type` как обычную колонку без ограничения на одно значение (см. [`database.md`](#database)), а формулировка `Resource` в продуктовой философии перечисляет сразу несколько примеров (Invoice, Customer, Contract...) как равноправные. Здесь принято прочтение (б); если имелось в виду (а), это требует отдельного RFC, так как затрагивает уже принятые решения в `data-model.md` и `database.md`.

> **Примечание о нумерации:** в отдельном документе `product.md` также используется префикс `PROD-xxx`, но для другого набора требований (функциональные требования к Activity Entry, а не продуктовые governance-правила). Чтобы избежать коллизии идентификаторов между двумя Accepted-документами, функциональные требования `product.md` переименованы в этой спецификации в `FUNC-xxx` — см. [`product.md`](#product) §5.

### 5. Архитектурные правила

- **ARCH-001** *(Critical)* — Архитектура ОБЯЗАНА состоять из независимых слоёв:

  ```text
  Application
        ↓
  React UI
        ↓
  Engine
        ↓
  Storage Adapter
        ↓
  Database
  ```

  *(Verification: Architecture Review)*

- **ARCH-002** — Engine НЕ ДОЛЖЕН импортировать React. *(Verification: Static Analysis)*
- **ARCH-003** — React ОБЯЗАН взаимодействовать только с Engine. React НЕ ДОЛЖЕН напрямую взаимодействовать с базой данных. *(Verification: Architecture Review)*
- **ARCH-004** — Engine ОБЯЗАН взаимодействовать только со `StorageAdapter`. *(Verification: Architecture Review)*
- **ARCH-005** — Engine НЕ ДОЛЖЕН содержать SQL. *(Verification: Code Review)*

> Детальная реализация этих правил — в [`engine.md`](#engine) (framework independence, стадии pipeline) и [`storage.md`](#storage) (контракт `StorageAdapter`).

### 6. Правила хранения

- **DB-001** — PostgreSQL ОБЯЗАН быть storage-реализацией по умолчанию. *(Verification: Architecture Review)*
- **DB-002** — Storage ОБЯЗАН быть заменяемым. *(Verification: Architecture Review)*
- **DB-003** — Хостируемый облачный сервис НЕ ДОЛЖЕН быть обязательным требованием. *(Verification: Manual Review)*

> **Примечание о нумерации:** документ [`database.md`](#database) также использует префикс `DB-xxx`, но для ограничений канонической схемы (первичные ключи, nullability и т.д.) — другой набор требований. Во избежание коллизии эти требования переименованы в `SCHEMA-xxx` — см. [`database.md`](#database) §4–5.

### 7. Правила API

- **API-001** — Публичные API ОБЯЗАНЫ оставаться стабильными, когда это возможно. *(Verification: Code Review)*
- **API-002** — Breaking changes ОБЯЗАНЫ включать migration guide. *(Verification: Documentation Review)*
- **API-003** — Каждый публичный API ОБЯЗАН включать минимум один рабочий пример. *(Verification: Documentation Review)*

> **Примечание о нумерации:** документ [`public-api.md`](#public-api) также использует префикс `API-xxx` для собственных детальных требований (`createActivity`, `track`, `query`, `ActivityPanel`). Во избежание коллизии с этими тремя governance-правилами требования `public-api.md` переименованы в `PUBAPI-xxx` — см. [`public-api.md`](#public-api).

### 8. Правила UI

- **UI-001** — Интерфейс Activity по умолчанию ОБЯЗАН использовать компактную (compact) плотность вёрстки. *(Verification: Storybook Review)*
- **UI-002** — Metadata ОБЯЗАНА отображаться после первичного контента. *(Verification: Storybook Review)*
- **UI-003** — Свёрнутые Activity Entries ОБЯЗАНЫ отображать не более трёх изменений полей. *(Verification: Snapshot Test)*
- **UI-004** — Развёрнутые Activity Entries ОБЯЗАНЫ разворачиваться inline. Модальные диалоги НЕ ДОЛЖНЫ использоваться. *(Verification: Storybook Review)*

> **Согласование с `activity-panel.md`:** `ActivityPanel` определяет проп `variant` со значениями `"default" | "compact" | "comfortable"`, где `"default"` — значение по умолчанию (см. [`activity-panel.md`](#activity-panel) §5). **UI-001** трактуется как требование к *визуальной плотности* самого варианта `"default"` (он должен выглядеть компактно), а не как переименование enum-значения в `"compact"` — иначе `"compact"` как отдельное значение варианта стало бы избыточным. Если имелось в виду именно переименование значения по умолчанию, это отдельное решение, требующее обновления `activity-panel.md` и `public-api.md` через RFC.

### 9. Правила производительности

- **PERF-001** — Списки, содержащие 100 000 Activity Entries, ОБЯЗАНЫ оставаться пригодными для использования. *(Verification: Performance Benchmark)*
- **PERF-002** — Большие списки ОБЯЗАНЫ использовать виртуализацию. *(Verification: Code Review)*
- **PERF-003** — Оптимизации производительности ОБЯЗАНЫ основываться на измерениях. *(Verification: Performance Report)*

> Согласуется с целевыми показателями в [`database.md`](#database) §15, [`storage.md`](#storage) §12, [`activity-panel.md`](#activity-panel) §21 и [`query-api.md`](#query-api) §14.

### 10. Доступность

- **A11Y-001** — Каждый интерактивный элемент ОБЯЗАН быть доступен с клавиатуры. *(Verification: Accessibility Audit)*
- **A11Y-002** — Видимый фокус клавиатуры ОБЯЗАН присутствовать. *(Verification: Accessibility Audit)*
- **A11Y-003** — Приложение ОБЯЗАНО удовлетворять **WCAG AA**. *(Verification: Accessibility Audit)*

> **Новое по сравнению с предыдущими черновиками:** явный стандарт **WCAG AA** ранее нигде не был зафиксирован ([`activity-panel.md`](#activity-panel) §20 и [`react-api.md`](#react-api) §14 говорили о доступности в общих терминах, без указания конкретного уровня соответствия). Это уточнение, а не конфликт — оба документа теперь наследуют этот стандарт по ссылке на `constitution.md`.

### 11. Документация

- **DOC-001** — Каждый экспортируемый символ ОБЯЗАН включать документацию. *(Verification: Code Review)*
- **DOC-002** — Каждая публичная фича ОБЯЗАНА включать пример. *(Verification: Documentation Review)*

### 12. Тестирование

- **TEST-001** — Каждый исправленный дефект ОБЯЗАН производить регрессионный тест. *(Verification: Code Review)*
- **TEST-002** — Публичное поведение ОБЯЗАНО быть протестировано. *(Verification: Test Review)*

### 13. Инженерия

- **ENG-001** — TypeScript strict mode ОБЯЗАН оставаться включённым. *(Verification: CI)*
- **ENG-002** — Тип `any` НЕ ДОЛЖЕН использоваться. Исключения ОБЯЗАНЫ быть задокументированы. *(Verification: ESLint)*
- **ENG-003** — Файлы ДОЛЖНЫ (SHOULD) оставаться до 300 строк. Файлы свыше 500 строк ОБЯЗАНЫ быть отрефакторены. *(Verification: Code Review)*
- **ENG-004** — Функции ДОЛЖНЫ (SHOULD) оставаться до 50 строк. Функции свыше 100 строк ОБЯЗАНЫ быть обоснованы. *(Verification: Code Review)*

### 14. Процесс принятия решений

- **DEC-001** — Каждое архитектурное изменение ОБЯЗАНО ссылаться на RFC. *(Verification: Pull Request Review)*
- **DEC-002** — Каждая реализация ОБЯЗАНА ссылаться минимум на один Requirement ID (например: «Implements: UI-003, PUBAPI-002»). *(Verification: Pull Request Review)*

Процесс RFC описан в [`rfc/README.md`](#rfc-readme).

### 15. Реестр префиксов Requirement ID

Чтобы предотвратить дальнейшие коллизии, ниже приведён единый реестр префиксов, используемых во всей спецификации:

| Префикс | Документ | Область |
|---|---|---|
| `PROD-xxx` | `constitution.md` | Продуктовые governance-правила |
| `FUNC-xxx` | `product.md` | Функциональные требования к Activity |
| `ARCH-xxx` | `constitution.md` | Архитектурные правила |
| `DB-xxx` | `constitution.md` | Правила хранения (governance) |
| `SCHEMA-xxx` | `database.md` | Ограничения канонической схемы |
| `IDX-xxx` | `database.md` | Индексы |
| `API-xxx` | `constitution.md` | Общие правила публичного API (governance) |
| `PUBAPI-xxx` | `public-api.md` | Детальные требования публичного API |
| `TRACK-xxx` | `tracking-api.md` | Требования Tracking API |
| `STORE-xxx` | `storage.md` | Требования `StorageAdapter` |
| `QUERY-xxx` | `query-api.md` | Семантика Query API |
| `PANEL-xxx` | `activity-panel.md` | Требования `ActivityPanel` |
| `REACT-xxx` | `react-api.md` | Требования React-компонентов (`ActivityEntry`, `ActivitySearch`, `ActivityFilters`) |
| `MODEL-xxx` | `data-model.md` | Требования к `ActivityEntry` |
| `RESOURCE-xxx` | `data-model.md` | Требования к `Resource` |
| `ACTOR-xxx` | `data-model.md` | Требования к `Actor` |
| `CHANGE-xxx` | `data-model.md` | Требования к `Change` |
| `CONTENT-xxx` | `data-model.md` | Требования к `Content` |
| `META-xxx` | `data-model.md` | Требования к `Metadata` |
| `INV-xxx` | `data-model.md` | Инварианты модели данных |
| `SEARCH-xxx` | `product.md` | Требования к поиску |
| `FILTER-xxx` | `product.md` | Требования к фильтрации |
| `EXT-xxx` | `product.md` | Требования к расширяемости |
| `NFR-xxx` | `product.md` | Нефункциональные требования |
| `UI-xxx` | `constitution.md` | UI-правила (governance) |
| `PERF-xxx` | `constitution.md` | Правила производительности |
| `A11Y-xxx` | `constitution.md` | Правила доступности |
| `DOC-xxx` | `constitution.md` | Правила документации |
| `TEST-xxx` | `constitution.md` | Правила тестирования |
| `ENG-xxx` | `constitution.md` | Инженерные правила |
| `DEC-xxx` | `constitution.md` | Процесс принятия решений |
| `OPEN-xxx` | `rfc/README.md` | Открытые вопросы (все три — Resolved) |

### 16. AI Instructions

Каждый AI-ассистент, присоединяющийся к проекту, ОБЯЗАН:

1. Прочитать этот документ первым.
2. Прочитать [`product.md`](#product).
3. Прочитать [`rfc/`](#rfc-readme).
4. Прочитать [`public-api.md`](#public-api).
5. Никогда не изобретать архитектуру, не описанную в спецификациях.
6. Никогда не обходить Engine (**ARCH-003**).
7. Никогда не обходить Storage Adapter (**ARCH-004**).
8. Никогда не изменять принятые архитектурные решения без RFC (**DEC-001**).

### 17. Приёмка

Эта спецификация принята, когда:

- ✓ Не существует конфликтующих спецификаций
- ✓ Все Requirement ID уникальны (см. реестр §15)
- ✓ Перекрёстные ссылки валидны
- ✓ Ревью завершено
<a id="product"></a>

## Часть II. Продукт: видение и требования

> **Status:** ✅ Accepted
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](#constitution)

### 1. Назначение

Определяет функциональный scope продукта Activity.

Эта спецификация определяет, **ЧТО** продукт должен делать. Она не определяет реализацию.

### 2. Обзор проекта

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

### 3. Миссия

Дать разработчикам возможность добавить корпоративного уровня Activity History в любое SaaS-приложение менее чем за 15 минут, с production-quality UX из коробки.

### 4. Scope продукта

Продукт состоит из:

- Tracking SDK (см. [`tracking-api.md`](#tracking-api))
- Activity Engine (см. [`engine.md`](#engine))
- Storage (см. [`storage.md`](#storage), [`database.md`](#database))
- React UI (см. [`react-api.md`](#react-api), [`activity-panel.md`](#activity-panel))

#### Вне scope этой спецификации

Эта спецификация не определяет:

- схему базы данных
- REST API
- реализацию React-компонентов
- вёрстку UI
- реализацию storage

Это покрывается отдельными спецификациями.

### 5. Определения

- **Resource** — бизнес-объект, которому принадлежат Activity Entries (примеры: Invoice, Customer, Contract, Ticket, Project).
- **Activity Entry** — одна запись, представляющая одну пользовательскую операцию.
- **Actor** — сущность, ответственная за операцию. Допустимые типы: User, System, API, Agent.
- **Change** — изменение одного поля (пример: Status: Draft → Approved).

Полная модель данных — в [`data-model.md`](#data-model).

### 6. Функциональные требования

> **Примечание о нумерации:** в исходном черновике эти требования были пронумерованы как `PROD-001`…`PROD-013`. Здесь они переименованы в **`FUNC-xxx`**, чтобы не конфликтовать с governance-правилами `PROD-xxx` из [`constitution.md`](#constitution) §4 (другой набор требований под тем же префиксом). Содержание не изменено.

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

### 7. Activity Families

Продукт определяет три визуальных семейства записей:

- **Update** — представляет одну операцию сохранения (Status changed, Amount changed, Owner changed). Одна Update Entry МОЖЕТ содержать несколько изменений полей.
- **Content** — представляет пользовательский контент (Comment, Attachment).
- **Lifecycle** — представляет жизненный цикл объекта (Created, Deleted, Archived, Restored).

Детальный рендеринг каждого семейства — в [`activity-panel.md`](#activity-panel) §13–15.

### 8. Требования к поиску

- **SEARCH-001** — Продукт ОБЯЗАН поддерживать полнотекстовый поиск. *(Integration Test)*
- **SEARCH-002** — Поиск ОБЯЗАН включать: заголовок Resource, имя Actor, лейблы полей, значения before/after, текст комментария. *(Integration Test)*

Детальная семантика — в [`query-api.md`](#query-api) §7 и [`database.md`](#database) §8.

### 9. Требования к фильтрации

- **FILTER-001** — Фильтрация по Action ОБЯЗАНА поддерживаться. *(Integration Test)*
- **FILTER-002** — Фильтрация по Actor ОБЯЗАНА поддерживаться. *(Integration Test)*
- **FILTER-003** — Фильтрация по диапазону дат ОБЯЗАНА поддерживаться. *(Integration Test)*

### 10. Расширяемость

- **EXT-001** — Приложения МОГУТ определять кастомные типы Resource. *(Example Application)*
- **EXT-002** — Приложения МОГУТ определять кастомные Actions. *(Example Application)*
- **EXT-003** — Приложения НЕ ДОЛЖНЫ модифицировать исходный код SDK для поддержки кастомных ресурсов. *(Architecture Review)*

### 11. Нефункциональные требования

- **NFR-001** — SDK ОБЯЗАН работать без доступа к интернету. *(Manual Test)*
- **NFR-002** — Облачные сервисы НЕ ДОЛЖНЫ быть обязательными. *(Manual Test)*
- **NFR-003** — Продукт ОБЯЗАН поддерживать тёмную тему. *(Storybook)*
- **NFR-004** — Продукт ОБЯЗАН поддерживать локализацию. *(Example Application)*
- **NFR-005** — Все публичные API ОБЯЗАНЫ быть полностью типизированы. *(TypeScript Build)*

### 12. MVP Scope

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

- ✗ Глобальная Activity-лента (см. также **PROD-004** в [`constitution.md`](#constitution))
- ✗ Notifications
- ✗ Realtime синхронизация
- ✗ Approval workflows (запланировано отдельно как Approval SDK, см. §14 ниже)
- ✗ Import engine (запланировано отдельно как Import Engine, см. §14)
- ✗ Audit reports (запланировано отдельно как Audit SDK, см. §14)
- ✗ AI summaries
- ✗ Multi-tenant облачный backend

### 13. Текущий статус проекта

**Завершено:** продуктовое направление, высокоуровневая архитектура, концепция Engine и Pipeline, решение о Local-First, roadmap будущих продуктов, спецификации constitution/product/data-model/tracking-api (Accepted).

**В работе:** остальные спецификации (public-api, engine, storage, database, query-api, react-api, activity-panel — все статус Draft).

**Не начато:** реализация, test suite, сайт документации.

### 14. Будущие продукты

- **Timeline SDK** — визуальный таймлайн поверх Activity Engine.
- **Audit SDK** — compliance-ориентированный неизменяемый audit trail.
- **Import Engine** — отслеживание импортов: валидация, маппинг, история выполнения.
- **Comments SDK** — тредированные обсуждения, привязанные к Resource.
- **Approval SDK** — workflow согласований на общем Activity Engine.

### 15. Приёмка

Эта спецификация принята, когда:

- ✓ Все функциональные требования (`FUNC-xxx`) реализованы
- ✓ Интеграционные тесты проходят
- ✓ Документация существует для каждого публичного API
- ✓ Пример-приложение демонстрирует все поддерживаемые actions
<a id="data-model"></a>

## Часть III. Модель данных

> **Status:** ✅ Accepted
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](#constitution), [`product.md`](#product)

### 1. Назначение

Определяет каноническую модель данных Activity.

Каждая реализация storage ОБЯЗАНА реализовывать эту модель (см. [`database.md`](#database), [`storage.md`](#storage)).

React UI ОБЯЗАН зависеть от этой модели (см. [`react-api.md`](#react-api), [`activity-panel.md`](#activity-panel)).

Tracking API ОБЯЗАН производить эту модель (см. [`tracking-api.md`](#tracking-api)).

### 2. Обзор

Каноническая модель содержит пять сущностей:

```text
ActivityEntry
      ↓
   Actor · Resource · Change[] · Metadata
```

### 3. `ActivityEntry`

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

> **MODEL-007 и каскадное удаление в схеме БД:** [`database.md`](#database) §5 определяет `SCHEMA-013` — каскадное удаление `activity_changes` при удалении `activity_entries`. Это не противоречие: `MODEL-007` запрещает **SDK** предоставлять публичный механизм удаления, а `SCHEMA-013` — техническая гарантия ссылочной целостности на случай ручного/административного удаления вне SDK (см. пояснение в `database.md`).

### 4. `Resource`

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

### 5. `Actor`

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

### 6. `Change`

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

### 7. `Content`

Представляет пользовательский контент.

Поддерживаемые типы: `comment`, `attachment`, `custom`.

- **Comment:** поле `text`.
- **Attachment:** поля `fileName`, `mimeType`, `size`, `url`.

**Требования:**

- **CONTENT-001** — Только Content Entries МОГУТ содержать Content.
- **CONTENT-002** — Update Entries НЕ ДОЛЖНЫ содержать Content.
- **CONTENT-003** — Lifecycle Entries НЕ ДОЛЖНЫ содержать Content.

### 8. `Metadata`

Представляет техническую metadata. Metadata НЕ ДОЛЖНА влиять на рендеринг.

Поля: `source`, `version`, `requestId`, `ipAddress`, `custom`.

**Требования:**

- **META-001** — Metadata ОБЯЗАНА быть опциональной.
- **META-002** — Metadata НЕ ДОЛЖНА рендериться в свёрнутых записях.
- **META-003** — Metadata МОЖЕТ рендериться в развёрнутых записях.

### 9. Инварианты

- **INV-001** — Каждая `ActivityEntry` ОБЯЗАНА иметь ровно один Resource.
- **INV-002** — Каждая `ActivityEntry` ОБЯЗАНА иметь ровно одного Actor.
- **INV-003** — Каждая `ActivityEntry` ОБЯЗАНА иметь ровно одно Action.
- **INV-004** — Каждая `ActivityEntry` ОБЯЗАНА принадлежать одному timestamp.
- **INV-005** — Changes ОБЯЗАНЫ сохранять порядок; приложения НЕ ДОЛЖНЫ переупорядочивать changes.
- **INV-006** — `ActivityEntry` ОБЯЗАНА оставаться неизменяемой.

### 10. Правила по Action

| Action | Допустимые дополнительные поля |
|---|---|
| `create` | Resource, Actor, Timestamp |
| `update` | Changes[] |
| `comment` | Content |
| `attachment` | Content |
| `archive` | Metadata |
| `restore` | Metadata |
| `delete` | Metadata |

Согласуется с правилами валидации Tracking API (см. [`tracking-api.md`](#tracking-api) §13).

### 11. Сериализация

Каноническая модель ОБЯЗАНА сериализоваться в JSON.

- Никаких функций.
- Никаких классов.
- Никаких `Date` вне ISO8601-сериализации.

### 12. Версионирование

Каноническая модель ОБЯЗАНА оставаться обратно совместимой.

Breaking-изменения полей требуют: RFC, Migration Guide, Major Version.

### 13. Приёмка

- ✓ Неизменяема
- ✓ Сериализуема
- ✓ Полностью типизирована
- ✓ Независима от фреймворка
- ✓ Независима от базы данных
- ✓ Независима от UI
<a id="tracking-api"></a>

## Часть IV. Tracking API

> **Status:** ✅ Accepted
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](#constitution), [`product.md`](#product), [`data-model.md`](#data-model)

### 1. Назначение

Определяет публичный Tracking API — основной интерфейс разработчика.

Developer Experience имеет приоритет выше, чем простота реализации.

### 2. Цели

API ОБЯЗАН удовлетворять следующим целям:

- читаемость
- строгая типизация
- независимость от фреймворка
- независимость от storage
- предсказуемость

### 3. Non-Goals

Tracking API НЕ ДОЛЖЕН экспонировать:

- SQL
- реализацию storage
- React
- ORM-специфичные типы

### 4. Принципы

- **TRACK-001** — Tracking API ОБЯЗАН возвращать `Promise<ActivityRecord>`. Приложения ДОЛЖНЫ `await track()` там, где failure должен быть observable. Fire-and-forget usage допускается только явно через `void activity.track(input)`. См. root-level `SPEC_CLARIFICATIONS.md` §1.
- **TRACK-002** — Приложения НЕ ДОЛЖНЫ конструировать `ActivityEntry` вручную. Только SDK создаёт объекты `ActivityEntry` (соответствует [`engine.md`](#engine) §7 — `EntryFactory`).
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

> **Примечание об именовании требований:** в исходном документе эти пункты были пронумерованы как `API-001`…`API-033`. В этой спецификации они переименованы в `TRACK-xxx`, чтобы не конфликтовать с нумерацией требований в [`public-api.md`](#public-api) (там аналогичный конфликт был решён переименованием в `PUBAPI-xxx` — например, `PUBAPI-001` про единственную фабричную функцию `createActivity`, а не про синхронность `track()`). Содержание требований не изменено — изменена только маркировка.

### 5. Точка входа

SDK предоставляет ровно один сервис трекинга:

```ts
activity.track(...)
```

Дополнительные хелперы МОГУТ существовать. `track()` остаётся основным API.

### 6. `track()`

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

`timestamp` опционален. Если не передан, SDK ОБЯЗАН сгенерировать его (согласуется с [`engine.md`](#engine) §6, Stage 3 — Enrichment).

### 7. `ResourceInput`

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

Соответствует **Resource** из [`data-model.md`](#data-model) §4 (**RESOURCE-001**).

### 8. `ActorInput`

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

Соответствует **Actor** из [`data-model.md`](#data-model) §5 (**ACTOR-001**); значения `type` совпадают с поддерживаемыми типами Actor.

### 9. `Action`

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

SDK ОБЯЗАН распознавать built-in actions и ОБЯЗАН принимать custom string actions. Built-in actions получают default rendering. Custom actions используют generic rendering, если приложение не предоставило custom renderer. См. root-level `SPEC_CLARIFICATIONS.md` §2.

### 10. `ChangeInput`

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

Соответствует изменениям полей, отображаемым в [`activity-panel.md`](#activity-panel) §13 и хранимым в таблице `activity_changes` (см. [`database.md`](#database) §5 — `field`/`label`/`before_value`/`after_value` напрямую соответствуют этим полям).

### 11. `ContentInput`

```ts
type ContentInput =
    | CommentContent
    | AttachmentContent
    | CustomContent
```

Соответствует Content-записям из [`activity-panel.md`](#activity-panel) §14 (Comment / Attachment / Custom).

### 12. `MetadataInput`

Metadata специфична для приложения.

SDK ОБЯЗАН сохранять неизвестные metadata без изменений (согласуется с [`engine.md`](#engine) §6, Stage 4 — Middleware МОЖЕТ обогащать metadata, но не обязан её понимать).

### 13. Правила валидации

| Action | Требование |
|---|---|
| `update` | `changes` ОБЯЗАТЕЛЬНЫ |
| `comment` | `content` ОБЯЗАТЕЛЕН |
| `attachment` | `content` ОБЯЗАТЕЛЕН |
| `create` | `changes` опциональны |
| `delete` | `changes` опциональны |

### 14. Примеры

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

### 15. Ошибки

Ошибки валидации ОБЯЗАНЫ содержать: `code`, `message`, `field`.

```ts
{
    code: "INVALID_ACTION",
    message: "...",
    field: "action"
}
```

> Дополняет модель ошибок из [`public-api.md`](#public-api) §14 (`code`/`message`) полем `field`, специфичным для ошибок валидации входа трекинга.

### 16. События

SDK МОЖЕТ эмитировать lifecycle-события: `beforeTrack`, `afterTrack`, `trackFailed`.

Приложения МОГУТ подписываться.

Соответствует событиям Engine из [`engine.md`](#engine) §6, Stage 6.

### 17. Потокобезопасность

Tracking API ОБЯЗАН поддерживать конкурентные вызовы. Глобальное изменяемое состояние не допускается (согласуется с [`engine.md`](#engine) §12).

### 18. Обратная совместимость

| Изменение | Тип |
|---|---|
| Добавление опциональных свойств | Совместимо |
| Удаление свойств | Breaking |
| Переименование свойств | Breaking |
| Изменение типов | Breaking |

### 19. Приёмка

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
<a id="public-api"></a>

## Часть V. Public API

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](#constitution), [`product.md`](#product)

### 1. Назначение

Определяет полный публичный API, предоставляемый Activity Platform.

Этот документ — единственный источник истины о том, что разработчику разрешено использовать.

Всё, что здесь не описано, считается внутренним.

### 2. Цели дизайна

Публичный API ОБЯЗАН:

- быть независимым от фреймворка
- быть независимым от storage
- быть полностью типизированным
- поддерживать tree-shaking
- минимизировать необходимую конфигурацию
- оставаться стабильным между minor-релизами

### 3. Публичные пакеты

Version 1.0 экспортирует следующие пакеты:

| Пакет | Назначение |
|---|---|
| `@activity/core` | Core engine и публичный API |
| `@activity/react` | React UI-компоненты |
| `@activity/postgres` | PostgreSQL storage adapter |

Приложения НЕ ДОЛЖНЫ импортировать внутренние пакеты.

### 4. Публичная точка входа

Приложения создают ровно один инстанс `Activity`.

```ts
import { createActivity } from "@activity/core";
```

**Требование:**

- **PUBAPI-001** — SDK ОБЯЗАН предоставлять ровно одну фабричную функцию: `createActivity(...)`. Никакие дополнительные фабричные функции не допускаются в v1 (проверка: unit-тест).

### 5. `createActivity()`

```ts
const activity = createActivity({
    adapter,
    logger?,
    clock?,
});
```

Возвращает: `Activity`.

**Требования:**

- **PUBAPI-002** — `createActivity()` НЕ ДОЛЖЕН подключаться к базе данных. Установление соединения делегируется адаптеру (см. [`storage.md`](#storage)).
- **PUBAPI-003** — `createActivity()` ОБЯЗАН быть синхронным.
- **PUBAPI-004** — `createActivity()` ОБЯЗАН быть свободным от побочных эффектов.

### 6. Интерфейс `Activity`

Возвращаемый объект ОБЯЗАН предоставлять следующие методы:

```ts
interface Activity {
    track(...)
    query(...)
}
```

Version 1.0 намеренно предоставляет только две операции.

**Требование:**

- **PUBAPI-010** — Публичный интерфейс `Activity` ОБЯЗАН оставаться минимальным. Version 1.0 ОБЯЗАНА предоставлять не более пяти публичных методов.

### 7. `track()`

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

- **PUBAPI-020** — `track()` ОБЯЗАН представлять ровно одну пользовательскую операцию (реализует **PROD-005**, см. [`constitution.md`](#constitution)).
- **PUBAPI-021** — `track()` ОБЯЗАН валидировать вход (см. [`engine.md`](#engine) §6, Stage 1).
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

### 8. `query()`

**Назначение:** читать Activity Entries.

```ts
activity.query(options)
```

Возвращает: `Promise<ActivityEntry[]>`.

**Требования:**

- **PUBAPI-030** — `query()` ОБЯЗАН быть асинхронным.
- **PUBAPI-031** — Результаты ОБЯЗАНЫ сортироваться по timestamp по убыванию по умолчанию (согласуется с [`query-api.md`](#query-api) §8).
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

> **Примечание:** `query()` возвращает `Promise<ActivityEntry[]>` напрямую, тогда как `StorageAdapter.query()` (см. [`storage.md`](#storage) §6) возвращает `Promise<QueryResult>` (содержащий `entries`, `total`, `hasMore`). Публичный `Activity.query()` — упрощённая проекция поверх внутреннего `QueryResult`; `total`/`hasMore` на этом уровне не экспонируются в v1.

### 9. Query Options

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

> Соответствует `QueryOptions` из [`storage.md`](#storage) §7, за исключением именования: публичный API использует `actor`, внутренний `StorageAdapter` — `actorId` (маппинг — деталь реализации Engine).

### 10. React-пакет

React-пакет НЕ ДОЛЖЕН создавать инстансы `Activity`.

React потребляет уже существующий инстанс `Activity`.

**Требование:**

- **PUBAPI-040** — Engine владеет данными. React владеет только рендерингом (реализует **ARCH-002/ARCH-003**, см. [`constitution.md`](#constitution)).

> **Это решает OPEN-001** (см. [`rfc/RFC-001-react-integration.md`](#rfc-001)): React-слой использует прямые инстансы `Activity`, передаваемые явно, а не паттерн `ActivityProvider`/контекст. Приложение создаёт `Activity` через `createActivity()` (вне React) и передаёт его как prop.

### 11. `ActivityPanel`

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

> **Это решает OPEN-002** (см. [`rfc/RFC-002-query-execution-model.md`](#rfc-002)): именно `ActivityPanel` выполняет запросы самостоятельно в режиме по умолчанию — отдельный обязательный хук для выполнения запроса не требуется. Это подтверждает предположение, сделанное ранее в [`activity-panel.md`](#activity-panel) на основе наличия controlled-режима.

### 12. Controlled Mode

Приложения МОГУТ обойти автоматическую загрузку:

```tsx
<ActivityPanel
    entries={entries}
/>
```

**Требование:**

- **PUBAPI-060** — Когда передан `entries`, `ActivityPanel` НЕ ДОЛЖЕН выполнять запросы (согласуется с [`activity-panel.md`](#activity-panel) §5).

### 13. Публичные типы

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

### 14. Модель ошибок

Каждая публичная ошибка ОБЯЗАНА предоставлять:

```ts
code
message
```

Stack traces — деталь реализации, не часть публичного контракта.

> Согласуется с моделью ошибок `StorageError` ([`storage.md`](#storage) §11) и типизированными ошибками Engine ([`engine.md`](#engine) §10).

### 15. Версионирование

| Изменение | Тип |
|---|---|
| Добавление опциональных свойств | Совместимо |
| Добавление методов | Совместимо |
| Удаление методов | Breaking |
| Переименование методов | Breaking |
| Изменение сигнатур методов | Breaking |

### 16. Примеры

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

### 17. Non-Goals

Version 1.0 НЕ ДОЛЖНА предоставлять:

- ORM-специфичные API
- SQL builders
- React-хуки, привязанные к storage
- Event bus
- Plugin registry
- Обязательную Provider-based архитектуру

Последний пункт — прямое следствие решения по OPEN-001 (раздел 10 выше): `ActivityProvider` не является обязательной частью архитектуры v1.

### 18. Приёмка

- ✓ Одна фабрика
- ✓ Один инстанс Activity
- ✓ Один метод трекинга
- ✓ Один метод запроса
- ✓ Стабильные публичные типы
- ✓ Полностью типизировано
- ✓ Независимо от фреймворка

### 19. Связанные документы

Конкретные поверхности публичного API также описаны в:

- [`engine.md`](#engine) — внутренняя реализация Engine, вызываемая через `track()`/`query()`
- [`query-api.md`](#query-api) — детальная семантика `query()`
- [`react-api.md`](#react-api) — модель интеграции React и публичные компоненты `ActivityEntry`, `ActivitySearch`, `ActivityFilters`
- [`activity-panel.md`](#activity-panel) — компонент `ActivityPanel`
- [`storage.md`](#storage) — контракт `StorageAdapter`

> **Статус:** публичный API полностью специфицирован для v1.0, включая решение OPEN-001 и OPEN-002. Breaking changes по-прежнему требуют RFC — см. процесс в [`rfc/README.md`](#rfc-readme).
<a id="engine"></a>

## Часть VI. Engine: внутренняя архитектура

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](#constitution), [`product.md`](#product), [`public-api.md`](#public-api), [`data-model.md`](#data-model)

### 1. Назначение

Определяет внутреннюю архитектуру Activity Engine.

Engine отвечает за обработку, сохранение и запрос Activity Entries.

Engine — единственный слой, которому разрешено взаимодействовать со Storage Adapters (**ARCH-004**, см. [`constitution.md`](#constitution)).

Engine не зависит от:

- React
- PostgreSQL
- Prisma
- Drizzle
- Next.js
- Express

Это расширяет **ARCH-002** ([`constitution.md`](#constitution)) конкретным списком фреймворков/библиотек.

### 2. Scope документа

Эта спецификация определяет:

- обязанности Engine
- pipeline обработки
- внутренние сервисы
- точки расширения
- жизненный цикл

Она **не** определяет:

- схему базы данных (см. [`database.md`](#database))
- React-компоненты (см. [`react-api.md`](#react-api), [`activity-panel.md`](#activity-panel))
- рендеринг UI, CSS
- публичный SDK как таковой (см. [`public-api.md`](#public-api))

### 3. Цели дизайна

Engine ОБЯЗАН быть:

- независимым от фреймворка
- независимым от storage
- детерминированным
- полностью типизированным
- тестируемым без базы данных

### 4. Архитектура

```text
Application
      ↓
Public API
      ↓
Activity Engine
      ├── Validation
      ├── Normalization
      ├── Enrichment
      ├── Middleware
      ├── Persistence
      └── Events
      ↓
Storage Adapter
      ↓
Database
```

Это детализирует Pipeline (см. [`pipeline.md`](#pipeline)) на уровне Engine: шаги Pipeline из `pipeline.md` — это стадии, реализуемые внутри Engine (раздел 6 ниже).

### 5. Обязанности

Engine ОБЯЗАН:

- валидировать вход
- нормализовать вход
- создавать канонический `ActivityEntry`
- выполнять middleware
- сохранять записи
- выполнять запросы
- эмитировать lifecycle-события

Engine НЕ ДОЛЖЕН:

- рендерить UI
- выполнять SQL напрямую (**ARCH-005**)
- знать о React
- знать о реализациях ORM

### 6. Pipeline обработки

Каждая операция `track()` ОБЯЗАНА выполнять следующие стадии по порядку. Это детальная реализация высокоуровневого Pipeline из [`pipeline.md`](#pipeline).

#### Stage 1 — Validation

- Вход: `TrackInput`
- Выход: `ValidatedTrackInput`

Обязанности:
- обязательные поля
- валидация enum
- логическая валидация
- валидация resource
- валидация action

Stage Validation НЕ ДОЛЖЕН модифицировать вход.

#### Stage 2 — Normalization

Обязанности:
- нормализация имён полей
- нормализация типов значений
- нормализация дат
- нормализация идентификаторов

Результат ОБЯЗАН быть детерминированным.

#### Stage 3 — Enrichment

Обязанности:
- генерация id `ActivityEntry`
- генерация timestamp (если не передан)
- генерация version
- прикрепление metadata
- вычисление derived-полей

Значения, предоставленные пользователем, ОБЯЗАНЫ иметь приоритет, если явно не запрещено обратное.

#### Stage 4 — Middleware

Middleware выполняются последовательно.

Каждый middleware получает:
- текущий `ActivityEntry`
- контекст выполнения

Middleware МОЖЕТ:
- обогащать metadata
- отклонять выполнение
- добавлять metadata
- логировать выполнение

Middleware НЕ ДОЛЖЕН напрямую мутировать предыдущее состояние pipeline.

Middleware ОБЯЗАН возвращать новый неизменяемый объект либо исходный объект.

#### Stage 5 — Persistence

Engine вызывает ровно один Storage Adapter.

Storage Adapter получает полностью сконструированный `ActivityEntry`.

Persistence НЕ ДОЛЖЕН выполнять бизнес-валидацию (она уже выполнена на Stage 1).

Соответствует **ARCH-004**: Engine взаимодействует с данными только через Storage Adapter (см. [`storage.md`](#storage), [`database.md`](#database)).

#### Stage 6 — Events

Lifecycle-события эмитируются после успешной персистентности.

Поддерживаемые события:
- `beforeTrack`
- `afterTrack`
- `trackFailed`

Слушатели событий НЕ ДОЛЖНЫ влиять на персистентные данные.

Сбои в слушателях событий НЕ ДОЛЖНЫ откатывать персистентность.

### 7. Внутренние сервисы

| Сервис | Ответственность |
|---|---|
| **ValidationService** | Валидация `TrackInput` |
| **NormalizationService** | Формирование канонических представлений |
| **EntryFactory** | Создание неизменяемых объектов `ActivityEntry` |
| **Pipeline** | Координация стадий выполнения |
| **StorageService** | Делегирование персистентности `StorageAdapter` |
| **QueryService** | Делегирование операций чтения |
| **EventDispatcher** | Диспетчеризация lifecycle-событий |

### 8. Query Flow

Каждый запрос выполняет:

```text
Query
  ↓
Validation
  ↓
Normalization
  ↓
Storage Adapter
  ↓
ActivityEntry[]
  ↓
Post Processing
  ↓
Result
```

> Это высокоуровневая версия детального 11-шагового Execution Order из [`query-api.md`](#query-api) §4 (Validate → Normalize → Resolve resource → apply filters → search → sort → paginate → map → return). `query-api.md` — источник истины для детальной семантики запроса; данный раздел описывает, где эти шаги физически происходят относительно Storage Adapter.

### 9. Иммутабельность

Все объекты `ActivityEntry` ОБЯЗАНЫ быть неизменяемыми.

Engine НЕ ДОЛЖЕН модифицировать персистентные записи.

Обновления создают новые Activity Entries. История — append-only.

Соответствует **MODEL-006** ([`data-model.md`](#data-model)) и реализуется на уровне схемы в [`database.md`](#database) §11.

### 10. Обработка ошибок

Engine предоставляет типизированные ошибки:

- `ValidationError`
- `StorageError`
- `ConfigurationError`

Неизвестные исключения НЕ ДОЛЖНЫ выходить за пределы публичного API в неизменном виде.

> Соотносится с кодами ошибок Query API ([`query-api.md`](#query-api) §15: `INVALID_RESOURCE`, `STORAGE_FAILURE` и т.д.) — те коды относятся к операциям чтения, эти типы ошибок — к операциям записи (`track()`).

### 11. Точки расширения

Version 1.0 поддерживает:

- кастомный `StorageAdapter`
- кастомный `Middleware`
- кастомные `Actions` (см. [`data-model.md`](#data-model) — приложения могут регистрировать Actions сверх встроенных)
- кастомные типы `Resource`

Будущие версии МОГУТ поддерживать:

- сериализаторы
- шифрование
- realtime-адаптеры
- telemetry-плагины

### 12. Потокобезопасность

Engine ОБЯЗАН поддерживать конкурентные операции.

Изменяемое глобальное состояние не допускается (согласуется с [`engineering/principles.md`](#engineering-principles) — «избегать global mutable state»).

### 13. Производительность

Engine ОБЯЗАН избегать ненужных аллокаций.

Engine ОБЯЗАН избегать глубокого клонирования неизменяемых объектов.

Engine ОБЯЗАН обрабатывать Activity Entries за O(n) относительно числа изменений полей.

### 14. Требования к тестированию

Каждая стадия pipeline ОБЯЗАНА иметь изолированные unit-тесты.

End-to-end тесты ОБЯЗАНЫ проверять полный pipeline обработки.

Тесты Storage Adapter ОБЯЗАНЫ быть переиспользуемыми между реализациями (полезно при появлении новых адаптеров, см. [`storage.md`](#storage), [`database.md`](#database) §17).

### 15. Чек-лист приёмки

- [ ] Validation pipeline реализован
- [ ] Normalization реализована
- [ ] Enrichment реализован
- [ ] Middleware реализован
- [ ] Persistence реализована
- [ ] Event dispatch реализован
- [ ] Unit-тесты завершены
- [ ] Интеграционные тесты завершены
- [ ] Публичный API не изменился

### 16. Открытые вопросы

Связь Engine с React-слоем была предметом открытого вопроса **OPEN-001**. Он решён — см. [`rfc/RFC-001-react-integration.md`](#rfc-001) и [`public-api.md`](#public-api) §10: React-слой использует прямые инстансы `Activity`, без `ActivityProvider`. Сам Engine, согласно разделу 1 выше, остаётся framework-independent — это решение касалось исключительно способа интеграции со стороны React.

> **Статус:** внутренняя архитектура Engine специфицирована (pipeline из 6 стадий, внутренние сервисы, query flow, error handling, extension points). Открытых архитектурных вопросов не осталось.
<a id="pipeline"></a>

## Часть VII. Pipeline

### Все write-операции проходят через Pipeline

Каждая операция записи проходит фиксированную последовательность шагов:

```text
Track Request
      ↓
Validation
      ↓
Normalization
      ↓
Enrichment
      ↓
Middleware
      ↓
Persistence
      ↓
Events
```

### Шаги Pipeline

| Шаг | Назначение |
|---|---|
| **Track Request** | Входная точка — приложение сообщает Engine о произошедшем действии |
| **Validation** | Проверка соответствия входных данных инвариантам модели данных (см. [`data-model.md`](#data-model)) |
| **Normalization** | Приведение данных к каноническому внутреннему представлению |
| **Enrichment** | Дополнение записи метаданными (например, контекст Actor'а) |
| **Middleware** | Точка расширения для пользовательской логики приложения |
| **Persistence** | Сохранение через Storage Adapter (см. [`storage.md`](#storage)); Engine никогда не пишет в БД напрямую (ARCH-005) |
| **Events** | Эмиссия событий после успешной записи, для подписчиков вне Engine |

### Инварианты, обеспечиваемые Pipeline

Pipeline — механизм, которым обеспечиваются продуктовые принципы из [`constitution.md`](#constitution):

- **PROD-005**: одно пользовательское действие → ровно одна Activity Record (агрегация происходит до/во время Validation/Normalization, а не на уровне БД).
- **PROD-006**: Pipeline работает с бизнес-действиями, а не с SQL-операциями.
- **MODEL-006**: Persistence — только append; Pipeline не предоставляет пути для модификации существующих записей.

> **Статус:** структура Pipeline специфицирована на двух уровнях. Этот документ описывает высокоуровневый поток (см. **ARCH-001** в `constitution.md`). Детальная реализация каждой стадии — включая внутренние сервисы (ValidationService, NormalizationService, EntryFactory и др.), точный контракт Middleware, обработку ошибок и extension points — специфицирована в [`engine.md`](#engine) §6–14.
<a id="storage"></a>

## Часть VIII. Storage: контракт адаптера

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](#constitution), [`product.md`](#product), [`data-model.md`](#data-model), [`public-api.md`](#public-api)

### 1. Назначение

Определяет абстракцию хранения, используемую Activity Engine.

Engine ОБЯЗАН зависеть только от этой абстракции (**ARCH-004**, см. [`constitution.md`](#constitution)).

Реализации Storage ОБЯЗАНЫ реализовывать эту спецификацию.

### 2. Цели дизайна

Слой хранения ОБЯЗАН:

- быть независимым от базы данных
- быть заменяемым (**DB-002**)
- поддерживать транзакции
- поддерживать пагинацию
- поддерживать фильтрацию
- поддерживать полнотекстовый поиск
- поддерживать опциональные будущие расширения

### 3. Архитектура

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

### 4. Интерфейс `StorageAdapter`

Каждый адаптер ОБЯЗАН реализовывать следующий интерфейс:

```ts
interface StorageAdapter {
    insert(entry: ActivityEntry): Promise<void>
    query(options: QueryOptions): Promise<QueryResult>
}
```

Version 1.0 намеренно оставляет интерфейс минимальным.

> Это закрывает ранее открытый вопрос контракта Storage Adapter (см. [`engine.md`](#engine) §7 — `StorageService`/`QueryService` делегируют именно этим двум методам).

### 5. `insert()`

**Назначение:** сохранить одну неизменяемую `ActivityEntry`.

**Требования:**

- **STORE-001** — `insert()` ОБЯЗАН вставлять ровно одну `ActivityEntry` (проверка: интеграционный тест).
- **STORE-002** — `insert()` ОБЯЗАН быть атомарным (проверка: интеграционный тест). Соответствует требованию транзакционности из [`database.md`](#database) §13 (Entry + все Changes в одной транзакции).
- **STORE-003** — `insert()` НЕ ДОЛЖЕН модифицировать `ActivityEntry` (проверка: unit-тест).
- **STORE-004** — `insert()` ОБЯЗАН сохранять порядок Changes (проверка: интеграционный тест; соответствует **DB-012**, см. [`database.md`](#database)).
- **STORE-005** — `insert()` ОБЯЗАН завершаться типизированной ошибкой при сбое персистентности (проверка: интеграционный тест).

### 6. `query()`

**Назначение:** получить Activity Entries.

```ts
query(options: QueryOptions): Promise<QueryResult>
```

**Требования:**

- **STORE-010** — Результаты ОБЯЗАНЫ упорядочиваться по timestamp по убыванию, если явно не переопределено (согласуется с [`database.md`](#database) §9 и [`query-api.md`](#query-api) §8).
- **STORE-011** — Пагинация ОБЯЗАНА поддерживаться.
- **STORE-012** — Фильтрация ОБЯЗАНА поддерживаться.
- **STORE-013** — Поиск ОБЯЗАН поддерживаться.
- **STORE-014** — `query()` НЕ ДОЛЖЕН мутировать сохранённые данные.

### 7. `QueryOptions`

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

Соответствие [`query-api.md`](#query-api) §4 (Execution Order): `resource` → «Resolve resource», `actions` → «Apply action filter», `actorId` → «Apply actor filter», `from`/`to` → «Apply date filter», `search` → «Apply search», `limit`/`offset` → «Apply pagination».

**Требования:**

- **STORE-020** — `resource` ОБЯЗАТЕЛЕН (согласуется с **QUERY-090**, см. [`query-api.md`](#query-api)).
- **STORE-021** — `limit` по умолчанию равен `50`.
- **STORE-022** — Максимальный `limit` по умолчанию равен `500`. Приложения МОГУТ переопределить этот лимит.
- **STORE-023** — Отрицательные `offset` ОБЯЗАНЫ отклоняться (согласуется с ошибкой `INVALID_OFFSET`, см. [`query-api.md`](#query-api) §15).

### 8. `QueryResult`

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
- **STORE-032** — `hasMore` ОБЯЗАН указывать на наличие дополнительных страниц (согласуется с `hasMore` из [`query-api.md`](#query-api) §9 и **QUERY-122**).

### 9. Транзакции

**Требования:**

- **STORE-040** — Адаптер МОЖЕТ участвовать в транзакциях приложения.
- **STORE-041** — Engine НЕ ДОЛЖЕН требовать поддержку транзакций как обязательное условие работы адаптера.

### 10. Конкурентность

**Требования:**

- **STORE-050** — Конкурентные вставки ОБЯЗАНЫ поддерживаться.
- **STORE-051** — Конкурентные чтения ОБЯЗАНЫ поддерживаться.
- **STORE-052** — Операции чтения НЕ ДОЛЖНЫ блокировать другие чтения.

Согласуется с требованием потокобезопасности Engine (см. [`engine.md`](#engine) §12).

### 11. Ошибки

Каждая ошибка хранения ОБЯЗАНА предоставлять:

```ts
interface StorageError {
    code: string
    message: string
}
```

Адаптер МОЖЕТ предоставлять дополнительные поля.

> Соотносится с `StorageError` из [`engine.md`](#engine) §10 (типизированные ошибки Engine) и кодами ошибок хранения из [`query-api.md`](#query-api) §15 (`STORAGE_FAILURE`, `QUERY_TIMEOUT`, `CONNECTION_FAILED`).

### 12. Производительность

**Требования:**

- **STORE-060** — Адаптер ОБЯЗАН поддерживать запросы к ресурсам, содержащим не менее 100 000 Activity Entries (проверка: бенчмарк). Согласуется с [`database.md`](#database) §15 и [`activity-panel.md`](#activity-panel) §21.
- **STORE-061** — Производительность запроса ОБЯЗАНА в первую очередь опираться на индексы (см. [`database.md`](#database) §7 — IDX-001…006). Полное сканирование таблицы ОБЯЗАНО избегаться для обычных запросов (проверка: бенчмарк базы данных).

### 13. Расширяемость

Приложения МОГУТ реализовывать кастомные `StorageAdapter`.

Engine ОБЯЗАН обрабатывать все совместимые адаптеры одинаково (согласуется с **DB-002**).

### 14. Версионирование

| Изменение | Тип |
|---|---|
| Добавление опциональных методов | Совместимо |
| Добавление обязательных методов | Breaking |
| Изменение сигнатур существующих методов | Breaking |

Согласуется с общей политикой breaking changes из [`public-api.md`](#public-api): RFC + Migration Guide + Major Version.

### 15. Приёмка

- ✓ Абстракция адаптера завершена
- ✓ Engine независим от базы данных
- ✓ Поддерживается пагинация
- ✓ Поддерживается фильтрация
- ✓ Поддерживается поиск
- ✓ Поддерживается неизменяемая `ActivityEntry`
- ✓ Поддерживаются кастомные адаптеры

### 16. Планируемые адаптеры

- PostgreSQL (см. [`database.md`](#database)) — единственный адаптер в scope V1 (см. [`product.md`](#product))
- SQLite
- MySQL
- Supabase
- Custom

> **Статус:** контракт `StorageAdapter` (методы `insert`/`query`, `QueryOptions`, `QueryResult`, ошибки) полностью специфицирован. Логическая схема PostgreSQL-реализации — в [`database.md`](#database). Открытых вопросов по этому документу не осталось.
<a id="database"></a>

## Часть IX. Database: каноническая схема

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](#constitution), [`data-model.md`](#data-model), [`engine.md`](#engine)

### 1. Назначение

Определяет каноническую реляционную схему базы данных.

Эта спецификация определяет **логическую** схему. Реализации Storage МОГУТ использовать разные физические оптимизации при условии, что все требования соблюдены.

### 2. Цели дизайна

Схема ОБЯЗАНА:

- сохранять неизменяемую историю (**MODEL-006**, см. [`constitution.md`](#constitution))
- поддерживать эффективные запросы по Resource
- поддерживать пагинацию (см. [`query-api.md`](#query-api), §9)
- поддерживать полнотекстовый поиск (см. [`query-api.md`](#query-api), §7)
- поддерживать будущее партиционирование

### 3. Таблицы

Version 1.0 определяет две обязательные таблицы:

- `activity_entries`
- `activity_changes`

Будущие версии МОГУТ вводить дополнительные таблицы.

### 4. `activity_entries`

Представляет одну Activity Entry (соответствует Activity Record из [`data-model.md`](#data-model)).

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

Соответствие модели данных ([`data-model.md`](#data-model)):

- `resource_type` / `resource_id` / `resource_title` → **Resource** (см. `data-model.md` §4)
- `actor_type` / `actor_id` / `actor_name` / `actor_avatar_url` → **Actor** (см. `data-model.md` §5)
- `action` → **Action** (см. `data-model.md` §10)
- `content_type` / `content_json` → Content-записи (comment/attachment/custom, см. [`activity-panel.md`](#activity-panel) §14)
- `metadata_json` → вторичный контент (см. [`ui/overview.md`](#ui-overview))

#### Ограничения (Constraints)

- **SCHEMA-001** — Первичный ключ: `id`.
- **SCHEMA-002** — `(resource_type, resource_id)` НЕ ДОЛЖНЫ быть NULL.
- **SCHEMA-003** — `created_at` НЕ ДОЛЖЕН быть NULL.
- **SCHEMA-004** — `action` НЕ ДОЛЖЕН быть NULL.
- **SCHEMA-005** — `actor_type` НЕ ДОЛЖЕН быть NULL.

### 5. `activity_changes`

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

Используется для рендеринга изменений полей в [`activity-panel.md`](#activity-panel) §13 («Update Entry Rendering» — collapsed показывает первые три `position`, остальное сворачивается в `+N more changes`).

#### Ограничения (Constraints)

- **SCHEMA-010** — `entry_id` ОБЯЗАН ссылаться на `activity_entries(id)`.
- **SCHEMA-011** — `position` ОБЯЗАН начинаться с 0.
- **SCHEMA-012** — Порядок `(field, position)` ОБЯЗАН сохраняться.
- **SCHEMA-013** — Удаление Activity Entry ОБЯЗАНО каскадно удалять `activity_changes`.

> Каскадное удаление (SCHEMA-013) — техническая мера ссылочной целостности БД. Она не противоречит **MODEL-006** (иммутабельность истории): SDK не предоставляет публичного API для удаления Activity Entries (см. [`activity-panel.md`](#activity-panel) §1 — «не отвечает за удаление»); правило существует на случай ручного administrative-удаления вне SDK.

### 6. Связи

```text
activity_entries
        1
        ↓
        N
activity_changes
```

Каждый Change принадлежит ровно одной Activity Entry.

### 7. Индексы

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

### 8. Поиск (Search)

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

Публичный API ([`query-api.md`](#query-api) §7) ОБЯЗАН оставаться неизменным независимо от выбранной техники поиска.

### 9. Сортировка (Ordering)

- Основная сортировка: `created_at DESC`
- Вторичная сортировка: `id DESC`

Это гарантирует детерминированный порядок при равных timestamp'ах — соответствует **QUERY-110/111** ([`query-api.md`](#query-api) §8).

### 10. Пагинация

- Offset-пагинация ОБЯЗАНА поддерживаться (соответствует решению по **OPEN-003**, см. [`query-api.md`](#query-api) §9 и [`rfc/RFC-003-pagination-strategy.md`](#rfc-003)).
- Cursor-пагинация МОЖЕТ быть добавлена в будущей версии (V2, см. [`query-api.md`](#query-api) §10).
- Публичный API ОБЯЗАН скрывать storage-специфичные детали реализации.

### 11. Иммутабельность

- Персистентные строки НЕ ДОЛЖНЫ обновляться (UPDATE запрещён на уровне схемы для `activity_entries`/`activity_changes`).
- Исправления создают новые Activity Entries.
- История — append-only.

Это прямая реализация **MODEL-006** ([`constitution.md`](#constitution)) на уровне схемы БД.

### 12. Хранение данных (Retention)

- SDK НЕ ДОЛЖЕН автоматически удалять исторические записи.
- Приложения МОГУТ определять собственные retention policies.
- Логика retention находится вне scope SDK.

### 13. Транзакции

Вставка одной Activity Entry и всех соответствующих Changes ОБЯЗАНА происходить в единой транзакции.

Частичная запись (partial writes) НЕ ДОЛЖНА быть возможна.

Это техническая гарантия **PROD-005** ([`constitution.md`](#constitution) — одно действие = одна запись) на уровне персистентности.

### 14. Правила миграций

Изменения схемы ОБЯЗАНЫ использовать forward-only миграции.

Деструктивные миграции требуют:

- RFC
- Migration Guide
- Major Version

(согласуется с общей политикой breaking changes из [`public-api.md`](#public-api)).

### 15. Целевые показатели производительности

| Метрика | Значение |
|---|---|
| Timeline query | ≤ 100 мс |
| Датасет | 100 000 записей |

**Допущения:**

- присутствуют рекомендуемые индексы
- warm cache
- PostgreSQL 16+

Согласуется с целевыми показателями сложности из [`query-api.md`](#query-api) §14 (O(log n + k)) и требованием производительности `ActivityPanel` из [`activity-panel.md`](#activity-panel) §21 (100 000+ записей с виртуализацией).

### 16. Чек-лист приёмки

- [ ] Каноническая схема реализована
- [ ] Foreign keys обеспечены
- [ ] Обязательные индексы созданы
- [ ] Транзакционные вставки проверены
- [ ] Сортировка проверена
- [ ] Пагинация проверена
- [ ] Бенчмарк производительности завершён

### 17. Будущие адаптеры (вне scope V1)

Эта каноническая схема описывает **PostgreSQL Adapter** — единственный адаптер, входящий в scope Version 1 (см. [`product.md`](#product), раздел «Включено в V1»).

Прочие адаптеры, перечисленные в [`storage.md`](#storage), вне scope V1:

- SQLite
- MySQL
- Supabase
- Custom

Для каждого из них потребуется собственная логическая схема, удовлетворяющая тем же требованиям («Цели дизайна» выше), после того как будет принято решение об их реализации.
<a id="query-api"></a>

## Часть X. Query API

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](#constitution), [`product.md`](#product), [`public-api.md`](#public-api), [`data-model.md`](#data-model), [`storage.md`](#storage)

### 1. Назначение

API для чтения, поиска и фильтрации Activity Records. Входит в scope Version 1 (см. [`product.md`](#product)):

- Search
- Filters

### 2. Связь с UI

Query API обслуживает Timeline UI (см. [`ui/overview.md`](#ui-overview)) и React-компоненты (см. [`react-api.md`](#react-api), [`activity-panel.md`](#activity-panel)).

### 3. Открытые вопросы

Оба вопроса, ранее открытые в этом документе, решены.

#### OPEN-002 — Кто выполняет запросы? ✅ Решено

~~Должны ли запросы выполняться напрямую компонентом `ActivityPanel`, или через отдельный хук?~~

**Решено: `ActivityPanel` выполняет запросы самостоятельно по умолчанию.** Обход — через Controlled Mode (`entries` prop), а не через отдельный хук.

Зафиксировано в [`public-api.md`](#public-api) §11 (**PUBAPI-052**) — см. также [`rfc/RFC-002-query-execution-model.md`](#rfc-002) (статус Resolved).

#### OPEN-003 — Стратегия пагинации ✅ Решено

~~Должна ли Version 1 поддерживать cursor-based пагинацию, или ограничиться только offset-пагинацией?~~

**Решено (см. раздел 9 ниже): Version 1 использует только offset-пагинацию. Cursor-пагинация зарезервирована для Version 2.**

См. также [`rfc/RFC-003-pagination-strategy.md`](#rfc-003) — статус Resolved.

### 4. Порядок выполнения (Execution Order)

Query Engine ОБЯЗАН выполнять операции в следующем порядке:

1. Validate request
2. Normalize request
3. Resolve resource
4. Apply action filter
5. Apply actor filter
6. Apply date filter
7. Apply search
8. Apply sorting
9. Apply pagination
10. Map results
11. Return QueryResult

Этот порядок ОБЯЗАН оставаться стабильным (breaking change иначе, см. раздел 15 «Совместимость»).

### 5. Нормализация запроса

**Требования:**

- **QUERY-080** — Все строковые фильтры ОБЯЗАНЫ быть обрезаны (trim).
- **QUERY-081** — Фильтры Action ОБЯЗАНЫ приводиться к нижнему регистру.
- **QUERY-082** — Дублирующиеся значения ОБЯЗАНЫ удаляться.
- **QUERY-083** — Undefined опциональные поля ОБЯЗАНЫ удаляться перед выполнением.
- **QUERY-084** — Нормализованный запрос ОБЯЗАН быть иммутабельным.

### 6. Разрешение Resource

**Требования:**

- **QUERY-090** — Запросы ОБЯЗАНЫ нацеливаться ровно на один Resource (согласуется с **INV-001**, см. [`data-model.md`](#data-model)).
- **QUERY-091** — Кросс-resource запросы НЕ ДОЛЖНЫ поддерживаться в Version 1.

  Допустимо:
  ```ts
  resource: {
      type: "invoice",
      id: "inv_123"
  }
  ```

  Недопустимо:
  ```ts
  resources: [...]
  ```

- **QUERY-092** — Неизвестные Resources ОБЯЗАНЫ возвращать пустой результат. Они НЕ ДОЛЖНЫ бросать ошибку.

### 7. Семантика поиска (Search)

Version 1 выполняет логическое OR по всем полям, доступным для поиска.

Пример: поиск `approved` совпадает с:

- Status = Approved
- Comment содержит "approved"
- Заголовок Resource содержит "approved"
- Имя Actor содержит "Approved" (регистронезависимо)

**Требования:**

- **QUERY-100** — Поиск ОБЯЗАН быть регистронезависимым.
- **QUERY-101** — Поиск ОБЯЗАН игнорировать начальные и конечные пробелы.
- **QUERY-102** — Поиск ОБЯЗАН находить частичные совпадения слов (например, `appro` находит `Approved`). Реализация МОЖЕТ использовать специфичные возможности конкретной БД.

### 8. Правила сортировки

Первичный ключ: `created_at`
Вторичный ключ: `id`

**Требования:**

- **QUERY-110** — Сортировка ОБЯЗАНА быть детерминированной.
- **QUERY-111** — Один и тот же датасет ОБЯЗАН всегда давать один и тот же порядок.
- **QUERY-112** — Реализации Storage НЕ ДОЛЖНЫ полагаться на порядок вставки (согласуется со [`storage.md`](#storage)).

### 9. Семантика пагинации (Version 1: offset)

**Version 1 использует offset-пагинацию.** Это решение закрывает **OPEN-003**.

**Требования:**

- **QUERY-120** — `offset` относится к строкам **после** фильтрации.
- **QUERY-121** — `limit` применяется после фильтрации и сортировки.
- **QUERY-122** — Storage Adapter МОЖЕТ внутренне запрашивать на одну строку больше, чтобы вычислить `hasMore`.

Пример:

```text
Всего строк: 125
Limit: 50
Offset: 50
Результат: 50 записей
hasMore: true
```

### 10. Cursor-пагинация (Version 2)

Cursor-пагинация зарезервирована для **Version 2**.

Публичный API ОБЯЗАН оставаться совместимым с будущей cursor-реализацией.

Приложения НЕ ДОЛЖНЫ полагаться на offset-специфичное поведение сверх того, что описано для Version 1 — иначе миграция на cursor в V2 будет breaking для них.

### 11. Маппинг результата

Storage Adapter возвращает канонические объекты `ActivityEntry` (см. [`data-model.md`](#data-model) — соответствует Activity Record).

- Query Engine НЕ ДОЛЖЕН мутировать возвращённые объекты (согласуется с **MODEL-006**).
- Query Engine МОЖЕТ обогащать транзитными runtime-метаданными, которые не персистятся.
- Персистентные поля ОБЯЗАНЫ оставаться неизменными.

### 12. Кэширование

- Query Engine НЕ ДОЛЖЕН кэшировать результаты по умолчанию.
- Кэширование делегируется прикладному слою.
- Будущие адаптеры МОГУТ реализовать прозрачное кэширование.
- Публичный API ОБЯЗАН оставаться неизменным независимо от наличия кэширования.

### 13. Консистентность

Запросы, выполненные после успешного `track()`, ОБЯЗАНЫ видеть персистентную Activity Entry.

Engine НЕ ДОЛЖЕН возвращать частично персистентные записи.

### 14. Целевые показатели сложности

| Операция | Целевая сложность |
|---|---|
| Timeline query | O(log n + k), где n = всего записей, k = возвращённые записи |
| Search | Зависит от БД; Query Engine ОБЯЗАН избегать линейных in-memory сканов, если Storage Adapter поддерживает иное |

### 15. Коды ошибок

**Validation:**
```text
INVALID_RESOURCE
INVALID_LIMIT
INVALID_OFFSET
INVALID_DATE_RANGE
INVALID_ACTION
```

**Storage:**
```text
STORAGE_FAILURE
QUERY_TIMEOUT
CONNECTION_FAILED
```

Приложения НЕ ДОЛЖНЫ парсить текст ошибок. Приложения ДОЛЖНЫ (SHOULD) использовать коды ошибок.

### 16. Observability

Query Engine МОЖЕТ предоставлять lifecycle-хуки:

```text
beforeQuery
afterQuery
queryFailed
```

Сбои хуков НЕ ДОЛЖНЫ изменять результаты запроса.

### 17. Совместимость (Compatibility)

| Изменение | Тип |
|---|---|
| Добавление опциональных query-параметров | Совместимо |
| Добавление опциональных полей результата | Совместимо |
| Удаление параметров | Breaking |
| Изменение семантики параметра | Breaking |
| Изменение сортировки по умолчанию | Breaking |

Согласуется с общей политикой breaking changes из [`public-api.md`](#public-api): RFC + Migration Guide + Major Version.

### 18. Чек-лист приёмки

- [ ] Query validation реализована
- [ ] Нормализация запроса реализована
- [ ] Разрешение Resource реализовано
- [ ] Search реализован
- [ ] Фильтрация реализована
- [ ] Стабильная сортировка проверена
- [ ] Пагинация проверена
- [ ] Типизированные ошибки реализованы
- [ ] Бенчмарки завершены
- [ ] Интеграционные тесты завершены

> **Статус:** ядро семантики Query API специфицировано (execution order, normalization, search, sorting, pagination, errors). Оба открытых вопроса (OPEN-002, OPEN-003) решены.
<a id="react-api"></a>

## Часть XI. React API

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](#constitution), [`product.md`](#product), [`data-model.md`](#data-model), [`tracking-api.md`](#tracking-api), [`public-api.md`](#public-api), [`activity-panel.md`](#activity-panel)

### 1. Назначение

Определяет полный публичный React API.

Эта спецификация определяет каждый публичный React-компонент. Она не определяет детали реализации рендеринга.

### 2. Разделение ответственности

Согласно **ARCH-002/ARCH-003** (см. [`constitution.md`](#constitution)):

- Engine владеет бизнес-логикой.
- React владеет только рендерингом.

React-пакет (`@activity/react`, см. [`public-api.md`](#public-api) §3) — тонкий слой поверх Engine, не содержащий собственной бизнес-логики.

### 3. Цели дизайна

React API ОБЯЗАН:

- требовать минимальной конфигурации
- быть полностью типизированным
- быть tree-shakeable
- работать в SSR
- работать в CSR
- работать в React Server Components, где это возможно

> **Замечание по RSC:** передача уже созданного инстанса `Activity` через границу server/client в RSC требует отдельной стратегии сериализации на уровне реализации `@activity/react` (например, создание/восстановление инстанса на клиенте). Это техническая деталь реализации компонента, а не изменение архитектурного решения из раздела 4 — фиксировать отдельным RFC на этом этапе не требуется.

### 4. Модель интеграции (решено)

**React-слой использует прямые инстансы `Activity`, передаваемые явно через props — без `ActivityProvider`/контекста.**

Это решение **OPEN-001**, зафиксированное в [`public-api.md`](#public-api) §10 и [`rfc/RFC-001-react-integration.md`](#rfc-001):

- React-пакет НЕ ДОЛЖЕН создавать инстансы `Activity` (**PUBAPI-040**).
- Приложение создаёт инстанс через `createActivity()` (см. [`public-api.md`](#public-api) §5) вне React и передаёт его явно.
- `ActivityProvider`-based архитектура исключена как Non-Goal v1.0 (см. [`public-api.md`](#public-api) §17).

**Почему не Context/Provider:** из компонентов, описанных в этом документе, к инстансу `Activity` обращается только `ActivityPanel` (см. §6 ниже — он самостоятельно выполняет запросы, **PUBAPI-052**). `ActivityEntry`, `ActivitySearch` и `ActivityFilters` — чисто презентационные/controlled компоненты и не нуждаются в Engine вовсе (см. §7–9). Поскольку доступ к инстансу нужен ровно одному компоненту, разделяемый контекст не решает здесь никакой реальной проблемы prop-drilling и был бы избыточной абстракцией (противоречит [`engineering/principles.md`](#engineering-principles) — «avoid hidden magic», «avoid unnecessary abstractions»).

### 5. Публичные компоненты

Version 1.0 экспортирует:

- `ActivityPanel`
- `ActivityEntry`
- `ActivitySearch`
- `ActivityFilters`

`ActivityProvider` **не входит** в публичный API v1.0 (см. раздел 4 выше).

### 6. `ActivityPanel`

Полностью специфицирован в [`activity-panel.md`](#activity-panel) и в [`public-api.md`](#public-api) §11–12.

Обязательные props: `activity`, `resource` (**PUBAPI-050/051**). `ActivityPanel` самостоятельно выполняет запросы по умолчанию; Controlled Mode — через `entries` (**PUBAPI-052/060**, решение **OPEN-002**).

`ActivityPanel` МОЖЕТ принимать `search`/`filters` как controlled props (см. [`activity-panel.md`](#activity-panel) §5) — значения для них может поставлять `ActivitySearch`/`ActivityFilters` (см. §8–9 ниже), но эти компоненты не обязаны использоваться вместе с `ActivityPanel`.

### 7. `ActivityEntry`

**Назначение:** отрендерить одну Activity Entry.

```tsx
<ActivityEntry
    entry={entry}
/>
```

Не требует доступа к `Activity` — получает данные напрямую через prop `entry`.

**Требования:**

- **REACT-020** — `ActivityEntry` ОБЯЗАН рендерить неизменяемые данные (согласуется с **MODEL-006**, см. [`data-model.md`](#data-model)).
- **REACT-021** — `ActivityEntry` ОБЯЗАН поддерживать inline-разворачивание.
- **REACT-022** — Collapsed-режим ОБЯЗАН отображать не более трёх изменений полей.
- **REACT-023** — Expanded-режим ОБЯЗАН отображать все изменения полей.

Это тот же рендеринг, что уже детально описан в [`activity-panel.md`](#activity-panel) §11–15 (Entry Expansion, Update/Content/Lifecycle Entry Rendering, **PANEL-040…051**) — `ActivityEntry` является выделенным публичным компонентом для одной записи, а `ActivityPanel` рендерит массив таких записей (см. «Правила рендеринга», раздел 10 ниже).

> **Замечание об именовании:** тип данных `ActivityEntry` уже объявлен как публичный тип в [`public-api.md`](#public-api) §13 (данные записи). Компонент `<ActivityEntry>` — одноимённый React-компонент из `@activity/react`. Они находятся в разных пакетах (`@activity/core` vs `@activity/react`) и разных TS-неймспейсах (тип vs значение), поэтому конфликта в спецификации нет, но при одновременном импорте из обоих пакетов потребителю стоит быть внимательным к алиасам импорта.

### 8. `ActivitySearch`

**Назначение:** поиск по Activity Entries.

```tsx
<ActivitySearch
    value={query}
    onChange={setQuery}
/>
```

**Требования:**

- **REACT-030** — `ActivitySearch` ОБЯЗАН быть controlled-компонентом.
- **REACT-031** — `ActivitySearch` НЕ ДОЛЖЕН выполнять операции хранения.

Значение из `onChange` естественно передаётся в `search` prop `ActivityPanel` (см. [`activity-panel.md`](#activity-panel) §16 — изменение search обязано перезагружать записи; debounce не навязывается панелью).

### 9. `ActivityFilters`

**Назначение:** отображение элементов управления фильтрами.

Поддерживаемые фильтры: Action, Actor, Date Range.

**Требования:**

- **REACT-040** — Фильтры ОБЯЗАНЫ быть controlled-компонентами.
- **REACT-041** — Состояние фильтров ОБЯЗАНО быть сериализуемым.

Результат передаётся в `filters` prop `ActivityPanel` (см. [`activity-panel.md`](#activity-panel) §17 — изменение фильтров обязано инициировать новый запрос и сохранять текст поиска).

### 10. Правила рендеринга

```text
ActivityPanel
      ↓ renders
ActivityEntry[]
```

```text
ActivityEntry
      ↓ selects renderer
Update | Content | Lifecycle
```

Соответствует разделению видов записи в [`activity-panel.md`](#activity-panel) §13–15.

### 11. Стилизация

Публичный API НЕ ДОЛЖЕН требовать CSS-фреймворков (согласуется с [`activity-panel.md`](#activity-panel) §22 и [`engineering/principles.md`](#engineering-principles)).

Потребители МОГУТ использовать: обычный CSS, CSS Modules, Tailwind, CSS Variables — на своё усмотрение.

### 12. Темизация

Тема ОБЯЗАНА использовать CSS-переменные.

Публичный API НЕ ДОЛЖЕН экспонировать цветовые константы.

### 13. Серверный рендеринг

Библиотека компонентов ОБЯЗАНА поддерживать: SSR, Streaming, Hydration (см. также замечание по RSC в разделе 3).

### 14. Доступность

Все интерактивные компоненты ОБЯЗАНЫ:

- поддерживать навигацию с клавиатуры
- предоставлять ARIA-лейблы
- предоставлять видимый focus

Согласуется с [`activity-panel.md`](#activity-panel) §19–20.

### 15. Обработка ошибок

Ошибки рендеринга НЕ ДОЛЖНЫ приводить к падению приложения.

Ошибки ОБЯЗАНЫ быть изолированы в рамках затронутого компонента.

### 16. Приёмка

- ✓ Полностью типизировано
- ✓ SSR-совместимо
- ✓ Tree-shakeable
- ✓ Доступно (accessible)
- ✓ Темизируемо
- ✓ Без рантайм-предупреждений React

> **Статус:** модель интеграции React решена (OPEN-001, OPEN-002 закрыты, `ActivityProvider` исключён из публичного API). Публичные компоненты специфицированы: `ActivityPanel` (детально в `activity-panel.md`), `ActivityEntry`, `ActivitySearch`, `ActivityFilters`. Остаётся реализация (код, тесты).
<a id="activity-panel"></a>

## Часть XII. ActivityPanel

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](#constitution), [`public-api.md`](#public-api), [`query-api.md`](#query-api), [`data-model.md`](#data-model)

### 1. Назначение

`ActivityPanel` — основная UI точка входа продукта.

Отвечает за:

- загрузку Activity Entries
- рендеринг Activity Entries
- поиск (search)
- фильтрацию (filters)
- пагинацию
- разворачивание (expansion)
- пустое состояние (empty state)
- состояние загрузки (loading state)
- состояние ошибки (error state)

**Не отвечает** за:

- создание Activity Entries
- редактирование Activity Entries
- удаление Activity Entries

Это согласуется с **ARCH-002/ARCH-003** (см. [`constitution.md`](#constitution)): React отвечает только за рендеринг, запись данных — исключительно через Engine/Pipeline.

### 2. Обязанности

`ActivityPanel` ОБЯЗАН:

- отображать Activity Entries
- управлять жизненным циклом запроса
- рендерить loading state
- рендерить empty state
- рендерить error state
- рендерить развёрнутые записи
- по возможности сохранять позицию скролла

`ActivityPanel` НЕ ДОЛЖЕН:

- мутировать Activity Entries (согласуется с **MODEL-006/INV-006** — иммутабельность истории, см. [`data-model.md`](#data-model))
- выполнять операции хранения напрямую (согласуется с **ARCH-004** — только через Storage Adapter, см. [`storage.md`](#storage))
- знать о реализации базы данных (согласуется с **ARCH-002/ARCH-003**)

### 3. Публичный интерфейс

```tsx
<ActivityPanel
    activity={activity}
    resource={{
        type: "invoice",
        id: "inv_123"
    }}
    variant="default"
/>
```

### 4. Обязательные props

| Prop | Тип | Обязателен |
|---|---|---|
| `activity` | `Activity` | Да |
| `resource` | `ResourceReference` | Да |

### 5. Опциональные props

| Prop | Описание |
|---|---|
| `variant` | `"default" \| "compact" \| "comfortable"`, по умолчанию `"default"` |
| `search` | Контролируемое значение поиска |
| `filters` | Контролируемые фильтры |
| `entries` | Controlled mode. Если передан, `ActivityPanel` НЕ ДОЛЖЕН выполнять запросы самостоятельно |
| `onEntryClick` | Вызывается при клике на запись |
| `onError` | Вызывается при ошибке загрузки |

> **Связь с OPEN-002 ✅ Решено** ([`public-api.md`](#public-api) §11, [`rfc/RFC-002-query-execution-model.md`](#rfc-002)): наличие `entries` как controlled-режима было верным сигналом — формально закреплено, что в uncontrolled-режиме `ActivityPanel` по умолчанию выполняет запрос самостоятельно (**PUBAPI-052**).

### 6. Внутреннее состояние

Реализация по умолчанию управляет:

- loading
- error
- expanded entries
- query result

Приложения НЕ ДОЛЖНЫ обращаться к внутреннему состоянию напрямую.

### 7. Жизненный цикл загрузки

```text
Initial mount → Loading → Query → Render
```

Если запрос завершается ошибкой:

```text
Query → Error State
```

**Требования:**

- **PANEL-001** — Loading state ОБЯЗАН появляться до завершения первого запроса.
- **PANEL-002** — Loading state ОБЯЗАН исчезать немедленно после успеха или ошибки.

### 8. Empty State

Показывается, когда `entries.length == 0`.

**Требования:**

- **PANEL-010** — Empty State НЕ ДОЛЖЕН трактоваться как ошибка.
- **PANEL-011** — Empty State ОБЯЗАН занимать область списка Activity.

### 9. Error State

Показывается только при неуспешном запросе.

**Требования:**

- **PANEL-020** — Ошибки валидации НЕ ДОЛЖНЫ игнорироваться молча.
- **PANEL-021** — Ошибки хранения ОБЯЗАНЫ приводить к Error State.
- **PANEL-022** — Приложения МОГУТ предоставить кастомный Error State.

### 10. Список Activity

Записи ОБЯЗАНЫ отображаться в порядке запроса. `ActivityPanel` НЕ ДОЛЖЕН переупорядочивать записи.

Группировка не поддерживается в Version 1 (согласуется с [`product.md`](#product) — Grouping отсутствует в scope V1).

**Требования:**

- **PANEL-030** — Порядок ОБЯЗАН точно соответствовать `QueryResult.entries`.

### 11. Разворачивание записи

Поддерживается только inline-разворачивание. Модальные диалоги запрещены.

**Требования:**

- **PANEL-040** — Свёрнутые записи ОБЯЗАНЫ разворачиваться inline.
- **PANEL-041** — Развёрнутые записи ОБЯЗАНЫ сохранять окружающую позицию скролла.
- **PANEL-042** — Развёрнутое состояние ОБЯЗАНО переживать перерендеры.

Это соответствует принципам [`ui/overview.md`](#ui-overview): «Свёрнутая запись — основное представление, развёрнутая — раскрывает детали».

### 12. Модель разворачивания

Каждая запись имеет одно из двух состояний: **Collapsed** или **Expanded**. Промежуточных состояний не существует.

### 13. Рендеринг Update-записи

**Collapsed режим** отображает:
- title
- первые три изменения полей
- actor
- timestamp

**Expanded режим** отображает:
- все изменения полей
- metadata
- actor
- timestamp

**Требования:**

- **PANEL-050** — Collapsed режим ОБЯЗАН отображать не более трёх изменений полей.
- **PANEL-051** — Оставшиеся изменения ОБЯЗАНЫ суммироваться, например: `+5 more changes`.

### 14. Рендеринг Content-записи

Поддерживаемый контент: **Comment**, **Attachment**, **Custom**.

Comments отображают: content, actor, timestamp.

Attachments отображают: filename, size, mime type, actor, timestamp.

### 15. Рендеринг Lifecycle-записи

Примеры: Created, Archived, Deleted, Restored (соответствуют встроенным Actions, см. [`data-model.md`](#data-model) §10 «Правила по Action»).

Отображают: action, actor, timestamp. Дополнительные metadata МОГУТ показываться в expanded режиме.

### 16. Search

Изменение search ОБЯЗАНО перезагружать Activity Entries.

Приложения МОГУТ применять debounce к вводу. `ActivityPanel` НЕ ДОЛЖЕН навязывать стратегию debounce.

### 17. Filters

Изменение фильтров ОБЯЗАНО инициировать новый запрос. Фильтры ОБЯЗАНЫ сохранять текст поиска.

### 18. Виртуализация

Version 1 ДОЛЖНА (SHOULD) поддерживать виртуализацию списка.

При включённой виртуализации:
- развёрнутые записи ОБЯЗАНЫ оставаться функциональными
- навигация с клавиатуры ОБЯЗАНА оставаться функциональной

### 19. Навигация с клавиатуры

Поддерживаемые клавиши: Up Arrow, Down Arrow, Enter, Space, Escape.

**Требования:**

- **PANEL-060** — Каждая запись ОБЯЗАНА быть достижима с клавиатуры.
- **PANEL-061** — Enter переключает разворачивание.
- **PANEL-062** — Escape сворачивает развёрнутую запись.

### 20. Доступность (Accessibility)

Каждая Activity Entry ОБЯЗАНА предоставлять: role, accessible name, focus state.

Скринридеры ОБЯЗАНЫ анонсировать состояние разворачивания.

### 21. Производительность

Панель ОБЯЗАНА избегать перерендера неизменившихся записей.

Панель ОБЯЗАНА поддерживать датасеты как минимум из 100 000 записей при использовании с виртуализированным списком.

### 22. Темизация

Панель ОБЯЗАНА использовать CSS custom properties.

Панель НЕ ДОЛЖНА зависеть от Tailwind, Bootstrap или любого другого CSS-фреймворка (согласуется с [`engineering/principles.md`](#engineering-principles) — независимость от фреймворка).

### 23. Интернационализация

Никакие видимые строки не могут быть захардкожены. Все лейблы ОБЯЗАНЫ быть локализуемыми.

Даты ОБЯЗАНЫ форматироваться приложением или сконфигурированным форматтером.

### 24. Чек-лист приёмки

- [ ] Loading State реализован
- [ ] Empty State реализован
- [ ] Error State реализован
- [ ] Inline expansion реализован
- [ ] Search интегрирован
- [ ] Filters интегрированы
- [ ] Навигация с клавиатуры проверена
- [ ] Аудит доступности пройден
- [ ] Бенчмарк производительности пройден
- [ ] Примеры в Storybook завершены
<a id="ui-overview"></a>

## Часть XIII. UI-принципы

### Ключевой вопрос

UI должен отвечать на один вопрос:

> **Что произошло?**

### Иерархия контента

**Первичный контент** (всегда виден):
- action
- changes
- comment

**Вторичный контент** (второстепенен):
- actor
- timestamp
- metadata

### Представление записей

- **Свёрнутая запись** — основное представление по умолчанию.
- **Развёрнутая запись** — раскрывает детали.

### Связь с данными

Поля, отображаемые в UI, соответствуют модели данных Activity Record (см. [`../data-model.md`](#data-model)).

Данные для отображения (Timeline UI, Search, Filters) поступают через [`../query-api.md`](#query-api) и React-слой ([`../react-api.md`](#react-api)).

> **Статус:** принципы согласованы; конкретные компоненты и визуальный дизайн — в работе (см. `../product.md` → «В работе»: UI System).
<a id="engineering-principles"></a>

## Часть XIV. Инженерные принципы

### Developer Experience

Ориентир по ощущению от SDK — **Stripe** и **Prisma**.

#### Цели

- Минимальная настройка (minimal setup)
- Явные API (explicit APIs)
- Предсказуемое поведение
- Полная типизация
- Отличные сообщения об ошибках
- Примеры в стиле copy-paste

#### Чего избегать

- Скрытая магия (hidden magic)
- Глобальное мутируемое состояние
- Избыточная конфигурация
- Ненужные абстракции

### Инженерные принципы

- TypeScript Strict Mode
- Иммутируемые данные
- Композиция вместо наследования
- Явные API
- Local First
- Независимость от базы данных
- Независимость от фреймворка
- Маленький публичный API

### Как это применяется в архитектуре

Эти принципы напрямую реализуются архитектурными решениями из [`../constitution.md`](#constitution):

| Принцип | Архитектурное решение |
|---|---|
| Независимость от БД | ARCH-004, DB-002 (Storage Adapter) |
| Независимость от фреймворка | ARCH-002/ARCH-003 |
| Маленький публичный API | Public API Philosophy (см. [`../public-api.md`](#public-api)) |
| Явные API, без скрытой магии | ARCH-002/ARCH-003 (Engine ≠ React) |
<a id="rfc-readme"></a>

## Часть XV. Процесс RFC

### Когда нужен RFC

Согласно [`../constitution.md`](#constitution) и [`../public-api.md`](#public-api), RFC обязателен для:

- Любого breaking change публичного API (вместе с Migration Guide и Major Version)
- Изменения принятого архитектурного решения (`AD-xxx`)
- Изменения принятого продуктового принципа (`PD-xxx`)
- Разрешения любого открытого вопроса (`OPEN-xxx`)

### Открытые вопросы, ожидающие RFC

Эти вопросы намеренно оставлены нерешёнными до реализации:

| ID | Вопрос | RFC |
|---|---|---|
| OPEN-001 | ✅ Resolved — прямые Activity-инстансы через props, без `ActivityProvider` | [RFC-001](#rfc-001) |
| OPEN-002 | ✅ Resolved — `ActivityPanel` выполняет запросы самостоятельно; обход через Controlled Mode | [RFC-002](#rfc-002) |
| OPEN-003 | ✅ Resolved — V1 использует offset-пагинацию, cursor зарезервирован для V2 | [RFC-003](#rfc-003) |

### Статус

Все три исходных открытых вопроса (OPEN-001, OPEN-002, OPEN-003) решены и зафиксированы в соответствующих RFC и специфицирующих документах (`public-api.md`, `query-api.md`). Реализация (код, тесты) при этом ещё не начата (см. [`../product.md`](#product), раздел «Не начато»).
<a id="rfc-001"></a>

## Часть XV.1. RFC-001 — React Integration Model

- **Статус:** ✅ Resolved (см. [`../public-api.md`](#public-api) §10)
- **Связанный открытый вопрос:** OPEN-001
- **Затрагивает:** [`../react-api.md`](#react-api), [`../engine.md`](#engine), [`../activity-panel.md`](#activity-panel)

### Вопрос

Должен ли React-слой использовать паттерн `ActivityProvider` (React Context), или приложения должны работать напрямую с инстансами Activity Engine?

### Решение

**React-слой использует прямые инстансы `Activity`, а не `ActivityProvider`/контекст.**

Зафиксировано в [`../public-api.md`](#public-api) §10–11:

- React-пакет НЕ ДОЛЖЕН создавать инстансы `Activity` (**PUBAPI-040**) — приложение создаёт инстанс через `createActivity()` вне React.
- Инстанс передаётся явно как prop: `<ActivityPanel activity={activity} .../>` (**PUBAPI-050**, `activity` обязателен).
- `ActivityProvider`-based архитектура явно исключена из v1.0 как Non-Goal (см. [`../public-api.md`](#public-api) §17).

### Контекст

- **ARCH-002/ARCH-003**: Engine владеет бизнес-логикой, React — только рендерингом ([`../constitution.md`](#constitution)) — прямая передача инстанса соответствует этому разделению без добавления неявного React-специфичного состояния.
- **ARCH-002**: Engine не зависит от React — прямые инстансы не создают такой зависимости, тогда как Context/Provider являются более "глубокой" интеграцией.
- Решение здесь напрямую определило ответ на **OPEN-002** — см. [RFC-002](#rfc-002).

### Итог

Вариант «прямые инстансы Engine, передаваемые явно через props» (см. предыдущее обсуждение вариантов) выбран как решение — совпадает с принципом «избегать hidden magic» ([`../engineering/principles.md`](#engineering-principles)).

### Реаффирмация (повторное подтверждение)

Позднее в проект был предложен альтернативный черновик `react-api.md`, вводивший `ActivityProvider` как обязательный компонент (`REACT-001`) и убиравший `activity` prop у `ActivityPanel`. Решение подтверждено повторно, ActivityProvider отклонён: из всех публичных React-компонентов (`ActivityPanel`, `ActivityEntry`, `ActivitySearch`, `ActivityFilters`) доступ к инстансу `Activity` требуется только `ActivityPanel`. При единственном потребителе разделяемый контекст не решает проблему prop-drilling и добавляет необоснованную абстракцию. См. итоговый [`../react-api.md`](#react-api) §4.
<a id="rfc-002"></a>

## Часть XV.2. RFC-002 — Query Execution Model

- **Статус:** ✅ Resolved (см. [`../public-api.md`](#public-api) §11)
- **Связанный открытый вопрос:** OPEN-002
- **Затрагивает:** [`../query-api.md`](#query-api), [`../react-api.md`](#react-api), [`../activity-panel.md`](#activity-panel)

### Вопрос

Должны ли запросы (Search, Filters) выполняться напрямую компонентом `ActivityPanel`, или через отдельный переиспользуемый хук?

### Решение

**`ActivityPanel` самостоятельно выполняет запросы в режиме по умолчанию.** Отдельный обязательный хук для выполнения запроса не предусмотрен в v1.0.

Зафиксировано в [`../public-api.md`](#public-api) §11:

- **PUBAPI-052** — `ActivityPanel` ОБЯЗАН самостоятельно загружать свои данные. Приложения НЕ ДОЛЖНЫ вручную загружать Activity Entries для реализации по умолчанию.
- Обход выполняется через **Controlled Mode** (`entries` prop, **PUBAPI-060**, см. также [`../activity-panel.md`](#activity-panel) §5) — а не через отдельный хук.

### Контекст

- Решение зависело от **OPEN-001** (см. [RFC-001](#rfc-001)) — прямая передача инстанса `Activity` в `ActivityPanel` делает естественным выполнение запроса внутри самого компонента.
- **Сигнал из [`activity-panel.md`](#activity-panel)**, отмеченный ранее в [`query-api.md`](#query-api): наличие controlled-режима через `entries` уже подразумевало этот вариант — теперь это формально закреплено в `public-api.md`.

### Итог

Вариант 1 («логика запроса внутри `ActivityPanel`») выбран как решение — соответствует цели «minimal setup» ([`../engineering/principles.md`](#engineering-principles)); переиспользуемость для кастомного UI обеспечивается через Controlled Mode, а не через выделенный хук.
<a id="rfc-003"></a>

## Часть XV.3. RFC-003 — Pagination Strategy

- **Статус:** ✅ Resolved (см. [`../query-api.md`](#query-api), разделы 9–10)
- **Связанный открытый вопрос:** OPEN-003
- **Затрагивает:** [`../query-api.md`](#query-api), [`../database.md`](#database)

### Вопрос

Должна ли Version 1 поддерживать cursor-based пагинацию, или ограничиться только offset-пагинацией?

### Решение

**Version 1 использует только offset-пагинацию.** Cursor-пагинация зарезервирована для **Version 2**.

Зафиксировано в [`../query-api.md`](#query-api):

- `offset` относится к строкам после фильтрации (**QUERY-120**)
- `limit` применяется после фильтрации и сортировки (**QUERY-121**)
- Storage Adapter может внутренне over-fetch на одну строку для вычисления `hasMore` (**QUERY-122**)

### Обязательство совместимости

Публичный API ОБЯЗАН оставаться совместимым с будущей cursor-реализацией. Приложения не должны полагаться на offset-специфичное поведение сверх того, что описано для Version 1 — иначе миграция на cursor в V2 будет для них breaking change.

### Контекст (сохранено из исходного обсуждения)

- Search и Filters входят в scope V1 ([`../product.md`](#product)) — пагинация напрямую влияет на их реализацию.
- Cursor-пагинация обычно требует индексируемого монотонного ключа; offset — проще для V1, но хуже масштабируется при параллельной записи. Для V1 выбрана offset-пагинация с явным заделом на переход к cursor в V2, чтобы не блокировать разработку сейчас.

---

<a id="colophon"></a>

## Колофон

**Activity Platform — Полная спецификация**, версия 1.0, собрана из 18 отдельных документов проекта (Constitution, Product, Data Model, Tracking API — Accepted; Public API, Engine, Pipeline, Storage, Database, Query API, React API, ActivityPanel, UI Overview, Engineering Principles — Draft; три RFC — Resolved).

**Что было сделано при сборке в единый документ:**

- Уровни заголовков всех исходных файлов сдвинуты на один уровень вниз (H1 → H2 и т.д.), чтобы встроить их в сквозную иерархию книги.
- Все межфайловые markdown-ссылки заменены на внутренние якоря одного документа.
- Разрешены три коллизии идентификаторов требований между Accepted-документами (`PROD-xxx`, `API-xxx`, `DB-xxx`) путём переименования с открытым указанием факта переименования — см. Часть I, §15 (реестр префиксов).
- Ни одно требование, инвариант или архитектурное решение не изменено по существу в процессе сборки.

**Открытые вопросы, оставленные как есть (не решены при сборке, требуют внимания разработчиков):**

1. Custom Actions typing resolved by root-level `SPEC_CLARIFICATIONS.md` §2: `Action = BuiltInAction | (string & {})`.
2. Трактовка `PROD-003` («MVP ровно для одного бизнес-ресурса») — архитектурное ограничение или scope демо-приложения (Часть I, §4).
3. Трактовка `UI-001` («интерфейс по умолчанию — compact») — визуальная плотность варианта `"default"` или переименование enum-значения (Часть I, §8).

*Конец документа.*
