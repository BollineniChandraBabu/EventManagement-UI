# Containerization

## 1. Current status: not containerized

There is **no `Dockerfile`, `docker-compose.yml` or `.dockerignore`** in the repository, and no
container is used in CI or production. The application is a static Angular bundle deployed to
Firebase Hosting ([ADR-009](architecture-decision-records/ADR-009-firebase-hosting.md)).

A container would only add value if the team needed to:

- Host the bundle outside Firebase (on-premises, another cloud, or a private network).
- Serve the SPA from an environment where a CDN is unavailable.
- Bundle a mock API for demos.

If none of those apply, **do not containerize**; the static CDN is simpler, cheaper and faster.

## 2. What a container would need to do

A static SPA container needs three things:

1. Build the bundle with the correct `environment.ts` for the target environment.
2. Serve the files over HTTP with an **SPA fallback** to `index.html`.
3. Set the same cache policy as Firebase (immutable hashed assets, short HTML TTL).

The API URL is compiled at build time, so one image is valid for exactly one environment. Build a
separate image per environment (or inject configuration at runtime with a more complex setup).

## 3. Reference Dockerfile (optional, not in use)

```dockerfile
# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Point the app at the target API before building.
ARG API_URL
RUN if [ -n "$API_URL" ]; then \
      sed -i "s|apiUrl: '.*'|apiUrl: '$API_URL'|" src/environments/environment.ts; \
    fi && \
    npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist/family-wishes-ui/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
```

`nginx.conf`:

```nginx
server {
  listen 8080;
  server_name _;
  root /usr/share/nginx/html;

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Hashed assets: cache for a year
  location ~* \.(?:js|css|woff2?|ttf|svg|png|jpe?g|gif|webp|ico)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  # Entry document: short cache
  location = /index.html {
    add_header Cache-Control "public, max-age=3600";
  }

  # Recommended security headers
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header X-Frame-Options "DENY" always;
}
```

Build and run:

```bash
docker build --build-arg API_URL="https://api.example.com/api" -t golden-greetings-ui .
docker run --rm -p 8080:8080 golden-greetings-ui
```

Open <http://localhost:8080>.

## 4. docker-compose for local demos (optional)

```yaml
services:
  ui:
    build:
      context: .
      args:
        API_URL: http://localhost:8080/api
    ports:
      - "8080:8080"
```

Note: the app calls the API from the **browser**, so `localhost` inside the container is not the
same as `localhost` in the browser. Use a browser-reachable URL (e.g. `http://host.docker.internal`)
or the real dev API.

## 5. Container requirements if adopted

| Requirement | Value |
| --- | --- |
| Base image | `nginx:alpine` (runtime), `node:20-alpine` (build) |
| Port | 8080 (non-root friendly) |
| User | Non-root (e.g. `nginx` or a custom UID) |
| Health check | `GET /` returns 200 |
| Read-only filesystem | Recommended |
| Environment | One image per API environment |
| Size | ~50–70 MB runtime image |
| TLS | Terminate at a load balancer/ingress, not in the container |

## 6. Things that break in containers

| Issue | Cause | Fix |
| --- | --- | --- |
| Deep links 404 | No SPA fallback | `try_files … /index.html` |
| Stale bundle after deploy | Long HTML cache | Short TTL on `index.html` |
| API calls fail | Wrong `apiUrl` compiled in | Build with the correct `API_URL` |
| WebSocket fails | Proxy does not forward `Upgrade` | Configure the ingress/proxy |
| Blank page | Wrong `base href` | Keep `<base href="/">` or set the sub-path |
| CORS errors | Container origin not allowed | Add the origin to the backend allow-list |

## 7. Recommendation

Keep Firebase Hosting unless there is a concrete requirement to leave it. If a container is
required, use the reference above, build one image per environment, and replicate the cache and
security headers from `firebase.json`.
