/**
 * Performance optimization utilities for Igne
 */

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      fn.apply(this, args);
      lastCall = now;
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        fn.apply(this, args);
        lastCall = Date.now();
        timeoutId = null;
      }, delay - timeSinceLastCall);
    }
  };
}

/**
 * LRU Cache for expensive computations
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Add to end
    this.cache.set(key, value);

    // Evict oldest if over size
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value as K;
      this.cache.delete(firstKey);
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Memoize expensive function calls
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyGenerator
      ? keyGenerator(...args)
      : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Batch multiple operations into a single execution
 */
export class BatchProcessor<T> {
  private queue: T[] = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private batchSize: number;
  private delay: number;
  private processor: (items: T[]) => void;

  constructor(
    batchSize: number,
    delay: number,
    processor: (items: T[]) => void
  ) {
    this.batchSize = batchSize;
    this.delay = delay;
    this.processor = processor;
  }

  add(item: T): void {
    this.queue.push(item);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => {
        this.flush();
      }, this.delay);
    }
  }

  flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.queue.length > 0) {
      const batch = [...this.queue];
      this.queue = [];
      this.processor(batch);
    }
  }
}

/**
 * Virtual scrolling helper
 */
export interface VirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export interface VirtualScrollResult {
  visibleStart: number;
  visibleEnd: number;
  offsetY: number;
  visibleCount: number;
}

export function calculateVirtualScroll(
  scrollTop: number,
  options: VirtualScrollOptions
): VirtualScrollResult {
  const {
    itemCount,
    itemHeight,
    containerHeight,
    overscan = 3,
  } = options;

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startNode = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endNode = Math.min(
    itemCount,
    startNode + visibleCount + overscan * 2
  );

  return {
    visibleStart: startNode,
    visibleEnd: endNode,
    offsetY: startNode * itemHeight,
    visibleCount,
  };
}

/**
 * Request animation frame throttle
 */
export function rafThrottle<T extends (...args: any[]) => void>(
  fn: T
): T {
  let rafId: number | null = null;

  return ((...args: Parameters<T>) => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      fn(...args);
      rafId = null;
    });
  }) as T;
}

/**
 * Idle callback utility for background tasks
 */
export function runWhenIdle(
  callback: () => void,
  timeout?: number
): () => void {
  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(callback, { timeout });
    return () => cancelIdleCallback(id);
  }

  // Fallback to setTimeout
  const id = setTimeout(callback, 1);
  return () => clearTimeout(id);
}

/**
 * Chunk an array into smaller batches
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process array items in chunks to avoid blocking
 */
export async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (item: T) => R | Promise<R>
): Promise<R[]> {
  const chunks = chunk(items, chunkSize);
  const results: R[] = [];

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);

    // Yield to event loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}

/**
 * Web Worker utility for offloading heavy computation
 */
export class WorkerPool<T> {
  private workers: Worker[] = [];
  private queue: { data: T; resolve: (result: any) => void }[] = [];
  private activeWorkers = 0;

  constructor(
    workerScript: string,
    private poolSize: number = navigator.hardwareConcurrency || 4
  ) {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(
        URL.createObjectURL(new Blob([workerScript], { type: 'text/javascript' }))
      );
      worker.onmessage = (e) => {
        const task = this.queue.shift();
        if (task) {
          task.resolve(e.data);
          this.activeWorkers--;
          this.processQueue();
        }
      };
      this.workers.push(worker);
    }
  }

  async execute(data: T): Promise<any> {
    return new Promise((resolve) => {
      this.queue.push({ data, resolve });
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.activeWorkers < this.poolSize) {
      const task = this.queue[0];
      const worker = this.workers[this.activeWorkers];

      if (worker && task) {
        this.activeWorkers++;
        worker.postMessage(task.data);
      }
    }
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.queue = [];
  }
}

/**
 * Lazy load utility
 */
export class LazyLoad<T> {
  private loaded = false;
  private value: T | null = null;
  private loader: () => T | Promise<T>;

  constructor(loader: () => T | Promise<T>) {
    this.loader = loader;
  }

  async get(): Promise<T> {
    if (!this.loaded) {
      this.value = await this.loader();
      this.loaded = true;
    }
    return this.value as T;
  }

  reset(): void {
    this.loaded = false;
    this.value = null;
  }
}

/**
 * Performance-optimized event emitter
 */
export class EventEmitter<T extends Record<string, any>> {
  private listeners: Map<keyof T, Set<Function>> = new Map();

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  clear<K extends keyof T>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
