export type CoinPack = { id: string; coins: number; priceUsd: number; label: string };

export const COIN_PACKS: CoinPack[] = [
  { id: "pack_150", coins: 150, priceUsd: 1.99, label: "Starter" },
  { id: "pack_500", coins: 500, priceUsd: 4.99, label: "Popular" },
  { id: "pack_1200", coins: 1200, priceUsd: 9.99, label: "Best value" },
];

export function getPack(id: string): CoinPack | undefined {
  return COIN_PACKS.find((p) => p.id === id);
}
