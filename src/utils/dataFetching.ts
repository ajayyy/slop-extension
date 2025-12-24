// import { VideoID } from "../../maze-utils/src/video";

export interface SubmissionData {
    id: string;
    upvotes: number;
    downvotes: number;
}

interface SubmissionsCacheRecord {
    data: SubmissionData[];
    lastUsed: number;
}

const cache: Record<string, SubmissionsCacheRecord> = {};
const cacheLimit = 10000;

// todo: should this be configurable?
// todo: put ai-topic somewhere, but not by default as bad
const aiVoteIDs = [
    "tts",
    "ai-script",
    "ai-music",
    "clip-mashup"
];
const negativeVoteIDs = [
    "boring",
    "low-quality",
    "misleading"
];

export function isAIVote(submission: SubmissionData): boolean {
    return aiVoteIDs.includes(submission.id);
}

export function isNegativeVote(submission: SubmissionData): boolean {
    return negativeVoteIDs.includes(submission.id);
}

export async function getSubmissions(id: string): Promise<SubmissionData[]> {
    const cachedValue = cache[id];

    if (cachedValue) {
        return cachedValue.data;
    } else {
        //todo: handle getting more data because query by hash
        const submissions = await fetchSubmissions(id);
        cache[id] = {
            data: submissions,
            lastUsed: Date.now()
        };

        const keys = Object.keys(cache);
        if (keys.length > cacheLimit) {
            const numberToDelete = keys.length - cacheLimit + 20;

            for (let i = 0; i < numberToDelete; i++) {
                const oldestKey = Object.keys(cache).reduce((a, b) => cache[a]?.lastUsed < cache[b]?.lastUsed ? a : b);
                delete cache[oldestKey];
            }
        }

        return submissions;
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchSubmissions(id: string): Promise<SubmissionData[]> {
    //todo:
    await true;

    if (Math.random() < 0.5) {
        if (Math.random() < 0.5) {
            return [
                {
                    id: "tts",
                    upvotes: Math.random() * 5,
                    downvotes: 0
                }
            ];
        } else {
            return [
                {
                    id: "low-quality",
                    upvotes: 4,
                    downvotes: 0
                }
            ];
        }
    }

    return [];
}

// function getSubmissionsForYT(videoID: VideoID): Promise<SubmissionData> {
//     //todo:
//     return Promise.resolve({} as SubmissionData);
// }