"use strict";
/**
 * PortOne V2 REST API client
 *
 * Docs: https://developers.portone.io/api/rest-v2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayment = getPayment;
const PORTONE_API_BASE = "https://api.portone.io";
/**
 * PortOne V2 API로 결제 건을 조회한다.
 * @param paymentId - 결제 건 ID
 * @param apiSecret - PortOne V2 API Secret
 */
async function getPayment(paymentId, apiSecret) {
    const res = await fetch(`${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
        headers: {
            Authorization: `PortOne ${apiSecret}`,
            "Content-Type": "application/json",
        },
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`PortOne API error ${res.status}: ${body}`);
    }
    return res.json();
}
//# sourceMappingURL=portone.js.map