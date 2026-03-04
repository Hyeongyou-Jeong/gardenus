import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { subscribeFlower } from "@/domains/user/user.repo";

/**
 * Firestore users/{uid}.flower 를 실시간 구독하는 훅.
 * 로그인 상태가 아니면 flower = 0, loading = false.
 */
export function useMyFlower() {
  const { userId } = useAuth();
  const [flower, setFlower] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setFlower(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsub = subscribeFlower(userId, (val) => {
      setFlower(val);
      setLoading(false);
    });

    return unsub;
  }, [userId]);

  return { flower, flowerLoading: loading };
}
