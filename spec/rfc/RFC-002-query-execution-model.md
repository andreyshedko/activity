# RFC-002: Query Execution Model

- **Статус:** ✅ Resolved (см. [`../public-api.md`](../public-api.md) §11)
- **Связанный открытый вопрос:** OPEN-002
- **Затрагивает:** [`../query-api.md`](../query-api.md), [`../react-api.md`](../react-api.md), [`../activity-panel.md`](../activity-panel.md)

## Вопрос

Должны ли запросы (Search, Filters) выполняться напрямую компонентом `ActivityPanel`, или через отдельный переиспользуемый хук?

## Решение

**`ActivityPanel` самостоятельно выполняет запросы в режиме по умолчанию.** Отдельный обязательный хук для выполнения запроса не предусмотрен в v1.0.

Зафиксировано в [`../public-api.md`](../public-api.md) §11:

- **PUBAPI-052** — `ActivityPanel` ОБЯЗАН самостоятельно загружать свои данные. Приложения НЕ ДОЛЖНЫ вручную загружать Activity Entries для реализации по умолчанию.
- Обход выполняется через **Controlled Mode** (`entries` prop, **PUBAPI-060**, см. также [`../activity-panel.md`](../activity-panel.md) §5) — а не через отдельный хук.

## Контекст

- Решение зависело от **OPEN-001** (см. [RFC-001](./RFC-001-react-integration.md)) — прямая передача инстанса `Activity` в `ActivityPanel` делает естественным выполнение запроса внутри самого компонента.
- **Сигнал из [`activity-panel.md`](../activity-panel.md)**, отмеченный ранее в [`query-api.md`](../query-api.md): наличие controlled-режима через `entries` уже подразумевало этот вариант — теперь это формально закреплено в `public-api.md`.

## Итог

Вариант 1 («логика запроса внутри `ActivityPanel`») выбран как решение — соответствует цели «minimal setup» ([`../engineering/principles.md`](../engineering/principles.md)); переиспользуемость для кастомного UI обеспечивается через Controlled Mode, а не через выделенный хук.
