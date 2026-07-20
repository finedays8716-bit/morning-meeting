import { NextResponse } from "next/server";

// 에어코리아(한국환경공단) 실시간 측정정보 조회 API 프록시
// station은 쿼리 파라미터로 넘어오면 그 값을, 없으면 환경변수 기본값을 씁니다.

const GRADE_LABEL: Record<string, string> = {
  "1": "좋음",
  "2": "보통",
  "3": "나쁨",
  "4": "매우나쁨",
};

export async function GET(req: Request) {
  const serviceKey = process.env.PUBLIC_DATA_AIR_KEY;
  const { searchParams } = new URL(req.url);
  const stationName = searchParams.get("station") || process.env.AIR_STATION_NAME || "구월동";

  if (!serviceKey) {
    return NextResponse.json(
      { error: "PUBLIC_DATA_AIR_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const url =
    `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty` +
    `?serviceKey=${serviceKey}` +
    `&returnType=json&numOfRows=1&pageNo=1` +
    `&stationName=${encodeURIComponent(stationName)}&dataTerm=DAILY&ver=1.3`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();
    const item = data?.response?.body?.items?.[0];

    if (!item) {
      return NextResponse.json({ error: "측정소 데이터를 찾을 수 없습니다.", raw: data }, { status: 502 });
    }

    return NextResponse.json({
      pm10Value: item.pm10Value,
      pm10Grade: GRADE_LABEL[item.pm10Grade] || "정보없음",
      pm25Value: item.pm25Value,
      pm25Grade: GRADE_LABEL[item.pm25Grade] || "정보없음",
      dataTime: item.dataTime,
      stationName,
    });
  } catch (err) {
    return NextResponse.json({ error: "미세먼지 API 호출 중 오류가 발생했습니다.", detail: String(err) }, { status: 500 });
  }
}
