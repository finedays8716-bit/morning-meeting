type ForecastItem = {
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
};

type AirItem = {
  stationName?: string;
  dataTime?: string;
  pm10Value?: string;
  pm25Value?: string;
};

const DEFAULT_LOCATION = {
  name: "인천 서해구 청라동",
  latitude: 37.5291606,
  longitude: 126.6375176,
};

function getWeatherKey() {
  return process.env.PUBLIC_DATA_WEATHER_KEY
    || process.env.WEATHER_API_KEY
    || process.env.KMA_API_KEY
    || process.env.KMA_SERVICE_KEY
    || process.env.PUBLIC_DATA_API_KEY
    || process.env.DATA_GO_KR_API_KEY
    || process.env.NEXT_PUBLIC_WEATHER_API_KEY;
}

function getAirKey() {
  return process.env.PUBLIC_DATA_AIR_KEY
    || process.env.AIRKOREA_API_KEY
    || process.env.AIR_API_KEY
    || process.env.AIR_QUALITY_API_KEY
    || process.env.PUBLIC_DATA_API_KEY
    || process.env.DATA_GO_KR_API_KEY
    || process.env.NEXT_PUBLIC_AIRKOREA_API_KEY;
}

function buildPublicDataUrl(base: string, key: string, params: Record<string, string>) {
  const serviceKey = key.includes("%") ? key : encodeURIComponent(key);
  return `${base}?serviceKey=${serviceKey}&${new URLSearchParams(params).toString()}`;
}

function toKmaGrid(latitude: number, longitude: number) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + latitude * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = longitude * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

function formatKst(date: Date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getLatestForecastBase() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000 - 15 * 60 * 1000);
  const hours = [2, 5, 8, 11, 14, 17, 20, 23];
  const available = hours.filter((hour) => hour <= kst.getUTCHours());
  if (available.length > 0) {
    const hour = available.at(-1)!;
    return { baseDate: formatKst(kst), baseTime: `${String(hour).padStart(2, "0")}00` };
  }
  const previous = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
  return { baseDate: formatKst(previous), baseTime: "2300" };
}

function weatherDescription(sky: string, precipitation: string) {
  const precipitationMap: Record<string, { condition: string; icon: string }> = {
    "1": { condition: "비가 와요", icon: "🌧️" },
    "2": { condition: "비와 눈이 와요", icon: "🌨️" },
    "3": { condition: "눈이 와요", icon: "❄️" },
    "4": { condition: "소나기가 와요", icon: "🌦️" },
  };
  if (precipitationMap[precipitation]) return precipitationMap[precipitation];
  if (sky === "1") return { condition: "맑아요", icon: "☀️" };
  if (sky === "3") return { condition: "구름이 많아요", icon: "⛅" };
  return { condition: "흐려요", icon: "☁️" };
}

function toNumber(value?: string) {
  if (!value || value === "-") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getSidoName(region: string) {
  const map: Array<[string[], string]> = [
    [["서울"], "서울"], [["부산"], "부산"], [["대구"], "대구"], [["인천"], "인천"],
    [["광주"], "광주"], [["대전"], "대전"], [["울산"], "울산"], [["세종"], "세종"],
    [["경기"], "경기"], [["강원"], "강원"], [["충북", "충청북도"], "충북"],
    [["충남", "충청남도"], "충남"], [["전북", "전라북도"], "전북"],
    [["전남", "전라남도"], "전남"], [["경북", "경상북도"], "경북"],
    [["경남", "경상남도"], "경남"], [["제주"], "제주"],
  ];
  return map.find(([names]) => names.some((name) => region.includes(name)))?.[1] || "인천";
}

async function fetchWeather(latitude: number, longitude: number, key: string) {
  const { nx, ny } = toKmaGrid(latitude, longitude);
  const { baseDate, baseTime } = getLatestForecastBase();
  const url = buildPublicDataUrl(
    "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
    key,
    { pageNo: "1", numOfRows: "1000", dataType: "JSON", base_date: baseDate, base_time: baseTime, nx: String(nx), ny: String(ny) },
  );
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`기상청 응답 오류(${response.status})`);
  const data = await response.json();
  const resultCode = data?.response?.header?.resultCode;
  if (resultCode !== "00") throw new Error(data?.response?.header?.resultMsg || "기상청 인증키를 확인해주세요.");
  const items: ForecastItem[] = data?.response?.body?.items?.item || [];
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const nowStamp = `${formatKst(nowKst)}${String(nowKst.getUTCHours()).padStart(2, "0")}00`;
  const forecastTimes = [...new Set(items.map((item) => `${item.fcstDate}${item.fcstTime}`))].sort();
  const target = forecastTimes.find((time) => time >= nowStamp) || forecastTimes[0];
  const currentItems = items.filter((item) => `${item.fcstDate}${item.fcstTime}` === target);
  const value = (category: string) => currentItems.find((item) => item.category === category)?.fcstValue || "";
  const temperature = toNumber(value("TMP"));
  if (temperature === null) throw new Error("현재 기온 자료가 없어요.");
  const description = weatherDescription(value("SKY"), value("PTY"));
  return {
    ...description,
    temperature,
    precipitationProbability: toNumber(value("POP")),
    forecastTime: target,
    grid: { nx, ny },
  };
}

async function fetchAir(region: string, key: string) {
  const sidoName = getSidoName(region);
  const url = buildPublicDataUrl(
    "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty",
    key,
    { returnType: "json", numOfRows: "100", pageNo: "1", sidoName, ver: "1.3" },
  );
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`에어코리아 응답 오류(${response.status})`);
  const data = await response.json();
  const resultCode = data?.response?.header?.resultCode;
  if (resultCode !== "00") throw new Error(data?.response?.header?.resultMsg || "에어코리아 인증키를 확인해주세요.");
  const rawItems = data?.response?.body?.items || [];
  const items: AirItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];
  const preferred = sidoName === "인천" && /서해구|서구|청라/.test(region)
    ? ["청라", "석남", "검단", "연희"]
    : [];
  const usable = items.filter((item) => toNumber(item.pm10Value) !== null || toNumber(item.pm25Value) !== null);
  const selected = preferred.map((name) => usable.find((item) => item.stationName?.includes(name))).find(Boolean) || usable[0];
  if (!selected) throw new Error("현재 미세먼지 측정값이 없어요.");
  return {
    pm10: toNumber(selected.pm10Value),
    pm25: toNumber(selected.pm25Value),
    stationName: selected.stationName || `${sidoName} 측정소`,
    dataTime: selected.dataTime || "",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("lat")) || DEFAULT_LOCATION.latitude;
  const longitude = Number(searchParams.get("lon")) || DEFAULT_LOCATION.longitude;
  const region = searchParams.get("region")?.trim() || DEFAULT_LOCATION.name;
  const weatherKey = getWeatherKey();
  const airKey = getAirKey();
  const [weatherResult, airResult] = await Promise.allSettled([
    weatherKey ? fetchWeather(latitude, longitude, weatherKey) : Promise.reject(new Error("날씨 API 키가 없어요.")),
    airKey ? fetchAir(region, airKey) : Promise.reject(new Error("미세먼지 API 키가 없어요.")),
  ]);

  return Response.json({
    location: { name: region, latitude, longitude },
    weather: weatherResult.status === "fulfilled" ? weatherResult.value : null,
    air: airResult.status === "fulfilled" ? airResult.value : null,
    live: {
      weather: weatherResult.status === "fulfilled",
      air: airResult.status === "fulfilled",
    },
    errors: {
      weather: weatherResult.status === "rejected" ? weatherResult.reason?.message || "날씨를 불러오지 못했어요." : null,
      air: airResult.status === "rejected" ? airResult.reason?.message || "미세먼지를 불러오지 못했어요." : null,
    },
  });
}
