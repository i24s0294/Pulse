declare module 'music-metadata-browser' {
  interface IPicture {
    format: string;
    data: Uint8Array;
  }

  interface ICommonMetadata {
    title?: string;
    artist?: string;
    picture?: IPicture[];
    [key: string]: any;
  }

  interface IAudioMetadata {
    common: ICommonMetadata;
  }

  export function parseBlob(blob: Blob): Promise<IAudioMetadata>;
}