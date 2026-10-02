console.log("stubb")

// From BlockTube https://github.com/amitbl/blocktube/blob/9dc6dcee1847e592989103b0968092eb04f04b78/src/scripts/seed.js#L52-L58
const fetchUrlsToRead = [
    "/youtubei/v1/search",
    "/youtubei/v1/guide",
    "/youtubei/v1/browse",
    "/youtubei/v1/next",
    "/youtubei/v1/player",
    "/youtubei/v1/get_watch" //todo: do we need this one?
];

declare const ytInitialData: Record<string, string> | undefined;

// todo: do this with initial data
if (typeof(ytInitialData) !== "undefined") {
    const channelPerVideo = findAllChannelPerVideo(ytInitialData);
    console.log(channelPerVideo);

    const posibleVideos = findAllVideoIds(ytInitialData);
    const missing: string[] = [];
    for (const vid of posibleVideos) {
        if (![...channelPerVideo.values()].includes(vid)) {
            missing.push(vid);
        }
    }
    console.log("missing:", [...posibleVideos].filter((v) => !channelPerVideo.has(v)));
} else {
    // Wait until it is loaded in
    const waitingInterval = setInterval(() => {
        if (typeof(ytInitialData) !== "undefined") {
            const channelPerVideo = findAllChannelPerVideo(ytInitialData);
            console.log(channelPerVideo);

            const posibleVideos = findAllVideoIds(ytInitialData);
            const missing: string[] = [];
            for (const vid of posibleVideos) {
                if (![...channelPerVideo.values()].includes(vid)) {
                    missing.push(vid);
                }
            }
            console.log("missing:", [...posibleVideos].filter((v) => !channelPerVideo.has(v)));

            clearInterval(waitingInterval);
        }
    }, 1);

    // savedSetup.waitingInterval = waitingInterval;
}

const browserFetch = window.fetch;
window.fetch = (resource, init=undefined) => {
    console.log(fetchUrlsToRead.some(u => (resource as Request)?.url?.includes(u)), (resource as Request)?.url)
    if (!(resource instanceof Request) || !fetchUrlsToRead.some(u => resource.url.includes(u))) {
        return browserFetch(resource, init);
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async (resolve, reject) => {
        try {
            const response = await browserFetch(resource, init=init);
            //   const url = new URL(resource.url);
            const json = await response!.json();

            // A new response has to be made because the body can only be read once
            resolve(new Response(JSON.stringify(json), response!));

            console.log("looking", resource.url)
            const channelPerVideo = findAllChannelPerVideo(json);
            console.log(channelPerVideo);

            const posibleVideos = findAllVideoIds(json);
            const missing: string[] = [];
            for (const vid of posibleVideos) {
                if (![...channelPerVideo.values()].includes(vid)) {
                    missing.push(vid);
                }
            }
            console.log("missing:", [...posibleVideos].filter((v) => !channelPerVideo.has(v)));
        } catch (e) {
            reject(e);
        }
    });
}

function navigateJson(data: Record<string, unknown>, path: string): Record<string, unknown> | undefined {
    if (path === "") return data;

    let object: Record<string, unknown> = data;
    for (const key of path.split(".")) {
        // path is allowed to start with a leading .
        if (key === "") continue;

        if (object && typeof(object) === "object") {
            object = object[key] as Record<string, unknown>;
        } else {
            return undefined;
        }
    }

    return object;
}

// To nearest object in an array
function toNearestArray(path: string): string {
    const beforeArray = path.match(/^(.+[0-9])[^0-9]+$/);
    if (beforeArray) {
        return beforeArray[1];
    } else {
        return "";
    }
}

//todo: this shouldn't be a global constant
const videoToChannel: Map<string, string | null> = new Map();
function findAllChannelPerVideo(data: Record<string, unknown>, path = ""): Map<string, string | null> {
    const currentObject = navigateJson(data, path);

    for (const key in currentObject) {
        if (typeof(currentObject[key]) === "string" && currentObject[key].match(/^UC.{22}$/)) {
            const videoID = currentObject["videoId"] as string;
            if (videoID) {
                videoToChannel.set(videoID, currentObject[key] as string);
            } else {
                // Try to go up to the nearest array
                let beforeArrayPath = toNearestArray(path);
                if (beforeArrayPath) {
                    const beforeArray = navigateJson(data, beforeArrayPath);
                    if (beforeArray) {
                        let videoIDs = findAllVideoIds(beforeArray);
                        if (!videoIDs) {
                            // Try one further up
                            beforeArrayPath = toNearestArray(beforeArrayPath);
                            if (beforeArrayPath) {
                                const beforeArray2 = navigateJson(data, beforeArrayPath);
                                if (beforeArray2) {
                                    videoIDs = findAllVideoIds(beforeArray);
                                }
                            }
                        }

                        console.log("got somewhere", beforeArray, videoIDs, currentObject[key])

                        if (videoIDs && videoIDs.size === 1) {
                            videoToChannel.set([...videoIDs][0], currentObject[key] as string);
                        }
                    }
                }
            }
        } else if (typeof(currentObject[key]) === "object") {
            findAllChannelPerVideo(data, `${path}.${key}`);
        }
    }

    return videoToChannel;
}

function findAllVideoIds(data: Record<string, unknown>): Set<string> {
    const videoIds: Set<string> = new Set();
    
    for (const key in data) {
        //todo: check content id too? && videoIDs[0].match(/[a-zA-Z0-9]{11}/)
        if (key === "videoId" || key === "contentId") {
            const videoID = data[key] as string;
            if (videoID && videoID.match(/[a-zA-Z0-9]{11}/)) {
                videoIds.add(videoID);
            }
        } else if (typeof(data[key]) === "object") {
            findAllVideoIds(data[key] as Record<string, unknown>).forEach(id => videoIds.add(id));
        }
    }

    return videoIds;
}