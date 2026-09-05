import React, { useState, useEffect } from 'react';
import { 
  X, 
  CloudSun, 
  Target, 
  Database, 
  ShieldCheck, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Key, 
  Cpu, 
  Layers, 
  Zap
} from 'lucide-react';
import { IntegrationsStatus } from '../types';

interface IntegrationsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationsHubModal: React.FC<IntegrationsHubModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sports/integrations-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch integrations status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modules = [
    {
      id: 'open_meteo',
      name: 'Open-Meteo Weather API',
      badge: '100% Gratuit & Illimité',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      status: status?.openMeteo ? 'Actif & Connecté' : 'Actif',
      statusColor: 'text-emerald-400',
      icon: <CloudSun className="w-5 h-5 text-amber-400" />,
      description: 'Récupère les conditions météorologiques précises des stades en direct (Température, Vitesse du vent en km/h, Précipitations, Pression).',
      impact: 'Ajuste les modèles Over/Under et le rebond de balle (notamment Football et Baseball).',
      keyNeeded: 'Aucune clé requise (Accès ouvert)',
      linkText: 'open-meteo.com',
      linkUrl: 'https://open-meteo.com/',
      envVarName: null,
    },
    {
      id: 'the_odds_api',
      name: 'The Odds API (Sharp Benchmark)',
      badge: '500 requêtes/mois gratuites',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      status: status?.theOddsApi.status === 'connected' ? 'Connecté (Live Keys)' : 'Mode Analytique Simulé',
      statusColor: status?.theOddsApi.status === 'connected' ? 'text-emerald-400' : 'text-amber-400',
      icon: <Target className="w-5 h-5 text-blue-400" />,
      description: 'Fournit les cotes des bookmakers Sharp de référence mondiale (Pinnacle Sports, Betfair Exchange) pour comparer aux cotes Stake.com.',
      impact: 'Calcule l\'écart exact de Closing Line Value (CLV) et identifie si la cote Stake offre un avantage statistique réel (+EV).',
      keyNeeded: 'Clé d\'API gratuite The Odds API',
      linkText: 'the-odds-api.com (Gratuit)',
      linkUrl: 'https://the-odds-api.com/',
      envVarName: 'THE_ODDS_API_KEY',
    },
    {
      id: 'football_data',
      name: 'Football-Data.org API',
      badge: 'Tier Développeur Gratuit',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      status: status?.footballData.status === 'connected' ? 'Connecté (Live Keys)' : 'Mode Analytique Simulé',
      statusColor: status?.footballData.status === 'connected' ? 'text-emerald-400' : 'text-amber-400',
      icon: <Database className="w-5 h-5 text-indigo-400" />,
      description: 'Base de données des 12 ligues majeures (Premier League, La Liga, Ligue 1, Serie A, Champions League, etc.).',
      impact: 'Alimente les séries de forme récentes (5 derniers matchs), les face-à-face (H2H) et les classements xPoints.',
      keyNeeded: 'Token d\'API gratuit Football-Data',
      linkText: 'football-data.org',
      linkUrl: 'https://www.football-data.org/client/register',
      envVarName: 'FOOTBALL_DATA_API_KEY',
    },
    {
      id: 'api_sports',
      name: 'API-Sports.io (Direct Live Feed v3)',
      badge: '100 requêtes/jour gratuites',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      status: status?.apiSports?.status === 'connected' ? 'Connecté (Live Matchs)' : 'Clé Configurable dans l\'application',
      statusColor: status?.apiSports?.status === 'connected' ? 'text-emerald-400' : 'text-cyan-400',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      description: 'API officielle en direct de api-sports.io couvrant Football, Basketball, Tennis, MMA, Baseball, Hockey et Rugby en direct.',
      impact: 'Alimente instantanément le composant SportsAnalysis en rencontres réelles, scores en direct, chronomètres et cotes sans simulation.',
      keyNeeded: 'Clé api-sports.io (x-apisports-key)',
      linkText: 'api-sports.io / dashboard.api-football.com',
      linkUrl: 'https://dashboard.api-football.com/register',
      envVarName: 'API_SPORTS_KEY',
    },
    {
      id: 'rapid_api',
      name: 'API-Football (RapidAPI)',
      badge: '100 requêtes/jour gratuites',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      status: status?.rapidApiFootball.status === 'connected' ? 'Connecté (Live Keys)' : 'Mode Analytique Simulé',
      statusColor: status?.rapidApiFootball.status === 'connected' ? 'text-emerald-400' : 'text-amber-400',
      icon: <Cpu className="w-5 h-5 text-purple-400" />,
      description: 'API spécialisée dans les compositions officielles d\'équipes, les forfaits de dernière minute et les arbitres.',
      impact: 'Mesure l\'impact WAR (Wins Above Replacement) des joueurs blessés et le profil disciplinaire de l\'arbitre.',
      keyNeeded: 'Clé RapidAPI (App ID)',
      linkText: 'rapidapi.com/api-sports/api-football',
      linkUrl: 'https://rapidapi.com/api-sports/api/api-football',
      envVarName: 'RAPIDAPI_KEY',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Hub des Modules & APIs Sportives</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  v2.5 Hybride
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Architecture de précision quantique combinant Stake.com et des sources de données externes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          
          {/* Info Card */}
          <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>Comment fonctionnent ces modules gratuits ?</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              L'application fonctionne <strong>instantanément sans configuration</strong> grâce à son moteur quantique déterministe et à <strong>Open-Meteo</strong> (qui ne nécessite aucune clé).
              Pour injecter des données live de Pinnacle, Betfair ou des compositions de ligues, ajoutez simplement vos clés gratuites dans les paramètres ou le fichier d'environnement.
            </p>
          </div>

          {/* Modules List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>Modules & Connecteurs Disponibles</span>
              <button 
                onClick={fetchStatus}
                disabled={isLoading}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold lowercase"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>actualiser</span>
              </button>
            </div>

            {modules.map((mod) => (
              <div 
                key={mod.id}
                className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 space-y-3 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      {mod.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">{mod.name}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${mod.badgeColor}`}>
                          {mod.badge}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                        <span className="text-slate-400">Statut :</span>
                        <span className={`font-semibold ${mod.statusColor}`}>● {mod.status}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={mod.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold px-2.5 py-1 rounded-lg bg-blue-950/40 border border-blue-800/40 hover:bg-blue-900/50 transition flex-shrink-0"
                  >
                    <span>Obtenir la clé</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {mod.description}
                </p>

                <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Apport quantitatif : {mod.impact}</span>
                  </div>
                  {mod.envVarName && (
                    <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] pt-1">
                      <Key className="w-3 h-3 text-slate-500" />
                      <span>Variable d'environnement : <strong className="text-slate-200">{mod.envVarName}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Guide Summary */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Résumé des clés à fournir (Optionnelles mais recommandées)</span>
            </h4>
            <div className="space-y-1 font-mono text-[11px] text-slate-300">
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-emerald-400 font-bold">1. Open-Meteo :</span> Déjà opérationnel sans aucune clé (Météo stades en direct)
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-blue-400 font-bold">2. The Odds API :</span> Créez un compte gratuit sur the-odds-api.com → <code className="text-amber-300">THE_ODDS_API_KEY</code>
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-indigo-400 font-bold">3. Football-Data :</span> Inscription gratuite sur football-data.org → <code className="text-amber-300">FOOTBALL_DATA_API_KEY</code>
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-purple-400 font-bold">4. API-Football :</span> Abonnement gratuit sur RapidAPI → <code className="text-amber-300">RAPIDAPI_KEY</code>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Toutes les clés gratuites sont automatiquement détectées par le backend.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
