# SUKAAA — Railway + PostgreSQL

## Marginalia

`marginalia.html` теперь хранит список дел в PostgreSQL через API:

- `GET /api/storage?keys=marginalia_tasks_v2`
- `POST /api/storage`

Ключ `marginalia_tasks_v2` содержит JSON-массив задач.

При первом открытии Marginalia:
1. существующие задачи из PostgreSQL загружаются;
2. если остались старые задачи в localStorage — они один раз переносятся в PostgreSQL;
3. если данных нет — создаются стартовые задачи и сохраняются в PostgreSQL.

## Railway

1. Добавь в проект PostgreSQL через **New → Database → Add PostgreSQL**.
2. Подключи PostgreSQL к `SUKAAA`, чтобы сервис получил `DATABASE_URL`.
3. Сделай Redeploy.
4. Не задавай порт вручную: сервер использует `process.env.PORT`.

`/health` возвращает состояние приложения.
