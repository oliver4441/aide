# Bigcapital Isolated Deployment & Operations Runbook (`AIDE-BIGCAP-02`)

- **Issue**: #77 (Parent: #75)
- **Pinned Baseline**: `607f10a43d7ae9418c6ae50a4e38d262f161a9c4`
- **Compose Spec**: `infra/aide-accounting/docker-compose.yml`

---

## 1. Architecture & Private Boundaries

- **Isolated Service**: Bigcapital runs in its own container stack (`bigcapital-api`, `bigcapital-mariadb`, `bigcapital-redis`) separate from Aide's Next.js/Vercel runtime and Neon PostgreSQL database.
- **Private Networking**:
  - `bigcapital_internal` is an `internal: true` Docker network. MariaDB (`3306`) and Redis (`6379`) are never published to the host or public internet.
  - `bigcapital-api` binds only to `127.0.0.1:3100` for reverse-proxy/private-gateway access from Aide.

---

## 2. Capacity Footprint (Baseline)

| Service | CPU Limit | Memory Limit | Storage |
|---|---|---|---|
| `bigcapital-api` | 1.0 vCPU | 1 GB | Stateless |
| `bigcapital-mariadb` | 1.0 vCPU | 1 GB | Persistent (`bigcapital_mariadb_data`) |
| `bigcapital-redis` | 0.5 vCPU | 256 MB | Persistent AOF (`bigcapital_redis_data`) |

---

## 3. Backup & Restore Drill

### Pre-Migration Backup
Always take a consistent MariaDB dump before running schema migrations or upgrading `BIGCAPITAL_IMAGE_TAG`:

```bash
docker compose -f infra/aide-accounting/docker-compose.yml exec -T bigcapital-mariadb \
  mysqldump -u root -p"$BIGCAPITAL_DB_ROOT_PASSWORD" --all-databases --single-transaction \
  > "backup-$(date +%Y%m%d-%H%M%S).sql"
```

### Restore Drill
Verify backups regularly in staging:

```bash
docker compose -f infra/aide-accounting/docker-compose.yml exec -T bigcapital-mariadb \
  mysql -u root -p"$BIGCAPITAL_DB_ROOT_PASSWORD" < backup-YYYYMMDD-HHMMSS.sql
```

---

## 4. Upgrade & Rollback

1. Take a pre-migration backup (Section 3).
2. Update `BIGCAPITAL_IMAGE_TAG` in `.env` to the new pinned commit SHA.
3. Pull and restart: `docker compose -f infra/aide-accounting/docker-compose.yml up -d`.
4. Verify `/api/health` and run a smoke check against a **canary tenant** before routing production traffic.
5. **Rollback**: Revert `BIGCAPITAL_IMAGE_TAG` to the previous SHA, restore the pre-migration SQL dump if schema changed, and restart the stack.
