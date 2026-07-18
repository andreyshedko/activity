# React API

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](./constitution.md), [`product.md`](./product.md), [`data-model.md`](./data-model.md), [`tracking-api.md`](./tracking-api.md), [`public-api.md`](./public-api.md), [`activity-panel.md`](./activity-panel.md)

## 1. Назначение

Определяет полный публичный React API.

Эта спецификация определяет каждый публичный React-компонент. Она не определяет детали реализации рендеринга.

## 2. Разделение ответственности

Согласно **ARCH-002/ARCH-003** (см. [`constitution.md`](./constitution.md)):

- Engine владеет бизнес-логикой.
- React владеет только рендерингом.

React-пакет (`@activity/react`, см. [`public-api.md`](./public-api.md) §3) — тонкий слой поверх Engine, не содержащий собственной бизнес-логики.

## 3. Цели дизайна

React API ОБЯЗАН:

- требовать минимальной конфигурации
- быть полностью типизированным
- быть tree-shakeable
- работать в SSR
- работать в CSR
- работать в React Server Components, где это возможно

> **Замечание по RSC:** передача уже созданного инстанса `Activity` через границу server/client в RSC требует отдельной стратегии сериализации на уровне реализации `@activity/react` (например, создание/восстановление инстанса на клиенте). Это техническая деталь реализации компонента, а не изменение архитектурного решения из раздела 4 — фиксировать отдельным RFC на этом этапе не требуется.

## 4. Модель интеграции (решено)

**React-слой использует прямые инстансы `Activity`, передаваемые явно через props — без `ActivityProvider`/контекста.**

Это решение **OPEN-001**, зафиксированное в [`public-api.md`](./public-api.md) §10 и [`rfc/RFC-001-react-integration.md`](./rfc/RFC-001-react-integration.md):

- React-пакет НЕ ДОЛЖЕН создавать инстансы `Activity` (**PUBAPI-040**).
- Приложение создаёт инстанс через `createActivity()` (см. [`public-api.md`](./public-api.md) §5) вне React и передаёт его явно.
- `ActivityProvider`-based архитектура исключена как Non-Goal v1.0 (см. [`public-api.md`](./public-api.md) §17).

**Почему не Context/Provider:** из компонентов, описанных в этом документе, к инстансу `Activity` обращается только `ActivityPanel` (см. §6 ниже — он самостоятельно выполняет запросы, **PUBAPI-052**). `ActivityEntry`, `ActivitySearch` и `ActivityFilters` — чисто презентационные/controlled компоненты и не нуждаются в Engine вовсе (см. §7–9). Поскольку доступ к инстансу нужен ровно одному компоненту, разделяемый контекст не решает здесь никакой реальной проблемы prop-drilling и был бы избыточной абстракцией (противоречит [`engineering/principles.md`](./engineering/principles.md) — «avoid hidden magic», «avoid unnecessary abstractions»).

## 5. Публичные компоненты

Version 1.0 экспортирует:

- `ActivityPanel`
- `ActivityEntry`
- `ActivitySearch`
- `ActivityFilters`

`ActivityProvider` **не входит** в публичный API v1.0 (см. раздел 4 выше).

## 6. `ActivityPanel`

Полностью специфицирован в [`activity-panel.md`](./activity-panel.md) и в [`public-api.md`](./public-api.md) §11–12.

Обязательные props: `activity`, `resource` (**PUBAPI-050/051**). `ActivityPanel` самостоятельно выполняет запросы по умолчанию; Controlled Mode — через `entries` (**PUBAPI-052/060**, решение **OPEN-002**).

`ActivityPanel` МОЖЕТ принимать `search`/`filters` как controlled props (см. [`activity-panel.md`](./activity-panel.md) §5) — значения для них может поставлять `ActivitySearch`/`ActivityFilters` (см. §8–9 ниже), но эти компоненты не обязаны использоваться вместе с `ActivityPanel`.

`expandedEntryId` и `onExpandedEntryChange` образуют опциональную controlled-модель
detail view. Приложение может хранить ID выбранной записи в URL и тем самым
реализовать deep links без зависимости Activity от конкретного роутера. Если
`expandedEntryId` не передан, каждая запись управляет раскрытием локально.

## 7. `ActivityEntry`

**Назначение:** отрендерить одну Activity Entry.

```tsx
<ActivityEntry
    entry={entry}
/>
```

Не требует доступа к `Activity` — получает данные напрямую через prop `entry`.

**Требования:**

- **REACT-020** — `ActivityEntry` ОБЯЗАН рендерить неизменяемые данные (согласуется с **MODEL-006**, см. [`data-model.md`](./data-model.md)).
- **REACT-021** — `ActivityEntry` ОБЯЗАН поддерживать inline-разворачивание.
- **REACT-022** — Collapsed-режим ОБЯЗАН отображать не более трёх изменений полей.
- **REACT-023** — Expanded-режим ОБЯЗАН отображать все изменения полей.

Это тот же рендеринг, что уже детально описан в [`activity-panel.md`](./activity-panel.md) §11–15 (Entry Expansion, Update/Content/Lifecycle Entry Rendering, **PANEL-040…051**) — `ActivityEntry` является выделенным публичным компонентом для одной записи, а `ActivityPanel` рендерит массив таких записей (см. «Правила рендеринга», раздел 10 ниже).

> **Замечание об именовании:** тип данных `ActivityEntry` уже объявлен как публичный тип в [`public-api.md`](./public-api.md) §13 (данные записи). Компонент `<ActivityEntry>` — одноимённый React-компонент из `@activity/react`. Они находятся в разных пакетах (`@activity/core` vs `@activity/react`) и разных TS-неймспейсах (тип vs значение), поэтому конфликта в спецификации нет, но при одновременном импорте из обоих пакетов потребителю стоит быть внимательным к алиасам импорта.

## 8. `ActivitySearch`

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

Значение из `onChange` естественно передаётся в `search` prop `ActivityPanel` (см. [`activity-panel.md`](./activity-panel.md) §16 — изменение search обязано перезагружать записи; debounce не навязывается панелью).

## 9. `ActivityFilters`

**Назначение:** отображение элементов управления фильтрами.

Поддерживаемые фильтры: Action, Actor, Date Range.

**Требования:**

- **REACT-040** — Фильтры ОБЯЗАНЫ быть controlled-компонентами.
- **REACT-041** — Состояние фильтров ОБЯЗАНО быть сериализуемым.

Результат передаётся в `filters` prop `ActivityPanel` (см. [`activity-panel.md`](./activity-panel.md) §17 — изменение фильтров обязано инициировать новый запрос и сохранять текст поиска).

## 10. Правила рендеринга

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

Соответствует разделению видов записи в [`activity-panel.md`](./activity-panel.md) §13–15.

## 11. Стилизация

Публичный API НЕ ДОЛЖЕН требовать CSS-фреймворков (согласуется с [`activity-panel.md`](./activity-panel.md) §22 и [`engineering/principles.md`](./engineering/principles.md)).

Потребители МОГУТ использовать: обычный CSS, CSS Modules, Tailwind, CSS Variables — на своё усмотрение.

## 12. Темизация

Тема ОБЯЗАНА использовать CSS-переменные.

Публичный API НЕ ДОЛЖЕН экспонировать цветовые константы.

`ActivityPanel` принимает `theme="light" | "dark" | "system"`. Значение по
умолчанию — `light`; `system` следует медиа-запросу `prefers-color-scheme`.
Активная тема отражается в атрибуте `data-activity-theme`, а потребитель МОЖЕТ
переопределить публичные CSS-переменные `--activity-*` без замены компонентов.

## 13. Серверный рендеринг

Библиотека компонентов ОБЯЗАНА поддерживать: SSR, Streaming, Hydration (см. также замечание по RSC в разделе 3).

## 14. Доступность

Все интерактивные компоненты ОБЯЗАНЫ:

- поддерживать навигацию с клавиатуры
- предоставлять ARIA-лейблы
- предоставлять видимый focus

Согласуется с [`activity-panel.md`](./activity-panel.md) §19–20.

## 15. Обработка ошибок

Ошибки рендеринга НЕ ДОЛЖНЫ приводить к падению приложения.

Ошибки ОБЯЗАНЫ быть изолированы в рамках затронутого компонента.

## 16. Приёмка

- ✓ Полностью типизировано
- ✓ SSR-совместимо
- ✓ Tree-shakeable
- ✓ Доступно (accessible)
- ✓ Темизируемо
- ✓ Без рантайм-предупреждений React

> **Статус:** модель интеграции React решена (OPEN-001, OPEN-002 закрыты, `ActivityProvider` исключён из публичного API). Публичные компоненты специфицированы: `ActivityPanel` (детально в `activity-panel.md`), `ActivityEntry`, `ActivitySearch`, `ActivityFilters`. Остаётся реализация (код, тесты).
