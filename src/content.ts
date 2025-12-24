import { cleanPage } from "./utils/pageCleaner";
import { onYouTubeCableTV } from "../maze-utils/src/pageInfo";
import { waitFor } from "../maze-utils/src";
import Config from "./config/config";
import { initSiteHandler } from "./utils/siteHandler";

if ( !onYouTubeCableTV() ) {
    cleanPage();
}


console.log("injected")

//todo: test this
void waitFor(() => Config.config !== null).then(() => initSiteHandler());
