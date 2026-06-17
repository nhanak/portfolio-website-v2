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
  /** Subtle idle drift amplitude in source pixels. */
  driftAmplitude?: number;
  /** Speed multiplier for idle drift. */
  driftSpeed?: number;
}

interface OmmatidiaState {
  displayWidth: number;
  displayHeight: number;
  dpr: number;
  gridCellSize: number;
  viewportSize: number;
  facetSize: number;
  gap: number;
  cols: number;
  rows: number;
  mouseOnCanvas: boolean;
  mouseX: number;
  mouseY: number;
  driftAmplitude: number;
  driftSpeed: number;
  rafId: number | null;
  animating: boolean;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cellPhase(col: number, row: number): [number, number] {
  const seed = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
  const seed2 = Math.sin(col * 269.5 + row * 183.3) * 23421.631;
  return [seed - Math.floor(seed), seed2 - Math.floor(seed2)];
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
    mouseX,
    mouseY,
    driftAmplitude,
    driftSpeed,
  } = state;

  const pitch = facetSize + gap;
  const maxPanX = gridCellSize - viewportSize;
  const maxPanY = gridCellSize - viewportSize;
  const time = performance.now() * 0.001 * driftSpeed;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, displayWidth, displayHeight);

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

      if (mouseOnCanvas) {
        panX = (mouseX / displayWidth) * maxPanX;
        panY = (mouseY / displayHeight) * maxPanY;
      }

      const [phaseX, phaseY] = cellPhase(col, row);
      const driftX =
        Math.sin(time * 0.9 + phaseX * Math.PI * 2) * driftAmplitude;
      const driftY =
        Math.cos(time * 0.7 + phaseY * Math.PI * 2) * driftAmplitude;

      panX = clamp(panX + driftX, 0, maxPanX);
      panY = clamp(panY + driftY, 0, maxPanY);

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

function startAnimationLoop(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement,
  state: OmmatidiaState,
) {
  const tick = () => {
    if (!state.animating) {
      return;
    }
    renderOmmatidia(canvas, source, state);
    state.rafId = requestAnimationFrame(tick);
  };

  state.rafId = requestAnimationFrame(tick);
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
      "gridCellSize" | "viewportSize" | "facetSize" | "gap" | "driftAmplitude" | "driftSpeed"
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
    cols: Math.ceil(displayWidth / pitch),
    rows: Math.ceil(displayHeight / pitch),
    mouseOnCanvas: false,
    mouseX: displayWidth / 2,
    mouseY: displayHeight / 2,
    driftAmplitude: props.driftAmplitude,
    driftSpeed: props.driftSpeed,
    rafId: null,
    animating: true,
  };

  const onMouseMove = (event: MouseEvent) => {
    const bounds = canvas.getBoundingClientRect();
    state.mouseOnCanvas = true;
    state.mouseX = event.clientX - bounds.left;
    state.mouseY = event.clientY - bounds.top;
  };

  const onMouseLeave = () => {
    state.mouseOnCanvas = false;
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
    setupCanvasSize(canvas, nextWidth, nextHeight, state.dpr);
  };

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);
  window.addEventListener("resize", onResize);

  startAnimationLoop(canvas, source, state);

  return () => {
    state.animating = false;
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
  facetSize = gridCellSize,
  gap = 0,
  driftAmplitude = 2.5,
  driftSpeed = 1,
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
        driftAmplitude,
        driftSpeed,
      });
    })
    .catch(() => {
      // Error already logged in onError handler.
    });
}
