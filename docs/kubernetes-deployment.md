# Kubernetes Deployment

## 1. Current status: not applicable

The repository contains **no Kubernetes manifests, Helm charts or Kustomize overlays**, and the
application is not deployed to a cluster. It is a static bundle on Firebase Hosting.

Kubernetes would only be justified if the organisation already runs the backend on a cluster and
wants the front end co-located, or if a policy requires all workloads to run in-cluster.

## 2. What a Kubernetes deployment would look like

A static SPA needs only:

| Resource | Purpose |
| --- | --- |
| `Deployment` | Runs N nginx pods serving the bundle |
| `Service` | Stable in-cluster address |
| `Ingress` | TLS termination, host routing, SPA fallback behaviour |
| `ConfigMap` | nginx configuration |
| `HorizontalPodAutoscaler` | Scale on CPU or request rate |
| `PodDisruptionBudget` | Keep availability during node drains |

The API URL is compiled into the bundle, so build one image per environment (see
[`containerization.md`](containerization.md)).

## 3. Reference manifests (optional, not in use)

### 3.1 Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: golden-greetings-ui
  labels: { app: golden-greetings-ui }
spec:
  replicas: 2
  selector:
    matchLabels: { app: golden-greetings-ui }
  template:
    metadata:
      labels: { app: golden-greetings-ui }
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
      containers:
        - name: web
          image: registry.example.com/golden-greetings-ui:1.0.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet: { path: /, port: 8080 }
            initialDelaySeconds: 3
          livenessProbe:
            httpGet: { path: /, port: 8080 }
            initialDelaySeconds: 10
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits:   { cpu: 200m, memory: 128Mi }
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
          volumeMounts:
            - { name: nginx-conf, mountPath: /etc/nginx/conf.d }
            - { name: cache, mountPath: /var/cache/nginx }
            - { name: run, mountPath: /var/run }
      volumes:
        - name: nginx-conf
          configMap: { name: golden-greetings-ui-nginx }
        - name: cache
          emptyDir: {}
        - name: run
          emptyDir: {}
```

### 3.2 Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: golden-greetings-ui
spec:
  selector: { app: golden-greetings-ui }
  ports:
    - port: 80
      targetPort: 8080
```

### 3.3 Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: golden-greetings-ui
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts: [app.example.com]
      secretName: app-example-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: golden-greetings-ui
                port: { number: 80 }
```

### 3.4 ConfigMap (nginx)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: golden-greetings-ui-nginx
data:
  default.conf: |
    server {
      listen 8080;
      root /usr/share/nginx/html;
      location / { try_files $uri $uri/ /index.html; }
      location = /index.html { add_header Cache-Control "public, max-age=3600"; }
      location ~* \.(js|css|woff2?|svg|png|jpe?g|webp|ico)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
      }
    }
```

### 3.5 Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: golden-greetings-ui
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: golden-greetings-ui
  minReplicas: 2
  maxReplicas: 6
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

## 4. Cluster requirements

| Requirement | Value |
| --- | --- |
| Kubernetes | 1.27+ |
| Ingress controller | nginx (or equivalent with SPA support) |
| TLS | cert-manager or a managed certificate |
| Image registry | Reachable by the cluster |
| DNS | A hostname pointing at the ingress |
| Secrets | Image pull secret; no application secrets in the pod |
| Namespaces | Separate per environment |

## 5. Networking considerations

- The API is called from the **browser**, so the backend must be publicly reachable and must allow
  the ingress host in CORS.
- If the backend is internal-only, a reverse proxy path (`/api`) on the same host can avoid CORS,
  but the client expects a full `apiUrl`; configure it as a same-origin path and keep the WebSocket
  path reachable.
- WebSocket upgrades must pass through the ingress (`nginx.ingress.kubernetes.io/proxy-read-timeout`
  may need raising for long-lived sockets).

## 6. Operations

| Task | Command |
| --- | --- |
| Deploy | `kubectl apply -k overlays/prod` (if Kustomize is used) |
| Status | `kubectl rollout status deployment/golden-greetings-ui` |
| Rollback | `kubectl rollout undo deployment/golden-greetings-ui` |
| Logs | `kubectl logs deploy/golden-greetings-ui` |
| Scale | Edit the HPA or `kubectl scale` |

## 7. Why not to do this without a reason

| Cost | Detail |
| --- | --- |
| Operational | Cluster, ingress, certificates, image pipeline, monitoring |
| Performance | A CDN (Firebase) is typically faster for static assets than a small cluster |
| Complexity | Per-environment images because the API URL is compiled in |
| Security | Another surface to patch and monitor |

## 8. Recommendation

Remain on Firebase Hosting. If a cluster is mandated, use the reference manifests, build one image
per environment, replicate the cache headers, and verify deep links, WebSocket connectivity and
CORS before cutover.
