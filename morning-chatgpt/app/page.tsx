"use client";

import { useEffect, useMemo, useState } from "react";

type PageInfo = {
  title: string;
  shortTitle: string;
  spritePosition: string;
  color: string;
  light: string;
};

type LocationSettings = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  source: "manual" | "device";
};

type ApiStatus = {
  geminiKeyConfigured: boolean;
  publicDataKeyConfigured: boolean;
  weatherLive: boolean;
  airLive: boolean;
};

type LiveWeatherData = {
  location: { name: string; latitude: number; longitude: number };
  weather: null | { condition: string; icon: string; temperature: number; precipitationProbability: number | null; forecastTime: string };
  air: null | { pm10: number | null; pm25: number | null; stationName: string; dataTime: string };
  live: { weather: boolean; air: boolean };
  errors: { weather: string | null; air: string | null };
};

const defaultLocation: LocationSettings = {
  name: "인천 서해구 청라동",
  latitude: 37.5291606,
  longitude: 126.6375176,
  source: "manual",
};

const pages: PageInfo[] = [
  { title: "오늘은 몇 월 며칠일까요?", shortTitle: "날짜와 요일", spritePosition: "0% 0%", color: "#ff8f70", light: "#fff0e9" },
  { title: "오늘 날씨는 어때요?", shortTitle: "날씨와 미세먼지", spritePosition: "50% 0%", color: "#4fa9e8", light: "#eaf6ff" },
  { title: "오늘은 무엇을 할까요?", shortTitle: "오늘의 일과", spritePosition: "100% 0%", color: "#9a78df", light: "#f3edff" },
  { title: "오늘의 도우미는 누구일까요?", shortTitle: "오늘의 도우미", spritePosition: "0% 100%", color: "#45b88a", light: "#e9faf3" },
  { title: "함께 생각해 봐요", shortTitle: "오늘의 질문", spritePosition: "50% 100%", color: "#ef9d34", light: "#fff6df" },
  { title: "우리 함께 약속해요", shortTitle: "오늘의 약속", spritePosition: "100% 100%", color: "#eb6e91", light: "#ffedf3" },
];

const weekNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function DatePage() {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  if (!today) return <div className="loading-date">오늘을 불러오고 있어요</div>;

  return (
    <div className="date-display">
      <div className="date-numbers">
        <span><b>{today.getMonth() + 1}</b>월</span>
        <span className="date-dot">·</span>
        <span><b>{today.getDate()}</b>일</span>
      </div>
      <div className="weekday-badge">{weekNames[today.getDay()]}</div>
    </div>
  );
}

function WeatherPage() {
  const [location, setLocation] = useState<LocationSettings>(defaultLocation);
  const [data, setData] = useState<LiveWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);
  const airQuality = [
    getAirQuality("PM10", data?.air?.pm10 ?? null),
    getAirQuality("PM2.5", data?.air?.pm25 ?? null),
  ];

  useEffect(() => {
    const saved = localStorage.getItem("morning-location-settings");
    if (!saved) return setLocation(defaultLocation);
    try {
      const savedLocation: LocationSettings = JSON.parse(saved);
      setLocation({
        name: savedLocation.name || defaultLocation.name,
        latitude: savedLocation.latitude ?? defaultLocation.latitude,
        longitude: savedLocation.longitude ?? defaultLocation.longitude,
        source: savedLocation.source || "manual",
      });
    } catch {
      setLocation(defaultLocation);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const query = new URLSearchParams({
      region: location.name,
      lat: String(location.latitude ?? defaultLocation.latitude),
      lon: String(location.longitude ?? defaultLocation.longitude),
    });
    fetch(`/api/weather?${query}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result: LiveWeatherData) => setData(result))
      .catch((error) => { if (error.name !== "AbortError") setData(null); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [location, refreshCount]);

  const worstAir = airQuality.some((air) => air.status === "매우 나쁨") ? "매우 나쁨"
    : airQuality.some((air) => air.status === "나쁨") ? "나쁨"
      : airQuality.some((air) => air.status === "확인 안 됨") ? "확인 안 됨" : "괜찮음";
  const airMessage = worstAir === "매우 나쁨" || worstAir === "나쁨"
    ? "공기가 좋지 않아요. 실내놀이를 선택해요."
    : worstAir === "확인 안 됨" ? "미세먼지 정보를 확인하고 있어요." : "공기가 괜찮아요. 바깥놀이를 할 수 있어요!";

  return (
    <div className="weather-wrap">
      <div className="weather-live-bar">
        <span className={data?.live.weather || data?.live.air ? "live-indicator active" : "live-indicator"} />
        <b>{loading ? "공공데이터를 불러오는 중…" : data?.live.weather || data?.live.air ? "실시간 공공데이터" : "API 연결을 확인해주세요"}</b>
        <button onClick={() => setRefreshCount((count) => count + 1)} disabled={loading}>↻ 새로고침</button>
      </div>
      <div className="weather-grid">
      <article className="weather-card sky-card">
        <div className="big-weather">{loading ? "⏳" : data?.weather?.icon || "🌡️"}</div>
        <div>
          <p className="eyebrow">오늘의 날씨</p>
          <span className="weather-location">📍 {location.name}</span>
          <h3>{loading ? "확인 중이에요" : data?.weather?.condition || "날씨 연결 확인"}</h3>
          <p className="temperature">{data?.weather ? `${Math.round(data.weather.temperature)}℃` : "--℃"}</p>
          {data?.weather?.precipitationProbability !== null && data?.weather?.precipitationProbability !== undefined && <p className="rain-probability">비 올 확률 {data.weather.precipitationProbability}%</p>}
          {!loading && data?.errors.weather && <p className="weather-error">{data.errors.weather}</p>}
        </div>
      </article>
      <article className="weather-card air-card">
        <div className="air-card-inner">
          <div className="air-heading">
            <div>
              <p className="eyebrow">오늘의 대기질</p>
              <h3>미세먼지</h3>
            </div>
            <span className="air-updated">{data?.air ? `${data.air.stationName} 측정소` : loading ? "확인 중" : "연결 확인"}</span>
          </div>
          <div className="air-readings">
            {airQuality.map((air) => (
              <div className="air-reading" key={air.type} style={{ "--air-color": air.color, "--air-soft": air.soft } as React.CSSProperties}>
                <span className="air-status">{air.status}</span>
                <div className="air-value"><b>{air.value ?? "--"}</b><span>㎍/㎥</span></div>
                <p>{air.label}</p>
              </div>
            ))}
          </div>
          <p className={`air-note ${worstAir === "나쁨" || worstAir === "매우 나쁨" ? "bad" : ""}`}><span aria-hidden="true">●</span> {airMessage}</p>
          {!loading && data?.errors.air && <p className="weather-error air-error">{data.errors.air}</p>}
        </div>
      </article>
      </div>
    </div>
  );
}

function getAirQuality(type: "PM10" | "PM2.5", value: number | null) {
  if (value === null) return { type, label: type === "PM10" ? "미세먼지" : "초미세먼지", value: null, status: "확인 안 됨", color: "#8b9298", soft: "#f0f2f4" };
  const levels = type === "PM10"
    ? [
        [30, "좋음", "#1683e3", "#e9f5ff"],
        [80, "보통", "#32a852", "#ecf9ef"],
        [150, "나쁨", "#f09819", "#fff4df"],
        [Infinity, "매우 나쁨", "#e34747", "#ffeded"],
      ] as const
    : [
        [15, "좋음", "#1683e3", "#e9f5ff"],
        [35, "보통", "#32a852", "#ecf9ef"],
        [75, "나쁨", "#f09819", "#fff4df"],
        [Infinity, "매우 나쁨", "#e34747", "#ffeded"],
      ] as const;
  const [, status, color, soft] = levels.find(([max]) => value <= max)!;
  return { type, label: type === "PM10" ? "미세먼지" : "초미세먼지", value, status, color, soft };
}

type ScheduleCard = { id: string; label: string; icon: string };

function cleanPromiseForDisplay(text: string) {
  const plain = String(text || "").replace(/\*\*|__|`/g, "").replace(/\s+/g, " ").trim();
  const quoted = [...plain.matchAll(/[“\"]([^“”\"]{5,120})[”\"]/g)];
  if (quoted.length > 0) return quoted[quoted.length - 1][1].trim();
  return plain
    .replace(/^.*?(?:다음과 같이 제안합니다|다음과 같습니다)\s*[.:：-]?\s*/u, "")
    .replace(/^(?:오늘의\s*)?(?:안전\s*|생활\s*)?약속\s*[:：-]\s*/u, "")
    .replace(/^["“]|["”]$/g, "")
    .trim();
}

function cleanAiTextForDisplay(text: string) {
  return String(text || "")
    .replace(/\*\*|__|`/g, "")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const starterScheduleCards: ScheduleCard[] = [
  { id: "arrival", label: "등원", icon: "🎒" },
  { id: "free-play", label: "자유놀이", icon: "🧸" },
  { id: "morning-snack", label: "오전간식", icon: "🥛" },
  { id: "afternoon-snack", label: "오후간식", icon: "🍎" },
  { id: "special", label: "특성화활동", icon: "✨" },
  { id: "home", label: "귀가", icon: "🏠" },
  { id: "field-trip", label: "현장학습", icon: "🚌" },
  { id: "drill", label: "대피훈련", icon: "🚨" },
  { id: "talk", label: "이야기나누기", icon: "💬" },
  { id: "story", label: "동화", icon: "📚" },
  { id: "outside", label: "바깥놀이", icon: "🌳" },
  { id: "art", label: "미술놀이", icon: "🎨" },
  { id: "music", label: "음악놀이", icon: "🎵" },
  { id: "lunch", label: "점심", icon: "🍚" },
  { id: "rest", label: "휴식", icon: "🌙" },
];

const cardIcons = ["🎒", "🧸", "🥛", "🍎", "✨", "🏠", "🚌", "🚨", "💬", "📚", "🌳", "🎨", "🎵", "🍚", "🌙", "🧩", "🏃", "🧼", "🎂", "🌱", "⭐"];

const locationPresets: LocationSettings[] = [
  { name: "인천 제물포구", latitude: 37.4738, longitude: 126.6432, source: "manual" },
  { name: "인천 영종구", latitude: 37.4936, longitude: 126.53, source: "manual" },
  { name: "인천 미추홀구", latitude: 37.4636, longitude: 126.65, source: "manual" },
  { name: "인천 연수구", latitude: 37.4102, longitude: 126.678, source: "manual" },
  { name: "인천 남동구", latitude: 37.4473, longitude: 126.731, source: "manual" },
  { name: "인천 부평구", latitude: 37.507, longitude: 126.7218, source: "manual" },
  { name: "인천 계양구", latitude: 37.537, longitude: 126.7378, source: "manual" },
  { name: "인천 서해구", latitude: 37.5291606, longitude: 126.6375176, source: "manual" },
  { name: "인천 검단구", latitude: 37.602, longitude: 126.657, source: "manual" },
  { name: "인천 강화군 북부", latitude: 37.77, longitude: 126.46, source: "manual" },
  { name: "인천 강화군 남부", latitude: 37.64, longitude: 126.49, source: "manual" },
  { name: "인천 옹진군 북도", latitude: 37.532, longitude: 126.43, source: "manual" },
  { name: "인천 옹진군 영흥", latitude: 37.255, longitude: 126.483, source: "manual" },
  { name: "인천 옹진군 덕적", latitude: 37.23, longitude: 126.15, source: "manual" },
  { name: "인천 옹진군 연평", latitude: 37.66, longitude: 125.7, source: "manual" },
  { name: "인천 옹진군 백령·대청", latitude: 37.97, longitude: 124.72, source: "manual" },
];

function TeacherSettings({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"location" | "helpers" | "schedule" | "api">("location");
  const [location, setLocation] = useState<LocationSettings>(defaultLocation);
  const [names, setNames] = useState<string[]>(["새싹이", "꽃잎이", "햇살이"]);
  const [nameDraft, setNameDraft] = useState("");
  const [cards, setCards] = useState<ScheduleCard[]>(starterScheduleCards);
  const [cardDraft, setCardDraft] = useState("");
  const [cardIcon, setCardIcon] = useState("⭐");
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const savedLocation = localStorage.getItem("morning-location-settings");
    const savedNames = localStorage.getItem("morning-helper-names");
    const savedCards = localStorage.getItem("morning-schedule-cards");
    try { if (savedLocation) setLocation(JSON.parse(savedLocation)); } catch { /* 기본값 유지 */ }
    try { if (savedNames) setNames(JSON.parse(savedNames)); } catch { /* 기본값 유지 */ }
    try {
      if (savedCards) {
        const previous: ScheduleCard[] = JSON.parse(savedCards);
        const previousIds = new Set(previous.map((card) => card.id));
        setCards([...starterScheduleCards.filter((card) => !previousIds.has(card.id)), ...previous]);
      }
    } catch { /* 기본값 유지 */ }
    fetch("/api/status").then((response) => response.json()).then(setApiStatus).catch(() => setApiStatus(null));
  }, []);

  const saveAll = () => {
    localStorage.setItem("morning-location-settings", JSON.stringify(location));
    localStorage.setItem("morning-helper-names", JSON.stringify(names));
    localStorage.setItem("morning-schedule-cards", JSON.stringify(cards));
    setNotice("이 기기에 저장했어요 ✓");
    window.setTimeout(() => setNotice(""), 1800);
  };

  const addName = () => {
    const name = nameDraft.trim();
    if (!name) return;
    setNames((current) => [...current, name]);
    setNameDraft("");
  };
  const moveName = (index: number, direction: -1 | 1) => {
    setNames((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const addCard = () => {
    const label = cardDraft.trim();
    if (!label) return;
    setCards((current) => [...current, { id: `custom-${Date.now()}`, label, icon: cardIcon }]);
    setCardDraft("");
  };

  return (
    <main className="app-shell settings-shell">
      <header className="settings-header">
        <div><p>교사용</p><h1>교사 설정</h1><span>우리 반 정보를 한곳에서 관리해요</span></div>
        <button onClick={onClose}>✕ 닫기</button>
      </header>

      <nav className="settings-tabs" aria-label="교사 설정 항목">
        <button className={tab === "location" ? "active" : ""} onClick={() => setTab("location")}>📍 지역</button>
        <button className={tab === "helpers" ? "active" : ""} onClick={() => setTab("helpers")}>🌱 도우미</button>
        <button className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")}>🗂 일과 카드</button>
        <button className={tab === "api" ? "active" : ""} onClick={() => setTab("api")}>🔌 API 상태</button>
      </nav>

      <section className="settings-panel">
        {tab === "location" && <div className="settings-section location-settings">
          <div className="settings-copy"><b>유치원 지역</b><span>날씨와 미세먼지를 확인할 지역을 선택해요.</span></div>
          <div className="location-preset-grid">
            {locationPresets.map((preset) => <button
              key={preset.name}
              className={location.name === preset.name ? "active" : ""}
              onClick={() => { setLocation(preset); setNotice(`${preset.name.split(" ").at(-1)}으로 선택했어요. 저장을 눌러주세요.`); }}
            ><span>📍</span><b>{preset.name.replace("인천 ", "")}</b></button>)}
          </div>
          <div className="selected-location"><span>선택한 지역</span><b>{location.name}</b></div>
          <p className="settings-note">선택한 지역의 좌표와 가까운 측정소를 자동으로 사용해요. 변경한 뒤 아래의 설정 저장을 눌러주세요.</p>
        </div>}

        {tab === "helpers" && <div className="settings-section">
          <div className="settings-copy"><b>도우미 순서</b><span>위에서부터 저장한 순서대로 매일 한 명씩 바뀌어요.</span></div>
          <div className="settings-helper-list">
            {names.map((name, index) => <div key={`${name}-${index}`}><span>{index + 1}</span><b>{name}</b><button onClick={() => moveName(index, -1)} aria-label={`${name} 위로`}>↑</button><button onClick={() => moveName(index, 1)} aria-label={`${name} 아래로`}>↓</button><button className="remove" onClick={() => setNames(names.filter((_, itemIndex) => itemIndex !== index))} aria-label={`${name} 삭제`}>×</button></div>)}
          </div>
          <div className="settings-add"><input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addName()} placeholder="친구 이름" /><button onClick={addName}>추가</button></div>
        </div>}

        {tab === "schedule" && <div className="settings-section">
          <div className="settings-copy"><b>일과 카드 모음</b><span>기본 카드는 유지되고, 우리 반 카드도 추가할 수 있어요.</span></div>
          <div className="settings-card-grid">{cards.map((card) => <div key={card.id}><span>{card.icon}</span><b>{card.label}</b>{card.id.startsWith("custom-") && <button onClick={() => setCards(cards.filter((item) => item.id !== card.id))} aria-label={`${card.label} 삭제`}>×</button>}</div>)}</div>
          <div className="settings-card-maker"><select value={cardIcon} onChange={(event) => setCardIcon(event.target.value)} aria-label="일과 카드 그림">{cardIcons.map((icon) => <option key={icon}>{icon}</option>)}</select><input value={cardDraft} onChange={(event) => setCardDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addCard()} placeholder="새 일과 이름" /><button onClick={addCard}>카드 추가</button></div>
        </div>}

        {tab === "api" && <div className="settings-section api-settings">
          <div className="settings-copy"><b>API 연결 상태</b><span>비밀키 내용은 화면에 표시하지 않아요.</span></div>
          <div className="api-status-list">
            <div><span className={apiStatus?.geminiKeyConfigured ? "status-dot ready" : "status-dot"} /><b>Gemini AI</b><em>{apiStatus?.geminiKeyConfigured ? "키 설정됨" : "키 없음 · 예시 문장 사용 중"}</em></div>
            <div><span className={apiStatus?.weatherLive ? "status-dot ready" : "status-dot pending"} /><b>날씨</b><em>{apiStatus?.weatherLive ? "기상청 키 인식됨" : "키 이름 또는 배포 설정 확인"}</em></div>
            <div><span className={apiStatus?.airLive ? "status-dot ready" : "status-dot pending"} /><b>미세먼지</b><em>{apiStatus?.airLive ? "에어코리아 키 인식됨" : "키 이름 또는 배포 설정 확인"}</em></div>
          </div>
          <p className="settings-note">이 화면에서는 연결 상태만 확인할 수 있어요.</p>
        </div>}
      </section>

      <footer className="settings-footer"><span>{notice || "변경한 뒤 저장을 눌러주세요"}</span><button onClick={saveAll}>설정 저장</button></footer>
    </main>
  );
}

function SchedulePage() {
  const [cards, setCards] = useState<ScheduleCard[]>(starterScheduleCards);
  const [todayIds, setTodayIds] = useState<string[]>(["arrival", "free-play", "morning-snack", "talk", "story", "home"]);
  const [adminMode, setAdminMode] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("⭐");
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  useEffect(() => {
    const savedCards = localStorage.getItem("morning-schedule-cards");
    const savedToday = localStorage.getItem("morning-schedule-today");
    if (savedCards) {
      const previous: ScheduleCard[] = JSON.parse(savedCards);
      const previousIds = new Set(previous.map((card) => card.id));
      setCards([...starterScheduleCards.filter((card) => !previousIds.has(card.id)), ...previous]);
    }
    if (savedToday) setTodayIds(JSON.parse(savedToday));
  }, []);

  useEffect(() => {
    localStorage.setItem("morning-schedule-cards", JSON.stringify(cards));
    localStorage.setItem("morning-schedule-today", JSON.stringify(todayIds));
  }, [cards, todayIds]);

  const addToToday = (id: string) => setTodayIds((current) => current.includes(id) ? current : [...current, id]);
  const insertAt = (id: string, index: number) => {
    if (!id) return;
    setTodayIds((current) => {
      const oldIndex = current.indexOf(id);
      const next = current.filter((item) => item !== id);
      const adjustedIndex = oldIndex >= 0 && oldIndex < index ? index - 1 : index;
      next.splice(Math.max(0, Math.min(adjustedIndex, next.length)), 0, id);
      return next;
    });
    setDropIndex(null);
  };
  const removeFromToday = (id: string) => setTodayIds((current) => current.filter((item) => item !== id));
  const move = (index: number, direction: -1 | 1) => {
    setTodayIds((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const addCustomCard = () => {
    const label = newLabel.trim();
    if (!label) return;
    setCards((current) => [...current, { id: `custom-${Date.now()}`, label, icon: newIcon || "⭐" }]);
    setNewLabel("");
  };

  return (
    <div className="schedule-board">
      <div className="schedule-toolbar">
        <div><b>{adminMode ? "일과 카드 편집" : "오늘의 일과"}</b><span>{adminMode ? "카드를 만들고 순서를 정해요" : "아래 카드를 누르거나 끌어 올려요"}</span></div>
        <button className={adminMode ? "admin-toggle active" : "admin-toggle"} onClick={() => setAdminMode((value) => !value)}>{adminMode ? "아이들과 보기" : "⚙ 관리자"}</button>
      </div>

      <div className="today-schedule">
        {todayIds.length === 0 && (
          <div className={dropIndex === 0 ? "schedule-empty drag-over" : "schedule-empty"} onDragOver={(event) => { event.preventDefault(); setDropIndex(0); }} onDragLeave={() => setDropIndex(null)} onDrop={(event) => insertAt(event.dataTransfer.getData("text/plain"), 0)}>일과 카드를 이곳에 놓아 주세요</div>
        )}
        {todayIds.map((id, index) => {
          const card = cards.find((item) => item.id === id);
          if (!card) return null;
          return (
            <div className="schedule-position" key={id}>
              <div className={dropIndex === index ? "insert-slot active" : "insert-slot"} onDragOver={(event) => { event.preventDefault(); setDropIndex(index); }} onDrop={(event) => insertAt(event.dataTransfer.getData("text/plain"), index)}><span>여기에 놓기</span></div>
              <div className="today-card" draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDropIndex(null)}>
                <span className="today-order">{index + 1}</span>
                <span className="today-icon">{card.icon}</span>
                <strong>{card.label}</strong>
                <div className="today-actions">
                  {adminMode && <button onClick={() => move(index, -1)} aria-label="앞으로 이동">‹</button>}
                  {adminMode && <button onClick={() => move(index, 1)} aria-label="뒤로 이동">›</button>}
                  <button onClick={() => removeFromToday(id)} aria-label={`${card.label} 빼기`}>×</button>
                </div>
              </div>
            </div>
          );
        })}
        {todayIds.length > 0 && <div className={dropIndex === todayIds.length ? "insert-slot end-slot active" : "insert-slot end-slot"} onDragOver={(event) => { event.preventDefault(); setDropIndex(todayIds.length); }} onDrop={(event) => insertAt(event.dataTransfer.getData("text/plain"), todayIds.length)}><span>끝에 놓기</span></div>}
      </div>

      {adminMode && (
        <div className="card-maker-wrap">
          <div className="icon-picker" aria-label="카드 그림 선택">
            {cardIcons.map((icon) => <button className={newIcon === icon ? "selected" : ""} key={icon} onClick={() => setNewIcon(icon)}>{icon}</button>)}
          </div>
          <div className="card-maker">
            <span className="chosen-icon">{newIcon}</span>
            <input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addCustomCard()} placeholder="새 일과 이름만 입력하세요" />
            <button onClick={addCustomCard}>카드 만들기</button>
          </div>
        </div>
      )}

      <div className="schedule-tray" aria-label="일과 카드 모음">
        {cards.map((card) => (
          <div className={todayIds.includes(card.id) ? "tray-card selected" : "tray-card"} key={card.id} draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", card.id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDropIndex(null)}>
            <button className="tray-card-main" onClick={() => addToToday(card.id)}><span>{card.icon}</span><b>{card.label}</b></button>
            {adminMode && card.id.startsWith("custom-") && <button className="delete-card" onClick={() => { setCards((current) => current.filter((item) => item.id !== card.id)); removeFromToday(card.id); }} aria-label={`${card.label} 카드 삭제`}>×</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function HelperPage() {
  const [names, setNames] = useState<string[]>(["새싹이", "꽃잎이", "햇살이"]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("morning-helper-names");
    if (saved) setNames(JSON.parse(saved));
  }, []);
  const saveNames = (next: string[]) => {
    setNames(next);
    localStorage.setItem("morning-helper-names", JSON.stringify(next));
  };
  const dayNumber = Math.floor(new Date().setHours(0, 0, 0, 0) / 86400000);
  const helper = names.length ? names[dayNumber % names.length] : "도우미를 정해주세요";
  const addName = () => {
    const name = draft.trim();
    if (!name) return;
    saveNames([...names, name]);
    setDraft("");
  };
  return (
    <div className="helper-wrap">
      {!editing ? <>
        <div className="helper-avatar">🌱</div>
        <p className="helper-label">오늘 우리 반을 도와줄 친구는</p>
        <div className="helper-name">{helper}</div>
        <div className="helper-footer">
          <p className="helper-cheer">저장한 순서대로 매일 한 명씩 바뀌어요</p>
          <button className="edit-mini" onClick={() => setEditing(true)}>⚙ 도우미 순서 설정</button>
        </div>
      </> : <div className="helper-admin">
        <div className="helper-admin-head"><b>도우미 순서 설정</b><button onClick={() => setEditing(false)}>설정 완료</button></div>
        <div className="helper-name-list">
          {names.map((name, index) => <div key={`${name}-${index}`}><span>{index + 1}</span><b>{name}</b><button onClick={() => saveNames(names.filter((_, i) => i !== index))}>×</button></div>)}
        </div>
        <div className="helper-add"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addName()} placeholder="친구 이름" /><button onClick={addName}>추가</button></div>
        <p>이 목록은 이 기기에 저장되며 날짜가 바뀌면 다음 친구로 자동 변경돼요.</p>
      </div>}
    </div>
  );
}

function QuestionPage() {
  const [topic, setTopic] = useState("오늘의 날씨");
  const [question, setQuestion] = useState("오늘 하늘을 보니 어떤 생각이 드나요?");
  const [source, setSource] = useState<"initial" | "ai" | "example" | "teacher">("initial");
  const [sourceMessage, setSourceMessage] = useState("질문 만들기를 누르면 Gemini가 새 질문을 만들어요.");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "question", topic }) });
      const data = await response.json();
      setQuestion(cleanAiTextForDisplay(data.text));
      setSource(data.mode === "ai" ? "ai" : "example");
      setSourceMessage(data.message || (data.mode === "ai" ? "Gemini AI가 새로 만든 문장이에요." : "API 연결이 필요해 예시 문장을 보여드려요."));
    } catch {
      setSource("example");
      setSourceMessage("AI 연결을 확인해주세요. 현재 문장은 그대로 유지했어요.");
    } finally { setLoading(false); }
  };
  return (
    <div className="ai-page">
      <div className="ai-controls"><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="질문 주제 입력" /><button onClick={generate} disabled={loading}>{loading ? "생각 중…" : "질문 만들기"}</button></div>
      <div className="message-card question-card compact-message">
        <div className={`ai-source ${source}`}><b>{source === "ai" ? "✨ Gemini AI 생성" : source === "teacher" ? "✎ 교사가 수정한 문장" : source === "example" ? "⚠ 예시 문장 · API 연결 확인" : "준비된 예시 문장"}</b><span>{sourceMessage}</span></div>
        <span className="quote-mark">“</span>
        {editing ? <textarea value={question} onChange={(event) => { setQuestion(event.target.value); setSource("teacher"); setSourceMessage("교사가 직접 다듬은 문장이에요."); }} /> : <p>{question}</p>}
        <span className="tiny-tag">정답은 없어요. 자유롭게 이야기해요!</span>
      </div>
      <div className="message-actions"><button onClick={generate}>↻ 다시 생성</button><button onClick={() => setEditing((value) => !value)}>{editing ? "✓ 수정 완료" : "✎ 직접 수정"}</button></div>
    </div>
  );
}

function PromisePage() {
  const [promise, setPromise] = useState("이동할 때는 앞을 잘 살펴요.");
  const [source, setSource] = useState<"initial" | "ai" | "example" | "teacher">("initial");
  const [sourceMessage, setSourceMessage] = useState("버튼을 누르면 오늘의 일과를 보고 Gemini가 약속을 만들어요.");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true);
    const savedIds: string[] = JSON.parse(localStorage.getItem("morning-schedule-today") || "[]");
    const savedCards: ScheduleCard[] = JSON.parse(localStorage.getItem("morning-schedule-cards") || "[]");
    const schedule = savedIds.map((id) => savedCards.find((card) => card.id === id)?.label).filter(Boolean).join(", ");
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "promise", schedule }) });
      const data = await response.json();
      setPromise(cleanAiTextForDisplay(cleanPromiseForDisplay(data.text)));
      setSource(data.mode === "ai" ? "ai" : "example");
      setSourceMessage(data.message || (data.mode === "ai" ? "Gemini AI가 새로 만든 문장이에요." : "API 연결이 필요해 예시 문장을 보여드려요."));
    } catch {
      setSource("example");
      setSourceMessage("AI 연결을 확인해주세요. 현재 문장은 그대로 유지했어요.");
    } finally { setLoading(false); }
  };
  return (
    <div className="ai-page">
      <div className="message-card promise-card compact-message">
        <div className={`ai-source ${source}`}><b>{source === "ai" ? "✨ Gemini AI 생성" : source === "teacher" ? "✎ 교사가 수정한 문장" : source === "example" ? "⚠ 예시 문장 · API 연결 확인" : "준비된 예시 문장"}</b><span>{sourceMessage}</span></div>
        <div className="promise-icon">🤝</div>
        {editing ? <textarea value={promise} onChange={(event) => { setPromise(event.target.value); setSource("teacher"); setSourceMessage("교사가 직접 다듬은 문장이에요."); }} /> : <p>{promise}</p>}
        <span className="tiny-tag">오늘의 일과에 어울리는 약속이에요</span>
      </div>
      <div className="message-actions"><button onClick={generate} disabled={loading}>{loading ? "생각 중…" : "↻ 약속 생성·다시 생성"}</button><button onClick={() => setEditing((value) => !value)}>{editing ? "✓ 수정 완료" : "✎ 직접 수정"}</button></div>
    </div>
  );
}

function PageContent({ page }: { page: number }) {
  if (page === 1) return <DatePage />;
  if (page === 2) return <WeatherPage />;
  if (page === 3) return <SchedulePage />;
  if (page === 4) return <HelperPage />;
  if (page === 5) return <QuestionPage />;
  return <PromisePage />;
}

function PictureIcon({ page, className = "" }: { page: PageInfo; className?: string }) {
  return (
    <span
      className={`picture-icon ${className}`}
      style={{ backgroundPosition: page.spritePosition }}
      aria-hidden="true"
    />
  );
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState(0);
  const active = useMemo(() => pages[currentPage - 1], [currentPage]);

  const go = (page: number) => {
    setCurrentPage(page);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  if (currentPage === -1) return <TeacherSettings onClose={() => go(0)} />;

  if (currentPage === 0) {
    return (
      <main className="app-shell home-shell">
        <button className="teacher-settings-button" onClick={() => go(-1)}>⚙ 교사 설정</button>
        <div className="decor decor-one" />
        <div className="decor decor-two" />
        <header className="home-header">
          <div className="sun-badge" aria-hidden="true"><span /></div>
          <div>
            <p className="welcome">좋은 아침이에요!</p>
            <h1>우리 반 아침모임</h1>
            <p className="home-subtitle">오늘도 친구들과 즐겁게 하루를 시작해요</p>
          </div>
        </header>

        <section className="menu-grid" aria-label="아침모임 순서">
          {pages.map((page, index) => (
            <button
              className="menu-card"
              style={{ "--card-color": page.color, "--card-light": page.light } as React.CSSProperties}
              key={page.shortTitle}
              onClick={() => go(index + 1)}
            >
              <span className="menu-number">{index + 1}</span>
              <PictureIcon page={page} className="menu-picture" />
              <span className="menu-label">{page.shortTitle}</span>
              <span className="menu-arrow">›</span>
            </button>
          ))}
        </section>

        <button className="start-button" onClick={() => go(1)}>
          아침모임 시작하기 <span>→</span>
        </button>
      </main>
    );
  }

  return (
    <main
      className="app-shell page-shell"
      style={{ "--page-color": active.color, "--page-light": active.light } as React.CSSProperties}
    >
      <header className="page-header">
        <div className="page-progress">
          {pages.map((_, index) => (
            <button
              key={index}
              className={index + 1 === currentPage ? "progress-dot active" : "progress-dot"}
              onClick={() => go(index + 1)}
              aria-label={`${index + 1}번 페이지로 이동`}
            />
          ))}
        </div>
        <div className="page-title-row">
          <PictureIcon page={active} className="page-title-icon" />
          <div>
            <p>{currentPage} / {pages.length}</p>
            <h2>{active.title}</h2>
          </div>
        </div>
      </header>

      <section className="content-panel">
        <PageContent page={currentPage} />
      </section>

      <nav className="bottom-nav" aria-label="페이지 이동">
        <button className="nav-button secondary" onClick={() => go(currentPage - 1)}>
          <span>←</span> 이전
        </button>
        <button className="nav-button home-button" onClick={() => go(0)}>
          <span>⌂</span> 메인으로
        </button>
        {currentPage < pages.length ? (
          <button className="nav-button primary" onClick={() => go(currentPage + 1)}>
            다음 <span>→</span>
          </button>
        ) : (
          <button className="nav-button primary" onClick={() => go(0)}>
            마치기 <span>✓</span>
          </button>
        )}
      </nav>
    </main>
  );
}
