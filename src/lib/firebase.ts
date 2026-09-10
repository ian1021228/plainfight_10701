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
let app: any = null;
let db: Firestore | null = null;
let isFirestoreAvailable = true;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
} catch (err) {
  isFirestoreAvailable = false;
}

export { app, db, isFirestoreAvailable };

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
  if (!db || !isFirestoreAvailable) {
    return { success: false, error: "Firestore currently unavailable" };
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
    const errMsg = String(err);
    if (errMsg.includes("not found") || errMsg.includes("NOT_FOUND")) {
      isFirestoreAvailable = false;
    }
    return { success: false, error: errMsg };
  }
}

/**
 * Fetch Top 5 scores from Firebase Firestore
 */
export async function fetchTop5FromFirebase(): Promise<ScoreEntry[]> {
  if (!db || !isFirestoreAvailable) return [];

  try {
    const scoresCol = collection(db, "scores");
    const q = query(scoresCol, orderBy("score", "desc"), limit(5));
    const snapshot = await getDocs(q);

    const results: ScoreEntry[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        id: doc.id,
        playerId: data.playerId || "107-01",
        score: Number(data.score) || 0,
        kills: Number(data.kills) || 0,
        combo: Number(data.combo) || 0,
        accuracy: Number(data.accuracy) || 0,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    return results;
  } catch (err) {
    isFirestoreAvailable = false;
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
  if (!db || !isFirestoreAvailable) return () => {};

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
            playerId: data.playerId || "107-01",
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
        // If database does not exist or has connection issue, disable listener permanently
        isFirestoreAvailable = false;
        try {
          unsubscribe();
        } catch {
          // ignore
        }
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    isFirestoreAvailable = false;
    return () => {};
  }
}
