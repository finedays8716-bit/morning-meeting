# 아침모임 웹앱

만 3세 학급 아침모임용 웹앱입니다. 날씨/미세먼지는 공공데이터포털 API에서,
오늘의 질문·안전약속은 Anthropic API(Claude)로 그 자리에서 생성합니다.

## 1. 로컬에서 실행해보기

```bash
npm install
cp .env.local.example .env.local   # 키 입력 후
npm run dev
```

`http://localhost:3000` 접속.

## 2. 키 발급받기

| 키 | 발급처 | 비고 |
|---|---|---|
| `PUBLIC_DATA_WEATHER_KEY` | [기상청 단기예보 조회서비스](https://www.data.go.kr/data/15084084/openapi.do) | "일반 인증키(Decoding)" 사용 |
| `PUBLIC_DATA_AIR_KEY` | [에어코리아 대기오염정보](https://www.data.go.kr/data/15073861/openapi.do) | 위와 동일 |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Vercel에는 절대 프론트 코드에 넣지 말고 환경변수로만 등록 |

공공데이터포털은 활용신청 후 **승인까지 1~2시간 정도 걸릴 수 있어요.**

## 3. 우리 지역 좌표/측정소 설정

- `WEATHER_NX`, `WEATHER_NY`: 기상청 격자좌표. [좌표 변환표](https://www.data.go.kr/data/15084084/openapi.do)의 "요청변수" 문서에서 지역명으로 검색 (인천 예시로 nx=54, ny=124를 기본값으로 넣어두었음 — 실제 학급 위치에 맞게 확인 후 수정)
- `AIR_STATION_NAME`: 에어코리아 측정소 이름 (예: "구월동"). 우리 동네와 가까운 측정소명은 에어코리아 홈페이지에서 확인

## 4. Vercel에 배포하기

1. 이 폴더를 GitHub 저장소에 올리기 (`.env.local`은 `.gitignore`에 포함되어 있어 자동으로 제외됨)
2. [vercel.com](https://vercel.com) → New Project → 방금 만든 저장소 선택
3. 배포 전 **Environment Variables** 항목에 위 4개 키(`PUBLIC_DATA_WEATHER_KEY`, `PUBLIC_DATA_AIR_KEY`, `ANTHROPIC_API_KEY`, `WEATHER_NX`, `WEATHER_NY`, `AIR_STATION_NAME`) 등록
4. Deploy 클릭

## 5. 나중에 수정하고 싶을 때

- 일과 버튼 목록: `app/page.tsx` 상단의 `PRESET_ACTIVITIES` 배열 수정
- 질문/안전약속 말투나 조건: `app/api/ai-generate/route.ts`의 `buildPrompt` 함수 수정
- 화면 색상/폰트: `app/globals.css` 상단 `:root` 변수 수정
