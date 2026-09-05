import React, { useState } from 'react';
import { 
  X, 
  Key, 
  ShieldCheck, 
  Globe, 
  Lock, 
  Shuffle, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trophy,
  ExternalLink,
  Sparkles,
  Zap,
  Check
} from 'lucide-react';
import { StakeApiCredentials } from '../types';
import { generateRandomSeed } from '../utils/provablyFair';
import { useTranslation } from '../i18n/LanguageContext';
import { 
  STAKE_DOMAIN_GROUPS, 
  STAKE_MIRROR_DOMAINS, 
  cleanStakeDomain, 
  getStakeDomainInfo, 
  isKnownStakeMirror 
} from '../utils/stakeDomains';

interface StakeApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: StakeApiCredentials;
  onSaveCredentials: (creds: StakeApiCredentials) => void;
  onSyncRealBalances?: (balances: Record<string, number>, username?: string) => void;
  activeCurrency?: string;
}

export const StakeApiSettingsModal: React.FC<StakeApiSettingsModalProps> = ({
  isOpen,
  onClose,
  credentials,
  onSaveCredentials,
  onSyncRealBalances,
  activeCurrency = 'USDC',
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  // Local draft state
  const [localCreds, setLocalCreds] = useState<StakeApiCredentials>(credentials);

  // Stake connection test state
  const [isTestingStake, setIsTestingStake] = useState(false);
  const [stakeTestResult, setStakeTestResult] = useState<{
    tested: boolean;
    ok: boolean;
    message?: string;
    error?: string;
    username?: string;
    balances?: Record<string, number>;
  } | null>(null);

  // Connection testing states
  const [isTestingSportsKey, setIsTestingSportsKey] = useState(false);
  const [sportsTestResult, setSportsTestResult] = useState<{
    tested: boolean;
    ok: boolean;
    provider?: string;
    message?: string;
    error?: string;
    accountEmail?: string;
    currentDayRequests?: number;
    maxDayRequests?: number;
    subscription?: string;
  } | null>(null);

  const [isTestingOddsKey, setIsTestingOddsKey] = useState(false);
  const [oddsTestResult, setOddsTestResult] = useState<{
    tested: boolean;
    ok: boolean;
    provider?: string;
    message?: string;
    error?: string;
    remainingRequests?: string;
  } | null>(null);

  const handleTestStakeConnection = async () => {
    const key = (localCreds.apiKey || '').trim();
    if (!key) {
      setStakeTestResult({
        tested: true,
        ok: false,
        error: 'Veuillez saisir votre token de session ou clé API Stake avant de tester.',
      });
      return;
    }

    setIsTestingStake(true);
    setStakeTestResult(null);

    try {
      const res = await fetch('/api/stake/test-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: key,
          domain: localCreds.domain,
          currency: activeCurrency,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.hasRealBalances && data.balances && Object.keys(data.balances).length > 0) {
          if (onSyncRealBalances) {
            onSyncRealBalances(data.balances, data.username);
          }
        }
        setStakeTestResult({
          tested: true,
          ok: true,
          message: data.message || `Connecté avec succès à ${localCreds.domain}`,
          username: data.username,
          balances: data.balances,
        });
      } else {
        setStakeTestResult({
          tested: true,
          ok: false,
          error: data.error || 'Impossible d\'authentifier la session Stake. Vérifiez votre jeton.',
        });
      }
    } catch (err: any) {
      setStakeTestResult({
        tested: true,
        ok: false,
        error: err.message || 'Erreur réseau lors de la communication avec l\'API Stake.',
      });
    } finally {
      setIsTestingStake(false);
    }
  };

  const handleRandomizeSeeds = () => {
    const updated = {
      ...localCreds,
      clientSeed: generateRandomSeed(),
      serverSeedHash: generateRandomSeed(),
    };
    setLocalCreds(updated);
  };

  // Test API-Sports Key via server verification endpoint
  const handleTestApiSportsConnection = async () => {
    const key = (localCreds.apiSportsKey || '').trim();
    if (!key) {
      setSportsTestResult({
        tested: true,
        ok: false,
        error: 'Veuillez saisir votre clé API-Sports avant de lancer le test.',
      });
      return;
    }

    setIsTestingSportsKey(true);
    setSportsTestResult(null);

    try {
      const res = await fetch('/api/sports/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'api-sports',
          apiKey: key,
        }),
      });

      const data = await res.json();
      setSportsTestResult({
        tested: true,
        ok: Boolean(data.ok),
        provider: data.provider || 'API-Sports',
        message: data.message,
        error: data.error,
        accountEmail: data.accountEmail,
        currentDayRequests: data.currentDayRequests,
        maxDayRequests: data.maxDayRequests,
        subscription: data.subscription,
      });
    } catch (err: any) {
      setSportsTestResult({
        tested: true,
        ok: false,
        error: err.message || 'Erreur réseau lors de la communication avec le serveur.',
      });
    } finally {
      setIsTestingSportsKey(false);
    }
  };

  // Test The Odds API Key
  const handleTestOddsApiConnection = async () => {
    const key = (localCreds.theOddsApiKey || '').trim();
    if (!key) {
      setOddsTestResult({
        tested: true,
        ok: false,
        error: 'Veuillez saisir votre clé The Odds API avant de lancer le test.',
      });
      return;
    }

    setIsTestingOddsKey(true);
    setOddsTestResult(null);

    try {
      const res = await fetch('/api/sports/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'the-odds-api',
          apiKey: key,
        }),
      });

      const data = await res.json();
      setOddsTestResult({
        tested: true,
        ok: Boolean(data.ok),
        provider: data.provider || 'The Odds API',
        message: data.message,
        error: data.error,
        remainingRequests: data.remainingRequests,
      });
    } catch (err: any) {
      setOddsTestResult({
        tested: true,
        ok: false,
        error: err.message || 'Erreur réseau lors de la communication avec le serveur.',
      });
    } finally {
      setIsTestingOddsKey(false);
    }
  };

  const handleSave = () => {
    onSaveCredentials(localCreds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Paramètres Clés API & Flux Sportifs</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live & Provably Fair
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Vérification instantanée des clés API et configuration du moteur
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
          
          {/* SECTION 1: API-SPORTS KEY (FEATURE REQUESTED) */}
          <div className="bg-slate-950/80 border border-blue-500/30 rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-inner">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-100 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-blue-400" />
                <span>Clé API-Sports (Live & Calendriers Mondiaux)</span>
              </label>
              
              <a
                href="https://dashboard.api-sports.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline"
              >
                <span>Obtenir une clé</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Injecte les données en direct officielles (Football, Basketball, Tennis, etc.) sans limitation avec votre propre quota gratuit.
            </p>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localCreds.apiSportsKey || ''}
                  onChange={(e) => {
                    setLocalCreds({ ...localCreds, apiSportsKey: e.target.value });
                    setSportsTestResult(null);
                  }}
                  placeholder="Ex: 8f4a19bc0d2e4f6a7b8c9d0e1f2a3b4c"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-600"
                />

                <button
                  type="button"
                  onClick={handleTestApiSportsConnection}
                  disabled={isTestingSportsKey}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center gap-1.5 flex-shrink-0 shadow-sm"
                >
                  {isTestingSportsKey ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Test en cours...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Tester la clé</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sports Test Feedback Banner */}
              {sportsTestResult && (
                <div
                  className={`p-3 rounded-xl border text-[11px] flex items-start gap-2.5 animate-in fade-in duration-200 ${
                    sportsTestResult.ok
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {sportsTestResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1 flex-1">
                    <div className="font-bold flex items-center justify-between">
                      <span>{sportsTestResult.ok ? 'Connexion Validée !' : 'Échec de Validation'}</span>
                      {sportsTestResult.subscription && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                          {sportsTestResult.subscription}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] opacity-90">
                      {sportsTestResult.message || sportsTestResult.error}
                    </p>

                    {sportsTestResult.ok && (
                      <div className="flex items-center gap-3 text-[10px] text-emerald-300/80 pt-1 font-mono">
                        {sportsTestResult.accountEmail && (
                          <span>Compte : {sportsTestResult.accountEmail}</span>
                        )}
                        {sportsTestResult.maxDayRequests !== undefined && (
                          <span>
                            Requêtes du jour : {sportsTestResult.currentDayRequests} / {sportsTestResult.maxDayRequests}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: THE ODDS API KEY */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Clé The Odds API (Benchmark Pinnacle & Cotes Réelles)</span>
              </label>

              <a
                href="https://the-odds-api.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 hover:underline"
              >
                <span>the-odds-api.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localCreds.theOddsApiKey || ''}
                  onChange={(e) => {
                    setLocalCreds({ ...localCreds, theOddsApiKey: e.target.value });
                    setOddsTestResult(null);
                  }}
                  placeholder="Ex: 6c8d7e9f0a1b2c3d4e5f6a7b8c9d0e1f"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-slate-600"
                />

                <button
                  type="button"
                  onClick={handleTestOddsApiConnection}
                  disabled={isTestingOddsKey}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold rounded-xl transition flex items-center gap-1.5 flex-shrink-0"
                >
                  {isTestingOddsKey ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Test...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tester</span>
                    </>
                  )}
                </button>
              </div>

              {oddsTestResult && (
                <div
                  className={`p-3 rounded-xl border text-[11px] flex items-start gap-2.5 animate-in fade-in duration-200 ${
                    oddsTestResult.ok
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {oddsTestResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-0.5 flex-1">
                    <div className="font-bold">
                      {oddsTestResult.ok ? 'The Odds API Connecté !' : 'Erreur The Odds API'}
                    </div>
                    <p className="text-[11px] opacity-90">
                      {oddsTestResult.message || oddsTestResult.error}
                    </p>
                    {oddsTestResult.remainingRequests && (
                      <div className="text-[10px] text-emerald-300 font-mono pt-0.5">
                        Requêtes restantes ce mois : {oddsTestResult.remainingRequests}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: DOMAINE & STAKE CREDENTIALS */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Domain Selection */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Domaine / Miroir Stake ({STAKE_MIRROR_DOMAINS.length} Disponibles)</span>
                  </span>
                  <span className="text-[10px] text-cyan-400/80 font-mono">
                    {getStakeDomainInfo(localCreds.domain).region}
                  </span>
                </label>
                <select
                  value={isKnownStakeMirror(localCreds.domain) ? cleanStakeDomain(localCreds.domain) : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== 'custom') {
                      setLocalCreds({ ...localCreds, domain: cleanStakeDomain(val) });
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {STAKE_DOMAIN_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label} className="bg-slate-950 text-slate-300 font-bold">
                      {group.domains.map((d) => (
                        <option key={d.domain} value={d.domain} className="bg-slate-900 text-slate-100 font-normal">
                          {d.flagEmoji || '🌐'} {d.name} — {d.region}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="⚙️ Personnalisé" className="bg-slate-950 text-slate-300 font-bold">
                    <option value="custom" className="bg-slate-900 text-cyan-300 font-semibold">
                      ✍️ Saisir un autre domaine miroir personnalisé...
                    </option>
                  </optgroup>
                </select>

                {/* Custom Domain Input if selected or non-standard */}
                {(!isKnownStakeMirror(localCreds.domain) || localCreds.domain === 'custom') && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={localCreds.domain === 'custom' ? '' : localCreds.domain}
                      onChange={(e) => setLocalCreds({ ...localCreds, domain: cleanStakeDomain(e.target.value) })}
                      placeholder="Ex: stake1022.com ou mon-miroir-stake.org"
                      className="w-full bg-slate-950 border border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Entrez le nom d'hôte miroir sans "https://"
                    </span>
                  </div>
                )}
              </div>

              {/* Stake API Key / Token */}
              <div>
                <label className="font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  Stake API Token (Session)
                </label>
                <input
                  type="password"
                  value={localCreds.apiKey}
                  onChange={(e) => {
                    setLocalCreds({ ...localCreds, apiKey: e.target.value });
                    setStakeTestResult(null);
                  }}
                  placeholder="session_token_stake_..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Domaine actif : <strong className="text-slate-200">{cleanStakeDomain(localCreds.domain)}</strong></span>
                  <span className="text-emerald-400">Anti-Blocage FAI ✔</span>
                </div>
              </div>
            </div>

            {/* Test Connection and Synchronize Balance Button */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTestStakeConnection}
                disabled={isTestingStake}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm text-xs"
              >
                {isTestingStake ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synchronisation Stake en cours...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Tester & Synchroniser Solde ({activeCurrency})</span>
                  </>
                )}
              </button>

              {stakeTestResult && (
                <div className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                  stakeTestResult.ok
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                }`}>
                  {stakeTestResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <div className="truncate">
                    <span className="font-semibold">{stakeTestResult.message || stakeTestResult.error}</span>
                    {stakeTestResult.balances && stakeTestResult.balances[activeCurrency] !== undefined && (
                      <span className="ml-2 font-mono font-bold text-white bg-emerald-900/60 px-1.5 py-0.5 rounded">
                        Solde {activeCurrency}: {stakeTestResult.balances[activeCurrency]}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: CLIENT SEED & SERVER SEED */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Graines Provably Fair (HMAC-SHA256)
              </span>
              <button
                type="button"
                onClick={handleRandomizeSeeds}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-500/20"
              >
                <Shuffle className="w-3 h-3" />
                Régénérer
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Graine Client (Client Seed) :</span>
                <input
                  type="text"
                  value={localCreds.clientSeed}
                  onChange={(e) => setLocalCreds({ ...localCreds, clientSeed: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-300"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Hachage Graine Serveur (SHA256) :</span>
                <input
                  type="text"
                  value={localCreds.serverSeedHash}
                  onChange={(e) => setLocalCreds({ ...localCreds, serverSeedHash: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-300"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Les clés validées sont mémorisées dans votre session.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Enregistrer & Valider</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
