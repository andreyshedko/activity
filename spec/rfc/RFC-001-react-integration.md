# RFC-001: React Integration Model

- **Статус:** ✅ Resolved (см. [`../public-api.md`](../public-api.md) §10)
- **Связанный открытый вопрос:** OPEN-001
- **Затрагивает:** [`../react-api.md`](../react-api.md), [`../engine.md`](../engine.md), [`../activity-panel.md`](../activity-panel.md)

## Вопрос

Должен ли React-слой использовать паттерн `ActivityProvider` (React Context), или приложения должны работать напрямую с инстансами Activity Engine?

## Решение

**React-слой использует прямые инстансы `Activity`, а не `ActivityProvider`/контекст.**

Зафиксировано в [`../public-api.md`](../public-api.md) §10–11:

- React-пакет НЕ ДОЛЖЕН создавать инстансы `Activity` (**PUBAPI-040**) — приложение создаёт инстанс через `createActivity()` вне React.
- Инстанс передаётся явно как prop: `<ActivityPanel activity={activity} .../>` (**PUBAPI-050**, `activity` обязателен).
- `ActivityProvider`-based архитектура явно исключена из v1.0 как Non-Goal (см. [`../public-api.md`](../public-api.md) §17).

## Контекст

- **ARCH-002/ARCH-003**: Engine владеет бизнес-логикой, React — только рендерингом ([`../constitution.md`](../constitution.md)) — прямая передача инстанса соответствует этому разделению без добавления неявного React-специфичного состояния.
- **ARCH-002**: Engine не зависит от React — прямые инстансы не создают такой зависимости, тогда как Context/Provider являются более "глубокой" интеграцией.
- Решение здесь напрямую определило ответ на **OPEN-002** — см. [RFC-002](./RFC-002-query-execution-model.md).

## Итог

Вариант «прямые инстансы Engine, передаваемые явно через props» (см. предыдущее обсуждение вариантов) выбран как решение — совпадает с принципом «избегать hidden magic» ([`../engineering/principles.md`](../engineering/principles.md)).

## Реаффирмация (повторное подтверждение)

Позднее в проект был предложен альтернативный черновик `react-api.md`, вводивший `ActivityProvider` как обязательный компонент (`REACT-001`) и убиравший `activity` prop у `ActivityPanel`. Решение подтверждено повторно, ActivityProvider отклонён: из всех публичных React-компонентов (`ActivityPanel`, `ActivityEntry`, `ActivitySearch`, `ActivityFilters`) доступ к инстансу `Activity` требуется только `ActivityPanel`. При единственном потребителе разделяемый контекст не решает проблему prop-drilling и добавляет необоснованную абстракцию. См. итоговый [`../react-api.md`](../react-api.md) §4.
