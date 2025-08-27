'use client';

import { Lightbulb, AlertTriangle, AlertCircle, MessageCircle, Info } from 'lucide-react';

interface CalloutProps {
  type: string;
  children: React.ReactNode;
}

export default function Callout({ type, children }: CalloutProps) {
  const getCalloutStyles = (type: string) => {
    const baseStyles = 'p-4 rounded-lg my-4 border-l-4';
    const icons = {
      note: <Lightbulb className="w-5 h-5" />,
      warning: <AlertTriangle className="w-5 h-5" />,
      important: <AlertCircle className="w-5 h-5" />,
      tip: <MessageCircle className="w-5 h-5" />,
      default: <Info className="w-5 h-5" />
    };
    
    switch (type.toLowerCase()) {
      case 'note':
        return {
          className: `${baseStyles} bg-blue-100/90 border-blue-500 dark:bg-blue-500/10`,
          icon: icons.note
        };
      case 'warning':
        return {
          className: `${baseStyles} bg-amber-100/90 border-amber-500 dark:bg-amber-500/10`,
          icon: icons.warning
        };
      case 'important':
        return {
          className: `${baseStyles} bg-red-100/90 border-red-500 dark:bg-red-500/10`,
          icon: icons.important
        };
      case 'tip':
        return {
          className: `${baseStyles} bg-emerald-100/90 border-emerald-500 dark:bg-emerald-500/10`,
          icon: icons.tip
        };
      default:
        return {
          className: `${baseStyles} bg-gray-100/90 border-gray-500 dark:bg-gray-500/10`,
          icon: icons.default
        };
    }
  };

  const styles = getCalloutStyles(type);

  return (
    <div className={styles.className}>
      <div className="font-medium mb-2 capitalize flex items-center gap-2">
        <span>{styles.icon}</span>
        {type}
      </div>
      <div className="text-sm prose-p:my-1 prose-p:leading-relaxed">
        {children}
      </div>
    </div>
  );
} 