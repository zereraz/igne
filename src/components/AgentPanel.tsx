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
      return <Clock size={size} style={{ color: '#9ca3af' }} />;
    case 'approved':
      return <CheckCircle2 size={size} style={{ color: '#3b82f6' }} />;
    case 'rejected':
      return <XCircle size={size} style={{ color: '#ef4444' }} />;
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
      return <CheckCircle2 size={size} style={{ color: '#22c55e' }} />;
    case 'failed':
      return <AlertCircle size={size} style={{ color: '#ef4444' }} />;
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
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    fontWeight: 500,
    backgroundColor: '#3f3f46',
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
    backgroundColor: '#22c55e',
  };

  const rejectStyle = {
    ...buttonStyle,
    backgroundColor: '#ef4444',
  };

  return (
    <div style={{
      border: '1px solid #3f3f46',
      borderRadius: '4px',
      padding: '12px',
      backgroundColor: '#18181b',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <StatusIcon status={step.status} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#e4e4e7',
            fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
          }}>
            {step.description}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#71717a',
            marginTop: '4px',
            fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
          }}>
            {step.toolId} {step.duration && `(${step.duration}ms)`}
          </div>
          {step.error && (
            <div style={{
              fontSize: '11px',
              color: '#ef4444',
              marginTop: '4px',
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
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
                    e.currentTarget.style.backgroundColor = '#22c55e';
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
                    e.currentTarget.style.backgroundColor = '#ef4444';
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
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
              fontWeight: 500,
              backgroundColor: '#3f3f46',
              borderRadius: '2px',
              color: '#a1a1aa',
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
              color: '#71717a',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#e4e4e7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#71717a';
            }}
          >
            {showDiff ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Show diff
          </button>
          {showDiff && step.expectedDiff && (
            <pre style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#27272a',
              borderRadius: '2px',
              fontSize: '11px',
              overflowX: 'auto',
              fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
              color: '#a1a1aa',
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
        color: '#71717a',
        fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
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
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
    fontWeight: 500,
    backgroundColor: '#3f3f46',
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
    backgroundColor: '#22c55e',
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
      backgroundColor: '#18181b',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #3f3f46',
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#e4e4e7',
          fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
        }}>Agent Plan</h2>
        <p style={{
          fontSize: '12px',
          color: '#a1a1aa',
          marginTop: '4px',
          fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
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
            backgroundColor: '#27272a',
            color: '#a1a1aa',
            fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
          }}>
            {activePlan.status}
          </span>
          <span style={{
            fontSize: '11px',
            color: '#71717a',
            fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
          }}>
            {activePlan.steps.filter(s => s.status === 'completed').length} / {activePlan.steps.length} steps
          </span>
        </div>
      </div>

      {/* Actions */}
      {(activePlan.status === 'pending' || activePlan.status === 'approved') && (
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #3f3f46',
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
                e.currentTarget.style.backgroundColor = '#22c55e';
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
          borderTop: '1px solid #3f3f46',
          padding: '16px',
        }}>
          <h3 style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#e4e4e7',
            marginBottom: '8px',
            fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
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
                fontFamily: "'IBM Plex Mono', 'SF Mono', 'Courier New', monospace",
              }}>
                <span style={{ color: '#71717a' }}>
                  {new Date(log.time).toLocaleTimeString()}
                </span>
                <span style={{ color: '#a1a1aa' }}>{log.step.description}</span>
                <span style={{ color: '#71717a' }}>→</span>
                <span style={{ color: log.result.startsWith('Failed') ? '#ef4444' : '#22c55e' }}>
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
