# Engine

> **Status:** Draft
> **Version:** 1.0.0
> **Depends on:** [`constitution.md`](./constitution.md), [`product.md`](./product.md), [`public-api.md`](./public-api.md), [`data-model.md`](./data-model.md)

## 1. Назначение

Определяет внутреннюю архитектуру Activity Engine.

Engine отвечает за обработку, сохранение и запрос Activity Entries.

Engine — единственный слой, которому разрешено взаимодействовать со Storage Adapters (**ARCH-004**, см. [`constitution.md`](./constitution.md)).

Engine не зависит от:

- React
- PostgreSQL
- Prisma
- Drizzle
- Next.js
- Express

Это расширяет **ARCH-002** ([`constitution.md`](./constitution.md)) конкретным списком фреймворков/библиотек.

## 2. Scope документа

Эта спецификация определяет:

- обязанности Engine
- pipeline обработки
- внутренние сервисы
- точки расширения
- жизненный цикл

Она **не** определяет:

- схему базы данных (см. [`database.md`](./database.md))
- React-компоненты (см. [`react-api.md`](./react-api.md), [`activity-panel.md`](./activity-panel.md))
- рендеринг UI, CSS
- публичный SDK как таковой (см. [`public-api.md`](./public-api.md))

## 3. Цели дизайна

Engine ОБЯЗАН быть:

- независимым от фреймворка
- независимым от storage
- детерминированным
- полностью типизированным
- тестируемым без базы данных

## 4. Архитектура

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

Это детализирует Pipeline (см. [`pipeline.md`](./pipeline.md)) на уровне Engine: шаги Pipeline из `pipeline.md` — это стадии, реализуемые внутри Engine (раздел 6 ниже).

## 5. Обязанности

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

## 6. Pipeline обработки

Каждая операция `track()` ОБЯЗАНА выполнять следующие стадии по порядку. Это детальная реализация высокоуровневого Pipeline из [`pipeline.md`](./pipeline.md).

### Stage 1 — Validation

- Вход: `TrackInput`
- Выход: `ValidatedTrackInput`

Обязанности:
- обязательные поля
- валидация enum
- логическая валидация
- валидация resource
- валидация action

Stage Validation НЕ ДОЛЖЕН модифицировать вход.

### Stage 2 — Normalization

Обязанности:
- нормализация имён полей
- нормализация типов значений
- нормализация дат
- нормализация идентификаторов

Результат ОБЯЗАН быть детерминированным.

### Stage 3 — Enrichment

Обязанности:
- генерация id `ActivityEntry`
- генерация timestamp (если не передан)
- генерация version
- прикрепление metadata
- вычисление derived-полей

Значения, предоставленные пользователем, ОБЯЗАНЫ иметь приоритет, если явно не запрещено обратное.

### Stage 4 — Middleware

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

### Stage 5 — Persistence

Engine вызывает ровно один Storage Adapter.

Storage Adapter получает полностью сконструированный `ActivityEntry`.

Persistence НЕ ДОЛЖЕН выполнять бизнес-валидацию (она уже выполнена на Stage 1).

Соответствует **ARCH-004**: Engine взаимодействует с данными только через Storage Adapter (см. [`storage.md`](./storage.md), [`database.md`](./database.md)).

### Stage 6 — Events

Lifecycle-события эмитируются после успешной персистентности.

Поддерживаемые события:
- `beforeTrack`
- `afterTrack`
- `trackFailed`

Слушатели событий НЕ ДОЛЖНЫ влиять на персистентные данные.

Сбои в слушателях событий НЕ ДОЛЖНЫ откатывать персистентность.

## 7. Внутренние сервисы

| Сервис | Ответственность |
|---|---|
| **ValidationService** | Валидация `TrackInput` |
| **NormalizationService** | Формирование канонических представлений |
| **EntryFactory** | Создание неизменяемых объектов `ActivityEntry` |
| **Pipeline** | Координация стадий выполнения |
| **StorageService** | Делегирование персистентности `StorageAdapter` |
| **QueryService** | Делегирование операций чтения |
| **EventDispatcher** | Диспетчеризация lifecycle-событий |

## 8. Query Flow

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

> Это высокоуровневая версия детального 11-шагового Execution Order из [`query-api.md`](./query-api.md) §4 (Validate → Normalize → Resolve resource → apply filters → search → sort → paginate → map → return). `query-api.md` — источник истины для детальной семантики запроса; данный раздел описывает, где эти шаги физически происходят относительно Storage Adapter.

## 9. Иммутабельность

Все объекты `ActivityEntry` ОБЯЗАНЫ быть неизменяемыми.

Engine НЕ ДОЛЖЕН модифицировать персистентные записи.

Обновления создают новые Activity Entries. История — append-only.

Соответствует **MODEL-006** ([`data-model.md`](./data-model.md)) и реализуется на уровне схемы в [`database.md`](./database.md) §11.

## 10. Обработка ошибок

Engine предоставляет типизированные ошибки:

- `ValidationError`
- `StorageError`
- `ConfigurationError`

Неизвестные исключения НЕ ДОЛЖНЫ выходить за пределы публичного API в неизменном виде.

> Соотносится с кодами ошибок Query API ([`query-api.md`](./query-api.md) §15: `INVALID_RESOURCE`, `STORAGE_FAILURE` и т.д.) — те коды относятся к операциям чтения, эти типы ошибок — к операциям записи (`track()`).

## 11. Точки расширения

Version 1.0 поддерживает:

- кастомный `StorageAdapter`
- кастомный `Middleware`
- кастомные `Actions` (см. [`data-model.md`](./data-model.md) — приложения могут регистрировать Actions сверх встроенных)
- кастомные типы `Resource`

Будущие версии МОГУТ поддерживать:

- сериализаторы
- шифрование
- realtime-адаптеры
- telemetry-плагины

## 12. Потокобезопасность

Engine ОБЯЗАН поддерживать конкурентные операции.

Изменяемое глобальное состояние не допускается (согласуется с [`engineering/principles.md`](./engineering/principles.md) — «избегать global mutable state»).

## 13. Производительность

Engine ОБЯЗАН избегать ненужных аллокаций.

Engine ОБЯЗАН избегать глубокого клонирования неизменяемых объектов.

Engine ОБЯЗАН обрабатывать Activity Entries за O(n) относительно числа изменений полей.

## 14. Требования к тестированию

Каждая стадия pipeline ОБЯЗАНА иметь изолированные unit-тесты.

End-to-end тесты ОБЯЗАНЫ проверять полный pipeline обработки.

Тесты Storage Adapter ОБЯЗАНЫ быть переиспользуемыми между реализациями (полезно при появлении новых адаптеров, см. [`storage.md`](./storage.md), [`database.md`](./database.md) §17).

## 15. Чек-лист приёмки

- [ ] Validation pipeline реализован
- [ ] Normalization реализована
- [ ] Enrichment реализован
- [ ] Middleware реализован
- [ ] Persistence реализована
- [ ] Event dispatch реализован
- [ ] Unit-тесты завершены
- [ ] Интеграционные тесты завершены
- [ ] Публичный API не изменился

## 16. Открытые вопросы

Связь Engine с React-слоем была предметом открытого вопроса **OPEN-001**. Он решён — см. [`rfc/RFC-001-react-integration.md`](./rfc/RFC-001-react-integration.md) и [`public-api.md`](./public-api.md) §10: React-слой использует прямые инстансы `Activity`, без `ActivityProvider`. Сам Engine, согласно разделу 1 выше, остаётся framework-independent — это решение касалось исключительно способа интеграции со стороны React.

> **Статус:** внутренняя архитектура Engine специфицирована (pipeline из 6 стадий, внутренние сервисы, query flow, error handling, extension points). Открытых архитектурных вопросов не осталось.
