# 우리 반 아침모임

유치원 아침모임용 Next.js 웹앱입니다.

## GitHub에 올리기

압축을 푼 뒤 이 폴더 안의 파일 전체를 새 GitHub 저장소에 업로드합니다. ZIP 파일 자체를 올리는 것이 아니라 압축을 푼 파일을 올려야 합니다.

## Vercel 배포

1. Vercel에서 `Add New > Project`를 선택합니다.
2. 이 GitHub 저장소를 `Import`합니다.
3. `Environment Variables`에 다음 값을 추가합니다.
   - Name: `OPENAI_API_KEY`
   - Value: 발급받은 `sk-...` 키
4. 필요하면 `OPENAI_MODEL` 값으로 `gpt-5-mini`를 추가합니다.
5. `Deploy`를 누릅니다.

API 키는 코드, `.env.example`, GitHub에 직접 입력하면 안 됩니다.

## 로컬 실행

```bash
npm install
npm run dev
```
