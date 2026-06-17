interface OmmatidiaProps {
  imageURL: string;
  canvasId: string;
  /** Fixed region of the source image each facet is tied to. */
  gridCellSize?: number;
  /** Portion of that region shown at once; must be smaller than gridCellSize. */
  viewportSize?: number;
  /** On-screen facet size in CSS pixels. */
  facetSize?: number;
  gap?: number;
  gapColor?: string;
}

interface HoveredFacet {
  col: number;
  row: number;
  localX: number;
  localY: number;
  facetWidth: number;
  facetHeight: number;
}

interface OmmatidiaState {
  displayWidth: number;
  displayHeight: number;
  dpr: number;
  gridCellSize: number;
  viewportSize: number;
  facetSize: number;
  gap: number;
  gapColor: string;
  cols: number;
  rows: number;
  mouseOnCanvas: boolean;
  hovered: HoveredFacet | null;
  rafId: number | null;
  needsRender: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createSourceCanvas(
  image: HTMLImageElement,
  displayWidth: number,
  displayHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = displayWidth;
  canvas.height = displayHeight;

  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return canvas;
  }

  const imgWidth = image.naturalWidth;
  const imgHeight = image.naturalHeight;
  const imageRatio = imgWidth / imgHeight;
  const targetRatio = displayWidth / displayHeight;

  let sx: number;
  let sy: number;
  let sw: number;
  let sh: number;

  if (imageRatio > targetRatio) {
    sh = imgHeight;
    sw = imgHeight * targetRatio;
    sx = (imgWidth - sw) / 2;
    sy = 0;
  } else {
    sw = imgWidth;
    sh = imgWidth / targetRatio;
    sx = 0;
    sy = (imgHeight - sh) / 2;
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, displayWidth, displayHeight);
  return canvas;
}

function getHoveredFacet(
  mouseX: number,
  mouseY: number,
  state: Pick<
    OmmatidiaState,
    "displayWidth" | "displayHeight" | "facetSize" | "gap" | "cols" | "rows"
  >,
): HoveredFacet | null {
  const pitch = state.facetSize + state.gap;

  if (
    mouseX < 0 ||
    mouseY < 0 ||
    mouseX >= state.displayWidth ||
    mouseY >= state.displayHeight
  ) {
    return null;
  }

  const col = Math.floor(mouseX / pitch);
  const row = Math.floor(mouseY / pitch);

  if (col < 0 || row < 0 || col >= state.cols || row >= state.rows) {
    return null;
  }

  const destX = col * pitch;
  const destY = row * pitch;
  const facetWidth = Math.min(state.facetSize, state.displayWidth - destX);
  const facetHeight = Math.min(state.facetSize, state.displayHeight - destY);
  const localX = mouseX - destX;
  const localY = mouseY - destY;

  if (localX < 0 || localY < 0 || localX > facetWidth || localY > facetHeight) {
    return null;
  }

  return { col, row, localX, localY, facetWidth, facetHeight };
}

function renderOmmatidia(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement,
  state: OmmatidiaState,
) {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return;
  }

  const {
    displayWidth,
    displayHeight,
    dpr,
    gridCellSize,
    viewportSize,
    facetSize,
    gap,
    cols,
    rows,
    mouseOnCanvas,
    hovered,
    gapColor,
  } = state;

  const pitch = facetSize + gap;
  const maxPanX = gridCellSize - viewportSize;
  const maxPanY = gridCellSize - viewportSize;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = gapColor;
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const destX = col * pitch;
      const destY = row * pitch;

      if (destX >= displayWidth || destY >= displayHeight) {
        continue;
      }

      const drawWidth = Math.min(facetSize, displayWidth - destX);
      const drawHeight = Math.min(facetSize, displayHeight - destY);

      const gridOriginX = col * gridCellSize;
      const gridOriginY = row * gridCellSize;

      let panX = maxPanX / 2;
      let panY = maxPanY / 2;

      if (
        mouseOnCanvas &&
        hovered !== null &&
        hovered.col === col &&
        hovered.row === row
      ) {
        panX = clamp(
          (hovered.localX / hovered.facetWidth) * maxPanX,
          0,
          maxPanX,
        );
        panY = clamp(
          (hovered.localY / hovered.facetHeight) * maxPanY,
          0,
          maxPanY,
        );
      }

      ctx.drawImage(
        source,
        gridOriginX + panX,
        gridOriginY + panY,
        viewportSize,
        viewportSize,
        destX,
        destY,
        drawWidth,
        drawHeight,
      );
    }
  }
}

function requestRender(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement,
  state: OmmatidiaState,
) {
  state.needsRender = true;

  if (state.rafId !== null) {
    return;
  }

  state.rafId = requestAnimationFrame(() => {
    state.rafId = null;
    if (!state.needsRender) {
      return;
    }
    state.needsRender = false;
    renderOmmatidia(canvas, source, state);
  });
}

function setupCanvasSize(
  canvas: HTMLCanvasElement,
  displayWidth: number,
  displayHeight: number,
  dpr: number,
) {
  canvas.width = Math.round(displayWidth * dpr);
  canvas.height = Math.round(displayHeight * dpr);
}

function startOmmatidiaEffect(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement,
  props: Required<
    Pick<
      OmmatidiaProps,
      "gridCellSize" | "viewportSize" | "facetSize" | "gap" | "gapColor"
    >
  >,
) {
  const rect = canvas.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;
  const dpr = window.devicePixelRatio || 1;
  const pitch = props.facetSize + props.gap;

  setupCanvasSize(canvas, displayWidth, displayHeight, dpr);

  const state: OmmatidiaState = {
    displayWidth,
    displayHeight,
    dpr,
    gridCellSize: props.gridCellSize,
    viewportSize: props.viewportSize,
    facetSize: props.facetSize,
    gap: props.gap,
    gapColor: props.gapColor,
    cols: Math.ceil(displayWidth / pitch),
    rows: Math.ceil(displayHeight / pitch),
    mouseOnCanvas: false,
    hovered: null,
    rafId: null,
    needsRender: true,
  };

  const updateMouse = (mouseX: number, mouseY: number, onCanvas: boolean) => {
    state.mouseOnCanvas = onCanvas;
    state.hovered = onCanvas ? getHoveredFacet(mouseX, mouseY, state) : null;
    requestRender(canvas, source, state);
  };

  const onMouseMove = (event: MouseEvent) => {
    const bounds = canvas.getBoundingClientRect();
    updateMouse(event.clientX - bounds.left, event.clientY - bounds.top, true);
  };

  const onMouseLeave = () => {
    state.mouseOnCanvas = false;
    state.hovered = null;
    requestRender(canvas, source, state);
  };

  const onResize = () => {
    const nextRect = canvas.getBoundingClientRect();
    const nextWidth = nextRect.width;
    const nextHeight = nextRect.height;

    if (nextWidth === 0 || nextHeight === 0) {
      return;
    }

    state.displayWidth = nextWidth;
    state.displayHeight = nextHeight;
    state.cols = Math.ceil(nextWidth / pitch);
    state.rows = Math.ceil(nextHeight / pitch);
    state.hovered = null;
    setupCanvasSize(canvas, nextWidth, nextHeight, state.dpr);
    requestRender(canvas, source, state);
  };

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);
  window.addEventListener("resize", onResize);

  requestRender(canvas, source, state);

  return () => {
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseleave", onMouseLeave);
    window.removeEventListener("resize", onResize);
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
    }
  };
}

function loadImage(url: string, onError: OnErrorEventHandler): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (event) => {
      onError?.call(image, event);
      reject(event);
    };
    image.src = url;
  });
}

export function ommatidia({
  imageURL,
  canvasId,
  gridCellSize = 50,
  viewportSize = 25,
  facetSize = 50,
  gap = 2,
  gapColor = "#0a0a0a",
}: OmmatidiaProps) {
  const safeViewportSize = Math.min(viewportSize, gridCellSize - 1);

  loadImage(imageURL, () => {
    console.error(`[ommatidia]: error loading image "${imageURL}"`);
  })
    .then((image) => {
      const canvas = document.getElementById(canvasId);
      if (canvas === null || !(canvas instanceof HTMLCanvasElement)) {
        console.error(`[ommatidia]: no canvas found with id "${canvasId}"`);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      const source = createSourceCanvas(image, rect.width, rect.height);
      startOmmatidiaEffect(canvas, source, {
        gridCellSize,
        viewportSize: safeViewportSize,
        facetSize,
        gap,
        gapColor,
      });
    })
    .catch(() => {
      // Error already logged in onError handler.
    });
}
