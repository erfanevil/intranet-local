declare module "word-extractor" {
  export interface ExtractedDocument {
    getBody(): string;
    getFootnotes(): string;
    getHeaders(): string;
    getAnnotations(): string;
    getEndnotes(): string;
  }
  export default class WordExtractor {
    extract(buffer: Buffer | string): Promise<ExtractedDocument>;
  }
}
