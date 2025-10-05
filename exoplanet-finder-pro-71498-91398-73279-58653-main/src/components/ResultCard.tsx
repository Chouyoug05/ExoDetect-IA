import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ResultCardProps {
  status: string;
  confidence: number;
}

const ResultCard = ({ status, confidence }: ResultCardProps) => {
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'exoplanète':
        return {
          icon: CheckCircle,
          iconBg: 'bg-success/10',
          iconColor: 'text-success',
          progressColor: 'bg-gradient-to-r from-success to-success',
          message: "Une exoplanète a été détectée avec un haut niveau de confiance. Les données de transit suggèrent la présence d'un corps planétaire."
        };
      case 'candidat':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-warning/10',
          iconColor: 'text-warning',
          progressColor: 'bg-gradient-to-r from-warning to-warning',
          message: "Un candidat potentiel a été identifié. Des analyses supplémentaires sont recommandées pour confirmer la détection."
        };
      case 'faux positif':
        return {
          icon: XCircle,
          iconBg: 'bg-destructive/10',
          iconColor: 'text-destructive',
          progressColor: 'bg-gradient-to-r from-destructive to-destructive',
          message: "Aucune exoplanète n'a été détectée. Le signal observé est probablement causé par un autre phénomène astronomique."
        };
      default:
        return {
          icon: AlertTriangle,
          iconBg: 'bg-muted/10',
          iconColor: 'text-muted-foreground',
          progressColor: 'bg-gradient-to-r from-muted to-muted',
          message: "Résultat de l'analyse."
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`
      w-full max-w-4xl mx-auto p-10 rounded-3xl glass-card glass-border
      ${status === 'Exoplanète' ? 'glow-success' : ''}
      ${status === 'Candidat' ? 'glow-warning' : ''}
      animate-in fade-in zoom-in duration-700
    `}>
      <div className="flex flex-col md:flex-row items-start gap-8">
        <div className={`
          p-6 rounded-2xl ${config.iconBg} transition-all duration-500
          ${status === 'Exoplanète' ? 'glow-success animate-pulse' : ''}
          ${status === 'Candidat' ? 'glow-warning' : ''}
        `}>
          <config.icon className={`w-12 h-12 ${config.iconColor}`} />
        </div>
        
        <div className="flex-1 space-y-6">
          <div>
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Résultat : <span className={config.iconColor}>{status}</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Niveau de confiance</span>
                <span className="text-xl font-bold text-foreground">
                  {(confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="relative h-4 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className={`h-full ${config.progressColor} transition-all duration-1500 ease-out relative`}
                  style={{ width: `${confidence * 100}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-base text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-4">
            {config.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
