FROM node:22-bookworm-slim AS frontend
WORKDIR /web
COPY package.json ./
# No lockfile is fabricated: generate and commit one after the first authorized install.
RUN npm install --no-audit --no-fund
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM python:3.12-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATABASE_PATH=/data/folio.sqlite3
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --uid 10001 --create-home folio \
    && mkdir /data && chown folio:folio /data
COPY backend ./backend
COPY --from=frontend /web/dist ./dist
USER folio
EXPOSE 8000
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-proxy-headers"]
