import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export const PhotoUsageService = {
  /**
   * Calculates the total number of photos used by the couple.
   * Includes:
   * 1. Memories with 'photo' field.
   * 2. Goals (Rewards) with 'image' field (excluding emoji-only).
   */
  calculateTotalPhotos: async (coupleId: string): Promise<number> => {
    try {
      if (!coupleId) return 0;

      // 1. Memories
      const memoriesRef = collection(db, 'couples', coupleId, 'memories');
      // Fetch all to filter client-side or use complex query (simple '!= null' is tricky in Firestore)
      // Optimally, we should maintain a counter, but for now we count.
      // Assuming 'photo' field exists and is not null/empty.
      const memoriesSnap = await getDocs(memoriesRef);
      const photoMemories = memoriesSnap.docs.filter(d => {
        const data = d.data();
        return data.photo && typeof data.photo === 'string' && data.photo.startsWith('http');
      }).length;

      // 2. Goals
      const goalsRef = collection(db, 'couples', coupleId, 'goals');
      const goalsSnap = await getDocs(goalsRef);
      const photoGoals = goalsSnap.docs.filter(d => {
        const data = d.data();
        // Check if image is URL (not emoji)
        return data.image && typeof data.image === 'string' && data.image.startsWith('http');
      }).length;

      return photoMemories + photoGoals;

    } catch (e) {
      console.error("Error calculating photo usage:", e);
      return 999; // Fallback to block if error, or 0? 999 to be safe/annoying? 0 to be permissive.
      // Let's return 999 to prevent abuse during error, or maybe 0 if offline.
      // User asked for STRICT limit.
      return 100; // Require re-try.
    }
  },

  /**
   * Check if user is allowed to upload ONE NEW photo.
   * Returns true if allowed, false if limit reached.
   */
  canAddPhoto: async (coupleId: string, isPro: boolean): Promise<boolean> => {
    if (isPro) return true;
    const currentCount = await PhotoUsageService.calculateTotalPhotos(coupleId);
    return currentCount < 5;
  }
};
