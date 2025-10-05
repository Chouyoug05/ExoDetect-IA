import { useState } from 'react';
import axios from 'axios';
import { apiUrl } from '@/lib/utils';
import { Telescope, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import FileUpload from '@/components/FileUpload';
import ResultCard from '@/components/ResultCard';
import LightCurveChart from '@/components/LightCurveChart';
import LoadingSpinner from '@/components/LoadingSpinner';
import UserMenu from '@/components/UserMenu';
import HowToDialog from '@/components/HowToDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Exoplanet3DView from '@/components/Exoplanet3DView';
interface AnalysisResult {
  status: string;
  confidence: number;
}
interface ChartData {
  time: number[];
  flux: number[];
}
const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [preprocInfo, setPreprocInfo] = useState<Record<string, any> | null>(null);
  const [habitability, setHabitability] = useState<
    {
      name: string;
      temp_eq: number | null;
      radius: number | null;
      zone_habitable: boolean;
      habitability_score: number;
      gravity_m_s2?: number | null;
      luminosity_w_m2?: number | null;
      summary?: string | null;
    }[] | null
  >(null);
  const [isHabitDialogOpen, setIsHabitDialogOpen] = useState(false);
  const [is3dDialogOpen, setIs3dDialogOpen] = useState(false);
  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setResult(null);
    setChartData(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      // Ne pas fixer manuellement Content-Type: axios ajoute le boundary automatiquement
      let endpoint = '/predict';
      let response = await axios.post(apiUrl(endpoint), formData);
      const { result: analysisResult, chart, model, preprocessing } = response.data;
      setResult(analysisResult);
      if (chart && chart.time && chart.flux) {
        setChartData(chart);
      }
      if (model) setModelUsed(model);
      if (preprocessing) setPreprocInfo(preprocessing);
      try {
        const h = await axios.post(apiUrl('/habitability'), formData);
        const planets = h.data?.planets || [];
        setHabitability(planets);
        try {
          localStorage.setItem('exodetect_habitability_last', JSON.stringify(planets));
        } catch {}
        if (planets.length === 0) {
          toast.error("Aucune donnée d'habitabilité disponible");
        }
      } catch (e) {
        toast.error("Échec du calcul d'habitabilité");
      }
      toast.success(`Analyse terminée avec succès (${endpoint})`);
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_NETWORK') {
          toast.error('Impossible de se connecter au serveur. Vérifiez que l\'API backend est démarrée sur http://localhost:8000');
        } else if (error.response) {
          const status = error.response.status;
          const detail = (error.response.data && (error.response.data.detail || error.response.data.message)) || '';
          if (status === 400) {
            try {
              // Fallback pour formats K2/NEA
              let endpoint = '/predict-k2';
              const resp2 = await axios.post(apiUrl(endpoint), formData);
              const { result: analysisResult, chart, model, preprocessing } = resp2.data;
              setResult(analysisResult);
              if (chart && chart.time && chart.flux) {
                setChartData(chart);
              }
              if (model) setModelUsed(model);
              if (preprocessing) setPreprocInfo(preprocessing);
              try {
                const h = await axios.post(apiUrl('/habitability'), formData);
                const planets = h.data?.planets || [];
                setHabitability(planets);
                try {
                  localStorage.setItem('exodetect_habitability_last', JSON.stringify(planets));
                } catch {}
                if (planets.length === 0) {
                  toast.error("Aucune donnée d'habitabilité disponible");
                }
              } catch (e) {
                toast.error("Échec du calcul d'habitabilité");
              }
              toast.success(`Analyse terminée avec succès (${endpoint})`);
              return;
            } catch (err2) {
              if (axios.isAxiosError(err2) && err2.response) {
                const d2 = (err2.response.data && (err2.response.data.detail || err2.response.data.message)) || '';
                toast.error(`Erreur serveur : ${err2.response.status}${d2 ? ' - ' + d2 : ''}`);
              } else {
                toast.error('Erreur serveur lors du fallback /predict-k2');
              }
            }
          } else {
            toast.error(`Erreur serveur : ${status}${detail ? ' - ' + detail : ''}`);
          }
        } else {
          toast.error('Erreur réseau lors de l\'envoi du fichier');
        }
      } else {
        toast.error('Une erreur inattendue s\'est produite');
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleReset = () => {
    setResult(null);
    setChartData(null);
    setModelUsed(null);
    setPreprocInfo(null);
    setHabitability(null);
    setIsHabitDialogOpen(false);
  };
  const handlePing = async () => {
    try {
      const response = await axios.get(apiUrl('/health'), { timeout: 4000 });
      if (response.status === 200 && response.data?.status === 'ok') {
        toast.success('API backend disponible');
      } else {
        toast.error('Réponse inattendue du backend');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_NETWORK') {
          toast.error("Backend injoignable sur http://localhost:8000");
        } else if (error.response) {
          toast.error(`Erreur backend: ${error.response.status}`);
        } else {
          toast.error('Erreur lors du test de l\'API');
        }
      } else {
        toast.error('Erreur inattendue lors du test de l\'API');
      }
    }
  };
  return <div className="min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 border-b glass-border">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-primary/10 glow-primary">
                <Telescope className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  ExoDetect AI
                </h1>
                <p className="text-sm text-muted-foreground">
                  Détection d'exoplanètes par IA avancée
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={handlePing}>
                Tester API
              </Button>
              <HowToDialog />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-16 relative z-10">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Introduction */}
          {!result && !isLoading && <>
              <div className="text-center space-y-6 animate-in fade-in duration-700">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 glass-card rounded-full glow-primary">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  <span className="text-sm font-semibold text-primary tracking-wide">
                    Intelligence Artificielle de Pointe
                  </span>
                </div>
                
                <h2 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
                  Découvrez de<br />
                  <span className="bg-gradient-primary bg-clip-text text-transparent">
                    nouveaux mondes
                  </span>
                </h2>
                
                <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Analysez les données d'observations spatiales des missions <span className="text-foreground font-medium">Kepler</span>, <span className="text-foreground font-medium">K2</span> et <span className="text-foreground font-medium">TESS</span>.<br />
                  Notre modèle d'IA détecte automatiquement la présence d'exoplanètes à partir des courbes de lumière stellaire.
                </p>
              </div>
            </>}

          {/* File Upload */}
          {!result && !isLoading && <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />}

          {/* Loading State */}
          {isLoading && <LoadingSpinner />}

          {/* Results */}
          {result && !isLoading && <div className="space-y-8 animate-in fade-in duration-500">
              <ResultCard status={result.status} confidence={result.confidence} />
              
              {chartData && <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <LightCurveChart time={chartData.time} flux={chartData.flux} />
                </div>}

              {/* AI Explanation Section */}
              <div className="glass-card p-6 rounded-2xl space-y-3">
                <h3 className="text-xl font-bold text-foreground">Explication de l'IA</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Modèle utilisé: <span className="text-foreground font-medium">{modelUsed === 'kepler' ? 'Kepler' : modelUsed === 'k2' ? 'K2' : 'Heuristique'}</span>
                  </p>
                  <p>
                    Caractéristiques analysées: <span className="text-foreground font-medium">
                      {modelUsed === 'k2' ? 'koi_period, koi_prad' : modelUsed === 'kepler' ? 'koi_period, koi_duration, koi_depth, koi_prad' : 'courbe de lumière (variance du flux)'}
                    </span>
                  </p>
                  <p>
                    Raison du verdict: l'algorithme a évalué la probabilité moyenne des classes sur les lignes valides et a retenu la classe
                    <span className="text-foreground font-medium"> {result.status}</span> avec un niveau de confiance de
                    <span className="text-foreground font-medium"> {(result.confidence * 100).toFixed(1)}%</span>.
                  </p>
                  {preprocInfo && (
                    <p>
                      Prétraitement: {preprocInfo.rows_in ?? '-'} lignes lues, {preprocInfo.rows_out ?? '-'} utilisées, {preprocInfo.dropped_rows ?? '-'} ignorées
                      {preprocInfo.note ? ` (${preprocInfo.note})` : ''}.
                    </p>
                  )}
                  <p>
                    Remarque: les valeurs d'entrée sont normalisées (clipping aux quantiles appris) avant la prédiction afin de stabiliser l'inférence.
                  </p>
                </div>
              </div>

              {/* Habitability as Dialog trigger */}
              {habitability && habitability.length > 0 && (
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setIsHabitDialogOpen(true)}>
                    Voir l'habitabilité
                  </Button>
                  <Button onClick={() => setIs3dDialogOpen(true)}>
                    Visualiser en 3D
                  </Button>
                  <Button onClick={() => navigate('/advanced', { state: { planets: habitability } })}>
                    Analyse avancée
                  </Button>
                </div>
              )}

              <Dialog open={isHabitDialogOpen} onOpenChange={setIsHabitDialogOpen}>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Habitabilité des exoplanètes</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[60vh] pr-2">
                    {habitability && (
                      <div className="space-y-4">
                        <div className="overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="text-muted-foreground">
                              <tr>
                                <th className="text-left py-2">Nom</th>
                                <th className="text-left py-2">Temp. d'équilibre (K)</th>
                                <th className="text-left py-2">Rayon (Terre)</th>
                                <th className="text-left py-2">Gravité (m/s²)</th>
                                <th className="text-left py-2">Luminosité (W/m²)</th>
                                <th className="text-left py-2">Zone habitable</th>
                                <th className="text-left py-2">Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {habitability.map((p, idx) => {
                                const score = typeof p.habitability_score === 'number' ? p.habitability_score : 0;
                                const color = score > 0.8 ? 'bg-green-500' : score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';
                                return (
                                  <tr key={idx} className="border-t border-border">
                                    <td className="py-2">{p.name || 'Non disponible'}</td>
                                    <td className="py-2">{p.temp_eq != null ? p.temp_eq.toFixed(1) : 'Non disponible'}</td>
                                    <td className="py-2">{p.radius != null ? p.radius.toFixed(2) : 'Non disponible'}</td>
                                    <td className="py-2">{p.gravity_m_s2 != null ? p.gravity_m_s2.toFixed(2) : 'Non disponible'}</td>
                                    <td className="py-2">{p.luminosity_w_m2 != null ? p.luminosity_w_m2.toExponential(2) : 'Non disponible'}</td>
                                    <td className="py-2">{p.zone_habitable ? 'Oui' : 'Non'}</td>
                                    <td className="py-2 w-64">
                                      <div className="w-full h-2 rounded-full bg-secondary">
                                        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, score * 100))}%` }} />
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">{score.toFixed(2)}</div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {/* Synthèse automatique */}
                        <div className="space-y-2">
                          {habitability.map((p, idx) => (
                            <div key={`s-${idx}`} className="text-sm text-muted-foreground">
                              {p.summary || ''}
                            </div>
                          ))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(() => {
                            const total = habitability.length;
                            const ok = habitability.filter(p => p.habitability_score > 0.5 && p.zone_habitable).length;
                            return `Sur ${total} exoplanètes analysées, ${ok} sont potentiellement habitables selon le modèle d'habitabilité simplifié.`;
                          })()}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <Dialog open={is3dDialogOpen} onOpenChange={setIs3dDialogOpen}>
                <DialogContent className="max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>Visualisation 3D des exoplanètes</DialogTitle>
                  </DialogHeader>
                  {habitability && <Exoplanet3DView planets={habitability.slice(0, 20)} />}
                </DialogContent>
              </Dialog>

              <div className="flex justify-center pt-8">
                <button onClick={handleReset} className="group px-8 py-4 rounded-xl glass-card glass-border text-foreground font-semibold hover:bg-primary/10 hover:border-primary/50 transition-all duration-500 hover:scale-105 hover:glow-primary">
                  <span className="flex items-center gap-2">
                    Analyser un autre fichier
                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                  </span>
                </button>
              </div>
            </div>}
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-card border-t glass-border mt-auto relative z-10">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Données issues des missions spatiales <span className="text-foreground font-medium">Kepler</span>, <span className="text-foreground font-medium">K2</span> et <span className="text-foreground font-medium">TESS</span>
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Système opérationnel</span>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;