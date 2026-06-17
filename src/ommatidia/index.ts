function drawImageCover(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
): ImageData | null {
  const rect = canvas.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;

  if (displayWidth === 0 || displayHeight === 0) {
    return null;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(displayWidth * dpr);
  canvas.height = Math.round(displayHeight * dpr);

  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return null;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function loadImage(
  url: string,
  canvasId: string,
  onSuccess: (imageData: ImageData) => void,
  onError: OnErrorEventHandler,
) {
  const image = new Image();

  image.onload = () => {
    const canvas = document.getElementById(canvasId);
    if (canvas === null || !(canvas instanceof HTMLCanvasElement)) {
      console.error(`[ommatidia]: no canvas found with id "${canvasId}"`);
      return;
    }

    const imageData = drawImageCover(image, canvas);
    if (imageData !== null) {
      onSuccess(imageData);
    }
  };

  image.onerror = onError;
  image.src = url;
}

interface OmmatidiaProps {
  imageURL: string;
  canvasId: string;
}

function handleLoadImageSuccess(_props: {
  imageURL: string;
  canvasId: string;
  imageData: ImageData;
}) {
  // Image is already drawn with object-fit: cover; imageData is available
  // for any downstream pixel processing (e.g. ommatidia effect).
}

function handleLoadImageError({
  imageURL,
}: {
  event: string | Event;
  imageURL: string;
}) {
  console.error(`[ommatidia]: error loading image "${imageURL}"`);
}

export function ommatidia({ imageURL, canvasId }: OmmatidiaProps) {
  loadImage(
    imageURL,
    canvasId,
    (imageData) =>
      handleLoadImageSuccess({ imageData, imageURL, canvasId }),
    (event) => handleLoadImageError({ event, imageURL }),
  );
}
