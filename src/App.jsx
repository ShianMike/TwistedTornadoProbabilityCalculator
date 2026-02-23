import { useState, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { toPng } from 'html-to-image';
import Header from './components/Header';
import InputForm from './components/InputForm';
import HodographAnalyzer from './components/HodographAnalyzer';
import ThermodynamicsPanel from './components/ThermodynamicsPanel';
import ProbabilityChart from './components/ProbabilityChart';
import { TornadoCharacteristics, WeatherConditions } from './components/SpecialFactors';
import Footer from './components/Footer';
import DataGathering from './pages/DataGathering';
import { calculateProbabilities, estimateWind, calculateRiskLevel } from './utils/tornadoCalculations';

function MainApp() {
  const [inputData, setInputData] = useState({});
  const [results, setResults] = useState(null);
  const [windEstimate, setWindEstimate] = useState(null);
  const [hodographData, setHodographData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const captureRef = useRef(null);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaveAsPng = async () => {
    if (!captureRef.current) {
      console.error('Capture ref not found');
      return;
    }
    
    setIsSaving(true);
    try {
      // Scroll capture area into view
      captureRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
      
      // Wait for DOM to fully settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Temporarily disable backdrop-blur for capture (it can cause issues)
      const blurElements = captureRef.current.querySelectorAll('[class*="backdrop-blur"]');
      blurElements.forEach(el => {
        el.dataset.originalFilter = el.style.backdropFilter;
        el.style.backdropFilter = 'none';
      });
      
      // Force a repaint
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(captureRef.current, {
        backgroundColor: '#020617',
        pixelRatio: 2,
        cacheBust: true,
        includeQueryParams: true,
        filter: (node) => {
          // Skip nodes that might cause issues
          if (node.classList && node.classList.contains('animate-spin')) {
            return false;
          }
          return true;
        }
      });
      
      // Restore backdrop-blur
      blurElements.forEach(el => {
        el.style.backdropFilter = el.dataset.originalFilter || '';
      });
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `tornado-analysis-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to save PNG:', error);
      // Restore backdrop-blur on error
      const blurElements = captureRef.current?.querySelectorAll('[class*="backdrop-blur"]');
      blurElements?.forEach(el => {
        el.style.backdropFilter = el.dataset.originalFilter || '';
      });
      alert('Failed to save image. Check console for details.');
    }
    setIsSaving(false);
  };

  const handleAnalyze = useCallback(() => {
    if (Object.keys(inputData).length === 0) return;
    
    setIsAnalyzing(true);
    
    setTimeout(() => {
      const probResults = calculateProbabilities(inputData, hodographData);
      const windResults = estimateWind(inputData);
      const riskLevel = calculateRiskLevel(inputData);
      
      setResults({
        ...probResults,
        riskLevel
      });
      setWindEstimate(windResults);
      setIsAnalyzing(false);
    }, 100);
  }, [inputData, hodographData]);

  const handleReset = useCallback(() => {
    setInputData({});
    setResults(null);
    setWindEstimate(null);
    setHodographData(null);
  }, []);

  const handleInputChange = useCallback((newData) => {
    setInputData(prev => ({ ...prev, ...newData }));
  }, []);

  const handleHodographAnalyzed = useCallback((data) => {
    setHodographData(data);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3 mr-6">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-white font-semibold text-sm hidden sm:block">Forecaster</span>
            </div>
            
            {/* Navigation Pills */}
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-full p-1">
              <button
                onClick={() => scrollToSection('input-section')}
                className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white 
                           hover:bg-slate-700/50 rounded-full transition-all duration-200"
              >
                Input
              </button>
              <button
                onClick={() => scrollToSection('hodograph-section')}
                className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white 
                           hover:bg-slate-700/50 rounded-full transition-all duration-200"
              >
                Hodograph
              </button>
              <button
                onClick={() => scrollToSection('thermodynamics-section')}
                className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white 
                           hover:bg-slate-700/50 rounded-full transition-all duration-200"
              >
                Thermodynamics
              </button>
              {results && (
                <button
                  onClick={() => scrollToSection('morphology-section')}
                  className="px-4 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10
                             hover:bg-cyan-500/20 rounded-full transition-all duration-200"
                >
                  Morphology
                </button>
              )}
            </div>
            
            {/* Save Button */}
            {results && (
              <button
                onClick={handleSaveAsPng}
                disabled={isSaving}
                className="ml-4 flex items-center gap-2 px-4 py-1.5 text-xs font-semibold
                           bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
                           hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-300
                           rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export PNG
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>
      
      <main className="relative max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header />
        
        {/* Row 1: Inputs + Hodograph */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <div id="input-section" className="scroll-mt-20">
            <InputForm 
              data={inputData} 
              onChange={handleInputChange}
            />
          </div>
          <div id="hodograph-section" className="scroll-mt-20">
            <HodographAnalyzer 
              onAnalyzed={handleHodographAnalyzed}
            />
          </div>
        </section>

        {/* Row 2: Analyze Button */}
        <section className="flex justify-center gap-4 mb-8">
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || Object.keys(inputData).length === 0}
            className="group relative px-12 py-4 bg-cyan-600 
                       rounded-xl font-bold text-white text-lg
                       shadow-lg shadow-cyan-600/20 
                       hover:bg-cyan-500 hover:shadow-xl hover:scale-[1.02]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                       transition-all duration-300 ease-out
                       overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Analyze
                </>
              )}
            </span>

          </button>
          <button 
            onClick={handleReset}
            className="px-8 py-4 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50
                       rounded-xl font-semibold text-slate-300
                       hover:bg-slate-700/80 hover:border-slate-600/50 hover:text-white
                       transition-all duration-200"
          >
            Reset
          </button>
        </section>

        {/* Capture area for PNG export */}
        <div ref={captureRef} className="bg-slate-950">
          {/* Row 3: Thermodynamics */}
          <section id="thermodynamics-section" className="mb-8 scroll-mt-20">
            <ThermodynamicsPanel 
              data={inputData} 
              windEstimate={windEstimate}
              hodographData={hodographData}
            />
          </section>

          {/* Row 4: Morphology + Tornado Characteristics + Weather Conditions */}
          {results && (
            <>
              <section id="morphology-section" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-4 scroll-mt-20">
                <ProbabilityChart 
                  types={results.types}
                />
                <TornadoCharacteristics 
                  factors={results.factors}
                />
                <WeatherConditions 
                  factors={results.factors}
                />
              </section>
              <p className="text-xs text-slate-500 text-center mb-8 pb-4">
                Hover over each card to see the descriptions
              </p>
            </>
          )}
        </div>

        {/* Data Gathering Link */}
        <section className="mb-8">
          <a 
            href="/data-gathering"
            className="group block w-full text-center py-5 px-6 
                       bg-emerald-500/10
                       border border-emerald-500/20 rounded-2xl
                       hover:bg-emerald-500/20
                       hover:border-emerald-500/40 
                       transition-all duration-300 hover:-translate-y-1"
          >
            <span className="text-emerald-400 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Tornado Data Gathering
            </span>
            <span className="block text-slate-500 text-xs mt-1.5 group-hover:text-slate-400 transition-colors">
              Record observations for ML Model Training
            </span>
          </a>
        </section>

        <Footer />
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/data-gathering" element={<DataGathering />} />
      </Routes>
    </Router>
  );
}

export default App;
