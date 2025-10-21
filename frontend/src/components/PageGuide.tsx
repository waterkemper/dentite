import { useState } from 'react';
import { HelpCircle, X, CheckCircle, ArrowRight } from 'lucide-react';

interface GuideItem {
  id: string;
  title: string;
  description: string;
  completed?: boolean;
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface PageGuideProps {
  title: string;
  items: GuideItem[];
  onDismiss?: () => void;
  showProgress?: boolean;
}

export const PageGuide = ({ title, items, onDismiss, showProgress = true }: PageGuideProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const completedCount = items.filter(item => item.completed).length;
  const progress = showProgress ? (completedCount / items.length) * 100 : 0;

  if (isCollapsed) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <HelpCircle className="w-5 h-5 text-primary mr-2" />
            <span className="text-sm font-medium text-gray-900">{title}</span>
            {showProgress && (
              <span className="ml-2 text-xs text-gray-500">
                {completedCount}/{items.length} completed
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-primary hover:text-blue-700 text-sm"
          >
            Show Guide
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <HelpCircle className="w-5 h-5 text-primary mr-2" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Dismiss guide"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Collapse guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showProgress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completedCount}/{items.length} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start p-3 rounded-lg ${
              item.completed 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex-shrink-0 mr-3 mt-0.5">
              {item.completed ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <h4 className={`font-medium text-sm ${
                item.completed ? 'text-green-900' : 'text-gray-900'
              }`}>
                {item.title}
              </h4>
              <p className={`text-sm mt-1 ${
                item.completed ? 'text-green-700' : 'text-gray-600'
              }`}>
                {item.description}
              </p>
              {item.action && !item.completed && (
                <button
                  onClick={item.action.onClick}
                  className="mt-2 text-primary text-sm hover:underline flex items-center"
                >
                  {item.action.text}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
