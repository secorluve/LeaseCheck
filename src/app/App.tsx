import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ResultsDashboard } from './components/ResultsDashboard';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { Footer } from './components/Footer';
import { motion } from 'motion/react';
import { analyzeListing } from '@/lib/analysis/analyzeListing';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { SupportPage } from './pages/SupportPage';
import type { AnalysisResult } from '@/lib/analysis/types';

export default function App() {
  const [hasResults, setHasResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [listingUrl, setListingUrl] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async (url: string) => {
    setListingUrl(url);
    setIsLoading(true);
    const result = await analyzeListing(url);
    setAnalysisResult(result);
    setIsLoading(false);
    setHasResults(true);
    
    // Smooth scroll to top when results are shown
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setHasResults(false);
    setListingUrl('');
    setAnalysisResult(null);
    
    // Smooth scroll to top when resetting
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Subtle gradient background effect */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <Header onReset={handleReset} showBack={hasResults} />
      
      <main className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route
            path="/"
            element={
              isLoading ? (
                <LoadingSkeleton />
              ) : !hasResults ? (
                <HeroSection onAnalyze={handleAnalyze} isLoading={isLoading} />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <ResultsDashboard listingUrl={listingUrl} analysisResult={analysisResult} />
                </motion.div>
              )
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}