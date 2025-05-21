import React from 'react';
import DiagnosticForm from './DiagnosticForm';
import CodeAnimation from './CodeAnimation';

const Hero = () => {
  return (
    <div className="w-full min-h-screen bg-gray-50 py-12 px-6 md:px-12">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        {/* Headline e animação lado a lado */}
        <div className="flex flex-col md:flex-row items-center justify-center w-full gap-8 mb-12">
          <div className="flex-1 flex flex-col items-start justify-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="gradient-text">Analise seu blog</span> e 
              <span className="gradient-text"> potencialize</span> seus resultados
            </h1>
            <p className="text-lg text-gray-700 mb-8">
              Descubra como você pode economizar tempo, aumentar sua 
              audiência e crescer seu faturamento através de publicações 
              automatizadas em seu blog WordPress.
            </p>
          </div>
          <div className="flex-1 flex justify-center items-center">
            <CodeAnimation />
          </div>
        </div>
        {/* Centralizar resultados/loading abaixo */}
        <div className="w-full flex justify-center">
          <div className="w-full max-w-2xl">
            <DiagnosticForm hideResetButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
