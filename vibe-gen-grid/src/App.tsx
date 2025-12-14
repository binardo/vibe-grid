import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import GridLibrary from '@/pages/GridLibrary';
import GridScreen from '@/pages/GridScreen';
import { openaiService } from '@/services/openai';
import { apiService } from '@/services/api';
import './App.css';

function App() {
  useEffect(() => {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (openaiKey) {
      openaiService.setApiKey(openaiKey);
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiBaseUrl || apiKey) {
      apiService.setConfig({
        baseUrl: apiBaseUrl,
        apiKey: apiKey,
      });
    }

    apiService.getStrategies();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GridLibrary />} />
        <Route path="/grid/:gridId" element={<GridScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
