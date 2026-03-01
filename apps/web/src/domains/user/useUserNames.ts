import { useEffect, useRef, useState } from "react";
import { fetchUser } from "@/domains/user/user.repo";

/**
 * uid(전화번호) 배열을 받아 { [uid]: name } 맵을 반환한다.
 * 이미 조회된 uid는 재요청하지 않는다.
 */
export function useUserNames(uids: string[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const fetchedRef = useRef(new Set<string>());

  useEffect(() => {
    const toFetch = uids.filter((uid) => uid && !fetchedRef.current.has(uid));
    if (toFetch.length === 0) return;

    toFetch.forEach((uid) => fetchedRef.current.add(uid));

    Promise.all(
      toFetch.map(async (uid) => {
        try {
          const user = await fetchUser(uid);
          return [uid, user?.name || uid] as const;
        } catch {
          return [uid, uid] as const;
        }
      }),
    ).then((entries) => {
      setNames((prev) => {
        const next = { ...prev };
        for (const [uid, name] of entries) next[uid] = name;
        return next;
      });
    });
  }, [uids.join(",")]);

  return names;
}
