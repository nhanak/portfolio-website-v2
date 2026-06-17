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

function handleGetImageDataOnSuccess({
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
