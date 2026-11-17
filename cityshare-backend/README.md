# CityShare Backend

## Prerequisites
- Java 17+
- Maven 3.8+
- PostgreSQL 15+

## Database Setup

```sql
CREATE DATABASE cityshare;
CREATE USER cityshare_user WITH PASSWORD 'cityshare_pass';
GRANT ALL PRIVILEGES ON DATABASE cityshare TO cityshare_user;
```

## Run

```bash
mvn spring-boot:run
```

Flyway auto-creates all tables on first run.

## API Docs

http://localhost:8080/swagger-ui.html

## WebSocket test

ws://localhost:8080/ws (STOMP)
