import { App, Editor, MarkdownView, Menu, Modal, Notice, Plugin, PluginSettingTab, Setting, setIcon, SuggestModal } from 'obsidian';
import { TFile } from 'obsidian';
import * as yaml from 'js-yaml';

// Remember to rename these classes and interfaces!

interface ObsidianPluginAutotagingSettings {
	api_key: string;
}

const DEFAULT_SETTINGS: ObsidianPluginAutotagingSettings = {
	api_key: 'default'
}

interface Book {
	title: string;
	author: string;
}

const ALL_BOOKS = [
	{
		title: 'How to Take Smart Notes',
		author: 'Sönke Ahrens',
	},
	{
		title: 'Thinking, Fast and Slow',
		author: 'Daniel Kahneman',
	},
	{
		title: 'Deep Work',
		author: 'Cal Newport',
	},
];

export default class ObsidianPluginAutotagingPlugin extends Plugin {
	settings: ObsidianPluginAutotagingSettings;

	async onload() {
		await this.loadSettings();

		// 输出插件加载信息
		console.log("plugin has been loaded");

		// 新增一个图标到左侧的Ribbon，并绑定一个鼠标点击事件
		const ribbonIconEl = this.addRibbonIcon('dice', 'new added icon', (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');

			// 在这个 ribbon 处创建一个上下文菜单
			const menu = new Menu();

			// 添加一个选项
			menu.addItem((item) =>
				item
					.setTitle('Copy')
					.setIcon('documents')
					.onClick(() => {
						new Notice('Copied');
						new SampleModal(this.app, (name) => {
							new Notice(`Hello, ${name}!`);
						}).open();
					})
			);

			// 当鼠标点击事件发生时，显示这个上下文菜单
			menu.showAtMouseEvent(_evt);

		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');



		this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
			// 当用户点击鼠标右键时，显示上下文菜单
			menu.addItem((item) =>
				item
					.setTitle('show file path')
					.setIcon('documents')
					.onClick(() => {
						new Notice(file.path);
					})
			);
		}));

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('caillo');
		setIcon(statusBarItemEl, "dice")


		// 给 Plugin 添加一系列的 command
		this.addCommand({
			id: 'test command',
			name: 'test command',
			callback: () => {
				new Notice('test command');
			}
		});

		this.addCommand({
			id: "read-current-file",
			name: "Read current file",
			callback: () => {
				new CurrentFileModal(this.app).open();
			}
		})

		this.addCommand({
			id: "generate-tags-for-all-files",
			name: "generate tags for all files",
			callback: () => {
				new AllFilesModal(this.app, this).open();
			}
		})

		this.addCommand({
			id: "add-internal-links-to-file",
			name: "Add internal links to file",
			callback: () => {
				new InternalLinkModal(this.app).open();
			}
		})

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app, (name) => {
					new Notice(`Hello, ${name}!`);
				}).open();
			}
		});

		this.addCommand({
			id: "open-suggestion-modal",
			name: "Open suggestion modal",
			callback: () => {
				new ExampleSuggestModal(this.app).open();
			}
		})

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, _view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app, (name) => {
							new Notice(`Hello, ${name}!`);
						}).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObsidianPluginAutotagingSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		console.log("plugin has been unloaded");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
// Modal 用于展示信息并于用户交互
export class SampleModal extends Modal {
	constructor(app: App, onSubmit: (name: string) => void) {
		super(app);
		this.setTitle("input somethinsg")

		let name = ""
		new Setting(this.contentEl)
			.setName("text 1")
			.addText((text) => text
				.setPlaceholder("Enter your secret")
				.onChange(async (value) => {
					name = value;
					new Notice(`value has been changed, ${name}!`);
				}));

		new Setting(this.containerEl).addButton((button) => button
			.setButtonText("submit")
			.setCta()
			.onClick(() => {
				this.close();
				onSubmit(name);
			}));
	}

	onOpen() {
		console.log(this.containerEl)
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}


// Modal that shows content of the currently active markdown file
export class CurrentFileModal extends Modal {
	constructor(app: App) {
		super(app);
		this.setTitle('Current File Content');
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Get the active markdown file
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			contentEl.createEl('div', { text: 'No active markdown file.', cls: 'no-file' });
			return;
		}

		const file = activeView.file;
		if (!file) {
			contentEl.createEl('div', { text: 'No file found in active view.', cls: 'no-file' });
			return;
		}

		// Create a scrollable container
		const container = contentEl.createDiv({ cls: 'current-file-container' });
		container.style.maxHeight = '400px';
		container.style.overflowY = 'auto';
		container.style.padding = '8px';
		container.style.border = '1px solid var(--background-modifier-border)';
		container.style.borderRadius = '4px';

		try {
			const content = await this.app.vault.read(file);
			const pre = container.createEl('pre', { cls: 'file-content' });
			pre.style.margin = '0';
			pre.textContent = content;
		} catch (err) {
			container.createEl('div', { text: `Failed to read file: ${err}`, cls: 'error' });
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}


// Modal that lists all markdown files in the vault
export class AllFilesModal extends Modal {
	private files: TFile[] = [];
	private autoTagResult: Record<string, string[]> = {};
	private plugin: ObsidianPluginAutotagingPlugin;

	constructor(app: App, plugin: ObsidianPluginAutotagingPlugin) {
		super(app);
		this.setTitle('All Files');
		this.loadFiles();
		this.plugin = plugin;
	}

	private async loadFiles() {
		// Get all markdown files in the vault
		this.files = this.app.vault.getMarkdownFiles();
		this.renderList();
	}

	private renderList() {
		const { contentEl } = this;

		// Clear previous content
		contentEl.empty();

		// Create a scrollable container
		const container = contentEl.createDiv({ cls: 'all-files-container' });
		container.style.maxHeight = '400px';
		container.style.overflowY = 'auto';

		console.log("print files")
		console.log(this.files)
		// Render each file as a clickable item
		this.files.forEach((file) => {
			const item = container.createDiv({ cls: 'file-item' });
			item.style.padding = '4px 8px';
			item.style.cursor = 'pointer';
			item.createEl('div', { text: file.path, cls: 'file-path' });

			// Read file content on click
			item.onClickEvent(async () => {
				try {
					const content = await this.app.vault.read(file);
					console.log(content)
					new Notice(`Content: ${content.slice(0, 100)}...`);
				} catch (err) {
					new Notice(`Failed to read file: ${err}`);
				}
			});
		});

		new Setting(contentEl).addButton((button) => button
			.setButtonText("submit")
			.setCta()
			.onClick(async () => {
				button.setButtonText("submitting...")
				new Notice("submit button clicked")
				try {
					// 提取TFile对象中需要的属性，避免循环引用
					const filesData = this.files.map(file => ({
						path: file.path,
						name: file.name,
						extension: file.extension,
					}));

					const response = await fetch('http://localhost:5000/get-tags', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							files: filesData,
							api_key: this.plugin.settings.api_key
						})
					});

					console.log(response)

					if (!response.ok) { // 先检查状态
						throw new Error(`Server responded with ${response.status}`);
					}
					const result = await response.json(); // 添加await
					console.log(result)
					this.autoTagResult = result.tags;

					// Render tags in container
					const tagContainer = container.createDiv({ cls: 'tags-container' });
					tagContainer.style.marginTop = '12px';
					tagContainer.style.padding = '8px';
					tagContainer.style.border = '1px solid var(--background-modifier-border)';
					tagContainer.style.borderRadius = '4px';
					tagContainer.style.maxHeight = '200px';
					tagContainer.style.overflowY = 'auto';

					tagContainer.createEl('h4', { text: 'Auto-generated Tags', cls: 'tags-header' });

					const list = tagContainer.createEl('ul', { cls: 'tags-list' });
					list.style.listStyle = 'none';
					list.style.paddingLeft = '0';

					Object.entries(this.autoTagResult).forEach(([file, tags]) => {
						const li = list.createEl('li', { cls: 'file-tags' });
						li.style.marginBottom = '6px';

						const fileSpan = li.createEl('span', { text: file, cls: 'file-path' });
						fileSpan.style.fontWeight = '600';
						fileSpan.style.display = 'block';

						const tagList = li.createEl('ul', { cls: 'tag-list' });
						tagList.style.paddingLeft = '16px';
						tagList.style.marginTop = '2px';

						const tagArray = Array.isArray(tags) ? tags : [tags];
						tagArray.forEach((tag: string) => {
							const tagLi = tagList.createEl('li', { text: tag, cls: 'tag-item' });
							tagLi.style.fontSize = '0.9em';
						});
					});

					new Notice(`Server response: ${JSON.stringify(result)}`);
					button.setButtonText("resubmit");
					// this.autoTagResult = result.tags
					// new Notice(`Server response: ${JSON.stringify(result)}`);
					// button.setButtonText("resubmit")
				} catch (err) {
					console.log(err)
					new Notice(`Failed to send file to server: ${err}`);
				}
			}));


		new Setting(contentEl).addButton((button) => button.setButtonText("apply tags for files").setCta()
			.setCta()
			.onClick(async () => {
				new Notice("submit button clicked")
				try {
					if (!this.autoTagResult || Object.keys(this.autoTagResult).length === 0) {
						new Notice('No auto-tagging results available');
						return;
					}

					let processedCount = 0;
					for (const file of this.files) {
						const newTags = this.autoTagResult[file.path];
						if (!newTags) continue;

						try {
							let content = await this.app.vault.read(file);
							const tagsToAdd = Array.isArray(newTags) ? newTags : [newTags];

							// 正则匹配frontmatter（YAML块）
							const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
							const match = content.match(frontmatterRegex);

							let metadata: any = {};
							let body = content;
							let hasFrontmatter = false;

							if (match) {
								hasFrontmatter = true;
								const yamlStr = match[1];
								body = content.slice(match[0].length);

								// 使用js-yaml解析YAML
								try {
									metadata = yaml.load(yamlStr) || {};
								} catch (e) {
									metadata = {};
								}
								if (!metadata.tags) metadata.tags = [];
							} else {
								metadata.tags = [];
							}

							// 添加新tags，避免重复
							tagsToAdd.forEach(tag => {
								if (!metadata.tags.includes(tag)) {
									metadata.tags.push(tag);
								}
							});

							// 构建新的frontmatter
							let newFrontmatter = '';
							if (hasFrontmatter) {
								newFrontmatter = '---\n';
								newFrontmatter += yaml.dump(metadata, { indent: 2 });
								newFrontmatter += '---\n';
							} else {
								newFrontmatter = '---\n';
								newFrontmatter += yaml.dump({ tags: metadata.tags }, { indent: 2 });
								newFrontmatter += '---\n';
							}

							// 组合新内容
							const newContent = newFrontmatter + body;
							await this.app.vault.modify(file, newContent);
							processedCount++;
						} catch (err) {
							console.error(`Failed to update tags for ${file.path}:`, err);
							new Notice(`Failed to update tags for ${file.path}`);
						}
					}

					new Notice(`Updated tags for ${processedCount} files`);
				} catch (err) {
					console.log(err)
					new Notice(`Failed to send file to server: ${err}`);
				}
			}));
	}

	onOpen() {
		console.log('AllFilesModal opened');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}


// Modal that sends the current file info to backend and appends returned internal-links at the end
export class InternalLinkModal extends Modal {
	private currentFile: TFile | null = null;

	constructor(app: App) {
		super(app);
		this.setTitle('Generate Internal Links');
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Identify the active markdown file
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView || !activeView.file) {
			contentEl.createEl('div', { text: 'No active markdown file.', cls: 'no-file' });
			return;
		}
		this.currentFile = activeView.file;

		// Build UI
		const container = contentEl.createDiv({ cls: 'internal-link-container' });
		container.createEl('p', { text: `File: ${this.currentFile.path}` });

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Generate Links')
					.setCta()
					.onClick(async () => {
						btn.setDisabled(true);
						btn.setButtonText('Generating…');
						try {
							const body = {
								path: this.currentFile!.path,
								name: this.currentFile!.name,
								content: await this.app.vault.read(this.currentFile!),
							};

							const res = await fetch('http://localhost:5000/internal-links', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify(body),
							});

							if (!res.ok) throw new Error(`Server ${res.status}`);
							const data = await res.json();

							// Extract links from new response structure
							const links: string[] = data.internal_link?.ids?.flat() || [];
							if (!links.length) {
								new Notice('No related files returned');
								return;
							}

							// Append links at the end of current file
							const linkSection =
								'\n\n## Related\n' +
								links.map((p) => `[[${p}]]`).join('\n') +
								'\n';

							const currentContent = await this.app.vault.read(this.currentFile!);
							await this.app.vault.modify(
								this.currentFile!,
								currentContent + linkSection
							);

							new Notice(`Added ${links.length} internal link(s)`);
							this.close();
						} catch (err) {
							console.error(err);
							new Notice(`Failed: ${err}`);
						} finally {
							btn.setDisabled(false);
							btn.setButtonText('Generate Links');
						}
					})
			)
			.addButton((btn) =>
				btn.setButtonText('Cancel').onClick(() => this.close())
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}



// 为插件在 setting 中创建一个页面，用于配置插件的设置
class ObsidianPluginAutotagingSettingTab extends PluginSettingTab {
	plugin: ObsidianPluginAutotagingPlugin;

	constructor(app: App, plugin: ObsidianPluginAutotagingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'API Configuration' });

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Enter your API key for the AI service')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.api_key)
				.onChange(async (value) => {
					this.plugin.settings.api_key = value.trim();
					await this.plugin.saveSettings();
				}));
	}
}


export class ExampleSuggestModal extends SuggestModal<Book> {
	// Returns all available suggestions.
	getSuggestions(query: string): Book[] {
		return ALL_BOOKS.filter((book) =>
			book.title.toLowerCase().includes(query.toLowerCase())
		);
	}

	// Renders each suggestion item.
	renderSuggestion(book: Book, el: HTMLElement) {
		el.createEl('div', { text: book.title });
		el.createEl('small', { text: book.author });
	}

	// Perform action on the selected suggestion.
	onChooseSuggestion(book: Book, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${book.title}`);
	}
}