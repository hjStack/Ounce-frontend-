# 1. 의존성 설치 단계 (deps)
FROM node:20-alpine AS deps
WORKDIR /app
# 패키지 매니저 파일 복사 (npm 기준)
COPY package.json package-lock.json ./
RUN npm ci

# 2. 빌드 단계 (builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js 프로젝트 빌드
RUN npm run build

# 3. 실행 단계 (runner) - 실제 운영 서버에 배포되는 가벼운 최종 이미지
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 보안과 용량 최적화를 위해 빌드된 결과물 중 필요한 것만 복사
COPY --from=builder /app/public ./public
# standalone 폴더 복사 (Next.js 12버전 이상에서 지원하는 최적화 빌드 결과물)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000

# Next.js 내장 서버 대신 standalone으로 생성된 가벼운 Node.js 서버 실행
CMD ["node", "server.js"]

FROM node:20-alpine AS builder
  WORKDIR /app

  ARG NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
  ENV NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY=$NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY

  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN npm run build
