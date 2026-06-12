// 네이버 클라우드 플랫폼(NCP) Geocoding + Directions.
// dooring-admin(견적서 프로젝트)의 현장 생성 패턴을 이식:
//   주소 검색(geocoding 후보 선택) → 공장~현장 자동차 경로 거리 계산 → 장거리 자동 판정.
//
// ⚠️ 베타 한정: 앱에서 직접 호출하므로 키가 번들에 포함된다 (내부 어드민 용도 전제).
//    정식 배포 전에 Supabase Edge Function 프록시로 이전할 것 (PLANNING 리스크 참조).

const NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET;

export const hasNaverConfig = Boolean(NAVER_CLIENT_ID && NAVER_CLIENT_SECRET);

// 이 거리 이상이면 장거리 (dooring-admin NEARBY_THRESHOLD_KM과 동일 기준)
// 판정 기준점은 공장이 아니라 "시공 기사의 출발지" (프로필에서 등록)
export const LONG_DISTANCE_KM = 30;

const headers = () => ({
  'x-ncp-apigw-api-key-id': NAVER_CLIENT_ID!,
  'x-ncp-apigw-api-key': NAVER_CLIENT_SECRET!,
});

export type AddressCandidate = {
  roadAddress: string;
  jibunAddress: string;
  lat: number;
  lon: number;
};

// 주소/검색어 → 후보 주소 목록 (도로명 우선)
export async function searchAddress(query: string): Promise<AddressCandidate[]> {
  if (!hasNaverConfig) throw new Error('네이버 API 키가 설정되지 않았습니다 (.env)');
  const res = await fetch(
    `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`주소 검색 실패 (${res.status})`);
  const data = await res.json();
  return ((data.addresses ?? []) as Array<Record<string, string>>)
    .filter((a) => a.roadAddress || a.jibunAddress)
    .slice(0, 5)
    .map((a) => ({
      roadAddress: a.roadAddress || a.jibunAddress,
      jibunAddress: a.jibunAddress || a.roadAddress,
      lat: parseFloat(a.y),
      lon: parseFloat(a.x),
    }));
}

export type Travel = { km: number; minutes: number; longDistance: boolean };

// 출발지 → 목적지 자동차 경로 거리/시간 + 장거리 판정
export async function travelBetween(
  start: { lat: number; lon: number },
  goal: { lat: number; lon: number },
): Promise<Travel> {
  if (!hasNaverConfig) throw new Error('네이버 API 키가 설정되지 않았습니다 (.env)');
  const res = await fetch(
    `https://maps.apigw.ntruss.com/map-direction/v1/driving?start=${start.lon},${start.lat}&goal=${goal.lon},${goal.lat}`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`경로 계산 실패 (${res.status})`);
  const data = await res.json();
  const summary = data?.route?.traoptimal?.[0]?.summary;
  if (!summary) throw new Error('경로를 찾을 수 없습니다');
  const km = Math.round((summary.distance / 1000) * 10) / 10;
  const minutes = Math.round(summary.duration / 1000 / 60);
  return { km, minutes, longDistance: km >= LONG_DISTANCE_KM };
}

// 기사 출발지 → 현장 주소(텍스트). 일감 상세에서 사용.
export async function travelFromAddress(
  start: { lat: number; lon: number },
  goalAddress: string,
): Promise<Travel> {
  const found = await searchAddress(goalAddress);
  if (found.length === 0) throw new Error('현장 주소의 좌표를 찾을 수 없습니다');
  return travelBetween(start, { lat: found[0].lat, lon: found[0].lon });
}
