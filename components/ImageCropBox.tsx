"use client";

import { useRef, useState, useEffect } from "react";

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// 사진 위에 드래그로 네모를 그려서 "색상을 측정할 영역"을 고르는 크롭
// 도구예요.
//
// 이전 버전은 <img> 태그의 offsetX/offsetY(브라우저가 계산해주는 값)를
// 썼는데, 실제 녹화 영상을 프레임 단위로 뜯어서 분석해보니 드래그 도중
// 마우스가 사진 영역을 살짝만 벗어나도(포인터를 "붙잡아두는"
// setPointerCapture와 같이 쓰일 때 크롬에서 벌어지는 현상) 그 좌표가 사진
// 기준이 아니라 훨씬 큰 엉뚱한 값으로 계산되고, 그게 사진 너비로
// clamp(고정)되면서 "항상 사진 전체 너비만큼 박스가 그려지는" 문제가
// 있었어요. 그래서 드래그 크기와 상관없이 박스가 늘 오른쪽 끝까지 이상하게
// 그려졌던 거예요.
//
// 이번 버전은 그 값을 아예 쓰지 않고, 매 순간 getBoundingClientRect()로
// "사진이 화면 어디에 있는지"를 새로 구하고, 거기에 clientX/clientY(마우스의
// 화면상 절대 좌표, 위 버그의 영향을 받지 않는 값)를 빼서 직접 계산해요.
// 이러면 스크롤이 되어 있거나 화면이 움직여도, 그리고 위 브라우저 이슈와도
// 상관없이 항상 정확한 위치가 나와요.
export function ImageCropBox({
  file,
  onCropChange,
}: {
  file: File;
  onCropChange: (box: CropBox | null) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const naturalRef = useRef<{ w: number; h: number } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [displayBox, setDisplayBox] = useState<CropBox | null>(null);

  useEffect(() => {
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    setDisplayBox(null);
    naturalRef.current = null;
    onCropChange(null);
    return () => URL.revokeObjectURL(objUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  function handleImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    naturalRef.current = { w: img.naturalWidth, h: img.naturalHeight };
  }

  function clamp(v: number, max: number) {
    return Math.min(Math.max(v, 0), max);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLImageElement>) {
    // 브라우저 기본 이미지 드래그/선택 동작을 막아요.
    e.preventDefault();
    const img = imgRef.current;
    if (!img) return;

    // 포인터를 사진에 "붙잡아둬서" 드래그 중 커서가 빠르게 움직여도 이벤트를
    // 놓치지 않게 해요. (좌표 계산 자체는 이제 이 값에 의존하지 않아요.)
    try {
      img.setPointerCapture(e.pointerId);
    } catch {
      // 일부 브라우저/환경에서 지원하지 않아도 괜찮아요.
    }

    const rect = img.getBoundingClientRect();
    const startX = clamp(e.clientX - rect.left, rect.width);
    const startY = clamp(e.clientY - rect.top, rect.height);
    setDisplayBox({ x: startX, y: startY, w: 0, h: 0 });

    function toBox(clientX: number, clientY: number) {
      // 드래그 도중 스크롤되거나 레이아웃이 바뀔 수도 있으니 매번 새로
      // 사진의 실제 화면 위치를 구해요.
      const r = img!.getBoundingClientRect();
      const cx = clamp(clientX - r.left, r.width);
      const cy = clamp(clientY - r.top, r.height);
      return {
        x: Math.min(startX, cx),
        y: Math.min(startY, cy),
        w: Math.abs(cx - startX),
        h: Math.abs(cy - startY),
      };
    }

    function handleMove(ev: PointerEvent) {
      setDisplayBox(toBox(ev.clientX, ev.clientY));
    }

    function finish(ev: PointerEvent) {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      try {
        img!.releasePointerCapture(e.pointerId);
      } catch {
        // 무시해도 괜찮아요.
      }

      const box = toBox(ev.clientX, ev.clientY);
      const natural = naturalRef.current;
      const r = img!.getBoundingClientRect();
      if (
        box.w < 8 ||
        box.h < 8 ||
        !natural ||
        r.width === 0 ||
        r.height === 0
      ) {
        setDisplayBox(null);
        onCropChange(null);
        return;
      }
      setDisplayBox(box);
      const scaleX = natural.w / r.width;
      const scaleY = natural.h / r.height;
      onCropChange({
        x: Math.round(box.x * scaleX),
        y: Math.round(box.y * scaleY),
        w: Math.round(box.w * scaleX),
        h: Math.round(box.h * scaleY),
      });
    }

    // 창(window) 레벨에서 듣기 때문에, 드래그 중 마우스가 사진 밖으로
    // 나가도 계속 정확하게 좌표를 추적할 수 있어요.
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

  return (
    <div>
      <div className="relative inline-block max-w-full touch-none select-none overflow-hidden rounded-lg border border-jerumi-200 bg-black/5">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={url}
            alt="크롭할 사진"
            className="block max-w-full"
            draggable={false}
            onLoad={handleImgLoad}
            onPointerDown={handlePointerDown}
          />
        )}
        {displayBox && (
          <div
            className="pointer-events-none absolute border-2 border-jerumi-500 bg-jerumi-500/20"
            style={{
              left: displayBox.x,
              top: displayBox.y,
              width: displayBox.w,
              height: displayBox.h,
            }}
          />
        )}
      </div>
      <p className="mt-1 text-xs text-jerumi-400">
        {displayBox && displayBox.w >= 8
          ? "영역이 선택됐어요 (다시 드래그하면 바뀌어요)"
          : "사진 위에서 색상을 측정할 부분을 마우스(또는 손가락)로 꾹 누른 채 드래그해서 네모로 선택해주세요"}
      </p>
    </div>
  );
}
