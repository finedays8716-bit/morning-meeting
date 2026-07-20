"use client";

import { useEffect, useState } from "react";

const PRESET_ACTIVITIES = [
  "바깥놀이",
  "실내자유놀이",
  "미술활동",
  "음악활동",
  "동화듣기",
  "체육활동",
  "견학/체험활동",
];

type WeatherData = {
  temperature?: string;
  condition?: string;
  precipitationProbability?: string;
  error?: string;
};

type DustData = {
  pm10Value?: string;
  pm10Grade?: string;
  pm25Value?: string;
  pm25Grade?: string;
  error?: string;
};

export default function Home() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [dust, setDust] = useState<DustData | null>(null);

  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [customActivities, setCustomActivities] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");

  const [question, setQuestion] = useState("");
  const [safetyPromise, setSafetyPromise] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingSafety, setLoadingSafety] = useState(false);

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then(setWeather)
      .catch(() => setWeather({ error: "날씨 정보를 불러오지 못했어요." }));

    fetch("/api/dust")
      .then((r) => r.json())
      .then(setDust)
      .catch(() => setDust({ error: "미세먼지 정보를 불러오지 못했어요." }));
  }, []);

  const allActivities = [...selectedActivities, ...customActivities];

  const toggleActivity = (act: string) => {
    setSelectedActivities((prev) =>
      prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]
    );
  };

  const addCustomActivity = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    setCustomActivities((prev) => [...prev, trimmed]);
    setCustomInput("");
  };

  const removeCustomActivity = (act: string) => {
    setCustomActivities((prev) => prev.filter((a) => a !== act));
  };

  const generate = async (type: "question" | "safety") => {
    const setLoading = type === "question" ? setLoadingQuestion : setLoadingSafety;
    const setResult = type === "question" ? setQuestion : setSafetyPromise;

    setLoading(true);
    try {
      const res = await fetch("/api/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, activities: allActivities }),
      });
      const data = await res.json();
      setResult(data.text || data.error || "생성에 실패했어요.");
    } catch {
      setResult("생성 중 오류가 발생했어요. 다시 눌러 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="hero">
        <div className="sun" aria-hidden="true" />
        <div className="hero-text">
          <h1 className="font-display">안녕, 오늘 아침이에요!</h1>
          <p>오늘 날씨를 살펴보고, 하루 일과를 함께 만들어봐요.</p>
        </div>
      </div>

      <div className="section info-row">
        <div className="card info-card">
          <div className="info-icon weather">☀️</div>
          <div>
            {!weather ? (
              <div className="info-loading">날씨 불러오는 중...</div>
            ) : weather.error ? (
              <div className="info-loading">{weather.error}</div>
            ) : (
              <>
                <div className="info-value font-display">
                  {weather.temperature}°C · {weather.condition}
                </div>
                <div className="info-label">강수확률 {weather.precipitationProbability}%</div>
              </>
            )}
          </div>
        </div>

        <div className="card info-card">
          <div className="info-icon dust">🌫️</div>
          <div>
            {!dust ? (
              <div className="info-loading">미세먼지 불러오는 중...</div>
            ) : dust.error ? (
              <div className="info-loading">{dust.error}</div>
            ) : (
              <>
                <div className="info-value font-display">미세먼지 {dust.pm10Grade}</div>
                <div className="info-label">
                  초미세먼지 {dust.pm25Grade} (PM10 {dust.pm10Value} · PM2.5 {dust.pm25Value})
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="section card">
        <h2 className="font-display">오늘의 일과</h2>
        <div className="activity-grid">
          {PRESET_ACTIVITIES.map((act) => (
            <button
              key={act}
              className={`activity-btn ${selectedActivities.includes(act) ? "selected" : ""}`}
              onClick={() => toggleActivity(act)}
            >
              {act}
            </button>
          ))}
        </div>

        <div className="text-input-row">
          <input
            className="text-input"
            placeholder="목록에 없는 활동을 직접 입력해요"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomActivity()}
          />
          <button className="add-btn" onClick={addCustomActivity}>
            추가
          </button>
        </div>

        {customActivities.length > 0 && (
          <div className="chip-row">
            {customActivities.map((act) => (
              <span key={act} className="chip">
                {act}
                <button onClick={() => removeCustomActivity(act)} aria-label={`${act} 삭제`}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="section generate-row">
        <div className="card generate-card">
          <h2>
            <span className="font-display">오늘의 질문</span>
            <span className="badge question">Q</span>
          </h2>
          <button
            className="generate-btn question"
            onClick={() => generate("question")}
            disabled={loadingQuestion}
          >
            {loadingQuestion ? "만드는 중..." : question ? "질문 다시 만들기" : "질문 만들기"}
          </button>
          {question ? (
            <textarea
              className="result-box"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          ) : (
            <div className="result-empty">버튼을 누르면 오늘 일과에 맞는 질문이 나와요.</div>
          )}
        </div>

        <div className="card generate-card">
          <h2>
            <span className="font-display">오늘의 안전약속</span>
            <span className="badge safety">약속</span>
          </h2>
          <button
            className="generate-btn safety"
            onClick={() => generate("safety")}
            disabled={loadingSafety}
          >
            {loadingSafety ? "만드는 중..." : safetyPromise ? "약속 다시 만들기" : "안전약속 만들기"}
          </button>
          {safetyPromise ? (
            <textarea
              className="result-box"
              value={safetyPromise}
              onChange={(e) => setSafetyPromise(e.target.value)}
            />
          ) : (
            <div className="result-empty">버튼을 누르면 오늘 일과에 맞는 안전약속이 나와요.</div>
          )}
        </div>
      </div>
    </main>
  );
}
