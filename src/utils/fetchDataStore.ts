interface StoredData {
    url: string;
    data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const datastore: StoredData[] = [];

//todo: get data from injected script into here

export function getStoredData(): StoredData[] {
    return datastore;
}