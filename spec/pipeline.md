# Pipeline

## Все write-операции проходят через Pipeline

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

## Шаги Pipeline

| Шаг | Назначение |
|---|---|
| **Track Request** | Входная точка — приложение сообщает Engine о произошедшем действии |
| **Validation** | Проверка соответствия входных данных инвариантам модели данных (см. [`data-model.md`](./data-model.md)) |
| **Normalization** | Приведение данных к каноническому внутреннему представлению |
| **Enrichment** | Дополнение записи метаданными (например, контекст Actor'а) |
| **Middleware** | Точка расширения для пользовательской логики приложения |
| **Persistence** | Сохранение через Storage Adapter (см. [`storage.md`](./storage.md)); Engine никогда не пишет в БД напрямую (ARCH-005) |
| **Events** | Эмиссия событий после успешной записи, для подписчиков вне Engine |

## Инварианты, обеспечиваемые Pipeline

Pipeline — механизм, которым обеспечиваются продуктовые принципы из [`constitution.md`](./constitution.md):

- **PROD-005**: одно пользовательское действие → ровно одна Activity Record (агрегация происходит до/во время Validation/Normalization, а не на уровне БД).
- **PROD-006**: Pipeline работает с бизнес-действиями, а не с SQL-операциями.
- **MODEL-006**: Persistence — только append; Pipeline не предоставляет пути для модификации существующих записей.

> **Статус:** структура Pipeline специфицирована на двух уровнях. Этот документ описывает высокоуровневый поток (см. **ARCH-001** в `constitution.md`). Детальная реализация каждой стадии — включая внутренние сервисы (ValidationService, NormalizationService, EntryFactory и др.), точный контракт Middleware, обработку ошибок и extension points — специфицирована в [`engine.md`](./engine.md) §6–14.
