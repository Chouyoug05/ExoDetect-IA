import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import Exoplanet3DView from '@/components/Exoplanet3DView';

type HabitItem = {
  name: string;
  temp_eq: number | null;
  radius: number | null;
  zone_habitable: boolean;
  habitability_score: number;
  gravity_m_s2?: number | null;
  luminosity_w_m2?: number | null;
  esi?: number | null;
  star_class?: string | null;
  distance_pc?: number | null;
  distance_ly?: number | null;
  summary?: string | null;
};

const Advanced = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [planets, setPlanets] = useState<HabitItem[] | null>(() => {
    const fromState = location?.state?.planets as HabitItem[] | undefined;
    if (fromState && fromState.length) return fromState;
    try {
      const cached = localStorage.getItem('exodetect_habitability_last');
      return cached ? (JSON.parse(cached) as HabitItem[]) : null;
    } catch {
      return null;
    }
  });
  const [showOnlyHab, setShowOnlyHab] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);
  const [explPlanet, setExplPlanet] = useState<HabitItem | null>(null);

  if (!planets || planets.length === 0) {
    return (
      <div className="min-h-screen container mx-auto px-6 py-12">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Analyse avancée</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  try {
                    const cached = localStorage.getItem('exodetect_habitability_last');
                    const parsed = cached ? (JSON.parse(cached) as HabitItem[]) : null;
                    if (parsed && parsed.length) {
                      setPlanets(parsed);
                      toast.success('Données rechargées');
                    } else {
                      toast.error('Aucune donnée sauvegardée');
                    }
                  } catch (e) {
                    toast.error('Impossible de recharger les données');
                  }
                }}
              >
                Recharger les dernières données
              </Button>
              <Button onClick={() => navigate('/dashboard')}>Retour au tableau de bord</Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Aucune donnée trouvée. Lancez d'abord une analyse depuis le tableau de bord.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = useMemo(() => (showOnlyHab ? planets.filter(p => p.zone_habitable && p.habitability_score > 0.5) : planets), [planets, showOnlyHab]);
  const sorted = useMemo(() => [...filtered].sort((a,b) => (sortDesc ? (b.habitability_score - a.habitability_score) : (a.habitability_score - b.habitability_score))), [filtered, sortDesc]);
  const chartData = useMemo(() => sorted.slice(0, 20).map(p => ({ name: p.name || '—', score: p.habitability_score || 0 })), [sorted]);

  const total = planets.length;
  const ok = planets.filter(p => p.habitability_score > 0.5 && p.zone_habitable).length;

  return (
    <div className="min-h-screen container mx-auto px-6 py-12 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analyse avancée</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => {
            try {
              const cached = localStorage.getItem('exodetect_habitability_last');
              const parsed = cached ? (JSON.parse(cached) as HabitItem[]) : null;
              if (parsed && parsed.length) {
                setPlanets(parsed);
                toast.success('Données rechargées');
              } else {
                toast.error('Aucune donnée sauvegardée');
              }
            } catch (e) {
              toast.error('Impossible de recharger les données');
            }
          }}>Recharger les dernières données</Button>
          <Button variant={showOnlyHab ? 'default' : 'secondary'} onClick={() => setShowOnlyHab(v => !v)}>
            {showOnlyHab ? 'Tout afficher' : 'Filtrer: habitables'}
          </Button>
          <Button variant="secondary" onClick={() => setSortDesc(v => !v)}>
            Tri: score {sortDesc ? '↓' : '↑'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>Retour au tableau de bord</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparaison des scores (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[600px] h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" hide />
                  <YAxis domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
                  <Tooltip formatter={(v: number) => v.toFixed(2)} />
                  <Bar dataKey="score" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visualisation 3D</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-muted-foreground glass-card p-3 rounded-lg">
            <div className="font-medium text-foreground">Légende</div>
            <div>Couleur des planètes: rouge (score faible) → orange → vert (score élevé)</div>
            <div>Anneau: orbite simulée • Survol: tooltip • Clic: panneau de détails</div>
            <div>Caméra: clic-droit pour pivoter • molette pour zoomer</div>
          </div>
          <Exoplanet3DView planets={sorted.slice(0, 15)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sur {total} exoplanètes analysées, {ok} sont potentiellement habitables selon le modèle d'habitabilité simplifié.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tableau des paramètres</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh]">
            <div className="min-w-[1200px]">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Nom</th>
                    <th className="text-left py-2">Classe étoile</th>
                    <th className="text-left py-2">Distance (al)</th>
                    <th className="text-left py-2">Rayon (Terre)</th>
                    <th className="text-left py-2">Gravité (m/s²)</th>
                    <th className="text-left py-2">Temp. eq (K)</th>
                    <th className="text-left py-2">Insolation (W/m²)</th>
                    <th className="text-left py-2">ESI</th>
                    <th className="text-left py-2">Zone habitable</th>
                    <th className="text-left py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, idx) => {
                    const score = typeof p.habitability_score === 'number' ? p.habitability_score : 0;
                    return (
                      <tr key={idx} className="border-t border-border">
                        <td className="py-2">{p.name || 'Non disponible'}</td>
                        <td className="py-2">{p.star_class || 'Non disponible'}</td>
                        <td className="py-2">{p.distance_ly != null ? p.distance_ly.toFixed(1) : 'Non disponible'}</td>
                        <td className="py-2">{p.radius != null ? p.radius.toFixed(2) : 'Non disponible'}</td>
                        <td className="py-2">{p.gravity_m_s2 != null ? p.gravity_m_s2.toFixed(2) : 'Non disponible'}</td>
                        <td className="py-2">{p.temp_eq != null ? p.temp_eq.toFixed(1) : 'Non disponible'}</td>
                        <td className="py-2">{p.luminosity_w_m2 != null ? p.luminosity_w_m2.toExponential(2) : 'Non disponible'}</td>
                        <td className="py-2">{p.esi != null ? p.esi.toFixed(2) : 'Non disponible'}</td>
                        <td className="py-2">{p.zone_habitable ? 'Oui' : 'Non'}</td>
                        <td className="py-2">
                          <Badge variant="secondary">{score.toFixed(2)}</Badge>
                          <div>
                            <Button size="sm" variant="ghost" onClick={() => setExplPlanet(p)}>Explication</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Explications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sorted.slice(0, 20).map((p, idx) => (
            <div key={`exp-${idx}`} className="space-y-1">
              <div className="font-medium">{p.name || '—'}</div>
              <div className="text-sm text-muted-foreground">{p.summary || "Explication non disponible."}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Glossaire</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div>
            <span className="text-foreground font-medium">ESI (Earth Similarity Index): </span>
            Indice simplifié (0–1) mesurant la similarité d’une planète avec la Terre sur plusieurs paramètres (rayon, gravité, température).
          </div>
          <div>
            <span className="text-foreground font-medium">Zone habitable: </span>
            Région autour d’une étoile où l’eau liquide peut exister à la surface d’une planète.
          </div>
          <div>
            <span className="text-foreground font-medium">Température d’équilibre: </span>
            Température théorique d’une planète sans atmosphère, équilibrant l’énergie reçue et émise.
          </div>
          <div>
            <span className="text-foreground font-medium">Insolation: </span>
            Puissance surfacique reçue de l’étoile (W/m²) au niveau de l’orbite.
          </div>
          <div>
            <span className="text-foreground font-medium">Classe stellaire: </span>
            Classification de l’étoile par température effective (O, B, A, F, G, K, M).
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!explPlanet} onOpenChange={(open) => !open && setExplPlanet(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Explication — {explPlanet?.name || '—'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>{explPlanet?.summary || 'Explication non disponible.'}</div>
            <Separator />
            <div>Classe stellaire: <span className="text-foreground">{explPlanet?.star_class ?? 'Non disponible'}</span></div>
            <div>Distance: <span className="text-foreground">{explPlanet?.distance_ly != null ? `${explPlanet.distance_ly.toFixed(1)} al` : 'Non disponible'}</span></div>
            <div>ESI: <span className="text-foreground">{explPlanet?.esi != null ? explPlanet.esi.toFixed(2) : 'Non disponible'}</span></div>
            <div>Insolation: <span className="text-foreground">{explPlanet?.luminosity_w_m2 != null ? explPlanet.luminosity_w_m2.toExponential(2) : 'Non disponible'}</span></div>
            <div>Gravité: <span className="text-foreground">{explPlanet?.gravity_m_s2 != null ? `${explPlanet.gravity_m_s2.toFixed(2)} m/s²` : 'Non disponible'}</span></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Advanced;


