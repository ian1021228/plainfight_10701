import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Firestore,
} from "firebase/firestore";
import { ScoreEntry } from "../types";

// User's Firebase project configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCbTCPeuXlpm6WH8HZwAc7f45hckYvdseA",
  authDomain: "flydrop-691bb.firebaseapp.com",
  projectId: "flydrop-691bb",
  storageBucket: "flydrop-691bb.firebasestorage.app",
  messagingSenderId: "209916357825",
  appId: "1:209916357825:web:477e1c3fd444126d2bb840",
};

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let db: Firestore | null = null;
try {
  db = getFirestore(app);
} catch (err) {
  console.warn("Failed to initialize Firestore:", err);
}

export { app, db };

/**
 * Submit score asynchronously to Firebase Firestore 'scores' collection
 */
export async function submitScoreToFirebase(entry: {
  playerId: string;
  score: number;
  kills: number;
  combo: number;
  accuracy: number;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!db) {
    return { success: false, error: "Firestore not initialized" };
  }

  try {
    const scoresCol = collection(db, "scores");
    const docRef = await addDoc(scoresCol, {
      playerId: entry.playerId,
      score: entry.score,
      kills: entry.kills,
      combo: entry.combo,
      accuracy: entry.accuracy,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });

    return { success: true, id: docRef.id };
  } catch (err: unknown) {
    console.warn("Firebase score submission error:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Fetch Top 5 scores from Firebase Firestore
 */
export async function fetchTop5FromFirebase(): Promise<ScoreEntry[]> {
  if (!db) return [];

  try {
    const scoresCol = collection(db, "scores");
    const q = query(scoresCol, orderBy("score", "desc"), limit(5));
    const snapshot = await getDocs(q);

    const results: ScoreEntry[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        id: doc.id,
        playerId: data.playerId || "CADET",
        score: Number(data.score) || 0,
        kills: Number(data.kills) || 0,
        combo: Number(data.combo) || 0,
        accuracy: Number(data.accuracy) || 0,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    return results;
  } catch (err) {
    console.warn("Error fetching Top 5 from Firebase:", err);
    return [];
  }
}

/**
 * Subscribe to real-time Top 5 Leaderboard changes from Firestore
 */
export function subscribeToFirebaseLeaderboard(
  onUpdate: (top5: ScoreEntry[]) => void,
  onError?: (err: Error) => void
) {
  if (!db) return () => {};

  try {
    const scoresCol = collection(db, "scores");
    const q = query(scoresCol, orderBy("score", "desc"), limit(5));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results: ScoreEntry[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          results.push({
            id: doc.id,
            playerId: data.playerId || "CADET",
            score: Number(data.score) || 0,
            kills: Number(data.kills) || 0,
            combo: Number(data.combo) || 0,
            accuracy: Number(data.accuracy) || 0,
            timestamp: data.timestamp || new Date().toISOString(),
          });
        });
        onUpdate(results);
      },
      (error) => {
        console.warn("Firestore onSnapshot error:", error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("Failed to attach Firestore snapshot listener:", err);
    return () => {};
  }
}
