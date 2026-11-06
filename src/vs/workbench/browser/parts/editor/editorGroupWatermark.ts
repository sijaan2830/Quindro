/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { Disposable, DisposableStore, IDisposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isNative, OS } from '../../../../base/common/platform.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IWorkspaceContextService, WorkbenchState } from '../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { append, clearNode, $, h } from '../../../../base/browser/dom.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { defaultKeybindingLabelStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorForeground, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { isRecentFolder, IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ILabelService, Verbosity } from '../../../../platform/label/common/label.js';
import { ColorScheme } from '../../web.api.js';
import { OpenFileFolderAction, OpenFolderAction } from '../../actions/workspaceActions.js';
import { IWindowOpenable } from '../../../../platform/window/common/window.js';
import { splitRecentLabel } from '../../../../base/common/labels.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';

/* eslint-disable */ // Void
import { VOID_CTRL_K_ACTION_ID, VOID_CTRL_L_ACTION_ID } from '../../../contrib/quindro/browser/actionIDs.js';
import { VIEWLET_ID as REMOTE_EXPLORER_VIEWLET_ID } from '../../../contrib/remote/browser/remoteExplorer.js';
/* eslint-enable */

// interface WatermarkEntry {
// 	readonly id: string;
// 	readonly text: string;
// 	readonly when?: {
// 		native?: ContextKeyExpression;
// 		web?: ContextKeyExpression;
// 	};
// }

// const showCommands: WatermarkEntry = { text: localize('watermark.showCommands', "Show All Commands"), id: 'workbench.action.showCommands' };
// const gotoFile: WatermarkEntry = { text: localize('watermark.quickAccess', "Go to File"), id: 'workbench.action.quickOpen' };
// const openFile: WatermarkEntry = { text: localize('watermark.openFile', "Open File"), id: 'workbench.action.files.openFile' };
// const openFolder: WatermarkEntry = { text: localize('watermark.openFolder', "Open Folder"), id: 'workbench.action.files.openFolder' };
// const openFileOrFolder: WatermarkEntry = { text: localize('watermark.openFileFolder', "Open File or Folder"), id: 'workbench.action.files.openFileFolder' };
// const openRecent: WatermarkEntry = { text: localize('watermark.openRecent', "Open Recent"), id: 'workbench.action.openRecent' };
// const newUntitledFile: WatermarkEntry = { text: localize('watermark.newUntitledFile', "New Untitled Text File"), id: 'workbench.action.files.newUntitledFile' };
// const findInFiles: WatermarkEntry = { text: localize('watermark.findInFiles', "Find in Files"), id: 'workbench.action.findInFiles' };
// const toggleTerminal: WatermarkEntry = { text: localize({ key: 'watermark.toggleTerminal', comment: ['toggle is a verb here'] }, "Toggle Terminal"), id: 'workbench.action.terminal.toggleTerminal', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const startDebugging: WatermarkEntry = { text: localize('watermark.startDebugging', "Start Debugging"), id: 'workbench.action.debug.start', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const openSettings: WatermarkEntry = { text: localize('watermark.openSettings', "Open Settings"), id: 'workbench.action.openSettings' };

// const showCopilot = ContextKeyExpr.or(ContextKeyExpr.equals('chatSetupHidden', false), ContextKeyExpr.equals('chatSetupInstalled', true));
// const openChat: WatermarkEntry = { text: localize('watermark.openChat', "Open Chat"), id: 'workbench.action.chat.open', when: { native: showCopilot, web: showCopilot } };
// const openCopilotEdits: WatermarkEntry = { text: localize('watermark.openCopilotEdits', "Open Copilot Edits"), id: 'workbench.action.chat.openEditSession', when: { native: showCopilot, web: showCopilot } };

// const emptyWindowEntries: WatermarkEntry[] = coalesce([
// 	showCommands,
// 	...(isMacintosh && !isWeb ? [openFileOrFolder] : [openFile, openFolder]),
// 	openRecent,
// 	isMacintosh && !isWeb ? newUntitledFile : undefined, // fill in one more on macOS to get to 5 entries
// 	openChat
// ]);

// const randomEmptyWindowEntries: WatermarkEntry[] = [
// 	/* Nothing yet */
// ];

// const workspaceEntries: WatermarkEntry[] = [
// 	showCommands,
// 	gotoFile,
// 	openChat
// ];

// const randomWorkspaceEntries: WatermarkEntry[] = [
// 	findInFiles,
// 	startDebugging,
// 	toggleTerminal,
// 	openSettings,
// 	openCopilotEdits
// ];


export class EditorGroupWatermark extends Disposable {
	private readonly shortcuts: HTMLElement;
	private readonly transientDisposables = this._register(new DisposableStore());
	// private enabled: boolean = false;
	private workbenchState: WorkbenchState;
	private currentDisposables = new Set<IDisposable>();

	constructor(
		container: HTMLElement,
		@IKeybindingService private readonly keybindingService: IKeybindingService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		// @IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IThemeService private readonly themeService: IThemeService,
		@IWorkspacesService private readonly workspacesService: IWorkspacesService,
		@ICommandService private readonly commandService: ICommandService,
		@IHostService private readonly hostService: IHostService,
		@ILabelService private readonly labelService: ILabelService,
		@IViewsService private readonly viewsService: IViewsService,
	) {
		super();

		const elements = h('.editor-group-watermark', [
			h('.letterpress@icon'),
			h('.shortcuts@shortcuts'),
		]);

		append(container, elements.root);
		this.shortcuts = elements.shortcuts; // shortcuts div is modified on render()

		// void icon style
		const updateTheme = () => {
			const theme = this.themeService.getColorTheme().type
			const isDark = theme === ColorScheme.DARK || theme === ColorScheme.HIGH_CONTRAST_DARK
			elements.icon.style.maxWidth = '220px'
			elements.icon.style.opacity = '50%'
			elements.icon.style.filter = isDark ? '' : 'invert(1)' //brightness(.5)
		}
		updateTheme()
		this._register(
			this.themeService.onDidColorThemeChange(updateTheme)
		)

		this.registerListeners();

		this.workbenchState = contextService.getWorkbenchState();
		this.render();
	}

	private registerListeners(): void {
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('workbench.tips.enabled')) {
				this.render();
			}
		}));

		this._register(this.contextService.onDidChangeWorkbenchState(workbenchState => {
			if (this.workbenchState === workbenchState) {
				return;
			}

			this.workbenchState = workbenchState;
			this.render();
		}));

		// const allEntriesWhenClauses = [...noFolderEntries, ...folderEntries].filter(entry => entry.when !== undefined).map(entry => entry.when!);
		// const allKeys = new Set<string>();
		// allEntriesWhenClauses.forEach(when => when.keys().forEach(key => allKeys.add(key)));
		// this._register(this.contextKeyService.onDidChangeContext(e => {
		// 	if (e.affectsSome(allKeys)) {
		// 		this.render();
		// 	}
		// }));
	}



	private render(): void {

		this.clear();
		const voidIconBox = append(this.shortcuts, $('.watermark-box'));
		const recentsBox = append(this.shortcuts, $('div'));
		recentsBox.style.display = 'flex'
		recentsBox.style.flex = 'row'
		recentsBox.style.justifyContent = 'center'


		const update = async () => {

			// put async at top so don't need to wait (this prevents a jitter on load)
			const recentlyOpened = await this.workspacesService.getRecentlyOpened()
				.catch(() => ({ files: [], workspaces: [] })).then(w => w.workspaces);

			clearNode(voidIconBox);
			clearNode(recentsBox);

			this.currentDisposables.forEach(label => label.dispose());
			this.currentDisposables.clear();


			// Quindro / Cursor style watermark
			// Quindro Studio Watermark & Command Deck
			if (this.contextService.getWorkbenchState() === WorkbenchState.EMPTY) {

				// Screen 2: Quindro Studio Home / Welcome Experience
				const homeContainer = $('div.q-home-container');
				homeContainer.style.display = 'flex';
				homeContainer.style.flexDirection = 'column';
				homeContainer.style.alignItems = 'center';
				homeContainer.style.gap = '28px';
				homeContainer.style.padding = '48px 24px';
				homeContainer.style.maxWidth = '720px';
				homeContainer.style.margin = '0 auto';
				homeContainer.style.userSelect = 'none';

				// Branding Box with Quindro Vector Logo
				const brandingBox = $('div.q-home-branding');
				brandingBox.style.display = 'flex';
				brandingBox.style.flexDirection = 'column';
				brandingBox.style.alignItems = 'center';
				brandingBox.style.gap = '6px';

				const logoBox = $('div.q-home-logo');
				logoBox.style.display = 'flex';
				logoBox.style.justifyContent = 'center';
				logoBox.style.alignItems = 'center';
				logoBox.style.marginBottom = '6px';
				logoBox.style.filter = 'drop-shadow(0 0 20px rgba(56, 189, 248, 0.28))';
				logoBox.innerHTML = `
					<svg width="64" height="64" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
						<defs>
							<linearGradient id="q_grad_home" x1="16" y1="16" x2="112" y2="112" gradientUnits="userSpaceOnUse">
								<stop offset="0%" stop-color="#38BDF8"/>
								<stop offset="50%" stop-color="#818CF8"/>
								<stop offset="100%" stop-color="#C084FC"/>
							</linearGradient>
						</defs>
						<rect x="22" y="22" width="84" height="84" rx="26" stroke="url(#q_grad_home)" stroke-width="6.5" stroke-linecap="round"/>
						<circle cx="64" cy="64" r="24" stroke="rgba(255, 255, 255, 0.9)" stroke-width="4.5" stroke-dasharray="110 18"/>
						<path d="M78 78L106 106" stroke="url(#q_grad_home)" stroke-width="8" stroke-linecap="round"/>
						<circle cx="106" cy="106" r="4.5" fill="#38BDF8"/>
						<circle cx="64" cy="64" r="6.5" fill="url(#q_grad_home)"/>
						<circle cx="64" cy="64" r="2.5" fill="#FFFFFF"/>
					</svg>
				`;
				brandingBox.appendChild(logoBox);

				const title = $('div.q-home-title');
				title.textContent = 'QUINDRO';
				title.style.fontSize = '30px';
				title.style.fontWeight = '800';
				title.style.letterSpacing = '4px';
				title.style.background = 'linear-gradient(135deg, #FFFFFF 35%, #A5B4FC 75%, #38BDF8 100%)';
				(title.style as any)['-webkit-background-clip'] = 'text';
				(title.style as any)['-webkit-text-fill-color'] = 'transparent';

				const badge = $('div.q-home-badge');
				badge.textContent = 'STUDIO v1.4.9 · QUANTUM AGENT ENGINE';
				badge.style.fontSize = '10px';
				badge.style.fontWeight = '600';
				badge.style.letterSpacing = '1.8px';
				badge.style.color = '#38BDF8';
				badge.style.padding = '3px 12px';
				badge.style.borderRadius = '9999px';
				badge.style.background = 'rgba(56, 189, 248, 0.08)';
				badge.style.border = '1px solid rgba(56, 189, 248, 0.22)';
				badge.style.marginTop = '2px';

				brandingBox.appendChild(title);
				brandingBox.appendChild(badge);
				homeContainer.appendChild(brandingBox);

				// Action Cards Container (4 Cards with Double-Bezel Architecture)
				const cardsBox = $('div.q-action-cards');
				cardsBox.style.display = 'grid';
				cardsBox.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
				cardsBox.style.gap = '14px';
				cardsBox.style.width = '100%';
				cardsBox.style.marginTop = '8px';

				const createActionCard = (icon: string, text: string, sub: string, onClick: () => void) => {
					const card = $('div.q-action-card');
					card.style.display = 'flex';
					card.style.flexDirection = 'column';
					card.style.alignItems = 'flex-start';
					card.style.gap = '10px';
					card.style.padding = '18px 18px';
					card.style.background = 'linear-gradient(180deg, rgba(24, 24, 30, 0.8) 0%, rgba(16, 16, 20, 0.95) 100%)';
					card.style.border = '1px solid rgba(255, 255, 255, 0.08)';
					card.style.borderRadius = '14px';
					card.style.cursor = 'pointer';
					card.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 24px -6px rgba(0, 0, 0, 0.4)';
					card.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';

					const iconContainer = $('div');
					iconContainer.style.width = '36px';
					iconContainer.style.height = '36px';
					iconContainer.style.borderRadius = '10px';
					iconContainer.style.display = 'flex';
					iconContainer.style.alignItems = 'center';
					iconContainer.style.justifyContent = 'center';
					iconContainer.style.background = 'rgba(255, 255, 255, 0.05)';
					iconContainer.style.border = '1px solid rgba(255, 255, 255, 0.08)';
					iconContainer.style.fontSize = '18px';
					iconContainer.textContent = icon;

					const textWrap = $('div');
					textWrap.style.display = 'flex';
					textWrap.style.flexDirection = 'column';
					textWrap.style.gap = '2px';

					const cardText = $('div');
					cardText.textContent = text;
					cardText.style.fontSize = '13px';
					cardText.style.fontWeight = '600';
					cardText.style.color = '#F4F4F5';

					const cardSub = $('div');
					cardSub.textContent = sub;
					cardSub.style.fontSize = '11px';
					cardSub.style.color = '#71717A';

					textWrap.appendChild(cardText);
					textWrap.appendChild(cardSub);
					card.appendChild(iconContainer);
					card.appendChild(textWrap);

					card.onmouseenter = () => {
						card.style.borderColor = 'rgba(56, 189, 248, 0.4)';
						card.style.transform = 'translateY(-2px)';
						card.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 14px 28px -6px rgba(0, 0, 0, 0.55)';
						iconContainer.style.transform = 'scale(1.08)';
					};
					card.onmouseleave = () => {
						card.style.borderColor = 'rgba(255, 255, 255, 0.08)';
						card.style.transform = 'translateY(0)';
						card.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 24px -6px rgba(0, 0, 0, 0.4)';
						iconContainer.style.transform = 'scale(1)';
					};
					card.onmousedown = () => {
						card.style.transform = 'scale(0.98)';
					};
					card.onmouseup = () => {
						card.style.transform = 'translateY(-2px)';
					};
					card.onclick = onClick;
					return card;
				};

				cardsBox.appendChild(createActionCard('📁', 'Open Project', 'Local Workspace', () => {
					this.commandService.executeCommand(isMacintosh && isNative ? OpenFileFolderAction.ID : OpenFolderAction.ID);
				}));
				cardsBox.appendChild(createActionCard('⎇', 'Clone Repo', 'Git Repository', () => {
					this.commandService.executeCommand('git.clone');
				}));
				cardsBox.appendChild(createActionCard('🌐', 'Remote SSH', 'Cloud Server', () => {
					this.viewsService.openViewContainer(REMOTE_EXPLORER_VIEWLET_ID);
				}));
				cardsBox.appendChild(createActionCard('⚡', 'AI Model Hub', 'Keys & Settings', () => {
					this.commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID);
				}));

				homeContainer.appendChild(cardsBox);

				// Recents List
				if (recentlyOpened.length !== 0) {
					const recentsSection = $('div.q-recents-section');
					recentsSection.style.width = '100%';
					recentsSection.style.marginTop = '16px';
					recentsSection.style.background = 'rgba(18, 18, 22, 0.5)';
					recentsSection.style.border = '1px solid rgba(255, 255, 255, 0.06)';
					recentsSection.style.borderRadius = '14px';
					recentsSection.style.padding = '14px 18px';

					const recentsHeader = $('div.q-recents-header');
					recentsHeader.style.display = 'flex';
					recentsHeader.style.justifyContent = 'space-between';
					recentsHeader.style.fontSize = '11px';
					recentsHeader.style.fontWeight = '600';
					recentsHeader.style.letterSpacing = '1px';
					recentsHeader.style.textTransform = 'uppercase';
					recentsHeader.style.color = '#71717A';
					recentsHeader.style.marginBottom = '10px';

					const recentsTitle = $('span');
					recentsTitle.textContent = 'Recent Projects';
					recentsHeader.appendChild(recentsTitle);
					recentsSection.appendChild(recentsHeader);

					const recentsList = $('div.q-recents-list');
					recentsList.style.display = 'flex';
					recentsList.style.flexDirection = 'column';
					recentsList.style.gap = '4px';

					recentlyOpened.slice(0, 5).forEach((w) => {
						if (!isRecentFolder(w)) return;
						const fullPath = w.label || this.labelService.getWorkspaceLabel(w.folderUri, { verbose: Verbosity.LONG });
						const { name, parentPath } = splitRecentLabel(fullPath);

						const item = $('div.q-recent-item');
						item.style.display = 'flex';
						item.style.justifyContent = 'space-between';
						item.style.alignItems = 'center';
						item.style.padding = '8px 12px';
						item.style.borderRadius = '8px';
						item.style.cursor = 'pointer';
						item.style.background = 'transparent';
						item.style.transition = 'all 0.15s ease';

						const leftSide = $('div');
						leftSide.style.display = 'flex';
						leftSide.style.alignItems = 'center';
						leftSide.style.gap = '8px';

						const iconFolder = $('span');
						iconFolder.textContent = '📂';
						iconFolder.style.fontSize = '14px';

						const nameSpan = $('span');
						nameSpan.textContent = name;
						nameSpan.style.color = '#E4E4E7';
						nameSpan.style.fontSize = '13px';
						nameSpan.style.fontWeight = '500';

						leftSide.appendChild(iconFolder);
						leftSide.appendChild(nameSpan);

						const pathSpan = $('span');
						pathSpan.textContent = parentPath;
						pathSpan.style.color = '#71717A';
						pathSpan.style.fontSize = '11px';

						item.appendChild(leftSide);
						item.appendChild(pathSpan);

						item.onmouseenter = () => {
							item.style.background = 'rgba(255, 255, 255, 0.05)';
							nameSpan.style.color = '#38BDF8';
						};
						item.onmouseleave = () => {
							item.style.background = 'transparent';
							nameSpan.style.color = '#E4E4E7';
						};

						item.onclick = (e) => {
							this.hostService.openWindow([{ folderUri: w.folderUri }], {
								forceNewWindow: e.ctrlKey || e.metaKey,
								remoteAuthority: w.remoteAuthority || null
							});
						};

						recentsList.appendChild(item);
					});

					recentsSection.appendChild(recentsList);
					homeContainer.appendChild(recentsSection);
				}

				voidIconBox.appendChild(homeContainer);

			}
			else {

				// Screen 3: Interactive Quindro AI Command Deck (Active Workspace State)
				const centerCanvas = $('div.q-center-canvas');
				centerCanvas.style.display = 'flex';
				centerCanvas.style.flexDirection = 'column';
				centerCanvas.style.alignItems = 'center';
				centerCanvas.style.justifyContent = 'center';
				centerCanvas.style.gap = '22px';
				centerCanvas.style.padding = '44px 20px';
				centerCanvas.style.userSelect = 'none';

				// Quindro Logo & Header
				const logoWrapper = $('div.q-canvas-logo');
				logoWrapper.style.display = 'flex';
				logoWrapper.style.justifyContent = 'center';
				logoWrapper.style.alignItems = 'center';
				logoWrapper.style.filter = 'drop-shadow(0 0 18px rgba(56, 189, 248, 0.25))';
				logoWrapper.innerHTML = `
					<svg width="52" height="52" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
						<defs>
							<linearGradient id="q_grad_deck" x1="16" y1="16" x2="112" y2="112" gradientUnits="userSpaceOnUse">
								<stop offset="0%" stop-color="#38BDF8"/>
								<stop offset="50%" stop-color="#818CF8"/>
								<stop offset="100%" stop-color="#C084FC"/>
							</linearGradient>
						</defs>
						<rect x="22" y="22" width="84" height="84" rx="26" stroke="url(#q_grad_deck)" stroke-width="6.5" stroke-linecap="round"/>
						<circle cx="64" cy="64" r="24" stroke="rgba(255, 255, 255, 0.88)" stroke-width="4.5" stroke-dasharray="110 18"/>
						<path d="M78 78L106 106" stroke="url(#q_grad_deck)" stroke-width="8" stroke-linecap="round"/>
						<circle cx="106" cy="106" r="4.5" fill="#38BDF8"/>
						<circle cx="64" cy="64" r="6.5" fill="url(#q_grad_deck)"/>
						<circle cx="64" cy="64" r="2.5" fill="#FFFFFF"/>
					</svg>
				`;
				centerCanvas.appendChild(logoWrapper);

				const badgeBox = $('div.q-canvas-badge');
				badgeBox.textContent = 'QUINDRO AI COMMAND DECK';
				badgeBox.style.fontSize = '11px';
				badgeBox.style.letterSpacing = '2px';
				badgeBox.style.color = '#38BDF8';
				badgeBox.style.fontWeight = '600';
				badgeBox.style.padding = '3px 12px';
				badgeBox.style.borderRadius = '9999px';
				badgeBox.style.background = 'rgba(56, 189, 248, 0.08)';
				badgeBox.style.border = '1px solid rgba(56, 189, 248, 0.2)';
				centerCanvas.appendChild(badgeBox);

				// Interactive Command List with Doppelrand styling
				const shortcutsList = $('div.q-shortcuts-list');
				shortcutsList.style.display = 'flex';
				shortcutsList.style.flexDirection = 'column';
				shortcutsList.style.gap = '8px';
				shortcutsList.style.minWidth = '380px';
				shortcutsList.style.maxWidth = '460px';

				const shortcutsData = [
					{ label: '⚡ Focus AI Builder Agent', keys: 'Ctrl + L', cmd: VOID_CTRL_L_ACTION_ID },
					{ label: '✨ Inline Code Surgeon', keys: 'Ctrl + K', cmd: VOID_CTRL_K_ACTION_ID },
					{ label: '🔍 Quick Search Files', keys: 'Ctrl + P', cmd: 'workbench.action.quickOpen' },
					{ label: '💻 Toggle Integrated Terminal', keys: 'Ctrl + J', cmd: 'workbench.action.terminal.toggleTerminal' },
					{ label: '⚙️ AI Model Hub & API Keys', keys: 'Settings', cmd: VOID_OPEN_SETTINGS_ACTION_ID },
					{ label: '📂 Switch Workspace Folder', keys: 'Ctrl + K Ctrl + O', cmd: isMacintosh && isNative ? OpenFileFolderAction.ID : OpenFolderAction.ID },
				];

				shortcutsData.forEach(s => {
					const row = $('div.q-shortcut-row');
					row.style.display = 'flex';
					row.style.justifyContent = 'space-between';
					row.style.alignItems = 'center';
					row.style.gap = '20px';
					row.style.padding = '10px 16px';
					row.style.borderRadius = '10px';
					row.style.background = 'rgba(20, 20, 24, 0.7)';
					row.style.border = '1px solid rgba(255, 255, 255, 0.07)';
					row.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.05)';
					row.style.cursor = 'pointer';
					row.style.transition = 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)';

					const labelSpan = $('span');
					labelSpan.textContent = s.label;
					labelSpan.style.fontSize = '13px';
					labelSpan.style.fontWeight = '500';
					labelSpan.style.color = '#D4D4D8';
					labelSpan.style.transition = 'color 0.15s ease';

					const kbdSpan = $('span');
					kbdSpan.textContent = s.keys;
					kbdSpan.style.fontSize = '11px';
					kbdSpan.style.fontFamily = 'monospace';
					kbdSpan.style.background = 'rgba(255, 255, 255, 0.06)';
					kbdSpan.style.border = '1px solid rgba(255, 255, 255, 0.1)';
					kbdSpan.style.padding = '3px 8px';
					kbdSpan.style.borderRadius = '5px';
					kbdSpan.style.color = '#A1A1AA';

					row.appendChild(labelSpan);
					row.appendChild(kbdSpan);

					row.onmouseenter = () => {
						row.style.borderColor = 'rgba(56, 189, 248, 0.35)';
						row.style.background = 'rgba(28, 28, 34, 0.85)';
						row.style.transform = 'translateY(-1px)';
						labelSpan.style.color = '#FFFFFF';
						kbdSpan.style.borderColor = 'rgba(56, 189, 248, 0.4)';
						kbdSpan.style.color = '#38BDF8';
					};
					row.onmouseleave = () => {
						row.style.borderColor = 'rgba(255, 255, 255, 0.07)';
						row.style.background = 'rgba(20, 20, 24, 0.7)';
						row.style.transform = 'translateY(0)';
						labelSpan.style.color = '#D4D4D8';
						kbdSpan.style.borderColor = 'rgba(255, 255, 255, 0.1)';
						kbdSpan.style.color = '#A1A1AA';
					};
					row.onmousedown = () => {
						row.style.transform = 'scale(0.985)';
					};
					row.onmouseup = () => {
						row.style.transform = 'translateY(-1px)';
					};

					row.onclick = () => {
						this.commandService.executeCommand(s.cmd);
					};

					shortcutsList.appendChild(row);
				});

				centerCanvas.appendChild(shortcutsList);
				voidIconBox.appendChild(centerCanvas);

			}
				// }
				// this.currentDisposables.add(label3);

			}

		};

		update();
		this.transientDisposables.add(this.keybindingService.onDidUpdateKeybindings(update));
	}

	private clear(): void {
		clearNode(this.shortcuts);
		this.transientDisposables.clear();
	}

	override dispose(): void {
		super.dispose();
		this.clear();
		this.currentDisposables.forEach(label => label.dispose());
	}
}

registerColor('editorWatermark.foreground', { dark: transparent(editorForeground, 0.6), light: transparent(editorForeground, 0.68), hcDark: editorForeground, hcLight: editorForeground }, localize('editorLineHighlight', 'Foreground color for the labels in the editor watermark.'));



// /*---------------------------------------------------------------------------------------------
//  *  Copyright (c) Microsoft Corporation. All rights reserved.
//  *  Licensed under the MIT License. See License.txt in the project root for license information.
//  *--------------------------------------------------------------------------------------------*/

// import { $, append, clearNode, h } from '../../../../base/browser/dom.js';
// import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
// import { coalesce, shuffle } from '../../../../base/common/arrays.js';
// import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
// import { isMacintosh, isWeb, OS } from '../../../../base/common/platform.js';
// import { localize } from '../../../../nls.js';
// import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
// import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
// import { ContextKeyExpr, ContextKeyExpression, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
// import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
// import { IStorageService, StorageScope, StorageTarget, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
// import { defaultKeybindingLabelStyles } from '../../../../platform/theme/browser/defaultStyles.js';
// import { editorForeground, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
// import { IWorkspaceContextService, WorkbenchState } from '../../../../platform/workspace/common/workspace.js';

// interface WatermarkEntry {
// 	readonly id: string;
// 	readonly text: string;
// 	readonly when?: {
// 		native?: ContextKeyExpression;
// 		web?: ContextKeyExpression;
// 	};
// }

// const showCommands: WatermarkEntry = { text: localize('watermark.showCommands', "Show All Commands"), id: 'workbench.action.showCommands' };
// const gotoFile: WatermarkEntry = { text: localize('watermark.quickAccess', "Go to File"), id: 'workbench.action.quickOpen' };
// const openFile: WatermarkEntry = { text: localize('watermark.openFile', "Open File"), id: 'workbench.action.files.openFile' };
// const openFolder: WatermarkEntry = { text: localize('watermark.openFolder', "Open Folder"), id: 'workbench.action.files.openFolder' };
// const openFileOrFolder: WatermarkEntry = { text: localize('watermark.openFileFolder', "Open File or Folder"), id: 'workbench.action.files.openFileFolder' };
// const openRecent: WatermarkEntry = { text: localize('watermark.openRecent', "Open Recent"), id: 'workbench.action.openRecent' };
// const newUntitledFile: WatermarkEntry = { text: localize('watermark.newUntitledFile', "New Untitled Text File"), id: 'workbench.action.files.newUntitledFile' };
// const findInFiles: WatermarkEntry = { text: localize('watermark.findInFiles', "Find in Files"), id: 'workbench.action.findInFiles' };
// const toggleTerminal: WatermarkEntry = { text: localize({ key: 'watermark.toggleTerminal', comment: ['toggle is a verb here'] }, "Toggle Terminal"), id: 'workbench.action.terminal.toggleTerminal', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const startDebugging: WatermarkEntry = { text: localize('watermark.startDebugging', "Start Debugging"), id: 'workbench.action.debug.start', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const openSettings: WatermarkEntry = { text: localize('watermark.openSettings', "Open Settings"), id: 'workbench.action.openSettings' };

// const showCopilot = ContextKeyExpr.or(ContextKeyExpr.equals('chatSetupHidden', false), ContextKeyExpr.equals('chatSetupInstalled', true));
// const openChat: WatermarkEntry = { text: localize('watermark.openChat', "Open Chat"), id: 'workbench.action.chat.open', when: { native: showCopilot, web: showCopilot } };

// const emptyWindowEntries: WatermarkEntry[] = coalesce([
// 	showCommands,
// 	...(isMacintosh && !isWeb ? [openFileOrFolder] : [openFile, openFolder]),
// 	openRecent,
// 	isMacintosh && !isWeb ? newUntitledFile : undefined, // fill in one more on macOS to get to 5 entries
// 	openChat
// ]);

// const randomEmptyWindowEntries: WatermarkEntry[] = [
// 	/* Nothing yet */
// ];

// const workspaceEntries: WatermarkEntry[] = [
// 	showCommands,
// 	gotoFile,
// 	openChat
// ];

// const randomWorkspaceEntries: WatermarkEntry[] = [
// 	findInFiles,
// 	startDebugging,
// 	toggleTerminal,
// 	openSettings,
// ];

// export class EditorGroupWatermark extends Disposable {

// 	private static readonly CACHED_WHEN = 'editorGroupWatermark.whenConditions';

// 	private readonly cachedWhen: { [when: string]: boolean };

// 	private readonly shortcuts: HTMLElement;
// 	private readonly transientDisposables = this._register(new DisposableStore());
// 	private readonly keybindingLabels = this._register(new DisposableStore());

// 	private enabled = false;
// 	private workbenchState: WorkbenchState;

// 	constructor(
// 		container: HTMLElement,
// 		@IKeybindingService private readonly keybindingService: IKeybindingService,
// 		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
// 		@IContextKeyService private readonly contextKeyService: IContextKeyService,
// 		@IConfigurationService private readonly configurationService: IConfigurationService,
// 		@IStorageService private readonly storageService: IStorageService
// 	) {
// 		super();

// 		this.cachedWhen = this.storageService.getObject(EditorGroupWatermark.CACHED_WHEN, StorageScope.PROFILE, Object.create(null));
// 		this.workbenchState = this.contextService.getWorkbenchState();

// 		const elements = h('.editor-group-watermark', [
// 			h('.letterpress'),
// 			h('.shortcuts@shortcuts'),
// 		]);

// 		append(container, elements.root);
// 		this.shortcuts = elements.shortcuts;

// 		this.registerListeners();

// 		this.render();
// 	}

// 	private registerListeners(): void {
// 		this._register(this.configurationService.onDidChangeConfiguration(e => {
// 			if (e.affectsConfiguration('workbench.tips.enabled') && this.enabled !== this.configurationService.getValue<boolean>('workbench.tips.enabled')) {
// 				this.render();
// 			}
// 		}));

// 		this._register(this.contextService.onDidChangeWorkbenchState(workbenchState => {
// 			if (this.workbenchState !== workbenchState) {
// 				this.workbenchState = workbenchState;
// 				this.render();
// 			}
// 		}));

// 		this._register(this.storageService.onWillSaveState(e => {
// 			if (e.reason === WillSaveStateReason.SHUTDOWN) {
// 				const entries = [...emptyWindowEntries, ...randomEmptyWindowEntries, ...workspaceEntries, ...randomWorkspaceEntries];
// 				for (const entry of entries) {
// 					const when = isWeb ? entry.when?.web : entry.when?.native;
// 					if (when) {
// 						this.cachedWhen[entry.id] = this.contextKeyService.contextMatchesRules(when);
// 					}
// 				}

// 				this.storageService.store(EditorGroupWatermark.CACHED_WHEN, JSON.stringify(this.cachedWhen), StorageScope.PROFILE, StorageTarget.MACHINE);
// 			}
// 		}));
// 	}

// 	private render(): void {
// 		this.enabled = this.configurationService.getValue<boolean>('workbench.tips.enabled');

// 		clearNode(this.shortcuts);
// 		this.transientDisposables.clear();

// 		if (!this.enabled) {
// 			return;
// 		}

// 		const fixedEntries = this.filterEntries(this.workbenchState !== WorkbenchState.EMPTY ? workspaceEntries : emptyWindowEntries, false /* not shuffled */);
// 		const randomEntries = this.filterEntries(this.workbenchState !== WorkbenchState.EMPTY ? randomWorkspaceEntries : randomEmptyWindowEntries, true /* shuffled */).slice(0, Math.max(0, 5 - fixedEntries.length));
// 		const entries = [...fixedEntries, ...randomEntries];

// 		const box = append(this.shortcuts, $('.watermark-box'));

// 		const update = () => {
// 			clearNode(box);
// 			this.keybindingLabels.clear();

// 			for (const entry of entries) {
// 				const keys = this.keybindingService.lookupKeybinding(entry.id);
// 				if (!keys) {
// 					continue;
// 				}

// 				const dl = append(box, $('dl'));
// 				const dt = append(dl, $('dt'));
// 				dt.textContent = entry.text;

// 				const dd = append(dl, $('dd'));

// 				const label = this.keybindingLabels.add(new KeybindingLabel(dd, OS, { renderUnboundKeybindings: true, ...defaultKeybindingLabelStyles }));
// 				label.set(keys);
// 			}
// 		};

// 		update();
// 		this.transientDisposables.add(this.keybindingService.onDidUpdateKeybindings(update));
// 	}

// 	private filterEntries(entries: WatermarkEntry[], shuffleEntries: boolean): WatermarkEntry[] {
// 		const filteredEntries = entries
// 			.filter(entry => (isWeb && !entry.when?.web) || (!isWeb && !entry.when?.native) || this.cachedWhen[entry.id])
// 			.filter(entry => !!CommandsRegistry.getCommand(entry.id))
// 			.filter(entry => !!this.keybindingService.lookupKeybinding(entry.id));

// 		if (shuffleEntries) {
// 			shuffle(filteredEntries);
// 		}

// 		return filteredEntries;
// 	}
// }

// registerColor('editorWatermark.foreground', { dark: transparent(editorForeground, 0.6), light: transparent(editorForeground, 0.68), hcDark: editorForeground, hcLight: editorForeground }, localize('editorLineHighlight', 'Foreground color for the labels in the editor watermark.'));
