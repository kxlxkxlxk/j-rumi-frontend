"use client";

import { useEffect, useRef, useState } from "react";

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
export function ImageCropBox({
  file,
  onCropChange,
}: {
  file: File;
  onCropChange: (box: CropBox | null) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number } | null>(null);
  const [displayBox, setDisplayBox] = useState<CropBox | null>(null);
  const draggingFrom = useRef<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    setDisplayBox(null);
    onCropChange(null);
    return () => URL.revokeObjectURL(objUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  function handleImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    setDisplay({ w: img.clientWidth, h: img.clientHeight });
  }

  function relativePos(e: React.PointerEvent) {
    const rect = wrapRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(e.clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(e.clientY - rect.top, 0), rect.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    const pos = relativePos(e);
    draggingFrom.current = pos;
    setDisplayBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingFrom.current) return;
    const pos = relativePos(e);
    const start = draggingFrom.current;
    setDisplayBox({
      x: Math.min(start.x, pos.x),
      y: Math.min(start.y, pos.y),
      w: Math.abs(pos.x - start.x),
      h: Math.abs(pos.y - start.y),
    });
  }

  function handlePointerUp() {
    draggingFrom.current = null;
    setDisplayBox((current) => {
      if (!current || !natural || !display || current.w < 8 || current.h < 8) {
        onCropChange(null);
        return current;
      }
      const scaleX = natural.w / display.w;
      const scaleY = natural.h / display.h;
      onCropChange({
        x: Math.round(current.x * scaleX),
        y: Math.round(current.y * scaleY),
        w: Math.round(current.w * scaleX),
        h: Math.round(current.h * scaleY),
      });
      return current;
    });
  }

  return (
    <div>
      <div
        ref={wrapRef}
        className="relative touch-none select-none overflow-hidden rounded-lg border border-jerumi-200 bg-black/5"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="크롭할 사진"
            className="block h-auto max-w-full"
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
          : "사진 위에서 색상을 측정할 부분을 마우스(또는 손가락)로 드래그해서 네모로 선택해주세요"}
      </p>
    </div>
  );
}
