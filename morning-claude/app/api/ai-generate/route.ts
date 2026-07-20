import { NextResponse } from "next/server";

// 그날 일과(활동 목록) 또는 교사가 입력한 주제어를 바탕으로
// 만 3세 대상 '랜덤질문' 또는 '안전약속'을 Google Gemini API로 생성합니다.
// 키는 서버에만 존재하고 브라우저에는 절대 노출되지 않습니다.
//
// 모델 fallback 목록: 앞에서부터 순서대로 시도하고, "모델 없음" 계열 오류가 나면 다음 모델로.
// 구글이 무료 tier 모델을 자주 바꾸기 때문에 여러 후보를 두어 앱이 죽지 않도록 합니다.
// 환경변수 GEMINI_MODEL이 지정되어 있으면 그 모델을 먼저 시도합니다.

const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
];

type RequestBody = {
  type: "question" | "safety";
  activities: string[];
  keyword?: string;
};

function buildPrompt(type: string, activities: string[], keyword?: string) {
  const activityText = activities.length > 0 ? activities.join(", ") : "특별한 일과 없음";
  const trimmedKeyword = keyword?.trim();

  if (type === "question") {
    if (trimmedKeyword) {
      return (
        `너는 만 3세 유치원 아침모임을 돕는 보조교사야. ` +
        `오늘 아이들과 이야기 나눌 주제는 "${trimmedKeyword}"이야. ` +
        `이 주제와 관련지어, 만 3세 아이들이 쉽게 이해하고 대답할 수 있는 ` +
        `짧고 다정한 '오늘의 질문' 1개만 만들어줘. ` +
        `조건: 한 문장, 존댓말, 어려운 단어 금지, 예/아니오보다는 자유롭게 말할 수 있는 열린 질문. ` +
        `질문 문장만 출력하고 다른 설명은 절대 붙이지 마.`
      );
    }
    return (
      `너는 만 3세 유치원 아침모임을 돕는 보조교사야. ` +
      `오늘의 일과는 [${activityText}]야. ` +
      `이 일과 중 하나와 관련지어, 만 3세 아이들이 쉽게 이해하고 대답할 수 있는 ` +
      `짧고 다정한 '오늘의 질문' 1개만 만들어줘. ` +
      `조건: 한 문장, 존댓말, 어려운 단어 금지, 예/아니오보다는 자유롭게 말할 수 있는 열린 질문. ` +
      `질문 문장만 출력하고 다른 설명은 절대 붙이지 마.`
    );
  }

  return (
    `너는 만 3세 유치원 아침모임을 돕는 보조교사야. ` +
    `오늘의 일과는 [${activityText}]야. ` +
    `이 일과 중 안전과 관련 있는 부분을 골라, 만 3세 아이들이 따라 말하기 쉬운 ` +
    `'오늘의 안전약속' 1개만 만들어줘. ` +
    `조건: 한 문장, "~해요" 또는 "~할게요" 같은 쉬운 약속체, 짧고 구체적인 행동 지침. ` +
    `문장만 출력하고 다른 설명은 절대 붙이지 마.`
  );
}

// 모델 이름 관련 오류(폐지, 없음, 신규 사용자 불가 등)를 감지
function isModelUnavailableError(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("no longer available") ||
    lowered.includes("not found") ||
    lowered.includes("does not exist") ||
    lowered.includes("is not supported") ||
    lowered.includes("model not found") ||
    lowered.includes("limit: 0")
  );
}

async function callGemini(model: string, apiKey: string, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 200, temperature: 0.9 },
    }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const prompt = buildPrompt(body.type, body.activities || [], body.keyword);

  // 사용자가 GEMINI_MODEL 환경변수로 강제 지정한 게 있으면 맨 앞에 넣음
  const preferredModel = process.env.GEMINI_MODEL?.trim();
  const modelsToTry = preferredModel
    ? [preferredModel, ...FALLBACK_MODELS.filter((m) => m !== preferredModel)]
    : FALLBACK_MODELS;

  const attempts: { model: string; error: string }[] = [];

  for (const model of modelsToTry) {
    try {
      const { ok, data } = await callGemini(model, apiKey, prompt);

      if (ok) {
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
          "생성에 실패했어요. 다시 시도해 주세요.";
        return NextResponse.json({ text, model });
      }

      const errMsg = data?.error?.message || "알 수 없는 오류";
      attempts.push({ model, error: errMsg });

      // 모델이 없는 종류의 오류가 아니면 (예: 진짜 quota 초과, 인증 오류) 즉시 중단
      if (!isModelUnavailableError(errMsg)) {
        return NextResponse.json(
          { error: errMsg, attempts },
          { status: 500 }
        );
      }
      // 그렇지 않으면 다음 모델 시도
    } catch (err) {
      attempts.push({ model, error: String(err) });
    }
  }

  return NextResponse.json(
    {
      error: "사용 가능한 Gemini 모델을 찾지 못했어요. 시간이 지나 다시 시도하거나 관리자에게 문의해주세요.",
      attempts,
    },
    { status: 500 }
  );
}
