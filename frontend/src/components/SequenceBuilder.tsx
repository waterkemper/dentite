import { useState } from 'react';
import { Plus, Trash2, GripVertical, Mail, Smartphone, Calendar, Clock } from 'lucide-react';

export interface SequenceStep {
  id?: string;
  stepNumber: number;
  name: string;
  messageType: 'sms' | 'email';
  messageTemplate: string;
  delayType: 'fixed_days' | 'days_before_expiry';
  delayValue: number;
  isActive?: boolean;
}

interface SequenceBuilderProps {
  steps: SequenceStep[];
  onChange: (steps: SequenceStep[]) => void;
}

export const SequenceBuilder = ({ steps, onChange }: SequenceBuilderProps) => {
  const [editingStep, setEditingStep] = useState<number | null>(null);

  const validateSteps = (stepsToValidate: SequenceStep[]): boolean => {
    return stepsToValidate.every(step => 
      step.name.trim() !== '' && 
      step.messageTemplate.trim() !== '' &&
      step.delayValue >= 0
    );
  };

  const addStep = () => {
    const newStep: SequenceStep = {
      stepNumber: steps.length + 1,
      name: `Step ${steps.length + 1}`,
      messageType: 'email',
      messageTemplate: 'Hi {firstName}, you have {amount} in dental benefits expiring on {expirationDate}. Don\'t let them go to waste!',
      delayType: 'fixed_days',
      delayValue: 7,
    };
    onChange([...steps, newStep]);
    setEditingStep(steps.length);
  };

  const updateStep = (index: number, updates: Partial<SequenceStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onChange(newSteps);
  };

  const deleteStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Renumber remaining steps
    const renumbered = newSteps.map((step, i) => ({
      ...step,
      stepNumber: i + 1,
    }));
    onChange(renumbered);
    setEditingStep(null);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

    // Renumber steps
    const renumbered = newSteps.map((step, i) => ({
      ...step,
      stepNumber: i + 1,
    }));

    onChange(renumbered);
  };

  const getDelayDescription = (step: SequenceStep) => {
    if (step.delayType === 'fixed_days') {
      return `${step.delayValue} days after previous step`;
    } else {
      return `${step.delayValue} days before expiry`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Message Sequence</h3>
        <button
          type="button"
          onClick={addStep}
          className="btn btn-secondary flex items-center text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Step
        </button>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">No steps added yet</p>
          <button type="button" onClick={addStep} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add First Step
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`border rounded-lg ${
                editingStep === index ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Step Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setEditingStep(editingStep === index ? null : index)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                    <span className="text-xs font-semibold text-gray-500">#{step.stepNumber}</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{step.name}</h4>
                      {step.messageType === 'sms' ? (
                        <Smartphone className="w-4 h-4 text-primary" />
                      ) : (
                        <Mail className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{getDelayDescription(step)}</span>
                      </div>
                    </div>
                    {step.messageTemplate && (
                      <p className="mt-2 text-sm text-gray-700 line-clamp-2 font-mono bg-gray-100 p-2 rounded">
                        {step.messageTemplate}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(index, 'up');
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Move up"
                      >
                        ↑
                      </button>
                    )}
                    {index < steps.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(index, 'down');
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Move down"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this step?')) {
                          deleteStep(index);
                        }
                      }}
                      className="p-1 hover:bg-red-100 text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Step Editor */}
              {editingStep === index && (
                <div className="p-4 border-t border-gray-200 bg-white space-y-4">
                  <div>
                    <label className="label">Step Name</label>
                    <input
                      type="text"
                      className="input"
                      value={step.name}
                      onChange={(e) => updateStep(index, { name: e.target.value })}
                      placeholder="e.g., Initial Reminder, Follow-up"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Message Type</label>
                      <select
                        className="input"
                        value={step.messageType}
                        onChange={(e) =>
                          updateStep(index, { messageType: e.target.value as 'sms' | 'email' })
                        }
                      >
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Delay Type</label>
                      <select
                        className="input"
                        value={step.delayType}
                        onChange={(e) =>
                          updateStep(index, {
                            delayType: e.target.value as 'fixed_days' | 'days_before_expiry',
                          })
                        }
                      >
                        <option value="fixed_days">Fixed Days After Previous</option>
                        <option value="days_before_expiry">Days Before Expiry</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">
                      {step.delayType === 'fixed_days'
                        ? 'Days After Previous Step'
                        : 'Days Before Expiry'}
                    </label>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      value={step.delayValue}
                      onChange={(e) =>
                        updateStep(index, { delayValue: parseInt(e.target.value) || 0 })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {step.delayType === 'fixed_days'
                        ? 'Message will be sent this many days after the previous step'
                        : 'Message will be sent this many days before benefits expire'}
                    </p>
                  </div>

                  <div>
                    <label className="label">Message Template</label>
                    <textarea
                      className="input"
                      rows={4}
                      value={step.messageTemplate}
                      onChange={(e) => updateStep(index, { messageTemplate: e.target.value })}
                      placeholder="Hi {firstName}, you have {amount} in dental benefits expiring on {expirationDate}..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available variables: {'{firstName}'}, {'{lastName}'}, {'{fullName}'},{' '}
                      {'{amount}'}, {'{expirationDate}'}, {'{daysRemaining}'}, {'{carrier}'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Timeline Preview */}
      {steps.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Sequence Timeline
            {!validateSteps(steps) && (
              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                Some steps need completion
              </span>
            )}
          </h4>
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isValid = step.name.trim() !== '' && step.messageTemplate.trim() !== '';
              return (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold ${
                    isValid ? 'bg-primary' : 'bg-red-500'
                  }`}>
                    {step.stepNumber}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{step.name || 'Unnamed Step'}</span>
                    <span className="text-gray-500 mx-2">•</span>
                    <span className="text-gray-600">{getDelayDescription(step)}</span>
                    {!isValid && (
                      <span className="text-red-500 text-xs ml-2">⚠️ Incomplete</span>
                    )}
                  </div>
                  {step.messageType === 'sms' ? (
                    <Smartphone className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Mail className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

