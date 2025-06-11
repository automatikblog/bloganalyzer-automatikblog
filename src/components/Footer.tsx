
import React from 'react';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="w-full py-8 px-6 md:px-12 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Logo />
            <p className="mt-4 text-gray-600">
              Crie dezenas de artigos para seu blog em minutos, não dias.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold mb-4">Soluções</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Blogs</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">E-commerce</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Sites</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-4">Recursos</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Diagnóstico</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Blog</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Suporte</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-4">Contato</h3>
            <ul className="space-y-2">
              <li className="text-gray-600">contato@automatikblog.com</li>
              <li className="text-gray-600">+55 (11) 99999-9999</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Automatik Blog. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
