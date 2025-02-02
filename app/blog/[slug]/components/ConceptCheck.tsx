'use client';

import { useState } from 'react';
import { useTheme } from '@/app/context/ThemeContext';

interface ConceptCheckProps {
  question: string;
  answer: string;
}

export default function ConceptCheck({ question, answer }: ConceptCheckProps) {
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const { theme } = useTheme();

  return (
    <div className={`rounded-lg p-4 my-4 border ${
      theme === 'dark' 
        ? 'bg-purple-900/30 border-purple-500/30' 
        : 'bg-purple-50 border-purple-200'
    }`}>
      <div className={`font-medium text-base mb-2 flex items-center gap-2 ${
        theme === 'dark' ? 'text-white/90' : 'text-gray-900'
      }`}>
        <span>🤔</span>
        <span className="uppercase">Concept Check</span>
      </div>
      <div className={`mb-3 ${
        theme === 'dark' ? 'text-white/80' : 'text-gray-700'
      }`}>
        {question}
      </div>
      <div 
        className={`p-3 rounded transition-all duration-200 cursor-pointer ${
          theme === 'dark' 
            ? 'bg-purple-900/10 text-white/80' 
            : 'bg-purple-100/40 text-gray-700'
        } ${isAnswerVisible ? '' : 'blur-md hover:blur-md'}`}
        onClick={() => setIsAnswerVisible(!isAnswerVisible)}
      >
        {answer}
      </div>
    </div>
  );
} 