"use client";

import { useMemo, useState } from "react";
import { labToCss } from "@/lib/labToRgb";

type Step = "intro" | "card" | "scope" | "capture" | "loading" | "result";

interface Match {
  id: string;
  brand: string;
  name: string;
  L: number;
  a: number;
  b: number;
  delta_e: number;
}

// 백엔드가 얼굴 사진에서 실제로 색을 뽑아본 부분들(양쪽 볼, 이마 등)의 정보예요.
// center/radius는 "원본 사진의 실제 픽셀" 기준 좌표라서, 화면에 그릴 때는
// 사진의 실제 크기(naturalWidth/Height) 대비 비율로 환산해서 그려요.
interface RegionDebug {
  name: string;
  center: [number, number];
  radius: number;
  lab?: [number, number, number];
  n_pixels_total?: number; // 원 안 전체 픽셀 수
  n_pixels_used?: number; // 상·하위 밝기 제외 후 남은 픽셀 수
  clip_pct?: number; // 밝기 상·하위 몇 %를 제외했는지
  lum_low?: number;
  lum_high?: number;
  used_as_final?: boolean;
  excluded_as_outlier?: boolean;
}

interface RecommendResponse {
  success: boolean;
  message: string;
  corrected_lab: [number, number, number] | null;
  matches: Match[];
  debug: {
    regions?: RegionDebug[];
    final_region?: string;
    image_size?: [number, number] | null;
    has_card?: boolean;
    [key: string]: unknown;
  };
  data_source: string;
  shade_pool_size: number;
  traceback?: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [hasCard, setHasCard] = useState<boolean | null>(null);
  const [useVerifiedOnly, setUseVerifiedOnly] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 결과 화면에 사진을 다시 보여줄 때, 그 사진의 실제(원본) 가로/세로
  // 픽셀 크기예요. 서버가 알려준 분석 영역 좌표(원본 픽셀 기준)를 화면에
  // 그릴 때 비율 계산용으로 필요해요.

  const progress = useMemo(() => {
    const order: Step[] = ["intro", "card", "scope", "capture", "loading", "result"];
    const idx = order.indexOf(step);
    return Math.round(((idx + 1) / order.length) * 100);
  }, [step]);

  function reset() {
    setStep("intro");
    setHasCard(null);
    setUseVerifiedOnly(null);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) setPreviewUrl(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file) return;
    if (!API_BASE) {
      setError(
        "백엔드 API 주소가 설정되지 않았어요 (NEXT_PUBLIC_API_BASE_URL 환경변수를 Vercel 프로젝트 설정에서 넣어주세요)."
      );
      setStep("result");
      return;
    }
    setError(null);
    setStep("loading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("has_card", String(hasCard ?? true));
      fd.append("use_verified_only", String(useVerifiedOnly ?? false));
      fd.append("top_n", "3");

      const res = await fetch(`${API_BASE}/api/recommend`, {
        method: "POST",
        body: fd,
      });
      const json: RecommendResponse = await res.json();
      setResult(json);
      setStep("result");
    } catch (err) {
      setError(
        `서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요. (${
          err instanceof Error ? err.message : String(err)
        })`
      );
      setStep("result");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      {step !== "intro" && (
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-jerumi-100">
          <div
            className="h-full rounded-full bg-jerumi-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {step === "intro" && (
        <section key={step} className="step-enter flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-jerumi-200 text-4xl">
            🌸
          </div>
          <h1 className="text-2xl font-bold text-jerumi-700">제루미</h1>
          <p className="mt-2 text-sm text-jerumi-600">
            사진 한 장으로 내 피부톤에 꼭 맞는
            <br />
            파운데이션 색상을 찾아드려요
          </p>
          <button
            onClick={() => setStep("card")}
            className="mt-10 w-full rounded-xl2 bg-jerumi-500 px-6 py-3.5 font-semibold text-white shadow-md shadow-jerumi-200 transition hover:bg-jerumi-600"
          >
            시작하기
          </button>
        </section>
      )}

      {step === "card" && (
        <StepCard
          key={step}
          title="색상 보정 카드가 있으신가요?"
          description={
            "촬영할 때 색상 카드(컬러체커)를 함께 찍으면 조명 영향을 보정해서\n더 정확한 결과를 드릴 수 있어요."
          }
        >
          <ChoiceButton
            emoji="🎴"
            label="있어요 (더 정확해요)"
            onClick={() => {
              setHasCard(true);
              setStep("scope");
            }}
          />
          <ChoiceButton
            emoji="🙅"
            label="없어요"
            onClick={() => {
              setHasCard(false);
              setStep("scope");
            }}
          />
          <BackLink onClick={() => setStep("intro")} />
        </StepCard>
      )}

      {step === "scope" && (
        <StepCard
          key={step}
          title="어떤 데이터로 추천받을까요?"
          description={
            "정확측정 데이터는 실제로 검증이 끝난 색상만 사용해요.\n전체 데이터는 아직 검증 전인 색상까지 포함해서 더 다양하게 비교해요."
          }
        >
          <ChoiceButton
            emoji="📦"
            label="전체 데이터 사용"
            onClick={() => {
              setUseVerifiedOnly(false);
              setStep("capture");
            }}
          />
          <ChoiceButton
            emoji="✅"
            label="정확측정 데이터만 사용"
            onClick={() => {
              setUseVerifiedOnly(true);
              setStep("capture");
            }}
          />
          <BackLink onClick={() => setStep("card")} />
        </StepCard>
      )}

      {step === "capture" && (
        <StepCard
          key={step}
          title="사진을 올려주세요"
          description={
            hasCard
              ? "얼굴과 색상 카드가 함께 잘 보이도록 찍은 사진을 선택해주세요."
              : "얼굴이 잘 보이도록 밝은 곳에서 찍은 사진을 선택해주세요."
          }
        >
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl2 border-2 border-dashed border-jerumi-300 bg-white/60 px-4 py-8 text-center transition hover:bg-white">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="선택한 사진 미리보기"
                className="mb-3 max-h-56 rounded-lg object-contain"
              />
            ) : (
              <span className="mb-2 text-3xl">📷</span>
            )}
            <span className="text-sm font-medium text-jerumi-600">
              {file ? "다른 사진으로 바꾸기" : "사진 선택 / 촬영하기"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <button
            disabled={!file}
            onClick={handleSubmit}
            className="mt-4 w-full rounded-xl2 bg-jerumi-500 px-6 py-3.5 font-semibold text-white shadow-md shadow-jerumi-200 transition hover:bg-jerumi-600 disabled:cursor-not-allowed disabled:bg-jerumi-200 disabled:text-jerumi-400 disabled:shadow-none"
          >
            분석하기
          </button>
          <BackLink onClick={() => setStep("scope")} />
        </StepCard>
      )}

      {step === "loading" && (
        <section key={step} className="step-enter flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-jerumi-200 border-t-jerumi-500" />
          <p className="text-sm font-medium text-jerumi-600">
            피부톤을 분석하고 있어요...
          </p>
          <p className="mt-1 text-xs text-jerumi-400">몇 초 정도 걸릴 수 있어요</p>
        </section>
      )}

      {step === "result" && (
        <section key={step} className="step-enter flex flex-1 flex-col">
          {error && (
            <div className="rounded-xl2 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {!error && result && !result.success && (
            <div className="rounded-xl2 bg-red-50 p-4 text-sm text-red-600">
              {result.message}
            </div>
          )}

          {!error && result && result.success && (
            <>
              <h2 className="text-lg font-bold text-jerumi-700">
                🎉 추천 결과예요
              </h2>

              {previewUrl && result.debug.regions && result.debug.regions.length > 0 && (
                <AnalysisCard
                  previewUrl={previewUrl}
                  regions={result.debug.regions}
                  imageSize={result.debug.image_size ?? null}
                  hasCard={result.debug.has_card ?? false}
                />
              )}

              {result.corrected_lab && (
                <div className="mt-4 flex items-center gap-3 rounded-xl2 bg-white/70 p-4">
                  <div
                    className="h-12 w-12 shrink-0 rounded-full border border-black/5"
                    style={{
                      backgroundColor: labToCss(
                        result.corrected_lab[0],
                        result.corrected_lab[1],
                        result.corrected_lab[2]
                      ),
                    }}
                  />
                  <div>
                    <p className="text-xs text-jerumi-400">측정된 내 피부톤</p>
                    <p className="text-sm font-medium text-jerumi-700">
                      L {result.corrected_lab[0].toFixed(1)} · a{" "}
                      {result.corrected_lab[1].toFixed(1)} · b{" "}
                      {result.corrected_lab[2].toFixed(1)}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3">
                {result.matches.map((m, i) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl2 bg-white p-4 shadow-sm"
                  >
                    <div
                      className="h-14 w-14 shrink-0 rounded-full border border-black/5"
                      style={{ backgroundColor: labToCss(m.L, m.a, m.b) }}
                    />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-jerumi-400">
                        {i === 0 ? "1순위 추천" : `${i + 1}순위`}
                      </p>
                      <p className="font-semibold text-jerumi-800">
                        {m.brand} · {m.name}
                      </p>
                      <p className="text-xs text-jerumi-400">
                        색상 차이(ΔE) {m.delta_e.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-center text-xs text-jerumi-400">
                총 {result.shade_pool_size}개 색상 중 비교
                {result.data_source === "local_fallback" &&
                  " (임시 데이터 기준)"}
              </p>
            </>
          )}

          <button
            onClick={reset}
            className="mt-6 w-full rounded-xl2 border border-jerumi-300 bg-white px-6 py-3 font-semibold text-jerumi-600 transition hover:bg-jerumi-50"
          >
            처음부터 다시하기
          </button>
        </section>
      )}
    </main>
  );
}

function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="step-enter flex flex-1 flex-col">
      <h2 className="text-lg font-bold text-jerumi-700">{title}</h2>
      {description && (
        <p className="mt-2 whitespace-pre-line text-sm text-jerumi-500">
          {description}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function ChoiceButton({
  emoji,
  label,
  onClick,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl2 border border-jerumi-200 bg-white px-4 py-4 text-left font-medium text-jerumi-700 shadow-sm transition hover:border-jerumi-400 hover:bg-jerumi-50"
    >
      <span className="text-xl">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 self-center text-sm text-jerumi-400 underline-offset-2 hover:underline"
    >
      이전으로
    </button>
  );
}

// ---------------------------------------------------------------------------
// 결과 상단 "어디서, 어떻게 색을 뽑았는지" 카드
// center/radius는 원본 사진의 실제 픽셀 좌표라서, 사진의 가로/세로 대비 비율(%)로 환산해서 그려요.
// ---------------------------------------------------------------------------
function AnalysisCard({
  previewUrl,
  regions,
  imageSize,
  hasCard,
}: {
  previewUrl: string;
  regions: RegionDebug[];
  imageSize: [number, number] | null;
  hasCard: boolean;
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  // 백엔드가 알려준 분석 기준 크기가 있으면 그걸 우선 사용(좌표와 같은 기준이라 가장 정확)
  const base = imageSize ? { w: imageSize[0], h: imageSize[1] } : natural;

  // 사진 왼쪽에 있는 영역부터 번호를 매겨서 "왼쪽 볼 / 오른쪽 볼"로 보여줘요.
  const ordered = [...regions].sort((a, b) => a.center[0] - b.center[0]);
  const sideLabel = (idx: number) =>
    ordered.length === 2 ? (idx === 0 ? "사진 왼쪽 볼" : "사진 오른쪽 볼") : `영역 ${idx + 1}`;

  const maxL = Math.max(...ordered.map((r) => r.lab?.[0] ?? 0), 1);
  const finalIdx = ordered.findIndex((r) => r.used_as_final);

  return (
    <div className="step-enter mt-4 rounded-xl2 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-jerumi-700">🔍 이렇게 분석했어요</p>
      <p className="mt-1 text-xs text-jerumi-400">
        내 사진에서 색을 뽑은 위치(안쪽 작은 원이 실제 측정 범위)와, 어떤 픽셀을 걸러냈는지 보여드려요.
      </p>

      <div className="relative mt-3 w-full overflow-hidden rounded-lg bg-jerumi-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="분석에 사용한 사진"
          className="block w-full"
          onLoad={(e) =>
            setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }
        />
        {base &&
          ordered.map((r, i) => {
            const isFinal = !!r.used_as_final;
            const left = (r.center[0] / base.w) * 100;
            const top = (r.center[1] / base.h) * 100;
            const wPct = ((r.radius * 2) / base.w) * 100;
            const hPct = ((r.radius * 2) / base.h) * 100;
            return (
              <div key={`${r.name}-${i}`}>
                {/* 위치를 쉽게 찾도록 바깥에 얇은 안내 링 (실제 측정 범위는 안쪽 작은 원) */}
                <div
                  className="region-pop pointer-events-none absolute rounded-full"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: 40,
                    height: 40,
                    animationDelay: `${i * 120}ms`,
                    border: `1.5px dashed ${isFinal ? "#f7548f" : "rgba(255,255,255,0.9)"}`,
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
                  }}
                />
                {/* 실제로 색을 뽑은 원 (크기는 실제 분석 반지름 그대로) */}
                <div
                  className="region-pop pointer-events-none absolute rounded-full"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${wPct}%`,
                    height: `${hPct}%`,
                    minWidth: 14,
                    minHeight: 14,
                    animationDelay: `${i * 120}ms`,
                    border: isFinal ? "2.5px solid #f7548f" : "2px solid rgba(255,255,255,0.95)",
                    background: isFinal ? "rgba(247,84,143,0.25)" : "rgba(255,255,255,0.2)",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
                  }}
                />
                {/* 눈에 잘 띄도록 번호표 + 채택 표시 */}
                <div
                  className="pointer-events-none absolute whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow"
                  style={{
                    left: `${Math.min(Math.max(left, 18), 82)}%`,
                    top: `${Math.max(top - hPct / 2, 6)}%`,
                    transform: "translate(-50%, -115%)",
                    background: isFinal ? "#f7548f" : "rgba(60,60,60,0.75)",
                  }}
                >
                  {i + 1}. {sideLabel(i)}
                  {isFinal ? " ✓채택" : ""}
                </div>
              </div>
            );
          })}
      </div>

      {/* 단계별 설명 */}
      <ol className="mt-4 flex flex-col gap-3 text-xs text-jerumi-600">
        <li className="flex gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-jerumi-100 text-[11px] font-bold text-jerumi-600">1</span>
          <span>
            <b>얼굴을 찾아 양쪽 볼 2곳을 골랐어요.</b> 눈·코·입 주변은 그림자나 눈썹이 섞이기 쉬워서, 그 아래쪽 볼 위치를 사용해요. 원 크기는 두 눈 사이 거리에 맞춰 자동 조절돼요.
          </span>
        </li>

        <li className="flex gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-jerumi-100 text-[11px] font-bold text-jerumi-600">2</span>
          <span className="flex-1">
            <b>각 영역에서 너무 밝은 픽셀·너무 어두운 픽셀을 걸러냈어요.</b> 빛 반사(하이라이트)와 그림자 때문에 색이 왜곡된 부분을 빼고 남은 픽셀의 중앙값으로 대표 색을 정해요.
            <div className="mt-2 flex flex-col gap-1.5">
              {ordered.map((r, i) => {
                const total = r.n_pixels_total ?? 0;
                const used = r.n_pixels_used ?? 0;
                const pct = total > 0 ? Math.round((used / total) * 100) : 0;
                return (
                  <div key={`f-${i}`} className="rounded-lg bg-jerumi-50 p-2">
                    <div className="flex justify-between font-medium text-jerumi-700">
                      <span>{i + 1}. {sideLabel(i)}</span>
                      <span>{total > 0 ? `${total.toLocaleString()}개 중 ${used.toLocaleString()}개 사용` : ""}</span>
                    </div>
                    {total > 0 && (
                      <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full bg-gray-300" style={{ width: `${(100 - pct) / 2}%` }} title="제외(어두움)" />
                        <div className="h-full bg-jerumi-500" style={{ width: `${pct}%` }} title="사용" />
                        <div className="h-full bg-gray-300" style={{ width: `${(100 - pct) / 2}%` }} title="제외(밝음)" />
                      </div>
                    )}
                    <p className="mt-1 text-[11px] text-jerumi-400">
                      밝기 하위 {r.clip_pct ?? 15}%(그림자 쪽)와 상위 {r.clip_pct ?? 15}%(빛 반사 쪽) 제외
                      {r.lum_low != null && r.lum_high != null
                        ? ` · 사용한 밝기 범위 ${Math.round(r.lum_low)}~${Math.round(r.lum_high)} (0~255)`
                        : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </span>
        </li>

        {hasCard && (
          <li className="flex gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-jerumi-100 text-[11px] font-bold text-jerumi-600">3</span>
            <span>
              <b>색상카드로 카메라·조명의 색 왜곡을 보정했어요.</b> 카드의 24개 패치 색을 기준으로 두 영역의 색을 같은 방식으로 보정한 뒤 비교해요.
            </span>
          </li>
        )}

        <li className="flex gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-jerumi-100 text-[11px] font-bold text-jerumi-600">{hasCard ? 4 : 3}</span>
          <span className="flex-1">
            <b>두 영역 중 더 밝은 쪽을 최종 피부색으로 골랐어요.</b> 그림자는 색을 어둡게만 만들기 때문에, 더 밝게 나온 쪽이 그림자 영향을 덜 받은 값이에요.
            <div className="mt-2 flex flex-col gap-1.5">
              {ordered.map((r, i) => {
                const L = r.lab?.[0] ?? 0;
                const isFinal = !!r.used_as_final;
                return (
                  <div key={`l-${i}`} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[11px] text-jerumi-500">{sideLabel(i)}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={isFinal ? "h-full bg-jerumi-500" : "h-full bg-jerumi-200"}
                        style={{ width: `${(L / maxL) * 100}%` }}
                      />
                    </div>
                    <span className={`w-20 shrink-0 text-right text-[11px] ${isFinal ? "font-bold text-jerumi-600" : "text-jerumi-400"}`}>
                      L* {L.toFixed(1)}{isFinal ? " ✓" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            {finalIdx >= 0 && (
              <p className="mt-1 text-[11px] text-jerumi-400">
                → {sideLabel(finalIdx)} 값을 최종 피부색으로 사용했어요.
              </p>
            )}
          </span>
        </li>
      </ol>
    </div>
  );
}
