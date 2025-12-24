interface FetchDataToStore {
    domains: (string)[];
    siteChecker?: (url: string) => boolean;

    urlRegex: RegExp;
    jsonKept: string[];
}

interface StoredData {
    url: string;
    data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const fetchDataToStore: FetchDataToStore[] = [
    {
        domains: [],
        urlRegex: /\/statuses\//,
        jsonKept: ["id", "uri"]
    }
];

const datastore: StoredData[] = [];

function init(): void {
    const browserFetch = window.fetch;
    window.fetch = (resource, init=undefined) => {
        if (!(resource instanceof Request)) {
            return browserFetch(resource, init);
        }

        let storeResponse: FetchDataToStore | null = null;

        for (const fetchData of fetchDataToStore) {
            const domain = new URL(resource.url).hostname;
            if (fetchData.domains.includes(domain)
                    || (fetchData.siteChecker && fetchData.siteChecker(window.location.href))) {
                
                if (fetchData.urlRegex.test(resource.url)) {
                    storeResponse = fetchData;
                    break;
                }
            }
        }

        if (!storeResponse) {
            return browserFetch(resource, init);
        }

        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                const response = await browserFetch(resource, init);
                const json = await response!.json();

                //todo: send to store in main script
                if (Array.isArray(json)) {
                    for (const arrayItem of json) {
                        for (const item of Object.entries(arrayItem)) {
                            if (!storeResponse!.jsonKept.includes(item[0])) {
                                delete arrayItem[item[0]];
                            }
                        }
                    }
                } else {
                    for (const item of Object.entries(json)) {
                        if (!storeResponse!.jsonKept.includes(item[0])) {
                            delete json[item[0]];
                        }
                    }
                }

                datastore.push({
                    url: resource.url,
                    data: json
                });

                // A new response has to be made because the body can only be read once
                resolve(new Response(JSON.stringify(json), response!));
            } catch (e) {
                reject(e);
            }
        });
    }
}

init();