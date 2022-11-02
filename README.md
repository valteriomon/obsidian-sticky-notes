# Sticky Notes Plugin



## How to use



## Considerations



## Manually installing the plugin

1. Download the `main.js`, `styles.css`, `manifest.json` from the release.
2. Create a folder named `obsidian-sticky-notes` inside your vault's plugins folder (`VaultFolder/.obsidian/plugins/`).
3. Add the downloaded files to the `obsidian-sticky-notes` folder.
4. Enable plugin in settings window.

## Development

1. Clone this repo and place it in a new vault for development inside `.obsidian/plugins/` folder.
2. Install NodeJS, then run `npm i` in the command line under the repo folder.
3. Run `npm run dev` to compile your plugin from `main.ts` to `main.js`.
4. Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
5. Reload Obsidian to load the new version of your plugin ("Reload app without saving" in the command palette for refreshing).
6. Enable plugin in settings window.

## Credits

This plugin is a fork of [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin) and the modules used for the file suggester are based on [Liam's Periodic Notes Plugin](https://github.com/liamcain/obsidian-periodic-notes) and [SilentVoid13's Templater Plugin](https://github.com/SilentVoid13/Templater). All the credits go to the original authors.