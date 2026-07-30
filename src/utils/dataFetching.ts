import { extensionUserAgent } from "../../maze-utils/src";
import Config, { Category } from "../config/config";
import { sendRequestToServer } from "./requests";

export interface VoteInfo {
    id: Category;
    votes: number;
    profileID?: string;
}

export interface ProfileVoteInfo {
    id: Category;
    votes: number;
    voteSum: number;
}

export interface SubmissionData {
    content: VoteInfo[];
    profile?: ProfileVoteInfo[] | null;
}

interface SubmissionsCacheRecord {
    data: SubmissionData;
    lastUsed: number;
}

export interface ToSubmitData {
    comment?: string;
    rating?: number;
    votes: string[];
}

const cache: Record<string, SubmissionsCacheRecord> = {};
const cacheLimit = 10000;

// todo: should this be configurable?
// todo: put ai-topic somewhere, but not by default as bad
const aiVoteIDs = [
    Category.AIScript,
    Category.AIMusic,
    Category.AIThumbnail,
    Category.AIGraphicsMost,
    Category.AIGraphicsLimited,
    Category.AIGraphicsCommentary,
    Category.TTSMostlyTTS,
    Category.TTSMostlyHuman,
    Category.TTSAI,
    Category.AITopicExamples
];

export function isAIVote(submission: VoteInfo): boolean {
    return aiVoteIDs.includes(submission.id);
}

export async function getSubmissions(contentID: string, profileID: string | null): Promise<SubmissionData> {
    const cachedValue = cache[getCacheKey(contentID, profileID)];

    if (cachedValue) {
        return cachedValue.data;
    } else {
        const submissions = await fetchSubmissions(contentID, profileID);
        cache[getCacheKey(contentID, profileID)] = {
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

function fetchSubmissions(contentID: string, profileID: string | null): Promise<SubmissionData> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            message: "fetchSubmissions",
            contentID,
            profileID
        }, (response) => {
            if ("error" in response) {
                reject(response.error);
            } else {
                resolve(response);
            }
        });
    });
}

export async function submitVote(contentID: string, profileID: string | null, data: ToSubmitData) {
    const result = await sendRequestToServer("POST", "/api/slop", {
        userID: Config.config!.userID,
        contentID,
        profileID,
        votes: data.votes,
        comment: data.comment,
        rating: data.rating,
        wholeProfile: false,
        userAgent: extensionUserAgent()
    });

    clearCache(contentID, profileID)

    return result;
}

export function clearCache(contentID: string, profileID: string | null) {
    delete cache[getCacheKey(contentID, profileID)];
}

export function getCacheKey(contentID: string, profileID: string | null) {
    return contentID + (profileID ? `.p.${profileID}` : "");
}