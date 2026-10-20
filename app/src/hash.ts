import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export const ZERO_HASH = '0'.repeat(64);

const hex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

export const sha256Text = (s: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s, { encoding: Crypto.CryptoEncoding.HEX });

export async function readBytes(uri: string): Promise<Uint8Array<ArrayBuffer>> {
  // web: CameraView returns a data: URL instead of a file path
  if (uri.startsWith('data:')) {
    const b64 = uri.slice(uri.indexOf(',') + 1);
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }
  if (Platform.OS === 'web') return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  return new Uint8Array(await new File(uri).bytes());
}

/** SHA-256 of the photo's original bytes (FR-05). */
export const hashBytes = async (bytes: Uint8Array<ArrayBuffer>) => hex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));

/** NFR-01 hash chain: each photo hash is chained onto the previous one in capture order. */
export const chainNext = (prev: string, photoHash: string) => sha256Text(prev + photoHash);

export const short = (h: string) => (h ? `${h.slice(0, 12)}…${h.slice(-6)}` : '—');
