# Deploy do My Page na Hetzner

Dois servidores, a mesma imagem Docker em papéis diferentes (`MYPAGE_ROLE`):

| Servidor     | Compose                        | Containers                                   |
|--------------|--------------------------------|----------------------------------------------|
| **Backend**  | `docker-compose.backend.yml`   | `postgres` (PostgreSQL 17) + `api` (só `/api/*`) |
| **Frontend** | `docker-compose.frontend.yml`  | `web` (páginas e studio, sem base de dados) + `caddy` (HTTPS, opcional) |

Como funciona:
- O browser só fala com o frontend (mypage.cv).
- O frontend encaminha cada pedido `/api/*` para o backend: login, uploads, downloads, guardar e publicar.
- O frontend também pede ao backend os dados de cada página, através de `/api/internal/load/*` (protegido por `INTERNAL_API_SECRET`). Nunca toca na base de dados.
- O backend só responde pela **rede privada da Hetzner**. A porta da API escuta no IP privado (`API_BIND`) e o Postgres não tem porta exposta.

Dados (só no backend), em dois volumes que precisam de backup:
- `mypage-backend_mypage-pg`: a base de dados
- `mypage-backend_mypage-storage`: os ficheiros dos artistas (imagens e áudio), em `STORAGE_DIR`

Requisitos:
- Docker com o plugin Compose nos dois servidores.
- Os dois servidores na mesma rede privada Hetzner.
- O DNS de mypage.cv a apontar para o frontend.

## 1. Backend (base de dados + API)

```sh
git clone <repo> && cd <repo>/mypage
git checkout postgres            # até ao merge para main

cp .env.backend.example .env.backend
# preencher:
#   API_BIND             IP privado deste servidor (ex.: 10.0.0.2), nunca 0.0.0.0
#   POSTGRES_PASSWORD    openssl rand -hex 24
#   INTERNAL_API_SECRET  openssl rand -hex 32  (o mesmo valor vai para o frontend)
#   AUTH_SECRET, PAYMENT_WEBHOOK_SECRET   openssl rand -hex 32

alias dcb='docker compose -f docker-compose.backend.yml --env-file .env.backend'
dcb up -d --build
```

O `--env-file` é obrigatório em todos os comandos.

Ao arrancar, a `api` sincroniza o schema da base de dados (`prisma db push`). Se uma mudança de schema apagasse dados, o container para com erro em vez de os apagar.

## 2. Frontend (páginas + HTTPS)

```sh
git clone <repo> && cd <repo>/mypage
git checkout postgres

cp .env.frontend.example .env.frontend
# preencher:
#   API_URL              http://<IP privado do backend>:3000
#   INTERNAL_API_SECRET  o mesmo valor do backend

alias dcf='docker compose -f docker-compose.frontend.yml --env-file .env.frontend'
```

**HTTPS.** Escolher uma das opções:
- **Caddy incluído**: `dcf --profile proxy up -d --build`. O certificado Let's Encrypt é obtido e renovado automaticamente.
- **nginx/Traefik já no servidor**: `dcf up -d --build` e fazer proxy para `http://127.0.0.1:3000` (`WEB_PORT`). Subir o `client_max_body_size` para 200M: os uploads chegam a 100 MB.

Verificar que o frontend chega à API: `curl -s http://<IP privado do backend>:3000/api/me` deve devolver 401 (sem sessão), e não um erro de ligação.

## 3. Migrar os dados do staging (Plesk, SQLite)

Uma vez só, **no backend**, com a `api` a correr e a base de dados vazia:

```sh
# 1. trazer do staging a base SQLite e a pasta storage/
scp plesk:/caminho/mypage/prisma/dev.db ./mypage.db
scp -r plesk:/caminho/mypage/storage ./storage-staging

# 2. base de dados
dcb cp ./mypage.db api:/tmp/mypage.db
dcb exec -e SQLITE_URL=file:/tmp/mypage.db api npm run db:migrate-from-sqlite

# 3. ficheiros (o chown é necessário: o docker cp deixa-os como root)
dcb cp ./storage-staging/. api:/app/storage/
dcb exec -u root api chown -R node:node /app/storage
```

O script confirma a contagem de cada tabela. Se o destino já tiver dados, recusa; `-- --replace` apaga-os antes de copiar.

## 4. Atualizações

Nos dois servidores:

```sh
git pull
dcb up -d --build                  # backend
dcf --profile proxy up -d --build  # frontend (sem --profile se não usar o Caddy)
```

Atualizar primeiro o backend, depois o frontend. Se `NEXT_PUBLIC_SITE_URL` mudar, o frontend precisa deste rebuild: o valor fica dentro do build.

## 5. Backups (backend)

```sh
# base de dados
dcb exec -T postgres pg_dump -U mypage -Fc mypage > mypage-$(date +%F).dump
# restaurar
dcb exec -T postgres pg_restore -U mypage -d mypage --clean < mypage-AAAA-MM-DD.dump

# ficheiros
docker run --rm -v mypage-backend_mypage-storage:/s -v "$PWD":/b alpine \
  tar czf /b/storage-$(date +%F).tgz -C /s .
```

## 6. Comandos úteis

```sh
dcb ps / dcf ps            # estado
dcb logs -f api            # logs da API
dcf logs -f web            # logs das páginas
dcb exec postgres psql -U mypage mypage
dcb exec api npm run db:seed:tiers
```

## Desenvolvimento e Plesk

Sem `MYPAGE_ROLE`, a app corre tudo num só processo, como até aqui: `npm run dev` em local e o staging no Plesk. Nada muda nesses ambientes.

## Pendente: SSO com a Muska

Quando a Muska fornecer as credenciais, acrescentam-se ao `.env.backend`: `MUSKA_API_URL`, `MUSKA_API_KEY` e o `client_id`/`client_secret` do OAuth. O callback a registar do lado da Muska é `https://mypage.cv/api/auth/callback/muska`. Passa pelo frontend e chega à API como qualquer outro `/api/*`.
