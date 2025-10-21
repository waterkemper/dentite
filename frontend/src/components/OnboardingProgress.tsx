import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isLastStep?: boolean;
}

export const OnboardingProgress = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSkip,
  canGoNext = true,
  canGoPrevious = true,
  isLastStep = false
}: OnboardingProgressProps) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between mb-6">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div key={stepNumber} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isCompleted 
                  ? 'bg-success text-white' 
                  : isCurrent 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  stepNumber
                )}
              </div>
              <span className={`text-xs mt-1 ${
                isCurrent ? 'text-primary font-medium' : 'text-gray-500'
              }`}>
                Step {stepNumber}
              </span>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-3">
          {onPrevious && canGoPrevious && (
            <button
              onClick={onPrevious}
              className="btn btn-secondary flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </button>
          )}
          {onSkip && !isLastStep && (
            <button
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Skip for now
            </button>
          )}
        </div>

        <div className="flex space-x-3">
          {isLastStep ? (
            <button
              onClick={onNext}
              className="btn btn-primary flex items-center"
            >
              Complete Setup
              <CheckCircle className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canGoNext}
              className="btn btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
