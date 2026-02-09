/**
 * Agent Panel Component for Phase H: AI-First Layer
 *
 * UI for interacting with AI agents:
 * - Conversation history
 * - Plan checklist
 * - Tool execution log
 * - Diff viewer
 */

import { useState, useEffect } from 'react';
import type { Plan, ProposedStep, ExecutorEvent } from '../agent/executor';
import { AgentExecutor } from '../agent/executor';
import { CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface AgentPanelProps {
  /**
   * Currently active plan
   */
  activePlan?: Plan;

  /**
   * Callback when a step is approved
   */
  onApproveStep?: (planId: string, stepId: string) => void;

  /**
   * Callback when a step is rejected
   */
  onRejectStep?: (planId: string, stepId: string) => void;

  /**
   * Callback when all steps are approved
   */
  onApproveAll?: (planId: string) => void;

  /**
   * Callback when plan execution starts
   */
  onExecute?: (planId: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

// =============================================================================
// Helper Components
// =============================================================================

function StatusIcon({ status }: { status: ProposedStep['status'] }) {
  const size = 14;
  switch (status) {
    case 'pending':
      return <Clock size={size} style={{ color: 'var(--text-faint)' }} />;
    case 'approved':
      return <CheckCircle2 size={size} style={{ color: '#3b82f6' }} />;
    case 'rejected':
      return <XCircle size={size} style={{ color: 'var(--color-red)' }} />;
    case 'running':
      return (
        <div style={{
          width: size,
          height: size,
          border: '2px solid #3b82f6',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      );
    case 'completed':
      return <CheckCircle2 size={size} style={{ color: 'var(--color-green)' }} />;
    case 'failed':
      return <AlertCircle size={size} style={{ color: 'var(--color-red)' }} />;
  }
}

function StepItem({
  step,
  planId,
  onApprove,
  onReject,
  showDiff,
  onToggleDiff,
}: {
  step: ProposedStep;
  planId: string;
  onApprove: (stepId: string) => void;
  onReject: (stepId: string) => void;
  showDiff: boolean;
  onToggleDiff: () => void;
}) {
  const canApprove = step.status === 'pending' || step.status === 'approved';
  const canReject = step.status === 'pending' || step.status === 'approved';

  const buttonStyle = {
    padding: '4px 8px',
    fontSize: '11px',
    fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
    fontWeight: 500,
    backgroundColor: 'var(--background-modifier-border)',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    color: 'white',
    opacity: 1,
  };

  const disabledStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  const approveStyle = {
    ...buttonStyle,
    backgroundColor: 'var(--color-green)',
  };

  const rejectStyle = {
    ...buttonStyle,
    backgroundColor: 'var(--color-red)',
  };

  return (
    <div style={{
      border: '1px solid var(--background-modifier-border)',
      borderRadius: '4px',
      padding: '12px',
      backgroundColor: 'var(--background-primary)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <StatusIcon status={step.status} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-normal)',
            fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
          }}>
            {step.description}
          </div>
          <div style={{
            fontSize: '11px',
            color: 'var(--text-faint)',
            marginTop: '4px',
            fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
          }}>
            {step.toolId} {step.duration && `(${step.duration}ms)`}
          </div>
          {step.error && (
            <div style={{
              fontSize: '11px',
              color: 'var(--color-red)',
              marginTop: '4px',
              fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
            }}>
              {step.error}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!step.readonly && (
            <>
              <button
                onClick={() => onApprove(step.id)}
                disabled={!canApprove}
                style={canApprove ? approveStyle : disabledStyle}
                onMouseEnter={(e) => {
                  if (canApprove) {
                    e.currentTarget.style.backgroundColor = '#16a34a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (canApprove) {
                    e.currentTarget.style.backgroundColor = 'var(--color-green)';
                  }
                }}
              >
                Approve
              </button>
              <button
                onClick={() => onReject(step.id)}
                disabled={!canReject}
                style={canReject ? rejectStyle : disabledStyle}
                onMouseEnter={(e) => {
                  if (canReject) {
                    e.currentTarget.style.backgroundColor = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (canReject) {
                    e.currentTarget.style.backgroundColor = 'var(--color-red)';
                  }
                }}
              >
                Reject
              </button>
            </>
          )}
          {step.readonly && (
            <span style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
              fontWeight: 500,
              backgroundColor: 'var(--background-modifier-border)',
              borderRadius: '2px',
              color: 'var(--text-muted)',
            }}>
              Read-only
            </span>
          )}
        </div>
      </div>

      {/* Diff viewer for write operations */}
      {!step.readonly && (step.status === 'approved' || step.status === 'pending') && (
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={onToggleDiff}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: 'var(--text-faint)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-normal)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-faint)';
            }}
          >
            {showDiff ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Show diff
          </button>
          {showDiff && step.expectedDiff && (
            <pre style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: 'var(--background-secondary)',
              borderRadius: '2px',
              fontSize: '11px',
              overflowX: 'auto',
              fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
              color: 'var(--text-muted)',
            }}>
              {step.expectedDiff}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AgentPanel({ activePlan, onApproveStep, onRejectStep, onApproveAll, onExecute }: AgentPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [executionLog, setExecutionLog] = useState<Array<{ step: ProposedStep; result: string; time: number }>>([]);

  // Subscribe to executor events
  useEffect(() => {
    const unsubscribe = AgentExecutor.onEvent((event: ExecutorEvent) => {
      switch (event.type) {
        case 'stepStarted':
          setExecutionLog(prev => [
            ...prev,
            { step: event.step, result: 'Starting...', time: Date.now() },
          ]);
          break;
        case 'stepCompleted':
          setExecutionLog(prev => {
            const updated = [...prev];
            const lastIdx = updated.findIndex(l => l.step.id === event.step.id);
            if (lastIdx >= 0) {
              updated[lastIdx] = {
                step: event.step,
                result: `Completed in ${event.step.duration}ms`,
                time: Date.now(),
              };
            }
            return updated;
          });
          break;
        case 'stepFailed':
          setExecutionLog(prev => {
            const updated = [...prev];
            const lastIdx = updated.findIndex(l => l.step.id === event.step.id);
            if (lastIdx >= 0) {
              updated[lastIdx] = {
                step: event.step,
                result: `Failed: ${event.error}`,
                time: Date.now(),
              };
            }
            return updated;
          });
          break;
      }
    });

    return unsubscribe;
  }, []);

  const toggleStepDiff = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const handleApproveAll = () => {
    if (activePlan) {
      AgentExecutor.approveAll(activePlan.id);
      onApproveAll?.(activePlan.id);
    }
  };

  const handleExecute = async () => {
    if (activePlan && activePlan.status === 'approved') {
      onExecute?.(activePlan.id);
      await AgentExecutor.executePlan(activePlan.id);
    }
  };

  if (!activePlan) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-faint)',
        fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
      }}>
        <p>No active plan. Start a conversation to create a plan.</p>
      </div>
    );
  }

  const allApproved = activePlan.steps.every(s => s.status === 'approved' || s.status === 'completed' || s.status === 'failed');
  const canExecute = activePlan.status === 'approved' || (activePlan.status === 'pending' && allApproved);

  const buttonStyle = {
    padding: '8px 16px',
    fontSize: '12px',
    fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
    fontWeight: 500,
    backgroundColor: 'var(--background-modifier-border)',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    color: 'white',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#3b82f6',
  };

  const successButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'var(--color-green)',
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--background-primary)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--background-modifier-border)',
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-normal)',
          fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
        }}>Agent Plan</h2>
        <p style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          marginTop: '4px',
          fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
        }}>{activePlan.description}</p>
        <div style={{
          marginTop: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '2px',
            backgroundColor: 'var(--background-secondary)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
          }}>
            {activePlan.status}
          </span>
          <span style={{
            fontSize: '11px',
            color: 'var(--text-faint)',
            fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
          }}>
            {activePlan.steps.filter(s => s.status === 'completed').length} / {activePlan.steps.length} steps
          </span>
        </div>
      </div>

      {/* Actions */}
      {(activePlan.status === 'pending' || activePlan.status === 'approved') && (
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--background-modifier-border)',
          display: 'flex',
          gap: '8px',
        }}>
          <button
            onClick={handleApproveAll}
            disabled={activePlan.status === 'approved'}
            style={activePlan.status === 'approved' ? disabledButtonStyle : primaryButtonStyle}
            onMouseEnter={(e) => {
              if (activePlan.status !== 'approved') {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (activePlan.status !== 'approved') {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            Approve All
          </button>
          <button
            onClick={handleExecute}
            disabled={!canExecute}
            style={canExecute ? successButtonStyle : disabledButtonStyle}
            onMouseEnter={(e) => {
              if (canExecute) {
                e.currentTarget.style.backgroundColor = '#16a34a';
              }
            }}
            onMouseLeave={(e) => {
              if (canExecute) {
                e.currentTarget.style.backgroundColor = 'var(--color-green)';
              }
            }}
          >
            Execute Plan
          </button>
        </div>
      )}

      {/* Steps */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {activePlan.steps.map(step => (
          <StepItem
            key={step.id}
            step={step}
            planId={activePlan.id}
            onApprove={(stepId) => {
              AgentExecutor.approveStep(activePlan.id, stepId);
              onApproveStep?.(activePlan.id, stepId);
            }}
            onReject={(stepId) => {
              AgentExecutor.rejectStep(activePlan.id, stepId);
              onRejectStep?.(activePlan.id, stepId);
            }}
            showDiff={expandedSteps.has(step.id)}
            onToggleDiff={() => toggleStepDiff(step.id)}
          />
        ))}
      </div>

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--background-modifier-border)',
          padding: '16px',
        }}>
          <h3 style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-normal)',
            marginBottom: '8px',
            fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
          }}>Execution Log</h3>
          <div style={{
            maxHeight: '160px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            {executionLog.map((log, idx) => (
              <div key={idx} style={{
                fontSize: '11px',
                display: 'flex',
                gap: '8px',
                fontFamily: 'var(--font-monospace-theme, var(--font-monospace))',
              }}>
                <span style={{ color: 'var(--text-faint)' }}>
                  {new Date(log.time).toLocaleTimeString()}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>{log.step.description}</span>
                <span style={{ color: 'var(--text-faint)' }}>→</span>
                <span style={{ color: log.result.startsWith('Failed') ? 'var(--color-red)' : 'var(--color-green)' }}>
                  {log.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
