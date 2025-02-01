'use client';

import { useState } from 'react';

interface ConceptCheckProps {
  question: string;
  answer: string;
}

export default function ConceptCheck({ question, answer }: ConceptCheckProps) {
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);

  return (
    <div className="rounded-lg p-4 my-4 border bg-purple-900/30 border-purple-500/30">
      <div className="font-medium text-base mb-2 text-white/90 flex items-center gap-2">
        <span>🤔</span>
        <span className="uppercase">Concept Check</span>
      </div>
      <div className="text-white/80 mb-3">
        {question}
      </div>
      <div 
        className={`text-white/80 bg-purple-950/50 p-3 rounded transition-all duration-200 cursor-pointer ${
          isAnswerVisible 
            ? 'blur-none' 
            : 'blur-sm hover:blur-[2px]'
        }`}
        onClick={() => setIsAnswerVisible(!isAnswerVisible)}
      >
        {answer}
      </div>
    </div>
  );
} 