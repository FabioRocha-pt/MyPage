# Deploy do My Page no servidor Hetzner

Um servidor, três containers (`docker-compose.prod.yml`):

| Container  | O quê                                   | Rede                                       |
|------------|-----------------------------------------|--------------------------------------------|
| `app`      | Next.js: páginas, studio e API          | `127.0.0.1:3000` no host (só loopback)     |
| `postgres` | PostgreSQL 17                           | só a rede interna do compose, sem porta    |
| `caddy`    | HTTPS para mypage.cv (opcional)         | 80 e 443                                   |

Dados em dois volumes, que precisam de backup:
- `mypage-prod_mypage-pg`: base de dados
- `mypage-prod_mypage-storage`: ficheiros dos artistas (imagens, áudio), `STORAGE_DIR`

Requisitos: Docker com o plugin Compose, e o DNS de mypage.cv a apontar para o servidor.

## 1. Primeira instalação

```sh
git clone <repo> && cd <repo>/mypage
git checkout postgres            # até ao merge para main

cp .env.production.example .env.production
# preencher todos os "change-me":
#   openssl rand -hex 24   → POSTGRES_PASSWORD
#   openssl rand -hex 32   → AUTH_SECRET, PAYMENT_WEBHOOK_SECRET
```

Alias usado no resto do guia (o `--env-file` é obrigatório em todos os comandos):

```sh
alias dc='docker compose -f docker-compose.prod.yml --env-file .env.production'
```

**HTTPS.** Escolher uma das opções:
- **Caddy incluído**: `dc --profile proxy up -d --build`. O certificado Let's Encrypt é obtido e renovado automaticamente.
- **nginx/Traefik já no servidor**: `dc up -d --build` e fazer proxy para `http://127.0.0.1:3000` (porta em `APP_PORT`). Subir o `client_max_body_size` para 200M: os uploads chegam a 100 MB.

Ao arrancar, o `app` sincroniza o schema da base de dados (`prisma db push`) antes de abrir a porta. Se uma mudança de schema apagasse dados, o container para com erro em vez de os apagar.

## 2. Migrar os dados do staging (Plesk, SQLite)

Uma vez só, com a app já a correr e a base de dados vazia:

```sh
# 1. trazer do staging a base SQLite e a pasta storage/
scp plesk:/caminho/mypage/prisma/dev.db ./mypage.db
scp -r plesk:/caminho/mypage/storage ./storage-staging

# 2. base de dados
dc cp ./mypage.db app:/tmp/mypage.db
dc exec -e SQLITE_URL=file:/tmp/mypage.db app npm run db:migrate-from-sqlite

# 3. ficheiros (o chown é necessário: o docker cp deixa-os como root)
dc cp ./storage-staging/. app:/app/storage/
dc exec -u root app chown -R node:node /app/storage
```

O script confirma a contagem de cada tabela. Se o destino já tiver dados, recusa; `-- --replace` apaga-os antes de copiar.

## 3. Atualizações

```sh
git pull
dc up -d --build          # (+ --profile proxy se usar o Caddy)
```

Se `NEXT_PUBLIC_SITE_URL` mudar, é preciso este rebuild: o valor fica dentro do build.

## 4. Backups

```sh
# base de dados
dc exec -T postgres pg_dump -U mypage -Fc mypage > mypage-$(date +%F).dump
# restaurar
dc exec -T postgres pg_restore -U mypage -d mypage --clean < mypage-AAAA-MM-DD.dump

# ficheiros
docker run --rm -v mypage-prod_mypage-storage:/s -v "$PWD":/b alpine \
  tar czf /b/storage-$(date +%F).tgz -C /s .
```

## 5. Comandos úteis

```sh
dc ps                     # estado
dc logs -f app            # logs da app
dc exec postgres psql -U mypage mypage
dc exec app npm run db:seed:tiers
```

## Pendente: SSO com a Muska

Quando a Muska fornecer as credenciais, acrescentam-se ao `.env.production` (`MUSKA_API_URL`, `MUSKA_API_KEY` e o `client_id`/`client_secret` do OAuth). O callback a registar do lado da Muska é `https://mypage.cv/api/auth/callback/muska`.
