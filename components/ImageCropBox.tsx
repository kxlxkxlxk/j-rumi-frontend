"use client";

import { useRef, useState, useEffect } from "react";

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// 사진 위에 드래그로 네모를 그려서 "색상을 측정할 영역"을 고르는 아주 단순한
// 크롭 도구예요. 별도 라이브러리 없이 순수 React + 마우스/터치 이벤트로만
// 만들었어요 (이미지에 표시되는 크기 기준 좌표를, 실제 원본 사진 픽셀 좌표로
// 환산해서 부모에게 알려줘요).
//
// 드래그 추적은 window 전체에 이벤트를 붙여서 처리해요 (엘리먼트 안쪽에만
// 붙이면, 빠르게 드래그하다가 사진 바깥으로 살짝 벗어나는 순간 추적이
// 끊기거나 어긋날 수 있어서, 그걸 방지하려고 이렇게 만들었어요).
export function ImageCropBox({
  file,
  onCropChange,
}: {
  file: File;
  onCropChange: (box: CropBox | null) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [displayBox, setDisplayBox] = useState<CropBox | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const naturalRef = useRef<{ w: number; h: number } | null>(null);
  const displaySizeRef = useRef<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    setDisplayBox(null);
    naturalRef.current = null;
    displaySizeRef.current = null;
    onCropChange(null);
    return () => URL.revokeObjectURL(objUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  function handleImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    naturalRef.current = { w: img.naturalWidth, h: img.naturalHeight };
    displaySizeRef.current = { w: img.clientWidth, h: img.clientHeight };
  }

  function posFromClient(clientX: number, clientY: number) {
    const rect = wrapRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(clientY - rect.top, 0), rect.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    // 브라우저 기본 텍스트/이미지 드래그-선택 동작을 막아요 (안 막으면 크롭
    // 박스랑 같이 브라우저 자체 선택 박스가 겹쳐 보여서 지저분해요).
    e.preventDefault();

    // 화면에 실제로 이미지가 그려진 뒤의 크기를, 드래그를 시작하는 이
    // 순간에 다시 한번 정확히 재보고 시작해요 (레이아웃이 로드 시점과
    // 아주 살짝 달라졌을 가능성까지 없애기 위해서예요).
    const imgEl = wrapRef.current?.querySelector("img");
    if (imgEl) {
      displaySizeRef.current = { w: imgEl.clientWidth, h: imgEl.clientHeight };
    }

    const start = posFromClient(e.clientX, e.clientY);
    setDisplayBox({ x: start.x, y: start.y, w: 0, h: 0 });

    function handleMove(ev: PointerEvent) {
      const pos = posFromClient(ev.clientX, ev.clientY);
      setDisplayBox({
        x: Math.min(start.x, pos.x),
        y: Math.min(start.y, pos.y),
        w: Math.abs(pos.x - start.x),
        h: Math.abs(pos.y - start.y),
      });
    }

    function finish(ev: PointerEvent) {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);

      const pos = posFromClient(ev.clientX, ev.clientY);
      const box = {
        x: Math.min(start.x, pos.x),
        y: Math.min(start.y, pos.y),
        w: Math.abs(pos.x - start.x),
        h: Math.abs(pos.y - start.y),
      };

      const natural = naturalRef.current;
      const disp = displaySizeRef.current;
      if (box.w < 8 || box.h < 8 || !natural || !disp) {
        onCropChange(null);
        return;
      }
      setDisplayBox(box);
      const scaleX = natural.w / disp.w;
      const scaleY = natural.h / disp.h;
      onCropChange({
        x: Math.round(box.x * scaleX),
        y: Math.round(box.y * scaleY),
        w: Math.round(box.w * scaleX),
        h: Math.round(box.h * scaleY),
      });
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

  return (
    <div>
      <div
        ref={wrapRef}
        className="relative inline-block max-w-full touch-none select-none overflow-hidden rounded-lg border border-jerumi-200 bg-black/5"
        onPointerDown={handlePointerDown}
      >
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="크롭할 사진"
            className="block max-w-full"
            draggable={false}
            onLoad={handleImgLoad}
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
