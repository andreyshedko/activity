# RFC Process

## Когда нужен RFC

Согласно [`../constitution.md`](../constitution.md) и [`../public-api.md`](../public-api.md), RFC обязателен для:

- Любого breaking change публичного API (вместе с Migration Guide и Major Version)
- Изменения принятого архитектурного решения (`AD-xxx`)
- Изменения принятого продуктового принципа (`PD-xxx`)
- Разрешения любого открытого вопроса (`OPEN-xxx`)

## Открытые вопросы, ожидающие RFC

Эти вопросы намеренно оставлены нерешёнными до реализации:

| ID | Вопрос | RFC |
|---|---|---|
| OPEN-001 | ✅ Resolved — прямые Activity-инстансы через props, без `ActivityProvider` | [RFC-001](./RFC-001-react-integration.md) |
| OPEN-002 | ✅ Resolved — `ActivityPanel` выполняет запросы самостоятельно; обход через Controlled Mode | [RFC-002](./RFC-002-query-execution-model.md) |
| OPEN-003 | ✅ Resolved — V1 использует offset-пагинацию, cursor зарезервирован для V2 | [RFC-003](./RFC-003-pagination-strategy.md) |

## Статус

Все три исходных открытых вопроса (OPEN-001, OPEN-002, OPEN-003) решены и зафиксированы в соответствующих RFC и специфицирующих документах (`public-api.md`, `query-api.md`). Реализация (код, тесты) при этом ещё не начата (см. [`../product.md`](../product.md), раздел «Не начато»).
