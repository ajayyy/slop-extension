<h1 align="center">Slop extension alpha</h1>

Early alpha prototype!!

If you want to help out: https://discord.gg/SponsorBlock

### Building

You must have [Node.js 22](https://nodejs.org/) and npm installed.

1. Clone with submodules

```bash
git clone https://github.com/ajayyy/slop-extension --recurse-submodules=yes
```

Or if you already cloned it, pull submodules with

```bash
git submodule update --init --recursive
```

2. Copy the file `config.json.example` to `config.json` and adjust configuration as desired.

    - You will need to repeat this step in the future if you get build errors related to `CompileConfig`.

3. Run `npm ci` in the repository to install dependencies.

4. Run `npm run build:dev` (for Chrome) or `npm run build:dev:firefox` (for Firefox) to generate a development version of the extension with source maps.

    - You can also run `npm run build` (for Chrome) or `npm run build:firefox` (for Firefox) to generate a production build.

5. The built extension is now in `dist/`. You can load this folder directly in Chrome as an [unpacked extension](https://developer.chrome.com/docs/extensions/mv3/getstarted/#manifest), or convert it to a zip file to load it as a [temporary extension](https://developer.mozilla.org/en-US/docs/Tools/about:debugging#loading_a_temporary_extension) in Firefox. You may need to edit package.json and add the parameters directly there.

### Credit

Built on the base of [DeArrow](https://github.com/ajayyy/DeArrow) and [SponsorBlock](https://github.com/ajayyy/SponsorBlock) licensed under GPL 3.0.

Logo based on Twemoji licensed under CC-BY 4.0.