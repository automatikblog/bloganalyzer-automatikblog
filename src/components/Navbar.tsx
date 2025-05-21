import React from 'react';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  return (
    <nav className="w-full py-4 px-6 md:px-12 flex items-center justify-between shadow-sm bg-white">
      <img src="/logo-automatik.png" alt="Automatik Blog" className="h-12 w-auto" />
      
      <Button className="gradient-bg text-white font-medium">
        COMEÇAR AGORA
      </Button>
    </nav>
  );
};

export default Navbar;
