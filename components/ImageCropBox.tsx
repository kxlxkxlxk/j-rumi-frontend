"use client";

import { useRef, useState, useEffect } from "react";

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// 사진 위에 드래그로 네모를 그려서 "색상을 측정할 영역"을 고르는 크롭
// 도구예요. 이전 버전은 바깥 div 기준으로 마우스 좌표를 직접 계산했는데,
// 그 계산이 실제 이미지 위치와 어긋나는 경우가 있었어요. 이번 버전은 그
// 계산을 브라우저가 대신 해주는 네이티브 값(offsetX/offsetY -- "지금
// 가리키고 있는 그 엘리먼트 안에서 몇 픽셀 위치인지"를 브라우저가 직접
// 알려주는 값)을 <img> 태그에 직접 붙여서 쓰도록 바꿨어요. 이러면 테두리,
// 스크롤, 레이아웃 미세 차이 같은 것 때문에 좌표가 어긋날 여지가 없어요.
export function ImageCropBox({
  file,
  onCropChange,
}: {
  file: File;
  onCropChange: (box: CropBox | null) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [displayBox, setDisplayBox] = useState<CropBox | null>(null);
  const naturalRef = useRef<{ w: number; h: number } | null>(null);

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
    const img = e.currentTarget;
    img.setPointerCapture(e.pointerId);

    const startX = clamp(e.nativeEvent.offsetX, img.clientWidth);
    const startY = clamp(e.nativeEvent.offsetY, img.clientHeight);
    setDisplayBox({ x: startX, y: startY, w: 0, h: 0 });

    function toBox(x: number, y: number) {
      const cx = clamp(x, img.clientWidth);
      const cy = clamp(y, img.clientHeight);
      return {
        x: Math.min(startX, cx),
        y: Math.min(startY, cy),
        w: Math.abs(cx - startX),
        h: Math.abs(cy - startY),
      };
    }

    function handleMove(ev: PointerEvent) {
      setDisplayBox(toBox(ev.offsetX, ev.offsetY));
    }

    function finish(ev: PointerEvent) {
      img.removeEventListener("pointermove", handleMove);
      img.removeEventListener("pointerup", finish);
      img.removeEventListener("pointercancel", finish);

      const box = toBox(ev.offsetX, ev.offsetY);
      const natural = naturalRef.current;
      if (box.w < 8 || box.h < 8 || !natural) {
        setDisplayBox(null);
        onCropChange(null);
        return;
      }
      setDisplayBox(box);
      const scaleX = natural.w / img.clientWidth;
      const scaleY = natural.h / img.clientHeight;
      onCropChange({
        x: Math.round(box.x * scaleX),
        y: Math.round(box.y * scaleY),
        w: Math.round(box.w * scaleX),
        h: Math.round(box.h * scaleY),
      });
    }

    img.addEventListener("pointermove", handleMove);
    img.addEventListener("pointerup", finish);
    img.addEventListener("pointercancel", finish);
  }

  return (
    <div>
      <div className="relative inline-block max-w-full touch-none select-none overflow-hidden rounded-lg border border-jerumi-200 bg-black/5">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
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
