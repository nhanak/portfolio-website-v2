interface OmmatidiaProps {
  imageURL: string;
  canvasId: string;
  /** Fixed width of each facet's image tile in source pixels. */
  gridCellWidth?: number;
  /** Fixed height of each facet's image tile in source pixels. */
  gridCellHeight?: number;
  /** Width of the visible sample from each tile. */
  viewportWidth?: number;
  /** Height of the visible sample from each tile. */
  viewportHeight?: number;
  /** On-screen facet width in CSS pixels. */
  facetWidth?: number;
  /** On-screen facet height in CSS pixels. */
  facetHeight?: number;
  gap?: number;
  driftAmplitude?: number;
  driftSpeed?: number;
}

interface OmmatidiaState {
  displayWidth: number;
  displayHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  dpr: number;
  gridCellWidth: number;
  gridCellHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  facetWidth: number;
  facetHeight: number;
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
  sourceWidth: number,
  sourceHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;

  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return canvas;
  }

  const imgWidth = image.naturalWidth;
  const imgHeight = image.naturalHeight;
  const imageRatio = imgWidth / imgHeight;
  const targetRatio = sourceWidth / sourceHeight;

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

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sourceWidth, sourceHeight);
  return canvas;
}

function getGridDimensions(
  displayWidth: number,
  displayHeight: number,
  pitchX: number,
  pitchY: number,
  gridCellWidth: number,
  gridCellHeight: number,
) {
  const cols = Math.ceil(displayWidth / pitchX);
  const rows = Math.ceil(displayHeight / pitchY);

  return {
    cols,
    rows,
    sourceWidth: cols * gridCellWidth,
    sourceHeight: rows * gridCellHeight,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cellPhase(col: number, row: number): [number, number] {
  const seed = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
  const seed2 = Math.sin(col * 269.5 + row * 183.3) * 23421.631;
  return [seed - Math.floor(seed), seed2 - Math.floor(seed2)];
}

function cellDriftFrequencies(col: number, row: number): [number, number] {
  const seed = Math.sin(col * 419.2 + row * 371.9) * 12345.678;
  const seed2 = Math.sin(col * 153.7 + row * 547.1) * 98765.432;
  return [
    0.35 + (seed - Math.floor(seed)) * 0.45,
    0.3 + (seed2 - Math.floor(seed2)) * 0.5,
  ];
}

function computeDrift(
  time: number,
  phaseX: number,
  phaseY: number,
  freqX: number,
  freqY: number,
  amplitude: number,
): [number, number] {
  const driftX = amplitude * Math.sin(time * freqX + phaseX * Math.PI * 2);
  const driftY = amplitude * Math.cos(time * freqY + phaseY * Math.PI * 2);

  return [driftX, driftY];
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
    sourceWidth,
    sourceHeight,
    dpr,
    gridCellWidth,
    gridCellHeight,
    viewportWidth,
    viewportHeight,
    facetWidth,
    facetHeight,
    gap,
    cols,
    rows,
    mouseOnCanvas,
    mouseX,
    mouseY,
    driftAmplitude,
    driftSpeed,
  } = state;

  const pitchX = facetWidth + gap;
  const pitchY = facetHeight + gap;
  const maxPanX = gridCellWidth - viewportWidth;
  const maxPanY = gridCellHeight - viewportHeight;
  const time = performance.now() * 0.001 * driftSpeed;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(
    source,
    0,
    0,
    sourceWidth,
    sourceHeight,
    0,
    0,
    displayWidth,
    displayHeight,
  );

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const destX = col * pitchX;
      const destY = row * pitchY;

      if (destX >= displayWidth || destY >= displayHeight) {
        continue;
      }

      const drawWidth = Math.min(facetWidth, displayWidth - destX);
      const drawHeight = Math.min(facetHeight, displayHeight - destY);

      const gridOriginX = col * gridCellWidth;
      const gridOriginY = row * gridCellHeight;

      let panX = maxPanX / 2;
      let panY = maxPanY / 2;

      if (mouseOnCanvas) {
        panX = (mouseX / displayWidth) * maxPanX;
        panY = (mouseY / displayHeight) * maxPanY;
      }

      const [phaseX, phaseY] = cellPhase(col, row);
      const [freqX, freqY] = cellDriftFrequencies(col, row);
      const [driftX, driftY] = computeDrift(
        time,
        phaseX,
        phaseY,
        freqX,
        freqY,
        driftAmplitude,
      );

      panX = clamp(panX + driftX, 0, maxPanX);
      panY = clamp(panY + driftY, 0, maxPanY);

      const sourceX = clamp(gridOriginX + panX, 0, sourceWidth - viewportWidth);
      const sourceY = clamp(
        gridOriginY + panY,
        0,
        sourceHeight - viewportHeight,
      );

      ctx.drawImage(
        source,
        sourceX,
        sourceY,
        viewportWidth,
        viewportHeight,
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
  getSource: () => HTMLCanvasElement,
  state: OmmatidiaState,
) {
  const tick = () => {
    if (!state.animating) {
      return;
    }
    renderOmmatidia(canvas, getSource(), state);
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
  image: HTMLImageElement,
  props: Required<
    Pick<
      OmmatidiaProps,
      | "gridCellWidth"
      | "gridCellHeight"
      | "viewportWidth"
      | "viewportHeight"
      | "facetWidth"
      | "facetHeight"
      | "gap"
      | "driftAmplitude"
      | "driftSpeed"
    >
  >,
) {
  const rect = canvas.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;
  const dpr = window.devicePixelRatio || 1;
  const pitchX = props.facetWidth + props.gap;
  const pitchY = props.facetHeight + props.gap;

  const grid = getGridDimensions(
    displayWidth,
    displayHeight,
    pitchX,
    pitchY,
    props.gridCellWidth,
    props.gridCellHeight,
  );

  let source = createSourceCanvas(image, grid.sourceWidth, grid.sourceHeight);

  setupCanvasSize(canvas, displayWidth, displayHeight, dpr);

  const state: OmmatidiaState = {
    displayWidth,
    displayHeight,
    sourceWidth: grid.sourceWidth,
    sourceHeight: grid.sourceHeight,
    dpr,
    gridCellWidth: props.gridCellWidth,
    gridCellHeight: props.gridCellHeight,
    viewportWidth: props.viewportWidth,
    viewportHeight: props.viewportHeight,
    facetWidth: props.facetWidth,
    facetHeight: props.facetHeight,
    gap: props.gap,
    cols: grid.cols,
    rows: grid.rows,
    mouseOnCanvas: false,
    mouseX: displayWidth / 2,
    mouseY: displayHeight / 2,
    driftAmplitude: props.driftAmplitude,
    driftSpeed: props.driftSpeed,
    rafId: null,
    animating: true,
  };

  const refreshSource = () => {
    const nextGrid = getGridDimensions(
      state.displayWidth,
      state.displayHeight,
      pitchX,
      pitchY,
      props.gridCellWidth,
      props.gridCellHeight,
    );

    state.cols = nextGrid.cols;
    state.rows = nextGrid.rows;
    state.sourceWidth = nextGrid.sourceWidth;
    state.sourceHeight = nextGrid.sourceHeight;
    source = createSourceCanvas(
      image,
      nextGrid.sourceWidth,
      nextGrid.sourceHeight,
    );
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
    setupCanvasSize(canvas, nextWidth, nextHeight, state.dpr);
    refreshSource();
  };

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);
  window.addEventListener("resize", onResize);

  startAnimationLoop(canvas, () => source, state);

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

function loadImage(
  url: string,
  onError: OnErrorEventHandler,
): Promise<HTMLImageElement> {
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
  gridCellWidth = 90,
  gridCellHeight = 130,
  viewportWidth = 60,
  viewportHeight = 120,
  facetWidth = 90,
  facetHeight = 120,
  gap = 0,
  driftAmplitude = 3.5,
  driftSpeed = 2,
}: OmmatidiaProps) {
  const safeViewportWidth = Math.min(viewportWidth, gridCellWidth - 1);
  const safeViewportHeight = Math.min(viewportHeight, gridCellHeight - 1);

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

      startOmmatidiaEffect(canvas, image, {
        gridCellWidth,
        gridCellHeight,
        viewportWidth: safeViewportWidth,
        viewportHeight: safeViewportHeight,
        facetWidth,
        facetHeight,
        gap,
        driftAmplitude,
        driftSpeed,
      });
    })
    .catch(() => {
      // Error already logged in onError handler.
    });
}
