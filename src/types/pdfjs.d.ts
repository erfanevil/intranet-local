declare module "/js/pdf.min.mjs" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(params: {
    data: ArrayBuffer;
  }): {
    promise: Promise<{
      numPages: number;
      getPage(num: number): Promise<{
        getViewport(params: { scale: number }): { width: number; height: number };
        render(params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
      }>;
    }>;
  };
}

declare module "pdfjs-dist/build/pdf.mjs" {
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };
  export function getDocument(params: {
    data: ArrayBuffer;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
    useSystemFonts?: boolean;
  }): {
    promise: Promise<{
      numPages: number;
      getPage(num: number): Promise<{
        getViewport(params: { scale: number }): {
          width: number;
          height: number;
        };
        render(params: {
          canvasContext: CanvasRenderingContext2D;
          viewport: { width: number; height: number };
          canvas: HTMLCanvasElement;
        }): { promise: Promise<void> };
      }>;
    }>;
  };
}
