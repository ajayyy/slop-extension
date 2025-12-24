export function cleanPage() {
    // For live-updates
    if (document.readyState === "complete") {
        //todo: add any other elements that need to be removed
        for (const element of document.querySelectorAll(".slVoteButton, .slSubmitMenu")) {
            element.remove();
        }
    }
}