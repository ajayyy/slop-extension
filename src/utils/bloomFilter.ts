import { waitFor } from "../../maze-utils/src";
import { sendRealRequestToCustomServer } from "../../maze-utils/src/background-request-proxy";
import { chromeP } from "../../maze-utils/src/browserApi";
import { getHash } from "../../maze-utils/src/hash";
import Config from "../config/config";
import { BloomFilterProcessed } from "../types/bloom.types";
import { arrayToDataUrl, dataUrlToArray } from "./bloomFilterUtils";
import { SubmissionData } from "./dataFetching";
import { logError } from "./logger";
import * as murmurhash3js from "murmurhash3js";

interface BloomFilterStored {
    timeFetched: number;
    timeGenerated: number;
    lastUpdate: number;
    numberOfHashes: number;
    data: string;
}
let bloomCache: Record<string, BloomFilterStored> = {};
let bloomCacheReady = false;

export function setupBackgroundBloom() {
    // import bloom data
    chrome.storage.local.get("bloom", (d) => {
        bloomCache = d.bloom;
        bloomCacheReady = true;
    });

    chrome.runtime.onMessage.addListener((request, sender, callback) => {
        if (request.message === "fetchSubmissions") {
            fetchSubmissions(request.contentID, request.profileID).then(callback).catch(logError);
            return true;
        }

        return false;
    });
}

const currentSubmissionFetchPromises: Record<string, Promise<SubmissionData>> = {};
function fetchSubmissions(contentID: string, profileID: string | null): Promise<SubmissionData> {
    const existingPromise = currentSubmissionFetchPromises[contentID + profileID];
    if (existingPromise !== undefined) {
        return existingPromise;
    }

    const fetchingPromise = (async () => {
        if (!await checkBloom(contentID, profileID)) {
            // Don't even check
            return {
                content: []
            };
        }

        const contentPrefix = (await getHash(contentID, 1)).slice(0, 4);
        const profilePrefix = profileID ? (await getHash(profileID, 1)).slice(0, 4) : null;
        const request = await sendRealRequestToCustomServer("GET", `${Config.config?.serverAddress}/api/slopByHash`, {
            contentPrefix,
            profilePrefix
        });

        if (request && request.ok) {
            const json = await request.json();
            const contentData = json.content[contentID];

            const profileIDToCheck = profileID || (contentData && contentData[0]?.profileID);
            const profileData = json.profile[profileIDToCheck] ?? null;

            return {
                content: contentData ?? [],
                profile: profileData
            };
        }


        // if (Math.random() < 0.5) {
        //     if (Math.random() < 0.5) {
        //         return [
        //             {
        //                 id: "tts",
        //                 votes: Math.random() * 5
        //             }
        //         ];
        //     } else {
        //         return [
        //             {
        //                 id: "low-quality",
        //                 votes: 4
        //             }
        //         ];
        //     }
        // }

        return {
            content: []
        };
    })();

    fetchingPromise.finally(() => {
        delete currentSubmissionFetchPromises[contentID + profileID];
    });

    currentSubmissionFetchPromises[contentID + profileID] = fetchingPromise;
    return fetchingPromise;
}

const updateInterval = 1000 * 60 * 30;
async function getBloomData(bloomID: number): Promise<BloomFilterProcessed | null> {
    await waitFor(() => bloomCacheReady);

    try {
        // Check if one is stored
        const storageCache = bloomCache[String(bloomID)];
        if (storageCache && storageCache.lastUpdate > Date.now() - updateInterval) {
            const newBloom = {
                timeFetched: storageCache.timeFetched,
                lastUpdate: storageCache.lastUpdate,
                numberOfHashes: storageCache.numberOfHashes,
                timeGenerated: storageCache.timeGenerated,
                data: await dataUrlToArray(storageCache.data)
            };
    
            return newBloom;
        } else if (storageCache) {
            const newBloom = await updateBloom(bloomID);
            return newBloom;
        } else {
            const newBloom = await fetchBloom(bloomID);
            return newBloom;
        }
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function checkBloom(contentID: string, profileID: string | null): Promise<boolean> {
    //todo: figure out which bloom to check based on settings
    //todo: use profileID for profile based bloom
    const contentBlooms = [2, 3, 4];

    for (const bloomID of contentBlooms) {
        const bloom = await getBloomData(bloomID);
        if (bloom) {
            const hashes = hashContent(contentID, bloom.numberOfHashes, bloom.data.length * 8);
            let success = false;
            for (const hash of hashes) {
                const hashByte = Math.floor(hash / 8);
                const checkByte = bloom.data[hashByte];
    
                if (!(checkByte & (1 << (7 - hash % 8)))) {
                    success = false;
                    break;
                } else {
                    success = true;
                }
            }

            if (success) {
                return true;
            }
        } else {
            logError(`Bloom is missing: ${bloomID}`);
        }
    }

    return false;

    //todo: then do it again but hash profile id instead
}

function hashContent(data: string, numberOfHashes: number, bloomSize: number): number[] {
    const result = new Array(numberOfHashes);
    for (let i = 0; i < numberOfHashes; i++) {
        result[i] = murmurhash3js.x86.hash32(data, i) % bloomSize;
    }

    return result;
}

const currentFetchPromises: Record<string, Promise<BloomFilterProcessed>> = {};
function fetchBloom(bloomID: number): Promise<BloomFilterProcessed> {
    const existingPromise = currentFetchPromises[String(bloomID)];
    if (existingPromise !== undefined) {
        return existingPromise;
    }

    const promise = new Promise<BloomFilterProcessed>((resolve, reject) => {
        const now = Date.now();
        sendRealRequestToCustomServer("GET", `${Config.config?.serverAddress}/api/slopBloom/${bloomID}`).then(async (response) => {
            const result = await response.arrayBuffer();
            const numberOfHashes = new Uint8Array(result.slice(0, 1))[0];
            const timeGenerated = Number(new BigInt64Array(result.slice(1, 9))[0]);
            const data = new Uint8Array(result.slice(9));
    
            if (data.length > 0 && response.ok) {
                arrayToDataUrl(data).then((data) => {
                    bloomCache[String(bloomID)] = {
                        timeFetched: now,
                        timeGenerated: timeGenerated,
                        numberOfHashes: numberOfHashes,
                        data,
                        lastUpdate: now
                    };

                    chromeP.storage.local.set({
                        bloom: bloomCache
                    }).catch(logError);
                }).catch(logError);
    
                resolve({
                    timeFetched: now,
                    timeGenerated: timeGenerated,
                    numberOfHashes: numberOfHashes,
                    data,
                    lastUpdate: now
                });
            } else {
                reject(`Bloom empty: ${response.status} ${response.statusText}`)
            }

        }).catch(error => {
            reject(error);
        });
    });

    promise.finally(() => {
        delete currentFetchPromises[String(bloomID)];
    });

    currentFetchPromises[String(bloomID)] = promise;
    return promise;
}

const currentUpdatePromises: Record<string, Promise<BloomFilterProcessed>> = {};
function updateBloom(bloomID: number): Promise<BloomFilterProcessed> {
    const existingPromise = currentUpdatePromises[String(bloomID)];
    if (existingPromise !== undefined) {
        return existingPromise;
    }

    const promise = new Promise<BloomFilterProcessed>((resolve, reject) => {
        const now = Date.now();
        sendRealRequestToCustomServer("GET", `${Config.config?.serverAddress}/api/slopBloomDiff/${bloomID}`).then(async (response) => {
            const result = await response.arrayBuffer();
            const numberOfHashes = new Uint8Array(result.slice(0, 1))[0];
            const timeGenerated = Number(new BigInt64Array(result.slice(1, 9))[0]);
            const diffData = new Uint32Array(result.slice(9));

            const currentFilter = bloomCache[String(bloomID)];
            // If the number of hashes changes, or the initial generation of the filter changed, fetch again.
            // In normal operation, timeGenerated should always stay the same
            if (!currentFilter || currentFilter.numberOfHashes !== numberOfHashes
                    || currentFilter.timeGenerated !== timeGenerated) {
                fetchBloom(bloomID).then(resolve).catch(reject);
                return;
            }

            const data = await dataUrlToArray(currentFilter.data);

            // Changes to false when moving on to changes to one
            let changesToZero = true;
            for (let byteIndex = 0; byteIndex < diffData.length; byteIndex++) {
                const bitChangeIndex = diffData[byteIndex];
                if (bitChangeIndex === 0 && diffData[byteIndex + 1] === 0) {
                    // Found switch to ones
                    changesToZero = false;
                    byteIndex += 1;
                } else {
                    const byteToChange = Math.floor(bitChangeIndex / 8);
                    const char = 7 - (bitChangeIndex - byteToChange * 8);

                    if (changesToZero) {
                        data[byteToChange] &= ~(1 << char);
                    } else {
                        data[byteToChange] |= 1 << char;
                    }
                }
            }

            arrayToDataUrl(data).then((data) => {
                bloomCache[String(bloomID)] = {
                    timeFetched: now,
                    timeGenerated: timeGenerated,
                    numberOfHashes: numberOfHashes,
                    data,
                    lastUpdate: now
                };

                chromeP.storage.local.set({
                    bloom: bloomCache
                }).catch(logError);
            }).catch(logError);
            
            const newFilter: BloomFilterProcessed = {
                timeFetched: currentFilter.timeFetched,
                timeGenerated,
                numberOfHashes,
                lastUpdate: now,
                data
            };

            resolve(newFilter);
        }).catch(error => {
            reject(error);
        });
    });


    promise.finally(() => {
        delete currentUpdatePromises[String(bloomID)];
    });

    currentUpdatePromises[String(bloomID)] = promise;
    return promise;
}