import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { firebaseApp } from "./client";

export const storage = getStorage(firebaseApp);

/** Storage에 실제 존재하는 flower 이미지 ID 범위 */
const FLOWER_IMAGE_MIN = 1;
const FLOWER_IMAGE_MAX = 16;

/**
 * profileImageId를 기반으로 Firebase Storage에서
 * server/flowers/{id}.png 의 downloadURL을 반환한다.
 * 실패하거나 id가 없거나 범위 밖이면 null.
 */
export async function getFlowerProfileUrl(
  profileImageId?: string
): Promise<string | null> {
  // 없거나 범위 밖이면 기본값 "1"
  const raw = profileImageId ?? "1";
  const num = Number(raw);
  const id = (Number.isNaN(num) || num < FLOWER_IMAGE_MIN || num > FLOWER_IMAGE_MAX)
    ? "1"
    : raw;
  try {
    const path = `server/flowers/${id}.png`;
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (err) {
    console.warn(
      `[storage] flower image 로드 실패 (id=${id})`,
      err
    );
    return null;
  }
}
