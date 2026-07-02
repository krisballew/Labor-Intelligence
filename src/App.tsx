import React from 'react';
import PortfolioOverview from './pages/PortfolioOverview';
import { ThemeProvider } from './components/ui/ThemeContext';
import './index.css';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <PortfolioOverview />
    </ThemeProvider>
  );
};

export default App;
