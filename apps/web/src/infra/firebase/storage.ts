import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { firebaseApp } from "./client";

export const storage = getStorage(firebaseApp);

/**
 * profileImageId를 기반으로 Firebase Storage에서
 * server/flowers/{id}.png 의 downloadURL을 반환한다.
 * 실패하거나 id가 없으면 null.
 */
export async function getFlowerProfileUrl(
  profileImageId?: string
): Promise<string | null> {
  if (!profileImageId) return null;

  try {
    const path = `server/flowers/${profileImageId}.png`;
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (err) {
    console.warn(
      `[storage] flower image 로드 실패 (id=${profileImageId})`,
      err
    );
    return null;
  }
}
