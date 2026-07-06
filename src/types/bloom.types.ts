export interface BloomFilter {
    timeFetched: number;
    timeGenerated: number;
    numberOfHashes: number;
    data: Uint8Array;
}

export interface BloomFilterProcessed extends BloomFilter {
    lastUpdate: number;
}