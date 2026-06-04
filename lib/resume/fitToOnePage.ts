// US Letter is 11in tall = 1056 CSS px at 96dpi. The resume node carries its own
// 0.6in margins via padding, so the whole node must fit within one page height.
// Leave a small safety margin to absorb sub-pixel rounding.
export const PAGE_CONTENT_PX = 1040;

// Shrink the resume to a single page (Chrome honors `zoom` for print layout, and
// re-measuring after each step accounts for text re-wrapping at the new scale).
// Returns a reset function that restores the original zoom.
export function fitToOnePage(node: HTMLElement): () => void {
  const prevZoom = node.style.zoom;
  node.style.zoom = "1";

  let zoom = 1;
  for (let i = 0; i < 8; i++) {
    node.style.zoom = String(zoom);
    const height = node.getBoundingClientRect().height;
    if (height <= PAGE_CONTENT_PX) break;
    zoom *= (PAGE_CONTENT_PX / height) * 0.99;
  }

  return () => {
    node.style.zoom = prevZoom;
  };
}
