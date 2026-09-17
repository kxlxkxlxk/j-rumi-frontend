"use client";

import { useEffect, useState } from "react";
import { ImageCropBox, type CropBox } from "@/components/ImageCropBox";
import { labToCss } from "@/lib/labToRgb";
import {
  adminLogin,
  addShade,
  deleteShade,
  fetchShades,
  getCardReference,
  previewCardReference,
  resetCardReference,
  saveCardReference,
  type Shade,
} from "@/lib/adminApi";

type Tab = "verified" | "unverified";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-5">
        <div className="mb-4 text-4xl">🔒</div>
        <h1 className="text-lg font-bold text-jerumi-700">관리자 로그인</h1>
        <form
          className="mt-6 flex w-full flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setAuthLoading(true);
            setAuthError(null);
            const res = await adminLogin(password);
            setAuthLoading(false);
            if (res.ok) setAuthed(true);
            else setAuthError(res.error || "로그인 실패");
          }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="rounded-xl2 border border-jerumi-200 bg-white px-4 py-3 outline-none focus:border-jerumi-400"
          />
          {authError && <p className="text-sm text-red-600">{authError}</p>}
          <button
            type="submit"
            disabled={authLoading || !password}
            className="rounded-xl2 bg-jerumi-500 px-6 py-3 font-semibold text-white transition hover:bg-jerumi-600 disabled:bg-jerumi-200"
          >
            {authLoading ? "확인 중..." : "로그인"}
          </button>
        </form>
      </main>
    );
  }

  return <AdminDashboard password={password} />;
}

function AdminDashboard({ password }: { password: string }) {
  const [tab, setTab] = useState<Tab>("verified");
  const [shades, setShades] = useState<Shade[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function reload() {
    try {
      const res = await fetchShades();
      setShades(res.shades);
      setListError(null);
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verified = shades?.filter((s) => s.verified) ?? [];
  const unverified = shades?.filter((s) => !s.verified) ?? [];
  const pool = tab === "verified" ? verified : unverified;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-8">
      <h1 className="text-xl font-bold text-jerumi-700">🗂️ 파운데이션 색상 DB 관리</h1>

      <div className="mt-5 flex gap-2">
        <TabButton active={tab === "verified"} onClick={() => setTab("verified")}>
          ✅ 정확측정 데이터 ({verified.length})
        </TabButton>
        <TabButton active={tab === "unverified"} onClick={() => setTab("unverified")}>
          📦 일반(미검증) 데이터 ({unverified.length})
        </TabButton>
      </div>

      <p className="mt-3 text-xs text-jerumi-500">
        {tab === "verified"
          ? "실제 카드+스와치 사진으로 정밀 측정해서 넣은 색상이에요. 사용자가 '정확측정 데이터만'을 선택하면 이 목록에서만 추천돼요."
          : "정밀 측정을 거치지 않은(또는 다른 출처의) 색상이에요. 사용자가 '전체 데이터'를 선택했을 때만 추천 후보에 포함돼요."}
      </p>

      {listError && <p className="mt-4 text-sm text-red-600">{listError}</p>}

      <section className="mt-4">
        <h2 className="text-sm font-semibold text-jerumi-600">등록된 색상</h2>
        <ShadeList
          shades={pool}
          password={password}
          onChanged={reload}
        />
      </section>

      <section className="mt-8 border-t border-jerumi-200 pt-6">
        <h2 className="text-sm font-semibold text-jerumi-600">새 색상 추가</h2>
        <AddShadeForm tab={tab} password={password} onSaved={reload} />
      </section>

      <section className="mt-10 border-t border-jerumi-200 pt-6">
        <h2 className="text-sm font-semibold text-jerumi-600">📇 카드 기준값 재설정 (선택)</h2>
        <CardReferenceSection password={password} />
      </section>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl2 px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-jerumi-500 text-white" : "bg-white text-jerumi-500 border border-jerumi-200"
      }`}
    >
      {children}
    </button>
  );
}

function ShadeList({
  shades,
  password,
  onChanged,
}: {
  shades: Shade[];
  password: string;
  onChanged: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const brands = Array.from(new Set(shades.map((s) => s.brand))).sort();

  if (shades.length === 0) {
    return <p className="mt-2 text-sm text-jerumi-400">아직 등록된 색상이 없어요.</p>;
  }

  return (
    <div className="mt-2 flex flex-col gap-4">
      {brands.map((brand) => (
        <div key={brand} className="rounded-xl2 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-jerumi-400">
            {brand} ({shades.filter((s) => s.brand === brand).length}개)
          </p>
          <div className="flex flex-col gap-2">
            {shades
              .filter((s) => s.brand === brand)
              .map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 shrink-0 rounded-full border border-black/5"
                    style={{ backgroundColor: labToCss(s.L, s.a, s.b) }}
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-jerumi-800">{s.name}</p>
                    <p className="text-xs text-jerumi-400">
                      L={s.L.toFixed(1)}, a={s.a.toFixed(1)}, b={s.b.toFixed(1)}
                    </p>
                  </div>
                  <button
                    disabled={deletingId === s.id}
                    onClick={async () => {
                      if (!confirm(`"${s.brand} ${s.name}"을(를) 삭제할까요?`)) return;
                      setDeletingId(s.id);
                      const res = await deleteShade(s.id, password);
                      setDeletingId(null);
                      if (res.ok) onChanged();
                      else alert(res.error || "삭제 실패");
                    }}
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddShadeForm({
  tab,
  password,
  onSaved,
}: {
  tab: Tab;
  password: string;
  onSaved: () => void;
}) {
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  // 미검증 탭에서만 방식을 고를 수 있어요. 정확측정 탭은 항상 카드+스와치 방식이에요.
  const [method, setMethod] = useState<"card" | "image">("card");
  const useCard = tab === "verified" || method === "card";
  const maxPhotos = useCard ? 5 : 1;

  const [photos, setPhotos] = useState<File[]>([]);
  const [crops, setCrops] = useState<(CropBox | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const arr = Array.from(fileList).slice(0, maxPhotos);
    setPhotos(arr);
    setCrops(arr.map(() => null));
    setResultMsg(null);
    setErrorMsg(null);
  }

  function reset() {
    setBrand("");
    setName("");
    setPhotos([]);
    setCrops([]);
  }

  const allCropped = photos.length > 0 && crops.length === photos.length && crops.every((c) => c !== null);

  async function handleSubmit() {
    if (!brand.trim() || !name.trim()) {
      setErrorMsg("브랜드명과 색상명을 입력해주세요.");
      return;
    }
    if (!allCropped) {
      setErrorMsg("모든 사진에서 색상 영역을 선택해주세요.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    setResultMsg(null);
    const res = await addShade({
      password,
      brand: brand.trim(),
      name: name.trim(),
      verified: tab === "verified",
      useCard,
      files: photos,
      crops: crops as CropBox[],
    });
    setSubmitting(false);
    if (res.success) {
      setResultMsg("저장 완료!");
      reset();
      onSaved();
    } else {
      setErrorMsg(res.message || "저장 실패");
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl2 bg-white p-4 shadow-sm">
      <div className="flex gap-2">
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="브랜드명"
          className="flex-1 rounded-lg border border-jerumi-200 px-3 py-2 text-sm outline-none focus:border-jerumi-400"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="색상명"
          className="flex-1 rounded-lg border border-jerumi-200 px-3 py-2 text-sm outline-none focus:border-jerumi-400"
        />
      </div>

      {tab === "verified" ? (
        <p className="text-xs text-jerumi-500">
          포토부스에서 색상카드 + 파운데이션 스와치를 같은 카메라로 여러 번(최대 5장) 촬영한 사진을 올려주세요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={method === "image"}
              onChange={() => {
                setMethod("image");
                setPhotos([]);
                setCrops([]);
              }}
            />
            🖼️ 이미지에서 색상만 추출 (보정 없이 그대로, 1장)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={method === "card"}
              onChange={() => {
                setMethod("card");
                setPhotos([]);
                setCrops([]);
              }}
            />
            📷 카드+스와치 사진 (카메라 보정 포함, 최대 5장)
          </label>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        multiple={maxPhotos > 1}
        onChange={(e) => handleFiles(e.target.files)}
        className="text-sm"
      />

      {photos.map((photo, i) => (
        <div key={i}>
          <p className="mb-1 text-xs font-medium text-jerumi-500">사진 {i + 1}/{photos.length}</p>
          <ImageCropBox
            file={photo}
            onCropChange={(box) =>
              setCrops((prev) => {
                const next = [...prev];
                next[i] = box;
                return next;
              })
            }
          />
        </div>
      ))}

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
      {resultMsg && <p className="text-sm text-green-600">{resultMsg}</p>}

      <button
        disabled={submitting || !brand || !name || !allCropped}
        onClick={handleSubmit}
        className="rounded-xl2 bg-jerumi-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-jerumi-600 disabled:bg-jerumi-200"
      >
        {submitting ? "저장 중..." : "이 색상으로 저장"}
      </button>
    </div>
  );
}

function CardReferenceSection({ password }: { password: string }) {
  const [current, setCurrent] = useState<Record<string, number[]> | null | undefined>(undefined);
  const [preview, setPreview] = useState<Record<string, number[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCardReference(password).then((res) => {
      if (res.success) setCurrent(res.patches ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl2 bg-white p-4 shadow-sm">
      <p className="text-xs text-jerumi-500">
        지금은 컬러체커 클래식의 공식 발표 수치를 정답으로 놓고 보정하고 있어요. 특정 카드/조명 조합에서 보정이
        과하게 느껴지면, 카드만 깨끗하게(반사·그림자 없이 정면에서 크게) 찍은 사진 한 장을 등록해서 실측값을 새
        기준으로 바꿀 수 있어요.
      </p>

      {current === undefined && <p className="text-xs text-jerumi-400">현재 상태 확인 중...</p>}
      {current === null && <p className="text-xs text-jerumi-500">지금은 공식 기준값을 쓰고 있어요.</p>}
      {current && (
        <div>
          <p className="text-xs text-green-600">
            지금은 커스텀 기준값을 쓰고 있어요 ({Object.keys(current).length}/24개 패치 등록됨)
          </p>
          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              const res = await resetCardReference(password);
              setLoading(false);
              if (res.success) {
                setCurrent(null);
                setMessage("공식 기준값으로 되돌렸어요");
              } else setError(res.message || "되돌리기 실패");
            }}
            className="mt-1 rounded-lg border border-jerumi-300 px-3 py-1.5 text-xs text-jerumi-600 hover:bg-jerumi-50"
          >
            공식 기준값으로 되돌리기
          </button>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setLoading(true);
          setError(null);
          setMessage(null);
          const res = await previewCardReference(password, file);
          setLoading(false);
          if (res.success && res.patches) {
            setPreview(res.patches);
            setMessage(res.message);
          } else {
            setError(res.message || "인식 실패");
          }
        }}
        className="text-sm"
      />

      {loading && <p className="text-xs text-jerumi-400">처리 중...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && (
        <div>
          <p className="mb-2 text-xs text-jerumi-500">{message}</p>
          <div className="grid grid-cols-6 gap-1">
            {Object.entries(preview).map(([pname, rgb]) => (
              <div key={pname} title={pname}>
                <div
                  className="h-6 w-full rounded"
                  style={{ backgroundColor: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={async () => {
              setLoading(true);
              const res = await saveCardReference(password, preview);
              setLoading(false);
              if (res.success) {
                setCurrent(preview);
                setPreview(null);
                setMessage("저장 완료! 이제부터 이 값을 기준으로 보정돼요.");
              } else setError(res.message || "저장 실패");
            }}
            className="mt-3 rounded-xl2 bg-jerumi-500 px-4 py-2 text-sm font-semibold text-white hover:bg-jerumi-600"
          >
            이 값을 새 기준으로 저장
          </button>
        </div>
      )}
    </div>
  );
}
