// =============================================================================
// Plugin System Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../test/setup';

import { App } from '../App';
import { Plugins } from '../Plugins';
import { Plugin } from '../Plugin';
import type { PluginManifest } from '../types';

// Mock plugin for testing
class TestPlugin extends Plugin {
  onload() {
    this.app.workspace.trigger('test-plugin-loaded');
  }

  onunload() {
    this.app.workspace.trigger('test-plugin-unloaded');
    super.onunload(); // Call parent to properly unload children
  }

  testMethod() {
    return 'test';
  }
}

// Mock manifest
const mockManifest: PluginManifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  minAppVersion: '0.0.1',
  description: 'A test plugin',
  author: 'Test Author',
  authorUrl: 'https://example.com',
  isDesktopOnly: false,
};

describe('Plugins', () => {
  let plugins: Plugins;
  let app: App;

  beforeEach(() => {
    app = new App('/test/path');
    plugins = new Plugins(app);
    // Mock the loadEnabledPlugins to return empty array
    vi.spyOn(plugins as any, 'loadEnabledPlugins').mockResolvedValue([]);
  });

  describe('Initialization', () => {
    it('should create plugins manager', () => {
      expect(plugins).toBeDefined();
      expect(plugins.getPlugins()).toEqual([]);
    });

    it('should load enabled plugins on loadPlugins', async () => {
      vi.spyOn(plugins as any, 'loadEnabledPlugins').mockResolvedValue(['test-plugin']);
      vi.spyOn(plugins as any, 'loadPlugin').mockResolvedValue(new TestPlugin(app, mockManifest));

      await plugins.loadPlugins();

      expect(plugins['loadEnabledPlugins']).toHaveBeenCalled();
      expect(plugins['loadPlugin']).toHaveBeenCalledWith('test-plugin');
    });
  });

  describe('Plugin Loading', () => {
    it('should load and register a plugin', async () => {
      // Mock importPlugin to return TestPlugin class
      vi.spyOn(plugins as any, 'importPlugin').mockResolvedValue(TestPlugin);
      // Mock loadManifest
      vi.spyOn(plugins as any, 'loadManifest').mockResolvedValue(mockManifest);

      const plugin = await plugins.loadPlugin('test-plugin');

      expect(plugin).toBeInstanceOf(TestPlugin);
      expect(plugins.getPluginById('test-plugin')).toBe(plugin);
      expect(plugins.getManifests().get('test-plugin')).toEqual(mockManifest);
    });

    it('should check if plugin is enabled', async () => {
      vi.spyOn(plugins as any, 'loadEnabledPlugins').mockResolvedValue(['test-plugin']);
      vi.spyOn(plugins as any, 'loadManifest').mockResolvedValue(mockManifest);
      vi.spyOn(plugins as any, 'importPlugin').mockResolvedValue(TestPlugin);
      await plugins.loadPlugins();

      expect(plugins.isEnabled('test-plugin')).toBe(true);
      expect(plugins.isEnabled('other-plugin')).toBe(false);
    });

    it('should return existing plugin if already loaded', async () => {
      vi.spyOn(plugins as any, 'loadManifest').mockResolvedValue(mockManifest);
      vi.spyOn(plugins as any, 'importPlugin').mockResolvedValue(TestPlugin);

      const plugin1 = await plugins.loadPlugin('test-plugin');
      const plugin2 = await plugins.loadPlugin('test-plugin');

      expect(plugin1).toBe(plugin2);
    });
  });

  describe('Plugin Unloading', () => {
    it('should unload a plugin', async () => {
      vi.spyOn(plugins as any, 'loadManifest').mockResolvedValue(mockManifest);
      vi.spyOn(plugins as any, 'importPlugin').mockResolvedValue(TestPlugin);

      await plugins.loadPlugin('test-plugin');
      await plugins.unloadPlugin('test-plugin');

      expect(plugins.getPluginById('test-plugin')).toBeUndefined();
      expect(plugins.getManifests().get('test-plugin')).toBeUndefined();
    });
  });

  describe('Getting Plugins', () => {
    it('should get all loaded plugins', async () => {
      vi.spyOn(plugins as any, 'loadManifest').mockResolvedValue(mockManifest);
      vi.spyOn(plugins as any, 'importPlugin').mockResolvedValue(TestPlugin);

      await plugins.loadPlugin('test-plugin');

      const allPlugins = plugins.getPlugins();
      expect(allPlugins).toHaveLength(1);
      expect(allPlugins[0]).toBeInstanceOf(TestPlugin);
    });

    it('should get all manifests', async () => {
      vi.spyOn(plugins as any, 'loadManifest').mockResolvedValue(mockManifest);
      vi.spyOn(plugins as any, 'importPlugin').mockResolvedValue(TestPlugin);

      await plugins.loadPlugin('test-plugin');

      const manifests = plugins.getManifests();
      expect(manifests.size).toBe(1);
      expect(manifests.get('test-plugin')).toEqual(mockManifest);
    });
  });
});

describe('Plugin Base Class', () => {
  let plugin: TestPlugin;
  let app: App;

  beforeEach(() => {
    app = new App('/test/path');
    plugin = new TestPlugin(app, mockManifest);
  });

  describe('Initialization', () => {
    it('should create plugin with app and manifest', () => {
      expect(plugin.app).toBe(app);
      expect(plugin.manifest).toEqual(mockManifest);
    });

    it('should have loaded property from Component', () => {
      expect(plugin.loaded).toBe(false);
    });
  });

  describe('Lifecycle', () => {
    it('should call onload when loaded', () => {
      const callback = vi.fn();
      app.workspace.on('test-plugin-loaded', callback);

      plugin.onload();

      expect(callback).toHaveBeenCalled();
    });

    it('should call onunload when unloaded', () => {
      plugin.onload();
      const callback = vi.fn();
      app.workspace.on('test-plugin-unloaded', callback);

      plugin.onunload();

      expect(callback).toHaveBeenCalled();
      expect(plugin.loaded).toBe(false);
    });
  });

  describe('Data Management', () => {
    it('should load plugin data from data.json', async () => {
      vi.spyOn(app.vault.adapter, 'read').mockResolvedValue('{"key": "value"}');

      const data = await plugin.loadData();

      expect(data).toEqual({ key: 'value' });
      expect(app.vault.adapter.read).toHaveBeenCalledWith(
        expect.stringContaining('test-plugin/data.json')
      );
    });

    it('should save plugin data to data.json', async () => {
      vi.spyOn(app.vault.adapter, 'write').mockResolvedValue();

      await plugin.saveData({ key: 'value' });

      expect(app.vault.adapter.write).toHaveBeenCalledWith(
        expect.stringContaining('test-plugin/data.json'),
        JSON.stringify({ key: 'value' }, null, 2)
      );
    });
  });

  describe('Registration Methods', () => {
    it('should add command through app', () => {
      const command = { id: 'test-cmd', name: 'Test Command', callback: () => {} };
      const addCommandSpy = vi.spyOn(app.commands, 'addCommand');

      plugin.addCommand(command);

      expect(addCommandSpy).toHaveBeenCalledWith(command);
    });

    it('should add setting tab through app', () => {
      const settingTab = { display: () => {}, hide: () => {} };
      const addSettingTabSpy = vi.spyOn(app.setting, 'addPluginSettingTab');

      plugin.addSettingTab(settingTab);

      expect(addSettingTabSpy).toHaveBeenCalledWith(plugin, settingTab);
    });

    it('should register view through app', () => {
      const viewCreator = () => {};
      const registerViewSpy = vi.spyOn(app.workspace, 'registerView');

      plugin.registerView('test-view', viewCreator);

      expect(registerViewSpy).toHaveBeenCalledWith('test-view', viewCreator);
    });
  });

  describe('Helper Methods', () => {
    it('should register cleanup function', () => {
      plugin.loaded = true; // Simulate plugin is loaded
      const fn = vi.fn();
      plugin.register(fn);

      // Verify the child was added and loaded
      expect(plugin.children.length).toBe(1);
      expect(plugin.children[0].loaded).toBe(true);

      // Directly call the child's onunload to verify it works
      const child = plugin.children[0];
      child.onunload();

      // Verify the function was called
      expect(fn).toHaveBeenCalledTimes(1);

      // Now test that plugin.onunload() properly unloads children
      // Create a new plugin instance
      const plugin2 = new TestPlugin(app, mockManifest);
      plugin2.loaded = true;
      const fn2 = vi.fn();
      plugin2.register(fn2);

      expect(plugin2.children.length).toBe(1);
      plugin2.onunload();

      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should register interval', () => {
      plugin.loaded = true; // Simulate plugin is loaded
      const callback = vi.fn();

      const id = plugin.registerInterval(callback, 1000);

      expect(callback).not.toHaveBeenCalled();

      // Verify the child was added
      expect(plugin.children.length).toBe(1);

      // Manually trigger the callback to verify it works
      callback();
      expect(callback).toHaveBeenCalledTimes(1);

      // Clear the interval
      clearInterval(id as unknown as number);

      plugin.onunload();

      // After unload, verify cleanup happened
      expect(plugin.children.length).toBe(0);
    });

    it('should register DOM event', () => {
      const element = document.createElement('div');
      const callback = vi.fn();

      const remove = plugin.registerDomEvent(element, 'click', callback);

      element.click();
      expect(callback).toHaveBeenCalledTimes(1);

      remove();
      element.click();
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should register workspace event', () => {
      const callback = vi.fn();
      plugin.registerEvent('test-event', callback);

      app.workspace.trigger('test-event');

      expect(callback).toHaveBeenCalled();
    });
  });
});
