import { NextResponse } from "next/server";

// 기상청 단기예보(동네예보) 조회 API를 서버에서 대신 호출하는 라우트입니다.
// 브라우저에서 직접 호출하면 서비스키가 노출되고, 공공데이터포털 API 특성상
// CORS가 막혀있는 경우가 많아 반드시 서버를 거쳐야 합니다.
// nx, ny는 쿼리 파라미터로 넘어오면 그 값을, 없으면 환경변수 기본값을 씁니다.

const BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];

function getBaseDateTime() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60 * 1000);
  let hour = kst.getUTCHours();
  let baseDate = kst.toISOString().slice(0, 10).replace(/-/g, "");

  let candidate = "0200";
  for (const t of BASE_TIMES) {
    if (hour * 100 + kst.getUTCMinutes() - 10 >= parseInt(t)) {
      candidate = t;
    }
  }
  if (hour < 2) {
    const yesterday = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
    baseDate = yesterday.toISOString().slice(0, 10).replace(/-/g, "");
    candidate = "2300";
  }

  return { baseDate, baseTime: candidate };
}

export async function GET(req: Request) {
  const serviceKey = process.env.PUBLIC_DATA_WEATHER_KEY;
  const { searchParams } = new URL(req.url);
  const nx = searchParams.get("nx") || process.env.WEATHER_NX || "54";
  const ny = searchParams.get("ny") || process.env.WEATHER_NY || "124";

  if (!serviceKey) {
    return NextResponse.json(
      { error: "PUBLIC_DATA_WEATHER_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { baseDate, baseTime } = getBaseDateTime();

  const url =
    `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst` +
    `?serviceKey=${serviceKey}` +
    `&numOfRows=100&pageNo=1&dataType=JSON` +
    `&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();

    const items = data?.response?.body?.items?.item ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "예보 데이터를 찾을 수 없습니다.", raw: data }, { status: 502 });
    }

    const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const nowHHMM = `${String(nowKst.getUTCHours()).padStart(2, "0")}00`;

    const fcstTimes: string[] = Array.from(new Set(items.map((i: any) => i.fcstTime))).sort();
    const targetTime = fcstTimes.find((t) => t >= nowHHMM) || fcstTimes[0];

    const pick = (category: string) =>
      items.find((i: any) => i.category === category && i.fcstTime === targetTime)?.fcstValue;

    const skyCode = pick("SKY");
    const ptyCode = pick("PTY");
    const tmp = pick("TMP");
    const pop = pick("POP");

    const skyLabelMap: Record<string, string> = { "1": "맑음", "3": "구름많음", "4": "흐림" };
    const ptyLabelMap: Record<string, string> = { "1": "비", "2": "비/눈", "3": "눈", "4": "소나기" };

    const label = ptyCode && ptyCode !== "0" ? ptyLabelMap[ptyCode] : skyLabelMap[skyCode] || "정보없음";

    return NextResponse.json({
      temperature: tmp,
      precipitationProbability: pop,
      condition: label,
      baseDate,
      baseTime,
    });
  } catch (err) {
    return NextResponse.json({ error: "날씨 API 호출 중 오류가 발생했습니다.", detail: String(err) }, { status: 500 });
  }
}
