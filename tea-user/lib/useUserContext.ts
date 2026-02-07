import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const norm = (s: any): string | null => {
  if (typeof s !== "string") return null;
  const x = s.trim().toUpperCase().replace(/\s+/g, "");
  return x.length ? x : null;
};

export function useUserContext() {
  const uid = auth.currentUser?.uid ?? null;

  const [routeId, setRouteId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    let stopRouteListen: null | (() => void) = null;

    const load = async () => {
      // ✅ user doc
      const userSnap = await getDoc(doc(db, "users", uid));
      const rawRoute = userSnap.exists() ? userSnap.data().routeId : null;
      const rId = norm(rawRoute);

      setRouteId(rId);
      setUserName(userSnap.exists() ? (userSnap.data().name ?? null) : null);
      setEmail(userSnap.exists() ? (userSnap.data().email ?? null) : null);

      if (!rId) {
        setVehicleId(null);
        return;
      }

      // ✅ listen route doc realtime (admin changes activeVehicleId -> user updates)
      const routeRef = doc(db, "routes", rId);

      stopRouteListen = onSnapshot(routeRef, async (routeSnap) => {
        const vId = routeSnap.exists()
          ? (routeSnap.data().activeVehicleId as string | null)
          : null;

        if (vId) {
          setVehicleId(vId);
          return;
        }

        // ✅ fallback: if activeVehicleId missing, pick a vehicle from vehicles collection
        try {
          const vq = query(
            collection(db, "vehicles"),
            where("routeId", "==", rId),
            limit(1)
          );
          const vs = await getDocs(vq);
          if (!vs.empty) setVehicleId(vs.docs[0].id);
          else setVehicleId(null);
        } catch {
          setVehicleId(null);
        }
      });
    };

    load();

    return () => {
      if (stopRouteListen) stopRouteListen();
    };
  }, [uid]);

  return { uid, routeId, vehicleId, userName, email };
}
