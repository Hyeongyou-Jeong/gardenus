/**
 * PortOne V2 REST API client
 *
 * Docs: https://developers.portone.io/api/rest-v2
 */

const PORTONE_API_BASE = "https://api.portone.io";

export interface PortOnePayment {
  status: string;
  id: string;
  amount: { total: number; currency: string };
  method?: Record<string, unknown>;
  customData?: string;
}

/**
 * PortOne V2 API로 결제 건을 조회한다.
 * @param paymentId - 결제 건 ID
 * @param apiSecret - PortOne V2 API Secret
 */
export async function getPayment(
  paymentId: string,
  apiSecret: string,
): Promise<PortOnePayment> {
  const res = await fetch(
    `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `PortOne ${apiSecret}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PortOne API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<PortOnePayment>;
}
