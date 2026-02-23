export default function Header() {
  return (
    <header className="mb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-cyan-400
                         tracking-tight">
            Twisted Tornado Forecaster
          </h1>
          <p className="mt-2 text-slate-400 text-sm sm:text-base">
            Enter parameters and analyze tornado morphology probability
          </p>
        </div>
        
        <div className="hidden sm:flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-cyan-400 text-xs font-semibold">v2.0</span>
          </div>
        </div>
      </div>
      
      {/* Decorative line */}
      <div className="mt-6 h-px bg-slate-700/50"></div>
    </header>
  );
}
