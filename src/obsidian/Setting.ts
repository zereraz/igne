// =============================================================================
// Setting - UI Components for Settings
// =============================================================================

import { Component } from './Component';

// Helper function to create a div with class
function createDiv(cls: string): HTMLDivElement {
  const div = document.createElement('div');
  div.classList.add(cls);
  return div;
}

/**
 * Setting - A setting item container with name, description, and control
 */
export class Setting extends Component {
  settingEl: HTMLElement;
  infoEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  controlEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    super();
    this.settingEl = createDiv('setting-item');
    this.infoEl = createDiv('setting-item-info');
    this.settingEl.appendChild(this.infoEl);

    this.nameEl = createDiv('setting-item-name');
    this.infoEl.appendChild(this.nameEl);

    this.descEl = createDiv('setting-item-description');
    this.infoEl.appendChild(this.descEl);

    this.controlEl = createDiv('setting-item-control');
    this.settingEl.appendChild(this.controlEl);

    containerEl.appendChild(this.settingEl);
  }

  /**
   * Set the setting name/title
   */
  setName(name: string | DocumentFragment): this {
    if (typeof name === 'string') {
      this.nameEl.textContent = name;
    } else {
      this.nameEl.appendChild(name);
    }
    return this;
  }

  /**
   * Set the setting description
   */
  setDesc(desc: string | DocumentFragment): this {
    if (typeof desc === 'string') {
      this.descEl.textContent = desc;
    } else {
      this.descEl.appendChild(desc);
    }
    return this;
  }

  /**
   * Add a toggle component
   */
  addToggle(cb: (component: ToggleComponent) => any): this {
    const toggle = new ToggleComponent(this.controlEl);
    cb(toggle);
    return this;
  }

  /**
   * Add a text input component
   */
  addText(cb: (component: TextComponent) => any): this {
    const text = new TextComponent(this.controlEl);
    cb(text);
    return this;
  }

  /**
   * Add a dropdown component
   */
  addDropdown(cb: (component: DropdownComponent) => any): this {
    const dropdown = new DropdownComponent(this.controlEl);
    cb(dropdown);
    return this;
  }

  /**
   * Add a button component
   */
  addButton(cb: (component: ButtonComponent) => any): this {
    const button = new ButtonComponent(this.controlEl);
    cb(button);
    return this;
  }

  /**
   * Add a slider component
   */
  addSlider(cb: (component: SliderComponent) => any): this {
    const slider = new SliderComponent(this.controlEl);
    cb(slider);
    return this;
  }

  /**
   * Add a color picker component (simple text input for color)
   */
  addColorPicker(cb: (component: ColorComponent) => any): this {
    const color = new ColorComponent(this.controlEl);
    cb(color);
    return this;
  }

  /**
   * Add a textarea component
   */
  addTextArea(cb: (component: TextAreaComponent) => any): this {
    const textarea = new TextAreaComponent(this.controlEl);
    cb(textarea);
    return this;
  }

  /**
   * Set the entire setting element as disabled
   */
  setDisabled(disabled: boolean): this {
    if (disabled) {
      this.settingEl.classList.add('is-disabled');
    } else {
      this.settingEl.classList.remove('is-disabled');
    }
    return this;
  }

  /**
   * Remove the setting from DOM
   */
  onunload(): void {
    this.settingEl.remove();
    super.onunload();
  }
}

/**
 * Base class for value components
 */
abstract class ValueComponent<T> extends Component {
  protected value!: T;
  protected changeCallback?: (value: T) => void;

  constructor(protected containerEl: HTMLElement) {
    super();
  }

  abstract getValue(): T;
  abstract setValue(value: T): this;

  onChange(callback: (value: T) => void): this {
    this.changeCallback = callback;
    return this;
  }

  protected triggerChange(): void {
    if (this.changeCallback) {
      this.changeCallback(this.getValue());
    }
  }
}

/**
 * ToggleComponent - A toggle switch component
 */
export class ToggleComponent extends ValueComponent<boolean> {
  private toggleEl: HTMLElement;
  private inputEl: HTMLInputElement;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    this.toggleEl = createDiv('toggle-container');
    this.inputEl = document.createElement('input');
    this.inputEl.type = 'checkbox';
    this.inputEl.classList.add('toggle-input');
    this.toggleEl.appendChild(this.inputEl);
    containerEl.appendChild(this.toggleEl);

    this.inputEl.addEventListener('change', () => {
      this.triggerChange();
    });

    this.updateUI();
  }

  getValue(): boolean {
    return this.inputEl.checked;
  }

  setValue(value: boolean): this {
    this.inputEl.checked = value;
    this.updateUI();
    return this;
  }

  setTooltip(tooltip: string): this {
    this.inputEl.setAttribute('aria-label', tooltip);
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.inputEl.disabled = disabled;
    if (disabled) {
      this.toggleEl.classList.add('is-disabled');
    } else {
      this.toggleEl.classList.remove('is-disabled');
    }
    return this;
  }

  private updateUI(): void {
    if (this.inputEl.checked) {
      this.toggleEl.classList.add('is-enabled');
    } else {
      this.toggleEl.classList.remove('is-enabled');
    }
  }

  onClick(callback: () => void): this {
    this.inputEl.addEventListener('click', callback);
    return this;
  }
}

/**
 * TextComponent - A text input component
 */
export class TextComponent extends ValueComponent<string> {
  inputEl: HTMLInputElement;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.classList.add('setting-input');
    containerEl.appendChild(this.inputEl);

    this.inputEl.addEventListener('change', () => {
      this.triggerChange();
    });
  }

  getValue(): string {
    return this.inputEl.value;
  }

  setValue(value: string): this {
    this.inputEl.value = value;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.inputEl.disabled = disabled;
    return this;
  }

  setInputType(type: 'text' | 'number' | 'email' | 'password' | 'url'): this {
    this.inputEl.type = type;
    return this;
  }

  onChanged(callback: (value: string) => void): this {
    this.onChange(callback);
    return this;
  }
}

/**
 * TextAreaComponent - A multi-line text input component
 */
export class TextAreaComponent extends ValueComponent<string> {
  textareaEl: HTMLTextAreaElement;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    this.textareaEl = document.createElement('textarea');
    this.textareaEl.classList.add('setting-textarea');
    containerEl.appendChild(this.textareaEl);

    this.textareaEl.addEventListener('change', () => {
      this.triggerChange();
    });
  }

  getValue(): string {
    return this.textareaEl.value;
  }

  setValue(value: string): this {
    this.textareaEl.value = value;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.textareaEl.placeholder = placeholder;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.textareaEl.disabled = disabled;
    return this;
  }

  setRows(rows: number): this {
    this.textareaEl.rows = rows;
    return this;
  }
}

/**
 * ButtonComponent - A button component
 */
export class ButtonComponent extends Component {
  buttonEl: HTMLButtonElement;
  private clickCallback?: () => void;

  constructor(containerEl: HTMLElement) {
    super();
    this.buttonEl = document.createElement('button') as HTMLButtonElement;
    this.buttonEl.classList.add('mod-cta');
    containerEl.appendChild(this.buttonEl);

    this.buttonEl.addEventListener('click', () => {
      if (this.clickCallback) {
        this.clickCallback();
      }
    });
  }

  setButtonText(text: string): this {
    this.buttonEl.textContent = text;
    return this;
  }

  setTooltip(tooltip: string): this {
    this.buttonEl.setAttribute('aria-label', tooltip);
    this.buttonEl.setAttribute('data-tooltip', tooltip);
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.buttonEl.disabled = disabled;
    if (disabled) {
      this.buttonEl.classList.add('is-disabled');
    } else {
      this.buttonEl.classList.remove('is-disabled');
    }
    return this;
  }

  setCta(): this {
    this.buttonEl.classList.add('mod-cta');
    return this;
  }

  setWarning(): this {
    this.buttonEl.classList.add('mod-warning');
    return this;
  }

  setDestructive(): this {
    this.buttonEl.classList.add('mod-destructive');
    return this;
  }

  onClick(callback: () => void): this {
    this.clickCallback = callback;
    return this;
  }

  remove(): void {
    this.buttonEl.remove();
    this.onunload();
  }
}

/**
 * DropdownComponent - A select dropdown component
 */
export class DropdownComponent extends ValueComponent<string> {
  selectEl: HTMLSelectElement;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    this.selectEl = document.createElement('select');
    this.selectEl.classList.add('setting-dropdown');
    containerEl.appendChild(this.selectEl);

    this.selectEl.addEventListener('change', () => {
      this.triggerChange();
    });
  }

  getValue(): string {
    return this.selectEl.value;
  }

  setValue(value: string): this {
    this.selectEl.value = value;
    return this;
  }

  addOption(value: string, display: string): this {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = display;
    this.selectEl.appendChild(option);
    return this;
  }

  addOptions(options: Record<string, string>): this {
    for (const [value, display] of Object.entries(options)) {
      this.addOption(value, display);
    }
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.selectEl.disabled = disabled;
    return this;
  }

  clear(): this {
    while (this.selectEl.firstChild) {
      this.selectEl.removeChild(this.selectEl.firstChild);
    }
    return this;
  }
}

/**
 * SliderComponent - A range slider component
 */
export class SliderComponent extends ValueComponent<number> {
  sliderEl: HTMLInputElement;
  valueEl: HTMLElement | null = null;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    this.sliderEl = document.createElement('input');
    this.sliderEl.type = 'range';
    this.sliderEl.classList.add('setting-slider');
    this.sliderEl.setAttribute('min', '0');
    this.sliderEl.setAttribute('max', '100');
    this.sliderEl.setAttribute('step', '1');
    containerEl.appendChild(this.sliderEl);

    this.sliderEl.addEventListener('input', () => {
      this.updateValueDisplay();
      this.triggerChange();
    });
  }

  getValue(): number {
    return parseFloat(this.sliderEl.value);
  }

  setValue(value: number): this {
    this.sliderEl.value = value.toString();
    this.updateValueDisplay();
    return this;
  }

  setDynamicTooltip(): this {
    this.sliderEl.setAttribute('data-tooltip-position', 'top');
    return this;
  }

  setLimits(min: number, max: number, step: number = 1): this {
    this.sliderEl.min = min.toString();
    this.sliderEl.max = max.toString();
    this.sliderEl.step = step.toString();
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.sliderEl.disabled = disabled;
    return this;
  }

  showTooltip(): this {
    this.sliderEl.setAttribute('data-tooltip', this.getValue().toString());
    return this;
  }

  private updateValueDisplay(): void {
    if (this.valueEl) {
      this.valueEl.textContent = this.getValue().toString();
    }
  }
}

/**
 * ColorComponent - A simple color picker component
 */
export class ColorComponent extends ValueComponent<string> {
  inputEl: HTMLInputElement;
  colorPreview: HTMLElement;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    const wrapper = document.createElement('div');
    wrapper.classList.add('color-wrapper');
    containerEl.appendChild(wrapper);

    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.classList.add('setting-input');
    this.inputEl.placeholder = '#000000';
    wrapper.appendChild(this.inputEl);

    this.colorPreview = document.createElement('div');
    this.colorPreview.classList.add('color-preview');
    wrapper.appendChild(this.colorPreview);

    this.updatePreview();

    this.inputEl.addEventListener('input', () => {
      this.updatePreview();
      this.triggerChange();
    });
  }

  getValue(): string {
    return this.inputEl.value;
  }

  setValue(value: string): this {
    this.inputEl.value = value;
    this.updatePreview();
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  private updatePreview(): void {
    const color = this.inputEl.value;
    this.colorPreview.style.backgroundColor = color || 'transparent';
  }
}
