# Trae Preflight

This folder is prepared for `wangxt-946-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18246
- API_PORT: 19246
- WEB_PORT: 20246
- DB_PORT: 21246
- REDIS_PORT: 22246

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
