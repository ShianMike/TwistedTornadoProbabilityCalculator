export default function Footer() {
  return (
    <footer className="mt-12 pt-8 border-t border-slate-800/50">
      {/* Disclaimer */}
      <div className="mb-6 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-amber-400">Disclaimer:</strong> This is a game/simulation tool for 
              Twisted from Roblox. The ML model was trained on a <strong className="text-slate-300">limited 
              dataset of ~48 events</strong>, primarily high-end scenarios, which may skew predictions. 
              Predictions should be treated as <strong className="text-slate-300">rough entertainment 
              estimates</strong>, not accurate forecasts.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <p className="text-xs text-slate-600 text-center mb-6">
        <strong className="text-slate-500">Privacy:</strong> This application runs entirely in your browser. 
        No personal data is collected. Hodograph images are sent to the server for AI analysis only.
      </p>

      {/* Credits */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          Created by <span className="text-cyan-400 font-medium">seanmike</span>
        </p>
        
        <div className="flex items-center gap-4">
          <a 
            href="/data-gathering" 
            className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
          >
            Data Gathering
          </a>
          <span className="text-slate-700">•</span>
          <span className="text-xs text-slate-600">v2.0 React</span>
        </div>
      </div>

      {/* Decorative line */}
      <div className="mt-8 h-px bg-slate-700/50"></div>
    </footer>
  );
}
