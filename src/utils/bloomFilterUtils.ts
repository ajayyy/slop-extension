export async function dataUrlToArray(dataUrl: string): Promise<Uint8Array> {
    const res = await fetch(dataUrl);
    return new Uint8Array(await res.arrayBuffer());
}

// https://developer.mozilla.org/en-US/docs/Web/API/Window/btoa#converting_arbitrary_binary_data
export async function arrayToDataUrl(data: Uint8Array, type = "application/octet-stream"): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = Object.assign(new FileReader(), {
            onload: () => resolve(reader.result as string),
            onerror: () => reject(reader.error),
        });
        reader.readAsDataURL(new File([data as unknown as ArrayBuffer], "", { type }));
    });
}