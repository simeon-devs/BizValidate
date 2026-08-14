"use client";

import { useEffect } from "react";

// A collapsed <details> cannot be revealed with CSS — Chrome omits its
// content from the printed output entirely. Since the metric cards cite
// sources by number ([S1], [S2]) that only resolve inside the evidence panel,
// printing it collapsed would leave dangling references in the document a
// founder forwards to an investor. Open every panel before printing and
// restore the screen state afterwards.
export function PrintExpander() {
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];

    const expand = () => {
      opened = Array.from(
        document.querySelectorAll<HTMLDetailsElement>("details:not([open])"),
      );
      for (const panel of opened) panel.open = true;
    };

    const restore = () => {
      for (const panel of opened) panel.open = false;
      opened = [];
    };

    window.addEventListener("beforeprint", expand);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", expand);
      window.removeEventListener("afterprint", restore);
    };
  }, []);

  return null;
}
