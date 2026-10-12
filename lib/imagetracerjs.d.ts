/** imagetracerjs (Unlicense) — без своих типов; берём одну функцию: растровая картинка → SVG. */
declare module 'imagetracerjs' {
  const ImageTracer: {
    imagedataToSVG(img: { width: number; height: number; data: Uint8ClampedArray }, options?: Record<string, number | boolean>): string
  }
  export default ImageTracer
}
