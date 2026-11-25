# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps; fi

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ARG NODE_MAX_OLD_SPACE=4096
ENV NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE}"

ARG NEXT_PUBLIC_URL_BACKEND=https://macbook-pro-7.tail6d3a82.ts.net:8443
ARG NEXT_PUBLIC_URL_BACKEND_WS=wss://macbook-pro-7.tail6d3a82.ts.net:8443
ARG NEXT_PUBLIC_URL_FRONTEND=https://macbook-pro-7.tail6d3a82.ts.net
ARG NEXT_PUBLIC_AUTH_MODE=dpop
ARG NEXT_PUBLIC_DPOP_API_ORIGIN=https://macbook-pro-7.tail6d3a82.ts.net:8443
ARG NEXT_PUBLIC_URL_GOOGLE_LOGIN=832199004728-lfqvpnak071c42hejp4357bnqadu5dcm.apps.googleusercontent.com
ARG NEXT_PUBLIC_PAYPAL_CLIENT_ID=Ae_SkKiW6oGtb6kOnes2QtYOuvuU42bS8H3pjHo6sPH1dWAmtqc5sQD_4lnPPQrZ_BaYhwlvjy4cO-EU
ARG INTERNAL_BACKEND_URL=http://backend:8000

ENV NEXT_PUBLIC_URL_BACKEND=${NEXT_PUBLIC_URL_BACKEND}
ENV NEXT_PUBLIC_URL_BACKEND_WS=${NEXT_PUBLIC_URL_BACKEND_WS}
ENV NEXT_PUBLIC_URL_FRONTEND=${NEXT_PUBLIC_URL_FRONTEND}
ENV NEXT_PUBLIC_AUTH_MODE=${NEXT_PUBLIC_AUTH_MODE}
ENV NEXT_PUBLIC_DPOP_API_ORIGIN=${NEXT_PUBLIC_DPOP_API_ORIGIN}
ENV NEXT_PUBLIC_URL_GOOGLE_LOGIN=${NEXT_PUBLIC_URL_GOOGLE_LOGIN}
ENV NEXT_PUBLIC_PAYPAL_CLIENT_ID=${NEXT_PUBLIC_PAYPAL_CLIENT_ID}
ENV INTERNAL_BACKEND_URL=${INTERNAL_BACKEND_URL}

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/login >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
