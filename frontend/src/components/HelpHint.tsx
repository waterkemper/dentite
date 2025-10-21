import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpHintProps {
  title: string;
  content: string;
  learnMoreUrl?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export const HelpHint = ({ 
  title, 
  content, 
  learnMoreUrl, 
  position = 'top',
  size = 'md'
}: HelpHintProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const tooltipClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-primary transition-colors"
        aria-label="Show help"
      >
        <HelpCircle className={sizeClasses[size]} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs ${tooltipClasses[position]}`}>
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-3">{content}</p>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm hover:underline"
            >
              Learn More →
            </a>
          )}
        </div>
      )}
    </div>
  );
};
