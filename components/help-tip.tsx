"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

const TOOLTIP_WIDTH = 288;
const VIEWPORT_GUTTER = 16;
const GAP = 8;

type TooltipPosition = {
  left: number;
  top: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function positionFromTrigger(trigger: HTMLElement): TooltipPosition {
  const rect = trigger.getBoundingClientRect();
  const left = clamp(
    rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2,
    VIEWPORT_GUTTER,
    window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_GUTTER,
  );

  return {
    left,
    top: rect.bottom + GAP,
  };
}

export function HelpTip({ label, text }: { label: string; text: string }) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const show = useCallback(() => {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    setPosition(positionFromTrigger(button));
  }, []);

  const hide = useCallback(() => {
    setPosition(null);
  }, []);

  useLayoutEffect(() => {
    if (!position || !tooltipRef.current || !buttonRef.current) {
      return;
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const overflowsBottom = tooltipRect.bottom > window.innerHeight - VIEWPORT_GUTTER;
    const overflowsTop = tooltipRect.top < VIEWPORT_GUTTER;

    if (overflowsBottom && !overflowsTop) {
      setPosition((current) =>
        current
          ? {
              left: current.left,
              top: Math.max(
                VIEWPORT_GUTTER,
                buttonRect.top - tooltipRect.height - GAP,
              ),
            }
          : current,
      );
    }
  }, [position]);

  useLayoutEffect(() => {
    if (!position) {
      return;
    }

    const reposition = () => {
      if (buttonRef.current) {
        setPosition(positionFromTrigger(buttonRef.current));
      }
    };

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [position]);

  return (
    <>
      <button
        aria-describedby={position ? tooltipId : undefined}
        aria-label={`${label}: ${text}`}
        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        onBlur={hide}
        onFocus={show}
        onMouseEnter={show}
        onMouseLeave={hide}
        ref={buttonRef}
        type="button"
      >
        <HelpCircle aria-hidden size={14} />
      </button>
      {position
        ? createPortal(
            <span
              className="help-card pointer-events-none fixed z-[9999] block w-72 rounded-lg px-3 py-2 text-xs font-semibold leading-5"
              id={tooltipId}
              ref={tooltipRef}
              role="tooltip"
              style={{
                left: position.left,
                top: position.top,
              }}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
