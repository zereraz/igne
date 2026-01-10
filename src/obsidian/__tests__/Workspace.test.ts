import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import DOM helpers first
import '../../test/setup';

import { Workspace } from '../Workspace';
import { WorkspaceItem } from '../WorkspaceItem';
import { WorkspaceLeaf } from '../WorkspaceLeaf';
import { WorkspaceRoot } from '../WorkspaceRoot';
import { WorkspaceSidedock } from '../WorkspaceSidedock';
import { WorkspaceRibbon, type RibbonAction } from '../WorkspaceRibbon';
import { Component } from '../Component';
import { View, ItemView, FileView, TextFileView } from '../View';
import { App } from '../App';

// Mock View class for testing
class TestView extends View {
  getViewType() { return 'test'; }
  getDisplayText() { return 'Test View'; }
  getIcon() { return 'test-icon' as any; }

  async onOpen() {
    this.containerEl.innerHTML = '<div class="test-view">Test</div>';
  }
}

class TestFileView extends FileView {
  getViewType() { return 'markdown'; }
  getDisplayText() { return 'Markdown'; }
  getIcon() { return 'file-text' as any; }

  canAcceptExtension(ext: string) {
    return ext === 'md' || ext === 'txt';
  }

  setViewData(_data: string, _clear: boolean) {}
}

class TestTextView extends TextFileView {
  getViewType() { return 'text'; }
  getDisplayText() { return 'Text'; }
  getIcon() { return 'file' as any; }

  setViewData(_data: string, _clear: boolean) {}
}

describe('Workspace', () => {
  let workspace: Workspace;
  let app: App;

  beforeEach(() => {
    app = new App('/test/path');
    workspace = new Workspace(app);
  });

  describe('Initialization', () => {
    it('should create workspace with subsystems', () => {
      expect(workspace.rootSplit).toBeDefined();
      expect(workspace.leftSplit).toBeDefined();
      expect(workspace.rightSplit).toBeDefined();
      expect(workspace.leftRibbon).toBeDefined();
      expect(workspace.rightRibbon).toBeDefined();
      expect(workspace.viewTypes).toBeInstanceOf(Map);
    });

    it('should have layoutReady as false initially', () => {
      expect(workspace.layoutReady).toBe(false);
    });

    it('should have no active leaf initially', () => {
      expect(workspace.activeLeaf).toBeNull();
    });
  });

  describe('Leaf Management', () => {
    it('should create new leaf in root split', () => {
      const leaf = workspace.rootSplit.createNewLeaf();
      expect(leaf).toBeDefined();
      expect(workspace.rootSplit.getLeaves()).toContain(leaf);
    });

    it('should get leaf when no active leaf', () => {
      const leaf = workspace.getLeaf();
      expect(leaf).toBeDefined();
      expect(workspace.rootSplit.getLeaves()).toContain(leaf);
    });

    it('should return active leaf when exists and newLeaf is false', () => {
      const leaf1 = workspace.getLeaf();
      workspace.activeLeaf = leaf1;
      const leaf2 = workspace.getLeaf(false);
      expect(leaf2).toBe(leaf1);
    });

    it('should create new leaf when newLeaf is true', () => {
      const leaf1 = workspace.getLeaf();
      workspace.activeLeaf = leaf1;
      const leaf2 = workspace.getLeaf(true);
      expect(leaf2).toBeDefined();
      expect(leaf2).not.toBe(leaf1);
    });

    it('should split active leaf horizontally', () => {
      const leaf1 = workspace.getLeaf();
      workspace.activeLeaf = leaf1;
      const leaf2 = workspace.splitActiveLeaf('horizontal');
      expect(leaf2).toBeDefined();
      expect(leaf2).not.toBe(leaf1);
    });

    it('should split active leaf vertically', () => {
      const leaf1 = workspace.getLeaf();
      workspace.activeLeaf = leaf1;
      const leaf2 = workspace.splitActiveLeaf('vertical');
      expect(leaf2).toBeDefined();
      expect(leaf2).not.toBe(leaf1);
    });

    it('should create new leaf when splitting with no active leaf', () => {
      const leaf = workspace.splitActiveLeaf('horizontal');
      expect(leaf).toBeDefined();
    });
  });

  describe('View Type Registration', () => {
    it('should register and retrieve view types', () => {
      const mockViewCreator = () => ({ getViewType: () => 'test' });
      workspace.registerView('test', mockViewCreator);
      expect(workspace.viewTypes.has('test')).toBe(true);
    });

    it('should unregister view types', () => {
      const mockViewCreator = () => ({ getViewType: () => 'test' });
      workspace.registerView('test', mockViewCreator);
      workspace.unregisterView('test');
      expect(workspace.viewTypes.has('test')).toBe(false);
    });

    it('should return null for unknown view types', () => {
      expect(workspace.viewTypes.get('unknown')).toBeUndefined();
    });
  });

  describe('Active View', () => {
    it('should get active view of specific type', () => {
      const leaf = workspace.getLeaf();
      const view = new TestView(leaf);
      leaf.view = view;
      workspace.activeLeaf = leaf;

      const activeView = workspace.getActiveViewOfType(TestView);
      expect(activeView).toBe(view);
    });

    it('should return null when no active view of type', () => {
      const activeView = workspace.getActiveViewOfType(TestView);
      expect(activeView).toBeNull();
    });
  });

  describe('Layout Management', () => {
    it('should get layout structure', () => {
      const layout = workspace.getLayout();
      expect(layout).toHaveProperty('leftSplit');
      expect(layout).toHaveProperty('rightSplit');
      expect(layout).toHaveProperty('main');
    });

    it('should set layout and trigger layout-change event', async () => {
      const callback = vi.fn();
      workspace.on('layout-change', callback);

      await workspace.setLayout({ leftSplit: [], rightSplit: [], main: {} });

      expect(workspace.layoutReady).toBe(true);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Events', () => {
    it('should trigger active-leaf-change event', () => {
      const callback = vi.fn();
      workspace.on('active-leaf-change', callback);

      workspace.trigger('active-leaf-change', workspace.activeLeaf);
      expect(callback).toHaveBeenCalledWith(workspace.activeLeaf);
    });

    it('should trigger file-open event', () => {
      const callback = vi.fn();
      workspace.on('file-open', callback);

      const mockFile = { path: 'test.md', name: 'test.md' } as any;
      workspace.trigger('file-open', mockFile);
      expect(callback).toHaveBeenCalledWith(mockFile);
    });

    it('should trigger resize event', () => {
      const callback = vi.fn();
      workspace.on('resize', callback);

      workspace.trigger('resize');
      expect(callback).toHaveBeenCalled();
    });
  });
});

describe('WorkspaceItem', () => {
  let item: WorkspaceItem;

  beforeEach(() => {
    item = new WorkspaceItem('split', 'horizontal');
  });

  it('should create split item with direction', () => {
    expect(item.type).toBe('split');
    expect(item.direction).toBe('horizontal');
  });

  it('should create leaf item', () => {
    const leafItem = new WorkspaceItem('leaf');
    expect(leafItem.type).toBe('leaf');
  });

  it('should add child', () => {
    const child = new WorkspaceItem('leaf');
    item.addChild(child);
    expect(item.children).toContain(child);
    expect(child.parent).toBe(item);
  });

  it('should add child at index', () => {
    const child1 = new WorkspaceItem('leaf');
    const child2 = new WorkspaceItem('leaf');
    item.addChild(child1);
    item.addChild(child2, 0);
    expect(item.children[0]).toBe(child2);
    expect(item.children[1]).toBe(child1);
  });

  it('should remove child', () => {
    const child = new WorkspaceItem('leaf');
    item.addChild(child);
    item.removeChild(child);
    expect(item.children).not.toContain(child);
    expect(child.parent).toBeNull();
  });

  it('should get leaf from leaf item', () => {
    const leafItem = new WorkspaceItem('leaf');
    const mockLeaf = { containerEl: document.createElement('div') } as any;
    leafItem.leaf = mockLeaf;
    expect(leafItem.getLeaf()).toBe(mockLeaf);
  });

  it('should get all leaves from split item', () => {
    const app = new App('/test/path');
    const ws = new Workspace(app);
    const leaf1 = new WorkspaceLeaf(ws);
    const leaf2 = new WorkspaceLeaf(ws);
    const leafItem1 = new WorkspaceItem('leaf');
    const leafItem2 = new WorkspaceItem('leaf');
    leafItem1.leaf = leaf1;
    leafItem2.leaf = leaf2;
    item.addChild(leafItem1);
    item.addChild(leafItem2);

    const leaves = item.getLeaves();
    expect(leaves).toHaveLength(2);
    expect(leaves).toContain(leaf1);
    expect(leaves).toContain(leaf2);
  });

  it('should return direction', () => {
    expect(item.getDirection()).toBe('horizontal');
  });
});

describe('WorkspaceLeaf', () => {
  let leaf: WorkspaceLeaf;
  let workspace: Workspace;
  let app: App;

  beforeEach(() => {
    app = new App('/test/path');
    workspace = new Workspace(app);
    leaf = new WorkspaceLeaf(workspace);
  });

  it('should create leaf with container element', () => {
    expect(leaf.containerEl).toBeDefined();
    expect(leaf.containerEl.className).toBe('workspace-leaf');
  });

  it('should get view state', () => {
    const view = new TestView(leaf);
    leaf.view = view;
    const state = leaf.getViewState();
    expect(state.type).toBe('test');
    expect(state.state).toEqual({});
  });

  it('should return empty view state when no view', () => {
    const state = leaf.getViewState();
    expect(state.type).toBe('empty');
  });

  it('should set view state', async () => {
    workspace.registerView('test', (l) => new TestView(l));
    await leaf.setViewState({ type: 'test', state: {} });
    expect(leaf.view).toBeDefined();
    expect(leaf.view?.getViewType()).toBe('test');
  });

  it('should close existing view when setting new view state', async () => {
    workspace.registerView('test', (l) => new TestView(l));
    const onCloseSpy = vi.spyOn(TestView.prototype, 'onClose');

    await leaf.setViewState({ type: 'test', state: {} });
    await leaf.setViewState({ type: 'test', state: {} });

    expect(onCloseSpy).toHaveBeenCalled();
  });

  it('should detach leaf and remove container', () => {
    const parent = document.createElement('div');
    parent.appendChild(leaf.containerEl);

    leaf.detach();
    expect(parent.contains(leaf.containerEl)).toBe(false);
  });
});

describe('WorkspaceRoot', () => {
  let root: WorkspaceRoot;
  let workspace: Workspace;
  let app: App;

  beforeEach(() => {
    app = new App('/test/path');
    workspace = new Workspace(app);
    root = new WorkspaceRoot(workspace);
  });

  it('should create root split', () => {
    expect(root.type).toBe('split');
    expect(root.direction).toBe('horizontal');
    expect(root.workspace).toBe(workspace);
  });

  it('should create new leaf in empty root', () => {
    const leaf = root.createNewLeaf();
    expect(leaf).toBeDefined();
    expect(root.children).toHaveLength(1);
  });

  it('should create new leaf and split when root has children', () => {
    const leaf1 = root.createNewLeaf();
    const leaf2 = root.createNewLeaf('vertical');
    expect(leaf1).toBeDefined();
    expect(leaf2).toBeDefined();
    expect(root.children).toHaveLength(1); // One split containing both leaves
  });

  it('should get state for serialization', () => {
    root.createNewLeaf();
    const state = root.getState();
    expect(state.type).toBe('root');
    expect(state.direction).toBe('horizontal');
    expect(state.children).toBeDefined();
  });

  it('should get all leaves', () => {
    const leaf1 = root.createNewLeaf();
    const leaf2 = root.createNewLeaf();
    const leaves = root.getLeaves();
    expect(leaves).toHaveLength(2);
  });
});

describe('WorkspaceSidedock', () => {
  let dock: WorkspaceSidedock;
  let workspace: Workspace;
  let app: App;

  beforeEach(() => {
    app = new App('/test/path');
    workspace = new Workspace(app);
    dock = new WorkspaceSidedock(workspace, 'left');
  });

  it('should create sidedock', () => {
    expect(dock.side).toBe('left');
    expect(dock.workspace).toBe(workspace);
    expect(dock.containerEl.className).toContain('workspace-sidedock-left');
  });

  it('should add leaf to sidedock', () => {
    const leaf = dock.addLeaf('backlink');
    expect(leaf).toBeDefined();
    expect(dock.children).toHaveLength(1);
  });

  it('should get children', () => {
    dock.addLeaf('backlink');
    dock.addLeaf('outgoing-link');
    expect(dock.getChildren()).toHaveLength(2);
  });

  it('should toggle collapse', () => {
    dock.toggleCollapse();
    expect(dock.containerEl.classList.contains('is-collapsed')).toBe(true);
    dock.toggleCollapse();
    expect(dock.isCollapsed()).toBe(false);
  });
});

describe('WorkspaceRibbon', () => {
  let ribbon: WorkspaceRibbon;
  let workspace: Workspace;
  let app: App;

  beforeEach(() => {
    app = new App('/test/path');
    workspace = new Workspace(app);
    ribbon = new WorkspaceRibbon(workspace, 'left');
  });

  it('should create ribbon', () => {
    expect(ribbon.side).toBe('left');
    expect(ribbon.actions).toBeInstanceOf(Map);
    expect(ribbon.containerEl.className).toContain('workspace-ribbon-left');
  });

  it('should add action', () => {
    const callback = vi.fn();
    ribbon.addAction('test', 'test-icon', 'Test Action', callback);
    expect(ribbon.actions.has('test')).toBe(true);
    expect(ribbon.getActions()).toHaveLength(1);
  });

  it('should remove action', () => {
    const callback = vi.fn();
    ribbon.addAction('test', 'test-icon', 'Test Action', callback);
    ribbon.removeAction('test');
    expect(ribbon.actions.has('test')).toBe(false);
  });

  it('should call action callback', () => {
    const callback = vi.fn();
    ribbon.addAction('test', 'test-icon', 'Test Action', callback);
    const action = ribbon.actions.get('test');
    action?.callback(new MouseEvent('click'));
    expect(callback).toHaveBeenCalled();
  });
});

describe('Component', () => {
  class TestComponent extends Component {
    testValue = 0;
    onload() {
      super.onload();
      this.testValue = 1;
    }
    onunload() {
      this.testValue = 0;
      super.onunload();
    }
  }

  it('should call onload when loaded', () => {
    const component = new TestComponent();
    component.onload();
    expect(component.loaded).toBe(true);
    expect(component.testValue).toBe(1);
  });

  it('should call onunload and unload children', () => {
    const parent = new TestComponent();
    const child1 = new TestComponent();
    const child2 = new TestComponent();
    parent.addChild(child1);
    parent.addChild(child2);

    parent.onload();
    parent.onunload();

    expect(parent.loaded).toBe(false);
    expect(parent.children).toHaveLength(0);
  });

  it('should add child and load if parent is loaded', () => {
    const parent = new TestComponent();
    parent.onload();
    const child = new TestComponent();
    parent.addChild(child);
    expect(child.loaded).toBe(true);
  });

  it('should add child without loading if parent not loaded', () => {
    const parent = new TestComponent();
    const child = new TestComponent();
    parent.addChild(child);
    expect(child.loaded).toBe(false);
  });

  it('should remove child and unload it', () => {
    const parent = new TestComponent();
    const child = new TestComponent();
    parent.addChild(child);
    parent.onload();
    parent.removeChild(child);
    expect(parent.children).not.toContain(child);
  });
});

describe('View Classes', () => {
  let leaf: WorkspaceLeaf;
  let workspace: Workspace;
  let app: App;

  beforeEach(() => {
    app = new App('/test/path');
    workspace = new Workspace(app);
    leaf = new WorkspaceLeaf(workspace);
  });

  describe('View', () => {
    it('should create view with default properties', () => {
      const view = new TestView(leaf);
      expect(view.icon).toBe('file-text'); // default icon from View base class
      expect(view.navigation).toBe(true);
      expect(view.leaf).toBe(leaf);
      expect(view.app).toBe(app);
      expect(view.getIcon()).toBe('test-icon'); // getIcon() returns the custom icon
    });

    it('should get and set state', () => {
      const view = new TestView(leaf);
      expect(view.getState()).toEqual({});
      view.setState({ test: true }, {});
    });
  });

  describe('ItemView', () => {
    class TestItemView extends ItemView {
      getViewType() { return 'item'; }
      getDisplayText() { return 'Item'; }
      getIcon() { return 'item' as any; }
    }

    it('should create content element', () => {
      const view = new TestItemView(leaf);
      expect(view.contentEl).toBeDefined();
      expect(view.contentEl.className).toContain('item-view-content');
    });

    it('should add action button', () => {
      const view = new TestItemView(leaf);
      const actionEl = view.addAction('test', 'Test', () => {});
      expect(actionEl).toBeDefined();
      expect(actionEl.getAttribute('aria-label')).toBe('Test');
    });
  });

  describe('FileView', () => {
    it('should track current file', () => {
      const view = new TestFileView(leaf);
      expect(view.file).toBeNull();
      expect(view.allowNoFile).toBe(false);
    });

    it('should check extension acceptance', () => {
      const view = new TestFileView(leaf);
      expect(view.canAcceptExtension('md')).toBe(true);
      expect(view.canAcceptExtension('txt')).toBe(true);
      expect(view.canAcceptExtension('png')).toBe(false);
    });
  });

  describe('TextFileView', () => {
    it('should load file data', async () => {
      const view = new TestTextView(leaf);
      const mockFile = {
        path: 'test.md',
        extension: 'md',
      } as any;

      vi.spyOn(app.vault, 'read').mockResolvedValue('test content');

      await view.onLoadFile(mockFile);
      expect(view.data).toBe('test content');
      expect(view.file).toBe(mockFile);
    });

    it('should get view data', () => {
      const view = new TestTextView(leaf);
      view.data = 'test data';
      expect(view.getViewData()).toBe('test data');
    });
  });
});
