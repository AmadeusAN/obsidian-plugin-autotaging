import { App, Editor, MarkdownView, Menu, Modal, Notice, Plugin, PluginSettingTab, Setting, setIcon, SuggestModal } from 'obsidian';
import { TFile } from 'obsidian';
import * as yaml from 'js-yaml';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
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

export default class HelloworldPlugin extends Plugin {
	settings: MyPluginSettings;

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
			id: "read-file",
			name: "Read file",
			callback: () => {
				new AllFilesModal(this.app).open();
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
		this.addSettingTab(new SampleSettingTab(this.app, this));

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

	constructor(app: App) {
		super(app);
		this.setTitle('All Files');
		this.loadFiles();
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
				this.close();
				new Notice("submit button clicked")
				try {
					// 提取TFile对象中需要的属性，避免循环引用
					const filesData = this.files.map(file => ({
						path: file.path,
						name: file.name,
						extension: file.extension,
						size: file.size,
						mtime: file.mtime,
						ctime: file.ctime
					}));

					const response = await fetch('http://localhost:5000/test', { // 添加await
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(filesData)
					});

					console.log(response)

					if (!response.ok) { // 先检查状态
						throw new Error(`Server responded with ${response.status}`);
					}
					const result = await response.json(); // 添加await
					console.log(result)
					this.autoTagResult = result.tags
					new Notice(`Server response: ${JSON.stringify(result)}`);
				} catch (err) {
					console.log(err)
					new Notice(`Failed to send file to server: ${err}`);
				}
			}));


		new Setting(contentEl).addButton((button) => button.setButtonText("test modify files").setCta()
			.setCta()
			.onClick(async () => {
				new Notice("submit button clicked")
				try {
					if (!this.files[1]) {
						new Notice('No second file found');
						return;
					}
					const file = this.files[1];

					// 假设这里是从服务器获取的响应，是一个路径到tags的字典
					// 对于示例，我们模拟一个响应；实际中替换为真实的API调用结果
					const pathToTags = {
						[file.path]: ['new-tag1', 'new-tag2']  // 可以是字符串如 'single-tag' 或数组
					};

					const newTags = pathToTags[file.path];
					if (!newTags) {
						new Notice(`No tags found for ${file.path}`);
						return;
					}

					let content = await this.app.vault.read(file);

					// 规范化newTags为数组
					const tagsToAdd = Array.isArray(newTags) ? newTags : [newTags];

					// 正则匹配frontmatter（YAML块）
					const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
					const match = content.match(frontmatterRegex);

					let metadata = {};
					let body = content;
					let hasFrontmatter = false;

					if (match) {
						hasFrontmatter = true;
						const yamlStr = match[1];
						body = content.slice(match[0].length);  // 移除frontmatter后的正文

						// 手动解析YAML（假设简单结构，无嵌套；实际中可使用js-yaml库）
						// 这里简单实现：按行分割，处理tags列表
						const lines = yamlStr.split('\n');
						let inTags = false;
						metadata.tags = [];

						for (let line of lines) {
							line = line.trim();
							if (line.startsWith('tags:')) {
								inTags = true;
								if (line.length > 5) {  // 如 tags: tag1 （但标准是列表）
									metadata.tags.push(line.slice(5).trim());
								}
								continue;
							}
							if (inTags) {
								if (line.startsWith('-')) {
									metadata.tags.push(line.slice(1).trim());
								} else if (line === '') {
									inTags = false;  // 空行结束
								} else {
									inTags = false;  // 其他键开始
									// 处理其他键，但这里只需tags，所以跳过
								}
							} else {
								// 其他metadata键，保留
								// 但为简单，我们只需添加tags，不改其他
							}
						}
					}

					// 添加新tags，避免重复（可选）
					tagsToAdd.forEach(tag => {
						if (!metadata.tags.includes(tag)) {
							metadata.tags.push(tag);
						}
					});

					// 构建新的frontmatter
					let newFrontmatter = '';
					if (hasFrontmatter) {
						// 重建原有frontmatter，但更新tags
						// 为简单，假设我们只需追加/替换tags部分
						// 但实际需保留其他键。这里简化：如果有create等，需解析所有
						// 改进：使用完整解析
						// 假设使用js-yaml（推荐：在插件中安装并import * as yaml from 'js-yaml';）
						// 注释掉手动解析，使用yaml假设
						/*
						if (match) {
							metadata = yaml.load(match[1]) || {};
							body = content.slice(match[0].length);
						}
						metadata.tags = metadata.tags || [];
						if (!Array.isArray(metadata.tags)) {
							metadata.tags = [metadata.tags];
						}
						tagsToAdd.forEach(tag => {
							if (!metadata.tags.includes(tag)) {
								metadata.tags.push(tag);
							}
						});
						newFrontmatter = '---\n' + yaml.dump(metadata) + '---\n';
						*/
						// 但为无库，手动构建
						newFrontmatter = '---\n';
						// 假设原有metadata有create，硬编码或从match复制
						if (match) {
							let originalFm = match[1].trim();
							if (originalFm.includes('tags:')) {
								// 替换tags部分
								originalFm = originalFm.replace(/tags:\s*([\s\S]*?)(?=\n\w+:|$)/, `tags:\n  - ${metadata.tags.join('\n  - ')}`);
							} else {
								originalFm += '\ntags:\n  - ' + metadata.tags.join('\n  - ');
							}
							newFrontmatter += originalFm + '\n';
						} else {
							newFrontmatter += 'tags:\n  - ' + metadata.tags.join('\n  - ') + '\n';
						}
						newFrontmatter += '---\n';
					} else {
						// 无frontmatter，创建新
						newFrontmatter = '---\n';
						newFrontmatter += 'tags:\n';
						metadata.tags.forEach(tag => {
							newFrontmatter += '  - ' + tag + '\n';
						});
						newFrontmatter += '---\n';
					}

					// 组合新内容
					const newContent = newFrontmatter + body;

					await this.app.vault.modify(file, newContent);
					new Notice(`Added tags to ${file.path}`);
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



// 为插件在 setting 中创建一个页面，用于配置插件的设置
class SampleSettingTab extends PluginSettingTab {
	plugin: HelloworldPlugin;

	constructor(app: App, plugin: HelloworldPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h1', { text: 'Heading 1' });

		const book = containerEl.createEl('div', { cls: 'book' });
		book.createEl('div', { text: 'How to Take Smart Notes', cls: 'book__title' });
		book.createEl('small', { text: 'Sönke Ahrens', cls: 'book__author' });

		new Setting(containerEl).setName("part 1").setHeading();
		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
					new Notice(`value has been changed, ${value}!`);
				}));

		new Setting(containerEl)
			.setName('Button')
			.setDesc('With extra button')
			.addButton(button => button
				.setButtonText('Click me!')
				.onClick(() => {
					new Notice('This is a notice!');
				})
			);

		new Setting(containerEl)
			.setName('Slider')
			.setDesc('with tooltip')
			.addSlider(slider => slider.setDynamicTooltip()
			);

		new Setting(containerEl)
			.setName('Progress bar')
			.setDesc('It\'s 50% done')
			.addProgressBar(bar => bar.setValue(50));
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