import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "@/infra/firebase/client";

const functions = getFunctions(firebaseApp, "asia-northeast3");

export async function deleteAccount(): Promise<void> {
  const callable = httpsCallable<void, { ok: boolean }>(
    functions,
    "deleteAccount",
  );
  await callable();
}
