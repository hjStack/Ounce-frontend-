#!/bin/bash
set -uo pipefail

# ─────────────────────────────────────────────────────────────
# Ounce 프론트엔드(Next.js) 무중단(Blue/Green) 배포 스크립트
# ─────────────────────────────────────────────────────────────

PROJECT_DIR="/home/ubuntu/ounce-frontend"
ENV_FILE="/etc/nginx/conf.d/service-frontend-url.inc"   # 프론트엔드 전용 Nginx 변수 파일
COMPOSE="docker compose -f docker-compose.frontend.yml"

HEALTH_PATH="/"        # Next.js 메인 페이지가 200을 주는지 확인
HEALTH_RETRY=30        # 30회 x 3초 = 최대 90초
HEALTH_INTERVAL=3
CURL_TIMEOUT=15
DRAIN_SECONDS=15       # 프론트엔드는 백엔드(25초)보다 커넥션이 짧아 15초면 충분합니다
STOP_TIMEOUT=10        # Next.js 구버전에 주는 graceful shutdown 시간

cd "$PROJECT_DIR" || exit 1

echo "🚀 Ounce 프론트엔드 배포 스크립트를 시작합니다."

# ── 0. sudo 권한 선확인 ─────────────────────────────────────
if ! sudo -n true 2>/dev/null; then
    echo "❌ sudo 가 비밀번호를 요구합니다. /etc/sudoers.d/ 설정을 확인하세요."
    exit 1
fi

# ── 1. 현재 서비스 중인 색 판별 ──────────────────────────────
if [ ! -s "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE 이 없거나 비어 있습니다."
    echo "   복구: echo 'set \$service_frontend_url http://127.0.0.1:3001;' | sudo tee $ENV_FILE"
    exit 1
fi

if grep -q "3000" "$ENV_FILE"; then
    OLD_COLOR="blue";  OLD_PORT=3000; TARGET_COLOR="green"; TARGET_PORT=3001
elif grep -q "3001" "$ENV_FILE"; then
    OLD_COLOR="green"; OLD_PORT=3001; TARGET_COLOR="blue";  TARGET_PORT=3000
else
    echo "❌ $ENV_FILE 에서 현재 색(3000/3001)을 읽지 못했습니다. 내용:"
    cat "$ENV_FILE"
    exit 1
fi

echo "   현재 서비스 중: $OLD_COLOR($OLD_PORT)  →  배포 대상: $TARGET_COLOR($TARGET_PORT)"

# ── 2. 신버전 컨테이너 기동 ─────────────────────────────────
echo "🐳 $TARGET_COLOR 컨테이너를 최신 이미지로 실행합니다."
$COMPOSE pull "frontend-$TARGET_COLOR" || { echo "❌ 이미지 pull 실패"; exit 1; }
$COMPOSE up -d --no-deps --force-recreate "frontend-$TARGET_COLOR" \
    || { echo "❌ $TARGET_COLOR 기동 실패"; exit 1; }

# ── 3. 헬스 체크 ────────────────────────────────────────────
echo "⏳ $TARGET_COLOR 헬스 체크 (http://localhost:$TARGET_PORT$HEALTH_PATH)"
HEALTHY=0
for (( i=1; i<=HEALTH_RETRY; i++ )); do
    STATE=$(docker inspect -f '{{.State.Status}}' "frontend-$TARGET_COLOR" 2>/dev/null)
    if [ "$STATE" != "running" ]; then
        echo "❌ frontend-$TARGET_COLOR 가 실행 중이 아닙니다 (상태: ${STATE:-없음}). 즉시 중단합니다."
        break
    fi

    CODE=$(curl -s -o /dev/null -m "$CURL_TIMEOUT" -w '%{http_code}' \
             "http://localhost:$TARGET_PORT$HEALTH_PATH" 2>/dev/null)
             
    if [[ "$CODE" =~ ^[23] ]]; then
        echo "✅ 헬스 체크 성공 (HTTP $CODE, ${i}번째 시도)"
        HEALTHY=1
        break
    fi
    echo "   Next.js 서버가 켜지는 중입니다... (HTTP ${CODE:-000}) ($i/$HEALTH_RETRY)"
    sleep "$HEALTH_INTERVAL"
done

if [ "$HEALTHY" -ne 1 ]; then
    echo "❌ 헬스 체크 실패. 트래픽은 그대로 $OLD_COLOR 에 둡니다 (서비스 영향 없음)."
    echo "   ── $TARGET_COLOR 컨테이너 로그 마지막 80줄 ──"
    $COMPOSE logs --tail=80 "frontend-$TARGET_COLOR"
    $COMPOSE stop -t 10 "frontend-$TARGET_COLOR"
    $COMPOSE rm -f "frontend-$TARGET_COLOR"
    exit 1
fi

# ── 4. 워밍업 ───────────────────────────────────────────────
echo "🔥 워밍업 요청 3회"
for _ in 1 2 3; do
    curl -s -o /dev/null -m 20 "http://localhost:$TARGET_PORT$HEALTH_PATH"
done

# ── 5. 호스트 nginx 트래픽 전환 ─────────────────────────────
echo "🔄 Nginx 트래픽을 $TARGET_COLOR 로 전환합니다."
sudo cp "$ENV_FILE" "$ENV_FILE.bak"
echo "set \$service_frontend_url http://127.0.0.1:$TARGET_PORT;" | sudo tee "$ENV_FILE" > /dev/null

if ! sudo nginx -t; then
    echo "❌ nginx 설정 검증 실패. 원래 설정으로 롤백합니다."
    sudo mv "$ENV_FILE.bak" "$ENV_FILE"
    $COMPOSE stop -t 10 "frontend-$TARGET_COLOR"
    exit 1
fi

if ! sudo systemctl reload nginx; then
    echo "❌ nginx reload 실패. 원래 설정으로 롤백합니다."
    sudo mv "$ENV_FILE.bak" "$ENV_FILE"
    sudo systemctl reload nginx || true
    $COMPOSE stop -t 10 "frontend-$TARGET_COLOR"
    exit 1
fi

# 프론트엔드 전환 확인
SWITCHED_CODE=$(curl -s -o /dev/null -m 10 -w '%{http_code}' -H "Host: ouncefresh.com" \
                  "http://127.0.0.1$HEALTH_PATH" 2>/dev/null)
if [[ ! "$SWITCHED_CODE" =~ ^[23] ]]; then
    echo "❌ 전환 후 nginx 응답이 비정상입니다 (HTTP ${SWITCHED_CODE:-000}). 롤백합니다."
    sudo mv "$ENV_FILE.bak" "$ENV_FILE"
    sudo systemctl reload nginx || true
    $COMPOSE stop -t 10 "frontend-$TARGET_COLOR"
    exit 1
fi

sudo rm -f "$ENV_FILE.bak"
echo "✅ Nginx 트래픽 전환 완료! (HTTP $SWITCHED_CODE)"

# ── 6. 드레인 ───────────────────────────────────────────────
echo "⏳ 기존 커넥션 드레인 대기 (${DRAIN_SECONDS}초)..."
sleep "$DRAIN_SECONDS"

# ── 7. 구버전 graceful 종료 ─────────────────────────────────
echo "🛑 기존 $OLD_COLOR 컨테이너를 종료합니다 (최대 ${STOP_TIMEOUT}초 대기)."
$COMPOSE stop -t "$STOP_TIMEOUT" "frontend-$OLD_COLOR"
$COMPOSE rm -f "frontend-$OLD_COLOR"

# ── 8. 디스크 정리 ──────────────────────────────────────────
docker image prune -f > /dev/null 2>&1 || true

echo "🎉 배포 완료. 현재 프론트엔드 서비스 중: $TARGET_COLOR"