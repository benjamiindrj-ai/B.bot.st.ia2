import React, { useState, useEffect, useCallback } from 'react';
import {
  Terminal,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Zap,
  Globe,
  Database,
  Cpu,
  Copy,
  Check,
  Download,
  Trash2,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Code2,
  FileJson,
  Radio,
  SlidersHorizontal,
  Flame,
  Info
} from 'lucide-react';
import { SportsDiagnosticReport, DiagnosticLogEntry, OddsAnomalyDetail } from '../types';
import { formatParisTime } from '../utils/parisTime';

interface SportsDiagnosticPanelProps {
  currentBalance?: number;
  currency?: string;
  onClose?: () => void;
}

export const SportsDiagnosticPanel: React.FC<SportsDiagnosticPanelProps> = ({
  currentBalance = 100,
  currency = 'USDT',
  onClose,
}) => {
  const [report, setReport] = useState<SportsDiagnosticReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTestingSync, setIsTestingSync] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stake_markets' | 'live_feed' | 'pre_match' | 'odds_audit' | 'logs'>('overview');

  // Raw data from other endpoints for deep inspection
  const [rawLiveAnalysis, setRawLiveAnalysis] = useState<any>(null);
  const [rawPreMatchAnalysis, setRawPreMatchAnalysis] = useState<any>(null);
  const [rawIntegrations, setRawIntegrations] = useState<any>(null);
  const [isLoadingDeepFeeds, setIsLoadingDeepFeeds] = useState<boolean>(false);

  // Search & Filters
  const [logFilterLevel, setLogFilterLevel] = useState<'all' | 'info' | 'success' | 'warn' | 'error'>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [jsonSearchQuery, setJsonSearchQuery] = useState<string>('');
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>('all');

  // Copy state feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Expanded log entries or fixture details
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [selectedFixtureForDeepInspection, setSelectedFixtureForDeepInspection] = useState<any | null>(null);

  const fetchDiagnosticReport = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) setIsLoading(true);
    setErrorMsg(null);

    try {
      let headers: Record<string, string> = {};
      try {
        const savedCreds = localStorage.getItem('stake_bot_api_credentials');
        if (savedCreds) {
          const creds = JSON.parse(savedCreds);
          if (creds.apiKey) headers['x-stake-api-token'] = creds.apiKey;
          if (creds.domain) headers['x-stake-domain'] = creds.domain;
        }
      } catch (e) {
        // ignore
      }

      const res = await fetch(`/api/stake/diagnostic?sport=${selectedSportFilter}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data: SportsDiagnosticReport = await res.json();
      setReport(data);
      if (data.rawEventsSample && data.rawEventsSample.length > 0 && !selectedFixtureForDeepInspection) {
        setSelectedFixtureForDeepInspection(data.rawEventsSample[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch diagnostic report:', err);
      setErrorMsg(err.message || 'Impossible de récupérer le rapport de diagnostic');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSportFilter, selectedFixtureForDeepInspection]);

  // Load all secondary feeds for complete cross-verification
  const fetchDeepFeeds = useCallback(async () => {
    setIsLoadingDeepFeeds(true);
    try {
      let headers: Record<string, string> = {};
      try {
        const savedCreds = localStorage.getItem('stake_bot_api_credentials');
        if (savedCreds) {
          const creds = JSON.parse(savedCreds);
          if (creds.apiKey) headers['x-stake-api-token'] = creds.apiKey;
          if (creds.domain) headers['x-stake-domain'] = creds.domain;
        }
      } catch (e) {}

      const [liveRes, preRes, integRes] = await Promise.allSettled([
        fetch('/api/gemini/live-sports-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ sport: selectedSportFilter, userBankroll: currentBalance, currency }),
        }),
        fetch('/api/gemini/analyze-sports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ sport: selectedSportFilter, marketType: 'all', userBankroll: currentBalance, currency }),
        }),
        fetch('/api/sports/integrations-status'),
      ]);

      if (liveRes.status === 'fulfilled' && liveRes.value.ok) {
        setRawLiveAnalysis(await liveRes.value.json());
      }
      if (preRes.status === 'fulfilled' && preRes.value.ok) {
        setRawPreMatchAnalysis(await preRes.value.json());
      }
      if (integRes.status === 'fulfilled' && integRes.value.ok) {
        setRawIntegrations(await integRes.value.json());
      }
    } catch (err) {
      console.warn('Deep feeds query notice:', err);
    } finally {
      setIsLoadingDeepFeeds(false);
    }
  }, [selectedSportFilter, currentBalance, currency]);

  useEffect(() => {
    fetchDiagnosticReport();
  }, [fetchDiagnosticReport]);

  const handleTriggerSyncTest = async () => {
    setIsTestingSync(true);
    try {
      let headers: Record<string, string> = {};
      try {
        const savedCreds = localStorage.getItem('stake_bot_api_credentials');
        if (savedCreds) {
          const creds = JSON.parse(savedCreds);
          if (creds.apiKey) headers['x-stake-api-token'] = creds.apiKey;
          if (creds.domain) headers['x-stake-domain'] = creds.domain;
        }
      } catch (e) {}

      const res = await fetch('/api/stake/test-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ sport: selectedSportFilter, testGraphql: true }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.report) {
          setReport(json.report);
        }
      }
    } catch (err: any) {
      console.error('Sync test error:', err);
    } finally {
      setIsTestingSync(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/stake/clear-logs', { method: 'POST' });
      fetchDiagnosticReport(true);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `stake-diagnostic-report-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const toggleLogExpand = (id: string) => {
    setExpandedLogIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter logs
  const filteredLogs = (report?.recentLogs || []).filter(log => {
    if (logFilterLevel !== 'all' && log.level !== logFilterLevel) return false;
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      const matchEvent = log.event.toLowerCase().includes(q);
      const matchSource = log.source.toLowerCase().includes(q);
      const matchDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(q) : false;
      return matchEvent || matchSource || matchDetails;
    }
    return true;
  });

  return (
    <div id="sports-diagnostic-panel" className="bg-slate-950 border border-blue-600/40 rounded-2xl p-5 shadow-2xl space-y-5 text-slate-200">
      
      {/* 1. Header Banner with Live Connection Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-500/50 flex items-center justify-center text-blue-400 shadow-md">
            <Terminal className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Console de Diagnostic & Flux API Bruts
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Stake.com Engine v3.7
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Inspection des réponses API, validation des cotes décimales, vérification du flux GraphQL et détection d'anomalies de synchronisation.
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-run-sync-test"
            onClick={handleTriggerSyncTest}
            disabled={isTestingSync || isLoading}
            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
            title="Tester la connexion et la conversion des cotes en direct"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingSync ? 'animate-spin' : ''}`} />
            <span>{isTestingSync ? 'Test en cours...' : 'Tester Synchro Live'}</span>
          </button>

          <button
            onClick={() => fetchDeepFeeds()}
            disabled={isLoadingDeepFeeds}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
            title="Charger les réponses JSON brutes complètes (Live + Pré-Match)"
          >
            <FileJson className={`w-3.5 h-3.5 text-amber-400 ${isLoadingDeepFeeds ? 'animate-spin' : ''}`} />
            <span>Charger Tous les Flux Bruts</span>
          </button>

          <button
            onClick={handleDownloadLogs}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            title="Télécharger le rapport de diagnostic JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export JSON</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 rounded-xl text-xs font-semibold transition"
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* 2. Real-Time Diagnostics KPI Metric Grid */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          
          {/* Endpoint Status */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Statut Connexion</span>
              {report.probeResults.connected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
            <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${report.probeResults.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span>HTTP {report.probeResults.httpStatus}</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate" title={report.environment.activeDomain}>
              {report.environment.activeDomain}
            </div>
          </div>

          {/* Latency */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Latence Réseau</span>
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xs font-bold text-cyan-300 font-mono">
              {report.probeResults.latencyMs} ms
            </div>
            <div className="text-[10px] text-slate-500">
              {report.probeResults.latencyMs < 100 ? 'Ultra-Rapide' : report.probeResults.latencyMs < 300 ? 'Optimal' : 'Standard'}
            </div>
          </div>

          {/* Mode & Source */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Source Données</span>
              <Database className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xs font-bold text-indigo-300 font-mono truncate" title={report.probeResults.sourceUsed}>
              {report.probeResults.sourceUsed === 'stake_graphql_api' ? 'GraphQL Authentifié' : 'Flux Direct Sportsbook'}
            </div>
            <div className="text-[10px] text-slate-500">
              {report.environment.hasStakeApiKey ? 'Clé Active' : 'Mode Public'}
            </div>
          </div>

          {/* Fixtures Synchronized */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Matchs Chargés</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xs font-bold text-emerald-300 font-mono">
              {report.feedSummary.totalRawEventsCount} rencontres
            </div>
            <div className="text-[10px] text-slate-500">
              🔴 {report.feedSummary.liveEventsCount} live | ⏳ {report.feedSummary.upcomingEventsCount} pré-match
            </div>
          </div>

          {/* Average Stake Margin */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Marge Bookmaker</span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xs font-bold text-amber-300 font-mono">
              {report.oddsHealthCheck.averageMarginPct}% (Stake)
            </div>
            <div className="text-[10px] text-slate-500">
              Optimal (&lt; 4.5% standard)
            </div>
          </div>

          {/* Odds Health & Anomalies */}
          <div className={`bg-slate-900/90 border rounded-xl p-3 space-y-1 ${
            report.oddsHealthCheck.anomaliesCount === 0 
              ? 'border-emerald-500/40 bg-emerald-950/10' 
              : 'border-rose-500/40 bg-rose-950/10'
          }`}>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Santé des Cotes</span>
              {report.oddsHealthCheck.anomaliesCount === 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
            <div className={`text-xs font-bold font-mono ${
              report.oddsHealthCheck.anomaliesCount === 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}>
              {report.oddsHealthCheck.anomaliesCount === 0 
                ? '100% Cohérentes' 
                : `${report.oddsHealthCheck.anomaliesCount} Anomalies`}
            </div>
            <div className="text-[10px] text-slate-400">
              {report.oddsHealthCheck.totalOutcomesAnalyzed} cotes vérifiées
            </div>
          </div>

        </div>
      )}

      {/* 3. Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Vue d'Ensemble & Environnement</span>
        </button>

        <button
          onClick={() => setActiveTab('stake_markets')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'stake_markets'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Marchés & Matchs Bruts ({report?.feedSummary.totalRawEventsCount || 0})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('live_feed');
            if (!rawLiveAnalysis) fetchDeepFeeds();
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'live_feed'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-orange-400" />
          <span>Flux Live In-Play API</span>
          {rawLiveAnalysis?.liveTips?.length ? (
            <span className="text-[10px] px-1.5 py-0.2 bg-orange-950 text-orange-200 border border-orange-500/30 rounded-full font-mono">
              {rawLiveAnalysis.liveTips.length}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => {
            setActiveTab('pre_match');
            if (!rawPreMatchAnalysis) fetchDeepFeeds();
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'pre_match'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Flux Pré-Match & Poisson Engine</span>
        </button>

        <button
          onClick={() => setActiveTab('odds_audit')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'odds_audit'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
          <span>Audit des Cotes & Marges</span>
          {report?.oddsHealthCheck.anomaliesCount ? (
            <span className="text-[10px] px-1.5 py-0.2 bg-rose-950 text-rose-200 border border-rose-500/30 rounded-full font-mono font-bold">
              {report.oddsHealthCheck.anomaliesCount}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-300" />
          <span>Journal d'Événements ({filteredLogs.length})</span>
        </button>
      </div>

      {/* 4. Tab Content Panels */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-7 h-7 text-blue-400 animate-spin" />
          <p className="text-xs font-medium">Interrogation des endpoints Stake.com & analyse des cotes en direct...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <div className="font-bold">Erreur de Diagnostic :</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & ENVIRONMENT */}
          {activeTab === 'overview' && report && (
            <div className="space-y-4">
              
              {/* API Keys & Environment Configuration */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  État des Connecteurs et Clés d'Environnement
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  
                  {/* Stake Credentials */}
                  <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">Stake.com API Token</span>
                      {report.environment.hasStakeApiKey ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-mono font-bold">
                          Configuré
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[10px] font-mono">
                          Mode Public Stake
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Clé : {report.environment.apiKeyPrefix || 'Non fournie (Synchronisation directe active)'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Domaine cible : <strong className="text-slate-300">{report.environment.activeDomain}</strong>
                    </div>
                  </div>

                  {/* Gemini AI Key */}
                  <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">Google Gemini 3.7 API</span>
                      {report.environment.hasGeminiKey ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-mono font-bold">
                          Connecté (Actif)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono">
                          Moteur Local
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Génération d'analyses probabilistes, Poisson et modélisation de Value.
                    </div>
                  </div>

                  {/* External Sports Providers */}
                  <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">Météo Stades (Open-Meteo)</span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-mono font-bold">
                        100% En Ligne
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Température, vent & pluie sans clé API requise.
                    </div>
                  </div>

                </div>
              </div>

              {/* Feed Distribution Breakdown */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Répartition des Matchs et Cotes par Sport
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {Object.entries(report.feedSummary.sportsBreakdown || {}).map(([sport, count]) => (
                    <div key={sport} className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl text-center space-y-1">
                      <div className="text-lg">
                        {sport === 'football' ? '⚽' : sport === 'basketball' ? '🏀' : sport === 'tennis' ? '🎾' : sport === 'mma' ? '🥊' : sport === 'baseball' ? '⚾' : sport === 'hockey' ? '🏒' : '🎮'}
                      </div>
                      <div className="text-xs font-bold text-white capitalize">{sport}</div>
                      <div className="text-xs font-mono text-emerald-400 font-bold">{count} matchs</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Probe JSON payload */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    Réponse Brute du Test de Sonde (Probe Response Payload)
                  </span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(report.probeResults, null, 2), 'probe-raw')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono flex items-center gap-1 transition"
                  >
                    {copiedKey === 'probe-raw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'probe-raw' ? 'Copié !' : 'Copier JSON'}</span>
                  </button>
                </div>

                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-60 scrollbar-thin">
                  {JSON.stringify(report.probeResults, null, 2)}
                </pre>
              </div>

            </div>
          )}

          {/* TAB 2: STAKE MARKETS & RAW FIXTURES */}
          {activeTab === 'stake_markets' && report && (
            <div className="space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-white">
                    Échantillon des Événements & Cotes Brutes ({report.rawEventsSample.length} affichés)
                  </span>
                </div>

                {/* Sport Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filtrer sport :</span>
                  <select
                    value={selectedSportFilter}
                    onChange={(e) => setSelectedSportFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1"
                  >
                    <option value="all">Tous les sports</option>
                    <option value="football">Football</option>
                    <option value="basketball">Basketball</option>
                    <option value="tennis">Tennis</option>
                    <option value="mma">MMA / UFC</option>
                    <option value="baseball">Baseball</option>
                    <option value="hockey">Hockey</option>
                  </select>
                </div>
              </div>

              {/* Master-Detail Viewer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Left: Fixture List */}
                <div className="lg:col-span-5 space-y-2 max-h-[550px] overflow-y-auto pr-1">
                  {report.rawEventsSample.map((ev, idx) => (
                    <div
                      key={ev.id || idx}
                      onClick={() => setSelectedFixtureForDeepInspection(ev)}
                      className={`p-3 rounded-xl border cursor-pointer transition text-left space-y-1.5 ${
                        selectedFixtureForDeepInspection?.id === ev.id
                          ? 'bg-blue-950/40 border-blue-500 text-white shadow-md'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-blue-400 uppercase tracking-wider">{ev.sport}</span>
                        <span className={`font-mono px-1.5 py-0.2 rounded ${
                          ev.isLive ? 'bg-red-950 text-orange-300 border border-orange-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {ev.isLive ? `🔴 LIVE (${ev.clock || 'En cours'})` : `⏳ À venir`}
                        </span>
                      </div>
                      <div className="text-xs font-bold line-clamp-1">{ev.match}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{ev.league}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                        <span>Score: <strong className="text-white font-mono">{ev.score || '0 - 0'}</strong></span>
                        <span>Marchés: {ev.markets?.length || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right: Deep JSON Inspection of Selected Fixture */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  {selectedFixtureForDeepInspection ? (
                    <>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1">
                            {selectedFixtureForDeepInspection.match}
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            ID: <span className="font-mono text-cyan-300">{selectedFixtureForDeepInspection.id}</span> | Ligue: {selectedFixtureForDeepInspection.league}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(selectedFixtureForDeepInspection, null, 2), 'fixture-raw')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono flex items-center gap-1 transition"
                        >
                          {copiedKey === 'fixture-raw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copier Objet JSON</span>
                        </button>
                      </div>

                      {/* Direct Stake.com URL Link Tester */}
                      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400 font-mono truncate mr-2">
                          stake.com/sports/{selectedFixtureForDeepInspection.sport}/...
                        </span>
                        <a
                          href={`https://stake.com/sports/${selectedFixtureForDeepInspection.sport || 'soccer'}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-[10px] font-semibold flex items-center gap-1 shrink-0"
                        >
                          <span>Ouvrir sur Stake.com</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Code block */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Structure JSON Brute (Reçue du service de synchronisation) :
                        </div>
                        <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[380px] scrollbar-thin">
                          {JSON.stringify(selectedFixtureForDeepInspection, null, 2)}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <div className="py-20 text-center text-xs text-slate-500">
                      Sélectionnez un match à gauche pour inspecter ses données brutes.
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: LIVE FEED RAW INSPECTOR */}
          {activeTab === 'live_feed' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-orange-400 animate-pulse" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      Réponse Brute du Module Live In-Play (/api/gemini/live-sports-analysis)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Cotes in-play dynamiques, minutes réelles, momentum et probabilités recalculées
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(rawLiveAnalysis || {}, null, 2), 'raw-live-json')}
                    disabled={!rawLiveAnalysis}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono flex items-center gap-1 transition disabled:opacity-50"
                  >
                    {copiedKey === 'raw-live-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copier JSON Live</span>
                  </button>
                  <button
                    onClick={fetchDeepFeeds}
                    disabled={isLoadingDeepFeeds}
                    className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-[11px] font-bold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingDeepFeeds ? 'animate-spin' : ''}`} />
                    <span>Actualiser</span>
                  </button>
                </div>
              </div>

              {rawLiveAnalysis ? (
                <div className="space-y-3">
                  {/* Summary pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                      <span className="text-slate-400">Matchs Live Actifs : </span>
                      <strong className="text-white font-mono">{rawLiveAnalysis.activeMatchesCount || rawLiveAnalysis.liveTips?.length || 0}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                      <span className="text-slate-400">Heure de Référence : </span>
                      <strong className="text-cyan-300 font-mono">{rawLiveAnalysis.lastUpdatedParisTime || 'N/A'}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                      <span className="text-slate-400">EV Moyen Live : </span>
                      <strong className="text-emerald-400 font-mono">+{rawLiveAnalysis.liveOpportunitiesSummary?.averageLiveEv || 0}%</strong>
                    </div>
                  </div>

                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-orange-200 overflow-x-auto max-h-[500px] scrollbar-thin">
                    {JSON.stringify(rawLiveAnalysis, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                  <p>Aucune réponse Live en cache.</p>
                  <button
                    onClick={fetchDeepFeeds}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Lancer la Requête Live
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRE-MATCH & POISSON RAW INSPECTOR */}
          {activeTab === 'pre_match' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      Réponse Brute Pré-Match & Value (/api/gemini/analyze-sports)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Scores prédits par distribution de Poisson, flux Sharp Money et cotes de clôture
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(rawPreMatchAnalysis || {}, null, 2), 'raw-pre-json')}
                    disabled={!rawPreMatchAnalysis}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono flex items-center gap-1 transition disabled:opacity-50"
                  >
                    {copiedKey === 'raw-pre-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copier JSON Pré-Match</span>
                  </button>
                  <button
                    onClick={fetchDeepFeeds}
                    disabled={isLoadingDeepFeeds}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingDeepFeeds ? 'animate-spin' : ''}`} />
                    <span>Actualiser</span>
                  </button>
                </div>
              </div>

              {rawPreMatchAnalysis ? (
                <div className="space-y-3">
                  {/* Summary pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                      <span className="text-slate-400">Paris Analysés : </span>
                      <strong className="text-white font-mono">{rawPreMatchAnalysis.tips?.length || 0}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                      <span className="text-slate-400">Flux Sharp Money : </span>
                      <strong className="text-emerald-400 font-mono">{rawPreMatchAnalysis.marketPulse?.sharpMoneyPercentage || 0}%</strong>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                      <span className="text-slate-400">Exposition Conseillée : </span>
                      <strong className="text-indigo-400 font-mono">{rawPreMatchAnalysis.marketPulse?.recommendedDailyMaxExposure || 0}%</strong>
                    </div>
                  </div>

                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-blue-200 overflow-x-auto max-h-[500px] scrollbar-thin">
                    {JSON.stringify(rawPreMatchAnalysis, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                  <p>Aucune réponse Pré-Match en cache.</p>
                  <button
                    onClick={fetchDeepFeeds}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Lancer la Requête Pré-Match
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ODDS AUDIT & MARGIN HEALTH CHECK */}
          {activeTab === 'odds_audit' && report && (
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Rapport de Contrôle de Conformité des Cotes & Marges Bookmaker
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                    report.oddsHealthCheck.anomaliesCount === 0 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {report.oddsHealthCheck.anomaliesCount === 0 ? '✅ 0 Anomalie Détectée' : `⚠️ ${report.oddsHealthCheck.anomaliesCount} Anomalie(s)`}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                    <div className="text-slate-400">Total Cotes Vérifiées</div>
                    <div className="text-sm font-bold text-white font-mono">{report.oddsHealthCheck.totalOutcomesAnalyzed} cotes</div>
                    <div className="text-[10px] text-slate-500">1X2, Over/Under, Handicaps, Combos</div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                    <div className="text-slate-400">Marge Moyenne Stake</div>
                    <div className="text-sm font-bold text-amber-300 font-mono">{report.oddsHealthCheck.averageMarginPct}%</div>
                    <div className="text-[10px] text-emerald-400">Écart très compétitif (Vig &lt; 3.5%)</div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                    <div className="text-slate-400">Plage de Cotes Détectée</div>
                    <div className="text-sm font-bold text-cyan-300 font-mono">
                      {report.oddsHealthCheck.oddsRange.min.toFixed(2)} à {report.oddsHealthCheck.oddsRange.max.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500">Format Décimal Européen standard</div>
                  </div>
                </div>

                {/* Anomalies List */}
                {report.oddsHealthCheck.anomaliesCount > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Anomalies ou Incohérences Détectées :</span>
                    </div>

                    <div className="space-y-1.5">
                      {report.oddsHealthCheck.anomalies.map((anom, idx) => (
                        <div key={idx} className="p-2.5 bg-rose-950/20 border border-rose-500/30 rounded-lg text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white">{anom.match}</span>
                            <span className="text-slate-400"> — {anom.marketName} ({anom.outcome})</span>
                            <div className="text-[11px] text-rose-300 mt-0.5">{anom.details}</div>
                          </div>
                          <span className="px-2 py-0.5 bg-rose-900/60 text-rose-200 rounded text-[10px] font-mono uppercase">
                            {anom.issueType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Toutes les cotes décimales, probabilités implicites (1/cote) et marges sont strictement valides et synchronisées avec Stake.com.
                    </span>
                  </div>
                )}
              </div>

              {/* Conversion Rule Reference Guide */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>Règles de Conversion & Détection d'Erreurs de Cote</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-300">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
                    <strong className="text-white">Format Décimal :</strong> 1.01 à 99.00 (Ex: 1.95 = 51.3% implied prob).
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
                    <strong className="text-white">Format Américain :</strong> +150 = 2.50 | -110 = 1.91 (converti automatiquement).
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
                    <strong className="text-white">Calcul de la Marge :</strong> Somme(1 / Cote) - 1 (doit être comprise entre 2.5% et 6.5%).
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: EVENT LOGS REAL-TIME JOURNAL */}
          {activeTab === 'logs' && report && (
            <div className="space-y-3">
              
              {/* Filter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-slate-900 border border-slate-800 rounded-xl">
                
                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Rechercher dans les événements, endpoints, codes HTTP..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 text-white text-xs rounded-lg placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Level filter pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['all', 'info', 'success', 'warn', 'error'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setLogFilterLevel(lvl)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold uppercase font-mono transition ${
                        logFilterLevel === lvl
                          ? lvl === 'error' ? 'bg-rose-600 text-white' : lvl === 'warn' ? 'bg-amber-600 text-white' : lvl === 'success' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}

                  <button
                    onClick={handleClearLogs}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-800 rounded text-xs font-semibold flex items-center gap-1 transition"
                    title="Vider le journal"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Effacer</span>
                  </button>
                </div>

              </div>

              {/* Log Stream Container */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-[500px] overflow-y-auto space-y-2 font-mono text-xs scrollbar-thin">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(log => {
                    const isExpanded = !!expandedLogIds[log.id];
                    const badgeColor = log.level === 'error' 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                      : log.level === 'warn'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : log.level === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40';

                    return (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-mono">{log.timeFormattedParis}</span>
                            <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold uppercase ${badgeColor}`}>
                              {log.level}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                              {log.source}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {log.latencyMs !== undefined && (
                              <span className="text-cyan-400 text-[10px]">
                                {log.latencyMs}ms
                              </span>
                            )}
                            {log.httpStatus !== undefined && (
                              <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                                log.httpStatus === 200 ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                              }`}>
                                HTTP {log.httpStatus}
                              </span>
                            )}
                            {log.details && (
                              <button
                                onClick={() => toggleLogExpand(log.id)}
                                className="text-slate-400 hover:text-white p-0.5"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-slate-200 text-xs font-medium">{log.event}</div>

                        {log.details && isExpanded && (
                          <pre className="mt-2 p-2 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-300 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Aucun événement correspondant aux critères de recherche.
                  </div>
                )}
              </div>

            </div>
          )}

        </>
      )}

    </div>
  );
};
