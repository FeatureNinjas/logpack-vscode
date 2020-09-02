import { LogPack } from "../LogPack";

/**
 * Abstract class to be implemented by every sink where log packs might be stored
 */
export abstract class Sink {

  /**
   * Default constructor
   *
   * @param storagePath Path where all log packs are stored when downloaded
   */
  constructor(protected storagePath: string | undefined) {}

  /**
   * Loads the list of log packs from the given sink
   */
  abstract list(): Promise<LogPack[] | undefined>

  /**
   * Formats the given number of bytes to the next unit that makes sense for the user
   *
   * @param bytes size in bytes of the file
   * @param decimals number of decimals to show
   */
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}