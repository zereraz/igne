/**
 * Agent Executor for Phase H: AI-First Layer
 *
 * Implements the plan → approve → execute workflow for agent operations.
 * All agent actions go through this executor, ensuring auditability and reversibility.
 */

import type { Result } from '../tools/types';
import type { CommandSource } from '../tools/types';
import type { AgentToolInput, AgentToolOutput } from './tools';
import { CommandRegistry } from '../commands/registry';
import { AuditLog } from '../commands/audit';

// =============================================================================
// Step Types
// =============================================================================

/**
 * Status of a step in the plan
 */
export type StepStatus = 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rejected';

/**
 * A single proposed step in an agent plan
 */
export interface ProposedStep {
  /**
   * Unique identifier for this step
   */
  id: string;

  /**
   * Tool ID to execute
   */
  toolId: string;

  /**
   * Input parameters for the tool
   */
  input: AgentToolInput;

  /**
   * Human-readable description of what this step does
   */
  description: string;

  /**
   * Current status of the step
   */
  status: StepStatus;

  /**
   * Result of the step (if executed)
   */
  result?: AgentToolOutput;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Diff preview (for write operations)
   */
  diff?: string;

  /**
   * Step index in the plan
   */
  order: number;

  /**
   * Timestamp when the step was created
   */
  createdAt: number;

  /**
   * Timestamp when the step completed (if applicable)
   */
  completedAt?: number;
}

/**
 * A plan of proposed steps from an agent
 */
export interface AgentPlan {
  /**
   * Unique identifier for this plan
   */
  id: string;

  /**
   * Human-readable description of the plan
   */
  description: string;

  /**
   * Steps in the plan
   */
  steps: ProposedStep[];

  /**
   * Current status of the plan
   */
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rejected';

  /**
   * Timestamp when the plan was created
   */
  createdAt: number;

  /**
   * Timestamp when the plan completed (if applicable)
   */
  completedAt?: number;

  /**
   * Total duration of plan execution in milliseconds
   */
  duration?: number;
}

// =============================================================================
// Agent Executor
// =============================================================================

class AgentExecutorClass {
  private plans = new Map<string, AgentPlan>();
  private nextPlanId = 0;
  private nextStepId = 0;

  /**
   * Create a new plan from proposed steps
   */
  createPlan(description: string, steps: Omit<ProposedStep, 'id' | 'status' | 'order' | 'createdAt'>[]): AgentPlan {
    const planId = `plan-${this.nextPlanId++}`;
    const now = Date.now();

    const plan: AgentPlan = {
      id: planId,
      description,
      status: 'pending',
      createdAt: now,
      steps: steps.map((step, index) => ({
        ...step,
        id: `${planId}-step-${this.nextStepId++}`,
        status: 'pending' as StepStatus,
        order: index,
        createdAt: now,
      })),
    };

    this.plans.set(planId, plan);

    return plan;
  }

  /**
   * Get a plan by ID
   */
  getPlan(planId: string): AgentPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Get all plans
   */
  getAllPlans(): AgentPlan[] {
    return Array.from(this.plans.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get a step by ID
   */
  getStep(planId: string, stepId: string): ProposedStep | undefined {
    const plan = this.plans.get(planId);
    if (!plan) return undefined;
    return plan.steps.find(s => s.id === stepId);
  }

  /**
   * Approve a single step
   */
  approveStep(planId: string, stepId: string): void {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan "${planId}" not found`);
    }

    const step = plan.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step "${stepId}" not found in plan "${planId}"`);
    }

    step.status = 'approved';

    // Update plan status if all steps are approved
    if (plan.steps.every(s => s.status === 'approved' || s.status === 'completed' || s.status === 'failed')) {
      plan.status = 'approved';
    }
  }

  /**
   * Reject a single step
   */
  rejectStep(planId: string, stepId: string, reason?: string): void {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan "${planId}" not found`);
    }

    const step = plan.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step "${stepId}" not found in plan "${planId}"`);
    }

    step.status = 'rejected';
    if (reason) {
      step.error = reason;
    }

    // Reject the entire plan if any step is rejected
    plan.status = 'rejected';
    plan.completedAt = Date.now();
  }

  /**
   * Approve all steps in a plan
   */
  approveAll(planId: string): void {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan "${planId}" not found`);
    }

    for (const step of plan.steps) {
      if (step.status === 'pending') {
        step.status = 'approved';
      }
    }

    plan.status = 'approved';
  }

  /**
   * Generate a diff for a step before execution
   * This is primarily useful for write operations
   */
  async getDiff(step: ProposedStep): Promise<string> {
    const { toolId, input } = step;

    // For write operations, we might want to show what will change
    if (toolId === 'note_write' || toolId === 'note_create') {
      const path = input.path as string;
      const content = input.content as string;

      // Try to read the current file content
      try {
        const command = CommandRegistry.get('file.read');
        if (command) {
          const currentContent = await CommandRegistry.execute('file.read', 'agent', path);
          if (typeof currentContent === 'string') {
            // Simple diff representation
            return `--- ${path} (current)\n+++ ${path} (proposed)\n@@ -1,${currentContent.split('\n').length} +1,${content.split('\n').length} @@\n- ${currentContent.substring(0, 100)}...\n+ ${content.substring(0, 100)}...`;
          }
        }
      } catch {
        // File doesn't exist, will be created
        return `+++ ${path} (new file)\n+ ${content.substring(0, 100)}...`;
      }
    }

    if (toolId === 'note_rename') {
      const oldPath = input.oldPath as string;
      const newPath = input.newPath as string;
      return `- ${oldPath}\n+ ${newPath}`;
    }

    if (toolId === 'note_delete') {
      const path = input.path as string;
      return `- ${path} (deleted)`;
    }

    return 'No diff available for this operation';
  }

  /**
   * Execute a single approved step
   */
  async executeStep(planId: string, stepId: string): Promise<AgentToolOutput> {
    const plan = this.plans.get(planId);
    if (!plan) {
      return { success: false, error: `Plan "${planId}" not found` };
    }

    const step = plan.steps.find(s => s.id === stepId);
    if (!step) {
      return { success: false, error: `Step "${stepId}" not found in plan "${planId}"` };
    }

    if (step.status !== 'approved') {
      return { success: false, error: `Step "${stepId}" is not approved (status: ${step.status})` };
    }

    // Mark step as executing
    step.status = 'executing';

    const startTime = Date.now();
    let result: AgentToolOutput;
    let planStatusUpdated = false;

    try {
      // Execute the command via CommandRegistry with agent source
      const command = CommandRegistry.get(step.toolId);
      if (!command) {
        throw new Error(`Command "${step.toolId}" not found in registry`);
      }

      // Convert input object to array of args
      // Most commands take positional args, so we extract values in order
      const args = Object.values(step.input);
      const commandResult = await CommandRegistry.execute(step.toolId, 'agent', ...args);

      result = {
        success: true,
        data: commandResult,
        duration: Date.now() - startTime,
      };

      step.status = 'completed';
      step.result = result;

      // Update plan status if all steps are completed
      if (plan.steps.every(s => s.status === 'completed' || s.status === 'failed' || s.status === 'rejected')) {
        plan.status = 'completed';
        plan.completedAt = Date.now();
        plan.duration = Date.now() - plan.createdAt;
        planStatusUpdated = true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result = {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };

      step.status = 'failed';
      step.error = errorMessage;
      step.result = result;

      // Update plan status if any step failed
      if (!planStatusUpdated) {
        plan.status = 'failed';
        plan.completedAt = Date.now();
        plan.duration = Date.now() - plan.createdAt;
      }
    }

    step.completedAt = Date.now();

    return result;
  }

  /**
   * Execute all approved steps in a plan
   */
  async executePlan(planId: string): Promise<AgentToolOutput[]> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan "${planId}" not found`);
    }

    if (plan.status !== 'approved') {
      throw new Error(`Plan "${planId}" is not approved (status: ${plan.status})`);
    }

    plan.status = 'executing';

    const results: AgentToolOutput[] = [];

    // Execute steps in order
    for (const step of plan.steps) {
      if (step.status === 'approved') {
        const result = await this.executeStep(planId, step.id);
        results.push(result);

        // Stop execution if a step fails
        if (!result.success) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Delete a plan
   */
  deletePlan(planId: string): boolean {
    return this.plans.delete(planId);
  }

  /**
   * Clear all plans (mainly for testing)
   */
  clearPlans(): void {
    this.plans.clear();
  }

  /**
   * Get statistics about plans
   */
  getStats(): {
    totalPlans: number;
    pendingPlans: number;
    approvedPlans: number;
    executingPlans: number;
    completedPlans: number;
    failedPlans: number;
  } {
    const plans = Array.from(this.plans.values());

    return {
      totalPlans: plans.length,
      pendingPlans: plans.filter(p => p.status === 'pending').length,
      approvedPlans: plans.filter(p => p.status === 'approved').length,
      executingPlans: plans.filter(p => p.status === 'executing').length,
      completedPlans: plans.filter(p => p.status === 'completed').length,
      failedPlans: plans.filter(p => p.status === 'failed').length,
    };
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const AgentExecutor = new AgentExecutorClass();

// Re-export types for convenience
export type { ProposedStep, AgentPlan, StepStatus };
