# Constitution

> **Status:** ✅ Accepted
> **Version:** 1.0.0
> **Last Updated:** 2026-07-06

## 1. Назначение

Этот документ определяет инженерные, продуктовые и архитектурные правила, управляющие всем проектом.

Каждая спецификация, RFC, реализация и pull request ОБЯЗАНЫ соответствовать этому документу.

**Если другая спецификация конфликтует с этим документом, приоритет имеет этот документ.**

## 2. Scope

Этот документ определяет:

- инженерные принципы
- продуктовые принципы
- правила документации
- архитектурные правила
- правила ревью

Он не определяет детали реализации.

## 3. Терминология

Ключевые слова **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY** трактуются согласно RFC 2119.

## 4. Продуктовые правила

- **PROD-001** *(Critical)* — Проект ОБЯЗАН решать одну бизнес-проблему. Каждая фича ОБЯЗАНА поддерживать эту проблему. *(Verification: Architecture Review)*
- **PROD-002** *(Critical)* — Первый публичный продукт ОБЯЗАН быть Activity History. *(Verification: Architecture Review)*
- **PROD-003** *(Critical)* — MVP ОБЯЗАН поддерживать Activity History ровно для одного бизнес-ресурса (примеры: Invoice, Customer, Contract, Ticket, Task, Project). *(Verification: Architecture Review)*
- **PROD-004** *(Critical)* — Глобальная activity-лента НЕ ДОЛЖНА быть реализована в MVP. *(Verification: Feature Review)*
- **PROD-005** *(Critical)* — Одна пользовательская операция ОБЯЗАНА производить одну Activity Entry. *(Verification: Integration Test)*
- **PROD-006** *(High)* — Activity ОБЯЗАНА представлять пользовательские действия. Activity НЕ ДОЛЖНА представлять SQL-операции. *(Verification: UX Review)*

> **Примечание о трактовке PROD-003:** формулировка допускает два прочтения — (а) SDK архитектурно ограничен одним типом Resource, или (б) референсное MVP-приложение/демо демонстрирует Activity History на примере одного типа ресурса, не ограничивая при этом сам SDK. Второе прочтение согласуется с остальной спецификацией: `Resource.type` объявлен application-defined (см. [`data-model.md`](./data-model.md) §RESOURCE-001), схема БД хранит `resource_type` как обычную колонку без ограничения на одно значение (см. [`database.md`](./database.md)), а формулировка `Resource` в продуктовой философии перечисляет сразу несколько примеров (Invoice, Customer, Contract...) как равноправные. Здесь принято прочтение (б); если имелось в виду (а), это требует отдельного RFC, так как затрагивает уже принятые решения в `data-model.md` и `database.md`.

> **Примечание о нумерации:** в отдельном документе `product.md` также используется префикс `PROD-xxx`, но для другого набора требований (функциональные требования к Activity Entry, а не продуктовые governance-правила). Чтобы избежать коллизии идентификаторов между двумя Accepted-документами, функциональные требования `product.md` переименованы в этой спецификации в `FUNC-xxx` — см. [`product.md`](./product.md) §5.

## 5. Архитектурные правила

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

> Детальная реализация этих правил — в [`engine.md`](./engine.md) (framework independence, стадии pipeline) и [`storage.md`](./storage.md) (контракт `StorageAdapter`).

## 6. Правила хранения

- **DB-001** — PostgreSQL ОБЯЗАН быть storage-реализацией по умолчанию. *(Verification: Architecture Review)*
- **DB-002** — Storage ОБЯЗАН быть заменяемым. *(Verification: Architecture Review)*
- **DB-003** — Хостируемый облачный сервис НЕ ДОЛЖЕН быть обязательным требованием. *(Verification: Manual Review)*

> **Примечание о нумерации:** документ [`database.md`](./database.md) также использует префикс `DB-xxx`, но для ограничений канонической схемы (первичные ключи, nullability и т.д.) — другой набор требований. Во избежание коллизии эти требования переименованы в `SCHEMA-xxx` — см. [`database.md`](./database.md) §4–5.

## 7. Правила API

- **API-001** — Публичные API ОБЯЗАНЫ оставаться стабильными, когда это возможно. *(Verification: Code Review)*
- **API-002** — Breaking changes ОБЯЗАНЫ включать migration guide. *(Verification: Documentation Review)*
- **API-003** — Каждый публичный API ОБЯЗАН включать минимум один рабочий пример. *(Verification: Documentation Review)*

> **Примечание о нумерации:** документ [`public-api.md`](./public-api.md) также использует префикс `API-xxx` для собственных детальных требований (`createActivity`, `track`, `query`, `ActivityPanel`). Во избежание коллизии с этими тремя governance-правилами требования `public-api.md` переименованы в `PUBAPI-xxx` — см. [`public-api.md`](./public-api.md).

## 8. Правила UI

- **UI-001** — Интерфейс Activity по умолчанию ОБЯЗАН использовать компактную (compact) плотность вёрстки. *(Verification: Storybook Review)*
- **UI-002** — Metadata ОБЯЗАНА отображаться после первичного контента. *(Verification: Storybook Review)*
- **UI-003** — Свёрнутые Activity Entries ОБЯЗАНЫ отображать не более трёх изменений полей. *(Verification: Snapshot Test)*
- **UI-004** — Развёрнутые Activity Entries ОБЯЗАНЫ разворачиваться inline. Модальные диалоги НЕ ДОЛЖНЫ использоваться. *(Verification: Storybook Review)*

> **Согласование с `activity-panel.md`:** `ActivityPanel` определяет проп `variant` со значениями `"default" | "compact" | "comfortable"`, где `"default"` — значение по умолчанию (см. [`activity-panel.md`](./activity-panel.md) §5). **UI-001** трактуется как требование к *визуальной плотности* самого варианта `"default"` (он должен выглядеть компактно), а не как переименование enum-значения в `"compact"` — иначе `"compact"` как отдельное значение варианта стало бы избыточным. Если имелось в виду именно переименование значения по умолчанию, это отдельное решение, требующее обновления `activity-panel.md` и `public-api.md` через RFC.

## 9. Правила производительности

- **PERF-001** — Списки, содержащие 100 000 Activity Entries, ОБЯЗАНЫ оставаться пригодными для использования. *(Verification: Performance Benchmark)*
- **PERF-002** — Большие списки ОБЯЗАНЫ использовать виртуализацию. *(Verification: Code Review)*
- **PERF-003** — Оптимизации производительности ОБЯЗАНЫ основываться на измерениях. *(Verification: Performance Report)*

> Согласуется с целевыми показателями в [`database.md`](./database.md) §15, [`storage.md`](./storage.md) §12, [`activity-panel.md`](./activity-panel.md) §21 и [`query-api.md`](./query-api.md) §14.

## 10. Доступность

- **A11Y-001** — Каждый интерактивный элемент ОБЯЗАН быть доступен с клавиатуры. *(Verification: Accessibility Audit)*
- **A11Y-002** — Видимый фокус клавиатуры ОБЯЗАН присутствовать. *(Verification: Accessibility Audit)*
- **A11Y-003** — Приложение ОБЯЗАНО удовлетворять **WCAG AA**. *(Verification: Accessibility Audit)*

> **Новое по сравнению с предыдущими черновиками:** явный стандарт **WCAG AA** ранее нигде не был зафиксирован ([`activity-panel.md`](./activity-panel.md) §20 и [`react-api.md`](./react-api.md) §14 говорили о доступности в общих терминах, без указания конкретного уровня соответствия). Это уточнение, а не конфликт — оба документа теперь наследуют этот стандарт по ссылке на `constitution.md`.

## 11. Документация

- **DOC-001** — Каждый экспортируемый символ ОБЯЗАН включать документацию. *(Verification: Code Review)*
- **DOC-002** — Каждая публичная фича ОБЯЗАНА включать пример. *(Verification: Documentation Review)*

## 12. Тестирование

- **TEST-001** — Каждый исправленный дефект ОБЯЗАН производить регрессионный тест. *(Verification: Code Review)*
- **TEST-002** — Публичное поведение ОБЯЗАНО быть протестировано. *(Verification: Test Review)*

## 13. Инженерия

- **ENG-001** — TypeScript strict mode ОБЯЗАН оставаться включённым. *(Verification: CI)*
- **ENG-002** — Тип `any` НЕ ДОЛЖЕН использоваться. Исключения ОБЯЗАНЫ быть задокументированы. *(Verification: ESLint)*
- **ENG-003** — Файлы ДОЛЖНЫ (SHOULD) оставаться до 300 строк. Файлы свыше 500 строк ОБЯЗАНЫ быть отрефакторены. *(Verification: Code Review)*
- **ENG-004** — Функции ДОЛЖНЫ (SHOULD) оставаться до 50 строк. Функции свыше 100 строк ОБЯЗАНЫ быть обоснованы. *(Verification: Code Review)*

## 14. Процесс принятия решений

- **DEC-001** — Каждое архитектурное изменение ОБЯЗАНО ссылаться на RFC. *(Verification: Pull Request Review)*
- **DEC-002** — Каждая реализация ОБЯЗАНА ссылаться минимум на один Requirement ID (например: «Implements: UI-003, PUBAPI-002»). *(Verification: Pull Request Review)*

Процесс RFC описан в [`rfc/README.md`](./rfc/README.md).

## 15. Реестр префиксов Requirement ID

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

## 16. AI Instructions

Каждый AI-ассистент, присоединяющийся к проекту, ОБЯЗАН:

1. Прочитать этот документ первым.
2. Прочитать [`product.md`](./product.md).
3. Прочитать [`rfc/`](./rfc/README.md).
4. Прочитать [`public-api.md`](./public-api.md).
5. Никогда не изобретать архитектуру, не описанную в спецификациях.
6. Никогда не обходить Engine (**ARCH-003**).
7. Никогда не обходить Storage Adapter (**ARCH-004**).
8. Никогда не изменять принятые архитектурные решения без RFC (**DEC-001**).

## 17. Приёмка

Эта спецификация принята, когда:

- ✓ Не существует конфликтующих спецификаций
- ✓ Все Requirement ID уникальны (см. реестр §15)
- ✓ Перекрёстные ссылки валидны
- ✓ Ревью завершено
