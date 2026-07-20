import { NextResponse } from "next/server";

// 그날 일과(활동 목록)를 바탕으로 만 3세 대상 '랜덤질문' 또는 '안전약속'을
// Google Gemini API로 생성하는 라우트. 키는 서버에만 존재하고 브라우저에는
// 절대 노출되지 않습니다.

type RequestBody = {
  type: "question" | "safety";
  activities: string[];
};

function buildPrompt(type: string, activities: string[]) {
  const activityText = activities.length > 0 ? activities.join(", ") : "특별한 일과 없음";

  if (type === "question") {
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

  const prompt = buildPrompt(body.type, body.activities || []);
  const model = "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.9,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Gemini 호출 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "생성에 실패했어요. 다시 시도해 주세요.";

    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: "AI 생성 중 오류가 발생했습니다.", detail: String(err) }, { status: 500 });
  }
}
