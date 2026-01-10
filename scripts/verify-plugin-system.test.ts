/**
 * Plugin System Verification Test
 *
 * This test demonstrates that the Obsidian Plugin System is working correctly
 * by showing all the key components are present and functional.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../src/test/setup';

import { Plugin, Plugins, App } from '../src/obsidian/index';
import type { PluginManifest } from '../src/obsidian/types';

describe('Plugin System Verification', () => {
  let testApp: App;

  beforeEach(() => {
    testApp = new App('/test/path');
  });

  describe('Component Existence', () => {
    it('should have Plugin class with all required methods', () => {
      expect(Plugin).toBeDefined();
      expect(typeof Plugin.prototype.onload).toBe('function');
      expect(typeof Plugin.prototype.onunload).toBe('function');
      expect(typeof Plugin.prototype.loadData).toBe('function');
      expect(typeof Plugin.prototype.saveData).toBe('function');
      expect(typeof Plugin.prototype.addCommand).toBe('function');
      expect(typeof Plugin.prototype.addSettingTab).toBe('function');
      expect(typeof Plugin.prototype.registerView).toBe('function');
      expect(typeof Plugin.prototype.registerEditorExtension).toBe('function');
      expect(typeof Plugin.prototype.registerEvent).toBe('function');
      expect(typeof Plugin.prototype.registerDomEvent).toBe('function');
      expect(typeof Plugin.prototype.registerInterval).toBe('function');
      expect(typeof Plugin.prototype.register).toBe('function');
    });

    it('should have Plugins class with all required methods', () => {
      expect(Plugins).toBeDefined();
      expect(typeof Plugins.prototype.loadPlugins).toBe('function');
      expect(typeof Plugins.prototype.loadPlugin).toBe('function');
      expect(typeof Plugins.prototype.unloadPlugin).toBe('function');
      expect(typeof Plugins.prototype.getPluginById).toBe('function');
      expect(typeof Plugins.prototype.isEnabled).toBe('function');
      expect(typeof Plugins.prototype.getPlugins).toBe('function');
      expect(typeof Plugins.prototype.getManifests).toBe('function');
    });
  });

  describe('App Integration', () => {
    it('should have plugins property', () => {
      expect(testApp.plugins).toBeDefined();
      expect(testApp.plugins instanceof Plugins).toBe(true);
    });

    it('should have workspace with registration methods', () => {
      expect(typeof testApp.workspace.registerEditorExtension).toBe('function');
      expect(typeof testApp.workspace.registerView).toBe('function');
    });

    it('should have settings with plugin setting tab support', () => {
      expect(typeof testApp.setting.addPluginSettingTab).toBe('function');
    });

    it('should have editorExtensions array', () => {
      expect(Array.isArray(testApp.workspace.editorExtensions)).toBe(true);
    });
  });

  describe('Plugin Lifecycle', () => {
    class TestPlugin extends Plugin {
      onloadCalled = false;
      onunloadCalled = false;

      onload() {
        this.onloadCalled = true;
      }

      onunload() {
        this.onunloadCalled = true;
        super.onunload();
      }
    }

    it('should create plugin instance', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        minAppVersion: '0.0.1',
        description: 'A test plugin',
        author: 'Test',
        authorUrl: 'https://test.com',
        isDesktopOnly: false,
      };

      const plugin = new TestPlugin(testApp, manifest);

      expect(plugin instanceof Plugin).toBe(true);
      expect(plugin.app).toBe(testApp);
      expect(plugin.manifest.id).toBe('test-plugin');
    });

    it('should call lifecycle methods', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        minAppVersion: '0.0.1',
        description: 'A test plugin',
        author: 'Test',
        authorUrl: 'https://test.com',
        isDesktopOnly: false,
      };

      const plugin = new TestPlugin(testApp, manifest);

      expect(plugin.onloadCalled).toBe(false);
      expect(plugin.onunloadCalled).toBe(false);

      plugin.onload();
      expect(plugin.onloadCalled).toBe(true);

      plugin.onunload();
      expect(plugin.onunloadCalled).toBe(true);
    });
  });

  describe('Registration Methods', () => {
    class TestPlugin extends Plugin {
      onload() {
        // Override to prevent errors
      }
    }

    it('should add command through app', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        minAppVersion: '0.0.1',
        description: 'A test plugin',
        author: 'Test',
        authorUrl: 'https://test.com',
        isDesktopOnly: false,
      };

      const plugin = new TestPlugin(testApp, manifest);
      const command = { id: 'test-cmd', name: 'Test Command', callback: () => {} };

      const result = plugin.addCommand(command);

      expect(testApp.commands.findCommand('test-cmd')).toBe(command);
      expect(result).toBe(command);
    });

    it('should register view through workspace', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        minAppVersion: '0.0.1',
        description: 'A test plugin',
        author: 'Test',
        authorUrl: 'https://test.com',
        isDesktopOnly: false,
      };

      const plugin = new TestPlugin(testApp, manifest);
      const viewCreator = () => {};

      plugin.registerView('test-view', viewCreator);

      expect(testApp.workspace.viewTypes.has('test-view')).toBe(true);
    });

    it('should register editor extension', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        minAppVersion: '0.0.1',
        description: 'A test plugin',
        author: 'Test',
        authorUrl: 'https://test.com',
        isDesktopOnly: false,
      };

      const plugin = new TestPlugin(testApp, manifest);
      const extension = {};

      plugin.registerEditorExtension(extension);

      expect(testApp.workspace.editorExtensions).toContain(extension);
    });
  });
});
