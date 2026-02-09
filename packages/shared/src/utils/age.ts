/**
 * born(출생연도)으로 나이를 계산한다.
 * @returns 만 나이 (0~120 범위 밖이면 null)
 */
export function calcAge(born?: number): number | null {
  if (born == null) return null;
  const age = new Date().getFullYear() - born;
  if (age < 0 || age > 120) return null;
  return age;
}
