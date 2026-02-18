"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLOWER_PRODUCTS = void 0;
exports.findProduct = findProduct;
exports.FLOWER_PRODUCTS = [
    { id: "flower_6400", flowerAmount: 6400, priceKRW: 199000 },
    { id: "flower_3200", flowerAmount: 3200, priceKRW: 119000 },
    { id: "flower_1600", flowerAmount: 1600, priceKRW: 63900 },
    { id: "flower_800", flowerAmount: 800, priceKRW: 34900 },
    { id: "flower_400", flowerAmount: 400, priceKRW: 18900 },
    { id: "flower_200", flowerAmount: 200, priceKRW: 10000 },
    { id: "flower_100", flowerAmount: 100, priceKRW: 6000 },
];
function findProduct(productId) {
    return exports.FLOWER_PRODUCTS.find((p) => p.id === productId);
}
//# sourceMappingURL=products.js.map