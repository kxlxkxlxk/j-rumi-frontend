// 관리자 페이지 전용 API 호출 모음. 백엔드(jerumi-api-test)의 /api/admin/*
// 엔드포인트를 호출해요. 모든 요청에 X-Admin-Password 헤더를 담아서 보내요.

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

export interface Shade {
  id: string;
  brand: string;
  name: string;
  L: number;
  a: number;
  b: number;
  verified: boolean;
}

export interface ShadesResponse {
  source: string;
  total: number;
  n_verified: number;
  n_unverified: number;
  shades: Shade[];
}

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function adminLogin(password: string): Promise<{ ok: boolean; error?: string }> {
  if (!API_BASE) return { ok: false, error: "백엔드 API 주소(NEXT_PUBLIC_API_BASE_URL)가 설정되지 않았어요" };
  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "X-Admin-Password": password },
    });
    if (res.ok) return { ok: true };
    const json = await parseJsonSafe(res);
    return { ok: false, error: json?.detail || "비밀번호가 틀렸어요" };
  } catch (e) {
    return { ok: false, error: `서버에 연결하지 못했어요 (${e instanceof Error ? e.message : String(e)})` };
  }
}

export async function fetchShades(): Promise<ShadesResponse> {
  const res = await fetch(`${API_BASE}/api/shades`);
  if (!res.ok) throw new Error("색상 목록을 불러오지 못했어요");
  return res.json();
}

export async function deleteShade(id: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/shades/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "X-Admin-Password": password },
    });
    if (res.ok) return { ok: true };
    const json = await parseJsonSafe(res);
    return { ok: false, error: json?.detail || json?.message || "삭제 실패" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface AddShadeResult {
  success: boolean;
  message: string;
  shade?: Shade;
  photos?: Array<{ file: string; lab?: number[]; calib_error?: number; error?: string }>;
}

export async function addShade(params: {
  password: string;
  brand: string;
  name: string;
  verified: boolean;
  useCard: boolean;
  files: File[];
  crops: Array<{ x: number; y: number; w: number; h: number }>;
}): Promise<AddShadeResult> {
  const fd = new FormData();
  fd.append("brand", params.brand);
  fd.append("name", params.name);
  fd.append("verified", String(params.verified));
  fd.append("use_card", String(params.useCard));
  fd.append("crops", JSON.stringify(params.crops));
  for (const f of params.files) fd.append("files", f);

  const res = await fetch(`${API_BASE}/api/admin/shades`, {
    method: "POST",
    headers: { "X-Admin-Password": params.password },
    body: fd,
  });
  const json = await parseJsonSafe(res);
  if (!json) return { success: false, message: "서버 응답을 읽지 못했어요" };
  return json;
}

export async function getCardReference(
  password: string
): Promise<{ success: boolean; patches?: Record<string, number[]> | null; message?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/card-reference`, {
    headers: { "X-Admin-Password": password },
  });
  const json = await parseJsonSafe(res);
  return json || { success: false, message: "응답을 읽지 못했어요" };
}

export async function previewCardReference(
  password: string,
  file: File
): Promise<{ success: boolean; message: string; patches?: Record<string, number[]> }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/admin/card-reference/preview`, {
    method: "POST",
    headers: { "X-Admin-Password": password },
    body: fd,
  });
  const json = await parseJsonSafe(res);
  return json || { success: false, message: "응답을 읽지 못했어요" };
}

export async function saveCardReference(
  password: string,
  patches: Record<string, number[]>
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/card-reference/save`, {
    method: "POST",
    headers: { "X-Admin-Password": password, "Content-Type": "application/json" },
    body: JSON.stringify(patches),
  });
  const json = await parseJsonSafe(res);
  return json || { success: false, message: "응답을 읽지 못했어요" };
}

export async function resetCardReference(password: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/card-reference`, {
    method: "DELETE",
    headers: { "X-Admin-Password": password },
  });
  const json = await parseJsonSafe(res);
  return json || { success: false, message: "응답을 읽지 못했어요" };
}
