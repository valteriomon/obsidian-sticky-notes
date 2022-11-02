import {
    App,
    MarkdownRenderer,
    ItemView,
    TAbstractFile,
    WorkspaceLeaf,
    Modal,
    Plugin,
    PluginSettingTab,
    Setting,
} from "obsidian";

import { FileSuggest } from "./utils/FileSuggester";

interface panel {
    enabled: boolean;
    useFile: boolean;
    path: string;
    content: string;
}

interface modal {
    useFile: boolean;
    path: string;
    content: string;
}

interface StickyNoteSettings {
    panel: panel;
    modal: modal;
}

interface StringDict {
    [key: string]: string;
}

const DEFAULT_SETTINGS: StickyNoteSettings = {
    panel: {
        enabled: true,
        useFile: false,
        path: "",
        content: "# This is a panel static note!",
    },
    modal: {
        useFile: false,
        path: "",
        content: "# This is a modal static note!",
    },
};

const StickyNoteViewType = "sticky-note";

class StickyNoteView extends ItemView {
    private readonly plugin: StickyNote;

    constructor(leaf: WorkspaceLeaf, plugin: StickyNote) {
        super(leaf);
        this.plugin = plugin;
    }

    public async onOpen(): Promise<void> {
        this.redraw();
    }

    public getViewType(): string {
        return StickyNoteViewType;
    }

    public getDisplayText(): string {
        return "Sticky Note";
    }

    public getIcon(): string {
        return "sticky-note";
    }

    public load(): void {
        super.load();
        this.registerEvent(this.app.vault.on("modify", this.update));
    }

    public readonly redraw = async (): Promise<void> => {
        const rootEl = createDiv();
        const content = await this.plugin.getPanelContent();

        MarkdownRenderer.renderMarkdown(content, rootEl, "", null);

        const contentEl = this.containerEl.children[1];
        contentEl.empty();
        contentEl.appendChild(rootEl);
    };

    private readonly update = async (file: TAbstractFile): Promise<void> => {
        if (
            this.plugin.settings.panel.useFile &&
            this.plugin.settings.panel.path == file?.path
        ) {
            setTimeout(async () => {
                this.redraw();
            }, 1000);
        }
    };
}

export default class StickyNote extends Plugin {
    settings: StickyNoteSettings;
    private stickyNote: StickyNoteModal | null;
    public view: StickyNoteView;

    async onload() {
        await this.loadSettings();

        this.registerView(
            StickyNoteViewType,
            (leaf) => new StickyNoteView(leaf, this)
        );

        if (this.app.workspace.layoutReady) {
            this.setView();
        } else {
            this.app.workspace.onLayoutReady(this.setView);
        }

        this.addCommand({
            id: "open-sticky-note",
            name: "Show modal",
            callback: async () => this.showModal(),
        });

        this.addCommand({
            id: "sticky-note-open",
            name: "Open panel",
            callback: async () => {
                let [leaf] =
                    this.app.workspace.getLeavesOfType(StickyNoteViewType);
                if (!leaf) {
                    leaf = this.app.workspace.getLeftLeaf(false);
                    await leaf.setViewState({ type: StickyNoteViewType });
                }
                this.app.workspace.revealLeaf(leaf);
            },
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new StickyNoteSettingTab(this.app, this));

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        this.registerInterval(
            window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
        );
    }

    async readFile(filePath: string): Promise<string> {
        const { vault } = this.app;

        const fileContents: string[] = await Promise.all(
            vault
                .getMarkdownFiles()
                .filter((file) => filePath == file.path)
                .map((file) => vault.cachedRead(file))
        );

        return fileContents.length == 1 ? fileContents[0] : "";
    }

    onunload() {
        console.log("Unloading Sticky Note plugin");
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async getContent(note: panel | modal): Promise<string> {
        let content;
        if (note.useFile) {
            content = await this.readFile(note.path);
        } else {
            content = note.content;
        }
        return content;
    }

    async getPanelContent(): Promise<string> {
        return await this.getContent(this.settings.panel);
    }

    async showModal(): Promise<void> {
        const content = await this.getContent(this.settings.modal);

        this.stickyNote =
            this.stickyNote || new StickyNoteModal(this.app, content);
        this.stickyNote.open();

        this.registerDomEvent(document, "keyup", (evt: KeyboardEvent) => {
            if (this.stickyNote) {
                this.stickyNote.close();
                this.stickyNote = null;
            }
        });
    }

    readonly setView = async (): Promise<void> => {
        let [leaf] = this.app.workspace.getLeavesOfType(StickyNoteViewType);

        if (this.settings.panel.enabled && !leaf) {
            leaf = this.app.workspace.getLeftLeaf(false);
            await leaf.setViewState({
                type: StickyNoteViewType,
                active: true,
            });
        } else if (!this.settings.panel.enabled && leaf) {
            leaf.detach();
        }
    };

    readonly redrawView = (): void => {
        const [leaf] = this.app.workspace.getLeavesOfType(StickyNoteViewType);
        const view = leaf.view;
        if (view instanceof StickyNoteView) {
            view.redraw();
        }
    };
}

class StickyNoteModal extends Modal {
    modalContent: string;

    constructor(app: App, modalContent: string) {
        super(app);
        this.modalContent = modalContent;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.parentElement?.addClass("sticky-note-modal");
        MarkdownRenderer.renderMarkdown(
            this.modalContent,
            contentEl,
            "",
            null
        );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class StickyNoteSettingTab extends PluginSettingTab {
    plugin: StickyNote;
    hardcodedTexts: StringDict = {
        panelHeader: "Panel note",
        modalHeader: "Modal note",
        enablePanel: "Enable panel note",
        noteTypeToggle: "Use file content instead of a static note",
        staticNote: "Static note",
        noteFile: "Note file",
    };

    constructor(app: App, plugin: StickyNote) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl("h1", { text: this.hardcodedTexts.panelHeader });

        new Setting(this.containerEl)
            .setName(this.hardcodedTexts.enablePanel)
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.panel.enabled)
                    .onChange((enable) => {
                        this.plugin.settings.panel.enabled = enable;
                        this.plugin.saveSettings();
                        this.plugin.setView();
                        this.display();
                    });
            });

        if (this.plugin.settings.panel.enabled) {
            new Setting(this.containerEl)
                .setName(this.hardcodedTexts.noteTypeToggle)
                .addToggle((toggle) => {
                    toggle
                        .setValue(this.plugin.settings.panel.useFile)
                        .onChange((useFile) => {
                            this.plugin.settings.panel.useFile = useFile;
                            this.plugin.saveSettings();
                            this.plugin.redrawView();
                            this.display();
                        });
                });

            if (this.plugin.settings.panel.useFile) {
                new Setting(this.containerEl)
                    .setName(this.hardcodedTexts.noteFile)
                    .addSearch((cb) => {
                        const rootFolder = app.vault.getRoot().path;
                        new FileSuggest(cb.inputEl, rootFolder);
                        cb.setValue(this.plugin.settings.panel.path).onChange(
                            (path) => {
                                this.plugin.settings.panel.path = path;
                                this.plugin.saveSettings();
                                this.plugin.redrawView();
                            }
                        );
                    });
            } else {
                new Setting(containerEl)
                    .setName(this.hardcodedTexts.staticNote)
                    .setClass("static-sticky-note")
                    .addTextArea((text) =>
                        text
                            .setValue(this.plugin.settings.panel.content)
                            .onChange((content) => {
                                this.plugin.settings.panel.content = content;
                                this.plugin.saveSettings();
                            })
                    );
            }
        }

        containerEl.createEl("h1", { text: this.hardcodedTexts.modalHeader });

        new Setting(this.containerEl)
            .setName(this.hardcodedTexts.noteTypeToggle)
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.modal.useFile)
                    .onChange((useFile) => {
                        this.plugin.settings.modal.useFile = useFile;
                        this.plugin.saveSettings();
                        this.display();
                    });
            });

        if (this.plugin.settings.modal.useFile) {
            new Setting(this.containerEl)
                .setName(this.hardcodedTexts.noteFile)
                .addSearch((cb) => {
                    const rootFolder = app.vault.getRoot().path;
                    new FileSuggest(cb.inputEl, rootFolder);
                    cb.setValue(this.plugin.settings.modal.path).onChange(
                        (path) => {
                            this.plugin.settings.modal.path = path;
                            this.plugin.saveSettings();
                        }
                    );
                });
        } else {
            new Setting(containerEl)
                .setName(this.hardcodedTexts.staticNote)
                .setClass("static-sticky-note")
                .addTextArea((text) =>
                    text
                        .setValue(this.plugin.settings.modal.content)
                        .onChange(async (content) => {
                            this.plugin.settings.modal.content = content;
                            await this.plugin.saveSettings();
                        })
                );
        }
    }
}
