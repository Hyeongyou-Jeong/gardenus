import { initializeApp } from "firebase-admin/app";

initializeApp();

export { verifyPayment } from "./payment/verifyPayment";
export {
  onMatchRequestCreated,
  onMatchRequestUpdated,
} from "./notifications/matchRequestTriggers";
