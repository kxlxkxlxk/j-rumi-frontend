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

interface RecommendResponse {
  success: boolean;
  message: string;
  corrected_lab: [number, number, number] | null;
  matches: Match[];
  debug: Record<string, unknown>;
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
        <section className="flex flex-1 flex-col items-center justify-center text-center">
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
        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-jerumi-200 border-t-jerumi-500" />
          <p className="text-sm font-medium text-jerumi-600">
            피부톤을 분석하고 있어요...
          </p>
          <p className="mt-1 text-xs text-jerumi-400">몇 초 정도 걸릴 수 있어요</p>
        </section>
      )}

      {step === "result" && (
        <section className="flex flex-1 flex-col">
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
    <section className="flex flex-1 flex-col">
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
