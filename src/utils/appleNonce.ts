import { getRandomValues } from 'expo-crypto';

export function generateAppleNonce(): string {
  const bytes = getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
