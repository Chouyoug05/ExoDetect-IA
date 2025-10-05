const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-8 p-8">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin glow-primary" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-4 border-primary-glow/30 border-b-primary-glow rounded-full animate-spin" 
               style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary/20 rounded-full animate-pulse glow-primary" />
        </div>
        
        <div className="text-center space-y-3 glass-card px-8 py-6 rounded-2xl animate-in fade-in zoom-in duration-500">
          <h3 className="text-2xl font-bold text-foreground">
            Analyse en cours
          </h3>
          <p className="text-base text-muted-foreground">
            Le modèle d'IA analyse les données astronomiques en profondeur...
          </p>
        </div>
        
        <div className="flex gap-3">
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse glow-primary" style={{ animationDelay: '0s' }} />
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse glow-primary" style={{ animationDelay: '0.2s' }} />
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse glow-primary" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
