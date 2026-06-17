function getImageData(
  url: string,
  onSuccess: (imageData: ImageData) => void,
  onError: OnErrorEventHandler,
) {
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");

    canvas.width = image.width;

    canvas.height = image.height;

    const ctx = canvas.getContext("2d");

    if (ctx === null) {
      return;
    }

    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    canvas.remove();

    onSuccess(imageData);
  };

  image.onerror = onError;

  image.src = url;
}

interface OmmatidiaProps {
  imageURL: string;
  canvasId: string;
}

interface OmmatidiaPropsWithImageData extends OmmatidiaProps {
  imageData: ImageData;
}

// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
async function scaleImageDataToFitCanvas({
  imageData,
  target,
}: {
  imageData: ImageData;
  target: HTMLCanvasElement;
}): Promise<ImageData | null> {
  const targetWidth = target.width;

  const targetHeight = target.height;

  const bitmap = await createImageBitmap(imageData);

  const canvas = document.createElement("canvas");

  canvas.width = targetWidth;

  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");

  if (ctx === null) {
    return null;
  }

  // ctx.drawImage(
  //   bitmap,
  //   0,
  //   0,
  //   targetWidth,
  //   targetHeight,
  //   0,
  //   0,
  //   targetWidth,
  //   targetHeight,
  // );

  ctx.imageSmoothingEnabled = true;

  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}

async function handleGetImageDataOnSuccess({
  imageURL,
  canvasId,
  imageData,
}: OmmatidiaPropsWithImageData) {
  const canvas = document.getElementById(canvasId);

  if (canvas === null || !(canvas instanceof HTMLCanvasElement)) {
    console.error(`[ommatidia]: no canvas found with id "${canvasId}"`);
    return;
  }

  const ctx = canvas.getContext("2d");

  if (ctx === null) {
    return;
  }

  const scaledImageData = await scaleImageDataToFitCanvas({
    imageData,
    target: canvas,
  });

  if (scaledImageData === null) {
    return;
  }

  console.log(imageData);

  ctx.putImageData(imageData, 0, 0);
}

function handleGetImageDataOnError({
  imageURL,
}: {
  event: string | Event;
  imageURL: string;
}) {
  console.error(`[ommatidia]: error loading image "${imageURL}"`);
}

export function ommatidia({ imageURL, canvasId }: OmmatidiaProps) {
  getImageData(
    imageURL,
    (imageData) =>
      handleGetImageDataOnSuccess({ imageData, imageURL, canvasId }),
    (event) => handleGetImageDataOnError({ event, imageURL }),
  );
}
