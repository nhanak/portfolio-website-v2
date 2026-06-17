export function getImageData(
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
