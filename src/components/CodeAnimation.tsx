import React from 'react';

const CodeAnimation = () => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center w-full max-w-md mx-auto animate-float border border-blue-100">
      <div className="flex items-center gap-3 mb-4">
        <svg className="w-10 h-10 text-cyan-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-2xl font-bold">Análise SEO</span>
      </div>
      <div className="w-full mb-3">
        <div className="flex justify-between text-xs text-gray-500">
          <span>SEO</span>
          <span className="font-semibold text-cyan-600">92/100</span>
        </div>
        <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
          <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-700" style={{width: '92%'}}></div>
        </div>
      </div>
      <div className="w-full mb-3">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Tráfego</span>
          <span className="font-semibold text-blue-600">Alto</span>
        </div>
        <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
          <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-700" style={{width: '80%'}}></div>
        </div>
      </div>
      <div className="w-full mb-3">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Performance</span>
          <span className="font-semibold text-purple-600">Ótima</span>
        </div>
        <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
          <div className="bg-gradient-to-r from-purple-400 to-cyan-400 h-2 rounded-full transition-all duration-700" style={{width: '95%'}}></div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <svg className="w-5 h-5 text-cyan-500 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-cyan-700 text-sm">Seu blog está pronto para ranquear no Google!</span>
      </div>
    </div>
  );
};

export default CodeAnimation;
