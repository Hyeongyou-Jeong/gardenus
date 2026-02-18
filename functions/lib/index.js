"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMatchRequestUpdated = exports.onMatchRequestCreated = exports.verifyPayment = void 0;
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
var verifyPayment_1 = require("./payment/verifyPayment");
Object.defineProperty(exports, "verifyPayment", { enumerable: true, get: function () { return verifyPayment_1.verifyPayment; } });
var matchRequestTriggers_1 = require("./notifications/matchRequestTriggers");
Object.defineProperty(exports, "onMatchRequestCreated", { enumerable: true, get: function () { return matchRequestTriggers_1.onMatchRequestCreated; } });
Object.defineProperty(exports, "onMatchRequestUpdated", { enumerable: true, get: function () { return matchRequestTriggers_1.onMatchRequestUpdated; } });
//# sourceMappingURL=index.js.map