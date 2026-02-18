export interface Product {
  id: string;
  flowerAmount: number;
  priceKRW: number;
}

export const FLOWER_PRODUCTS: Product[] = [
  { id: "flower_6400", flowerAmount: 6400, priceKRW: 199000 },
  { id: "flower_3200", flowerAmount: 3200, priceKRW: 119000 },
  { id: "flower_1600", flowerAmount: 1600, priceKRW: 63900 },
  { id: "flower_800",  flowerAmount: 800,  priceKRW: 34900 },
  { id: "flower_400",  flowerAmount: 400,  priceKRW: 18900 },
  { id: "flower_200",  flowerAmount: 200,  priceKRW: 10000 },
  { id: "flower_100",  flowerAmount: 100,  priceKRW: 6000 },
];

export function findProduct(productId: string): Product | undefined {
  return FLOWER_PRODUCTS.find((p) => p.id === productId);
}
