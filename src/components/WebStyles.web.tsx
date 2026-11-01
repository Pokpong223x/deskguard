import React from "react";
import { colors } from "../theme";

/** The browser preview consumes the same palette as the native app. */
export function WebStyles() {
  return (
    <style>{`
    :root { scrollbar-color: ${colors.muted} ${colors.background}; scrollbar-width: thin; }
    * { scrollbar-color: inherit; scrollbar-width: inherit; box-sizing: border-box; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: ${colors.background}; }
    ::-webkit-scrollbar-thumb { background: ${colors.muted}; border-radius: 8px; }
    ::-webkit-scrollbar-thumb:hover { background: ${colors.ink}; }
    [role="button"], button, [role="switch"] { cursor: pointer; }
    [aria-disabled="true"] { cursor: default; }
    :focus-visible { outline: 2px solid ${colors.ink}; outline-offset: 3px; }
    input { outline-offset: -3px; }
    @media (forced-colors: active) { * { scrollbar-color: auto; } }
  `}</style>
  );
}
