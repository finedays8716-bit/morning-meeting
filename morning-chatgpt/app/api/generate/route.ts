const questionTemplates = [
  (topic: string) => `${topic}을(를) 보며 가장 궁금한 것은 무엇인가요?`,
  (topic: string) => `${topic}이(가) 말을 할 수 있다면 우리에게 뭐라고 할까요?`,
  (topic: string) => `${topic}으로 새로운 놀이를 만든다면 어떻게 놀고 싶나요?`,
  (topic: string) => `${topic}에서 마음에 드는 점을 친구에게 소개해 볼까요?`,
];

function fallback(kind: string, topic: string, schedule: string) {
  if (kind === "question") return questionTemplates[Math.floor(Math.random() * questionTemplates.length)](topic || "오늘");
  if (schedule.includes("바깥")) return "바깥놀이를 할 때 친구와 안전한 거리를 지켜요.";
  if (schedule.includes("미술")) return "미술 도구를 안전하게 사용하고 제자리에 정리해요.";
  if (schedule.includes("점심")) return "음식을 골고루 먹고 식사 후 내 자리를 정리해요.";
  return "친구의 이야기를 잘 듣고 서로 다정하게 말해요.";
}

export async function POST(request: Request) {
  const { kind, topic = "", schedule = "" } = await request.json();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ text: fallback(kind, topic, schedule), mode: "example" });

  const instruction = kind === "question"
    ? `만 3~5세 유아가 아침모임에서 자유롭게 말할 수 있는 열린 질문 하나를 만드세요. 주제: ${topic}. 한 문장만, 쉽고 따뜻한 한국어로 쓰세요.`
    : `유치원 오늘의 일과(${schedule || "일상적인 유치원 생활"})를 보고 가장 필요한 안전 또는 생활 약속 하나를 만드세요. 만 3~5세가 이해할 한 문장만, 긍정적인 한국어로 쓰세요.`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5-mini", input: instruction }),
  });
  if (!response.ok) return Response.json({ text: fallback(kind, topic, schedule), mode: "example" });
  const data = await response.json();
  return Response.json({ text: data.output_text || fallback(kind, topic, schedule), mode: "ai" });
}
