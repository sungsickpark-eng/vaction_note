#!/bin/bash
set -e

echo "🗺️  여행 일지 다이어리 — 로컬 개발 환경 시작"
echo "================================================"
echo ""
echo "  ⚠️  포트 안내"
echo "  - MySQL Docker: 3307 (로컬 MySQL 충돌 방지)"
echo "  - Backend:  8003"
echo "  - Frontend: 3003"
echo ""

# 1. MySQL + Redis 실행
echo "▶ [1/4] MySQL + Redis 시작 (Docker Compose)..."
docker compose up -d
echo "   ✅ 컨테이너 실행됨"

# 2. MySQL 준비 대기
echo ""
echo "▶ [2/4] MySQL 준비 대기 중..."
for i in {1..20}; do
  if docker exec travel_diary_mysql mysqladmin ping -uroot -ptravel_root --silent 2>/dev/null; then
    echo "   ✅ MySQL 준비 완료 (포트 3307)"
    break
  fi
  printf "   ... 대기 중 (%d/20)\r" "$i"
  sleep 2
done

# 3. 백엔드 설정
echo ""
echo "▶ [3/4] 백엔드 설정..."
cd backend

if [ ! -d ".venv" ]; then
  echo "   가상환경 생성 중..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

echo "   DB 마이그레이션 실행..."
if alembic current 2>/dev/null | grep -q "head"; then
  echo "   마이그레이션 이미 최신 상태"
else
  alembic revision --autogenerate -m "auto" 2>/dev/null || true
  alembic upgrade head
fi

echo "   백엔드 서버 시작 (http://localhost:8003)..."
uvicorn main:app --reload --host 0.0.0.0 --port 8003 &
BACKEND_PID=$!
echo "   ✅ 백엔드 PID: $BACKEND_PID"
cd ..

# 4. 프론트엔드
echo ""
echo "▶ [4/4] 프론트엔드 시작..."
cd frontend
if [ ! -d "node_modules" ]; then
  npm install --silent
fi
npm run dev &
FRONTEND_PID=$!
echo "   ✅ 프론트엔드 PID: $FRONTEND_PID"
cd ..

echo ""
echo "================================================"
echo "✅ 모든 서비스 실행 완료!"
echo ""
echo "  🌐 Frontend:  http://localhost:3003"
echo "  📡 Backend:   http://localhost:8003"
echo "  📖 API Docs:  http://localhost:8003/docs"
echo "  🗄️  MySQL:     127.0.0.1:3307 (travel_diary)"
echo ""
echo "종료: Ctrl+C"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose stop" EXIT
wait $BACKEND_PID $FRONTEND_PID
