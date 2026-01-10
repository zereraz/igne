// =============================================================================
// Component - Base Class for Plugin Components
// =============================================================================

export abstract class Component {
  loaded: boolean = false;
  children: Component[] = [];

  /**
   * Called when component is loaded
   */
  onload(): void {
    this.loaded = true;
  }

  /**
   * Called when component is unloaded
   */
  onunload(): void {
    this.loaded = false;
    // Unload all children
    for (const child of this.children) {
      child.onunload();
    }
    this.children = [];
  }

  /**
   * Add a child component
   */
  addChild(child: Component): void {
    this.children.push(child);
    if (this.loaded) {
      child.onload();
    }
  }

  /**
   * Remove a child component
   */
  removeChild(child: Component): void {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.onunload();
    }
  }
}
