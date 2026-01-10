/**
 * Performance measurement utilities for Igne
 */

export interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private marks: Map<string, number> = new Map();

  /**
   * Start a performance measurement
   */
  start(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * End a performance measurement and return duration
   */
  end(name: string): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`Performance mark "${name}" not found`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    this.marks.delete(name);
    return duration;
  }

  /**
   * Measure a function's execution time
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      return await fn();
    } finally {
      this.end(name);
    }
  }

  /**
   * Measure a synchronous function's execution time
   */
  measureSync<T>(name: string, fn: () => T): T {
    this.start(name);
    try {
      return fn();
    } finally {
      this.end(name);
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get average duration for a specific measurement
   */
  getAverage(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  /**
   * Get the median duration for a specific measurement
   */
  getMedian(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sorted = metrics.map(m => m.duration).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Get the p95 (95th percentile) duration
   */
  getP95(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sorted = metrics.map(m => m.duration).sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Log a performance report
   */
  logReport(): void {
    console.group('Performance Report');

    const grouped = new Map<string, PerformanceMetrics[]>();
    this.metrics.forEach(m => {
      if (!grouped.has(m.name)) {
        grouped.set(m.name, []);
      }
      grouped.get(m.name)!.push(m);
    });

    grouped.forEach((metrics, name) => {
      const avg = this.getAverage(name);
      const median = this.getMedian(name);
      const p95 = this.getP95(name);
      const count = metrics.length;

      console.log(`${name}:`);
      console.log(`  Count: ${count}`);
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  Median: ${median.toFixed(2)}ms`);
      console.log(`  P95: ${p95.toFixed(2)}ms`);
    });

    console.groupEnd();
  }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();

/**
 * Decorator to measure method performance
 */
export function MeasurePerformance(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  const className = target.constructor.name;

  descriptor.value = async function (...args: any[]) {
    const name = `${className}.${propertyKey}`;
    perfMonitor.start(name);

    try {
      return await originalMethod.apply(this, args);
    } finally {
      perfMonitor.end(name);
    }
  };

  return descriptor;
}

/**
 * Check if performance targets are met
 */
export interface PerformanceTargets {
  startupTime: number; // ms
  fileSwitch: number; // ms
  search: number; // ms
  memoryUsage: number; // MB
}

export const PERFORMANCE_TARGETS: PerformanceTargets = {
  startupTime: 2000, // < 2 seconds for 1000 files
  fileSwitch: 100, // < 100ms
  search: 500, // < 500ms for 1000 files
  memoryUsage: 500, // < 500MB for 1000 files
};

/**
 * Benchmark suite for performance testing
 */
export class Benchmark {
  constructor() {}

  /**
   * Benchmark startup time with a vault of given size
   */
  async benchmarkStartup(fileCount: number): Promise<number> {
    console.log(`Benchmarking startup with ${fileCount} files...`);

    // This would typically start the app and measure time
    const startTime = performance.now();

    // Simulate loading files
    for (let i = 0; i < fileCount; i++) {
      // Simulate file read
      await new Promise(resolve => setTimeout(resolve, 0.1));
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Startup time: ${duration.toFixed(2)}ms`);

    return duration;
  }

  /**
   * Benchmark file switching performance
   */
  async benchmarkFileSwitch(iterations: number = 100): Promise<number> {
    console.log(`Benchmarking file switch (${iterations} iterations)...`);

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      // Simulate file switch
      await new Promise(resolve => setTimeout(resolve, 0.05));

      const end = performance.now();
      times.push(end - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Average file switch: ${avg.toFixed(2)}ms`);

    return avg;
  }

  /**
   * Benchmark search performance
   */
  async benchmarkSearch(fileCount: number): Promise<number> {
    console.log(`Benchmarking search with ${fileCount} files...`);

    const start = performance.now();

    // Simulate search index query
    await new Promise(resolve => setTimeout(resolve, fileCount * 0.05));

    const end = performance.now();
    const duration = end - start;

    console.log(`Search time: ${duration.toFixed(2)}ms`);

    return duration;
  }

  /**
   * Benchmark memory usage
   */
  benchmarkMemoryUsage(): number {
    if ('memory' in performance && (performance as any).memory) {
      const usedMB = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
      console.log(`Memory usage: ${usedMB.toFixed(2)}MB`);
      return usedMB;
    }

    console.warn('Memory API not available');
    return 0;
  }

  /**
   * Run full benchmark suite
   */
  async runFullBenchmark(fileCount: number = 1000): Promise<{
    startupTime: number;
    fileSwitch: number;
    search: number;
    memoryUsage: number;
    targetsMet: boolean;
  }> {
    console.log('Running full benchmark suite...');
    console.log(`Target: ${fileCount} files`);

    const startupTime = await this.benchmarkStartup(fileCount);
    const fileSwitch = await this.benchmarkFileSwitch();
    const search = await this.benchmarkSearch(fileCount);
    const memoryUsage = this.benchmarkMemoryUsage();

    const targetsMet =
      startupTime < PERFORMANCE_TARGETS.startupTime &&
      fileSwitch < PERFORMANCE_TARGETS.fileSwitch &&
      search < PERFORMANCE_TARGETS.search &&
      memoryUsage < PERFORMANCE_TARGETS.memoryUsage ||
      memoryUsage === 0; // Skip memory check if not available

    console.log('\n--- Benchmark Results ---');
    console.log(`Startup: ${startupTime.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.startupTime}ms)`);
    console.log(`File Switch: ${fileSwitch.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.fileSwitch}ms)`);
    console.log(`Search: ${search.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.search}ms)`);
    console.log(`Memory: ${memoryUsage.toFixed(2)}MB (target: ${PERFORMANCE_TARGETS.memoryUsage}MB)`);
    console.log(`Targets Met: ${targetsMet ? '✅' : '❌'}`);

    return {
      startupTime,
      fileSwitch,
      search,
      memoryUsage,
      targetsMet,
    };
  }
}
