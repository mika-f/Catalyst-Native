import type { CSSProperties } from "react";

import iconUrl from "../../images/icon.png";
import type { FormatKey, StoreFormat, StoreSlide } from "../content";

const screenshots = import.meta.glob<string>("../screenshots/*.PNG", {
  eager: true,
  import: "default",
  query: "?url",
});

type CanvasStyle = CSSProperties & Record<`--${string}`, string | number>;
type PreviewFormat = StoreFormat & { scale: number };

interface StoreCanvasProps {
  editable?: boolean;
  format: PreviewFormat;
  formatKey: FormatKey;
  slide: StoreSlide;
}

function screenshotUrl(filename: string): string {
  const url = screenshots[`../screenshots/${filename}`];

  if (!url) {
    throw new Error(`Screenshot asset was not found: ${filename}`);
  }

  return url;
}

export function StoreCanvas({ editable = false, format, formatKey, slide }: StoreCanvasProps) {
  const compact = formatKey === "google-play";
  const isIpad = formatKey === "app-store-ipad";
  const canvasStyle: CanvasStyle = {
    "--accent": slide.accent,
    "--accent-soft": slide.accentSoft,
    "--canvas-height": format.height,
    "--canvas-width": format.width,
    "--scale": format.scale,
  };

  return (
    <div className="canvas-slot" style={canvasStyle}>
      <article
        aria-label={`${slide.eyebrow} store screenshot`}
        className="store-canvas relative isolate overflow-hidden bg-[#f7f8fa] font-sans text-[#17181c]"
        style={canvasStyle}
      >
        <div className="absolute inset-x-0 top-0 h-[22px] bg-[var(--accent)]" />

        <div className="font-utility absolute left-[76px] top-[98px] flex items-center gap-[24px] text-[30px] font-semibold tracking-[0.18em]">
          <span className="text-[var(--accent)]">Catalyst</span>
          <span className="h-[2px] w-[70px] bg-[#cdd1d8]" />
          <span className="text-[#777d88]">{slide.eyebrow}</span>
        </div>
        <div className="font-utility absolute right-[70px] top-[80px] text-[76px] font-bold tracking-[-0.06em] text-[#d8dbe1]">
          {slide.number}
        </div>

        <header className={`absolute right-[70px] left-[76px] ${compact ? "top-[225px]" : "top-[260px]"}`}>
          <h1
            className="m-0 text-[94px] leading-[1.24] font-bold tracking-[-0.055em]"
            contentEditable={editable}
            suppressContentEditableWarning
          >
            <span className="relative inline-block">
              <span className="absolute inset-x-[-12px] bottom-[8px] -z-10 h-[27px] bg-[var(--accent-soft)]" />
              {slide.headline[0]}
            </span>
            <br />
            {slide.headline[1]}
          </h1>
          <p
            className={`mt-[40px] max-w-[1040px] leading-[1.7] tracking-[-0.025em] text-[#626873] ${compact ? "text-[32px]" : "text-[36px]"}`}
            contentEditable={editable}
            suppressContentEditableWarning
          >
            {slide.note}
          </p>
        </header>

        <div
          className={`absolute overflow-hidden border-b-0 border-[#202126] bg-[#202126] shadow-[0_36px_80px_rgba(20,23,30,0.22)] ${isIpad
              ? "top-[845px] left-[194px] w-[1660px] rounded-t-[66px] border-[66px]"
              : compact
                ? "top-[748px] left-[76px] w-[928px] rounded-t-[112px] border-[18px]"
                : "top-[845px] left-[76px] w-[1132px] rounded-t-[112px] border-[18px]"
            }`}
        >
          <div className={`relative overflow-hidden bg-black ${isIpad ? "rounded-t-[10px]" : "rounded-t-[90px]"}`}>
            <img alt="" className="block h-auto w-full" draggable="false" src={screenshotUrl(slide.screenshot[formatKey])} />
            {isIpad ? (
              null
            ) : (
              <div className="absolute top-[20px] left-1/2 h-[38px] w-[144px] -translate-x-1/2 rounded-full bg-[#050506]" />
            )}
          </div>
        </div>

        <div className="absolute right-[54px] bottom-[54px] flex h-[78px] w-[78px] items-center justify-center rounded-full bg-white shadow-[0_12px_28px_rgba(23,24,28,0.12)]">
          <img alt="" className="h-[58px] w-[58px] rounded-[14px]" src={iconUrl} />
        </div>
      </article>
    </div>
  );
}
