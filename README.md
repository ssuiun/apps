# SUKAAA — Railway + PostgreSQL

Проект подготовлен для Railway с одной общей PostgreSQL-базой.

## Что внутри
- `server.js` — Node.js сервер + API + PostgreSQL
- `railway-sync.js` — синхронизация выбранных данных страниц с PostgreSQL
- `index.html`, `visa.html`, `kadr.html`, `akt.html`, `marginalia.html`
- `package.json` — запуск и зависимость `pg`

## Настройка в Railway
1. Задеплой этот проект.
2. В том же Railway Project добавь **PostgreSQL**: `New` → `Database` → `Add PostgreSQL`.
3. Убедись, что переменная `DATABASE_URL` доступна сервису `SUKAAA`. Если Railway не добавил её автоматически, в Variables создай ссылку на `Postgres.DATABASE_URL`.
4. Сделай Redeploy `SUKAAA`.
5. В Deploy Logs должны появиться строки:
   - `PostgreSQL connected and app_storage is ready.`
   - `Server listening on http://0.0.0.0:PORT`
6. В Settings → Networking укажи публичный домен на тот порт, который использует Railway.

## Важно
Сейчас это единое общее хранилище без авторизации: любой человек, у кого есть URL сайта, потенциально сможет обращаться к API хранения. Для реальной многопользовательской системы следующим шагом нужно добавить пользователей/авторизацию и разделение данных по аккаунтам.
