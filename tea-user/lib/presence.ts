import { AppState } from "react-native";
import { onDisconnect, ref, set, serverTimestamp } from "firebase/database";
import { rtdb } from "./firebase";

export function setupPresence(uid: string) {
  const pRef = ref(rtdb, `presence/${uid}`);

  const goOnline = async () => {
    await set(pRef, { online: true, lastSeen: serverTimestamp() });
    try {
      await onDisconnect(pRef).set({ online: false, lastSeen: serverTimestamp() });
    } catch {}
  };

  const goOffline = async () => {
    try {
      await set(pRef, { online: false, lastSeen: serverTimestamp() });
    } catch {}
  };

  // initial
  goOnline();

  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") goOnline();
    else goOffline();
  });

  return () => {
    sub.remove();
    goOffline();
  };
}
