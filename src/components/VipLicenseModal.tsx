import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  Crown, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Infinity as InfinityIcon,
  X,
  Copy,
  Check,
  Calendar,
  Lock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Brain,
  Layers
} from 'lucide-react';
import { UserLicenseState, LicensePlan } from '../types';
import { 
  verifyLicenseKeyOnline, 
  removeActiveLicense, 
  generateAdminLicenseKey 
} from '../utils/licenseManager';

interface VipLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseState: UserLicenseState;
  onLicenseUpdated: (newState: UserLicenseState) => void;
}

export const VipLicenseModal: React.FC<VipLicenseModalProps> = ({
  isOpen,
  onClose,
  licenseState,
  onLicenseUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'activate' | 'offers' | 'admin'>('activate');
  const [keyInput, setKeyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Admin Generator State
  const [adminPlan, setAdminPlan] = useState<'vip_monthly' | 'vip_yearly' | 'vip_lifetime'>('vip_lifetime');
  const [adminClientNote, setAdminClientNote] = useState('');
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);
  const [isAdminGenerating, setIsAdminGenerating] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (keyToTest?: string) => {
    const key = keyToTest || keyInput;
    if (!key.trim()) {
      setErrorMessage('Veuillez saisir votre clé de licence.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await verifyLicenseKeyOnline(key);
      if (res.success) {
        onLicenseUpdated(res.state);
        setSuccessMessage(res.message);
        setKeyInput('');

        // Trigger victory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage('Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLicense = () => {
    if (confirm('Voulez-vous vraiment désactiver cette licence et revenir au forfait gratuit ?')) {
      const freeState = removeActiveLicense();
      onLicenseUpdated(freeState);
      setSuccessMessage('Licence retirée. Vous êtes désormais en mode Essai Gratuit.');
    }
  };

  const handleAdminGenerate = async () => {
    setIsAdminGenerating(true);
    setGeneratedResult(null);
    try {
      const res = await generateAdminLicenseKey(licenseState.licenseKey || '', adminPlan, adminClientNote);
      if (res.success) {
        setGeneratedResult(res.generated);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Erreur lors de la génération');
    } finally {
      setIsAdminGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return 'Accès Permanent (À vie)';
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-6"
      >
        {/* Top Header Banner */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-amber-950/90 via-slate-900 to-indigo-950/90 border-b border-amber-500/20">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/40 text-amber-400 shadow-lg">
              <Crown className="w-7 h-7 animate-pulse text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Accès VIP & Licences Pro
                </h2>
                {licenseState.isPro ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    VIP PRO ACTIF
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    ESSAI GRATUIT
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Contrôlez vos accès, activez votre clé d'abonnement ou profitez de l'essai gratuit.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('activate')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'activate'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Activer une Clé</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('offers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'offers'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Avantages Pro vs Gratuit</span>
            </button>

            {licenseState.isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-purple-950/60 text-purple-300 border border-purple-500/30 hover:bg-purple-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Générateur Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* TAB 1: ACTIVATE KEY */}
          {activeTab === 'activate' && (
            <div className="space-y-5">
              {/* CURRENT STATUS CARD */}
              {licenseState.isPro ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                        Votre Licence est Active
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                      {licenseState.planName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Validité</div>
                      <div className="text-slate-200 font-bold mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>{formatDate(licenseState.expiresAt)}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Quota Paris Bot</div>
                      <div className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1.5">
                        <InfinityIcon className="w-3.5 h-3.5" />
                        <span>Illimité (aucun plafond)</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                    <div className="font-semibold text-slate-300">Fonctionnalités débloquées :</div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-300">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Cerveau IA Autonome (1.33x – 7.77x)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Matrice de transition Markov</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Couloir haute certitude (75-85% win)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Micro-tirs Barbell Sniper (10x-25x)</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Rotation multi-jeux anti-clustering</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Audit stratégique IA Gemini</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={handleRemoveLicense}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline"
                    >
                      Désactiver la licence sur cet appareil
                    </button>
                  </div>
                </div>
              ) : (
                /* FREE STATUS & QUOTA CARD */
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Statut Actuel : Essai Gratuit
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-500/30">
                      {licenseState.freeDailyBetsRemaining} / {licenseState.maxFreeDailyBets} paris restants aujourd'hui
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.min(100, (licenseState.freeDailyBetsRemaining / licenseState.maxFreeDailyBets) * 100)}%`,
                      }}
                    ></div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Vous profitez du mode d'essai gratuit limité à {licenseState.maxFreeDailyBets} paris automatiques par jour sur les stratégies de base. Activez votre clé VIP Pro pour lever toutes les limites et libérer la puissance de l'IA.
                  </p>
                </div>
              )}

              {/* KEY INPUT FORM */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                  Entrez votre Clé de Licence VIP :
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="ex: VIP-PRO-LIFETIME-STAKE-2026"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none transition"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleVerify()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Activer</span>
                      </>
                    )}
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}
              </div>

              {/* QUICK DEMO KEYS FOR IMMEDIATE TESTING */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clés de démonstration prêtes à l'emploi pour vos tests :</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleVerify('VIP-PRO-LIFETIME-STAKE-2026')}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-left transition cursor-pointer"
                  >
                    <div className="font-bold text-amber-300">👑 VIP Pro À Vie (Permanent)</div>
                    <div className="text-[10px] text-slate-400 font-mono">VIP-PRO-LIFETIME-STAKE-2026</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerify('VIP-PRO-ANNUAL-ALPHA-777')}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left transition cursor-pointer"
                  >
                    <div className="font-bold text-cyan-300">⭐ VIP Pro Annuel (365 Jours)</div>
                    <div className="text-[10px] text-slate-400 font-mono">VIP-PRO-ANNUAL-ALPHA-777</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerify('VIP-PRO-MONTHLY-BETA-333')}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left transition cursor-pointer"
                  >
                    <div className="font-bold text-blue-300">🔹 VIP Pro Mensuel (30 Jours)</div>
                    <div className="text-[10px] text-slate-400 font-mono">VIP-PRO-MONTHLY-BETA-333</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerify('ADMIN-MASTER-VIP-2026')}
                    className="p-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-left transition cursor-pointer"
                  >
                    <div className="font-bold text-purple-300">🛡️ Clé Créateur / Admin</div>
                    <div className="text-[10px] text-slate-400 font-mono">ADMIN-MASTER-VIP-2026 (Générateur)</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OFFERS & COMPARISON MATRIX */}
          {activeTab === 'offers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Free Tier Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base">Niveau Gratuit</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">0 €</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Idéal pour découvrir l'interface et tester le bot sans engagement.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400" />
                      <span>50 paris automatiques / jour</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400" />
                      <span>Stratégies standard (Bouclier, D'Alembert)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400" />
                      <span>Télémétrie et graphiques de base</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-500">
                      <X className="w-4 h-4 text-slate-600" />
                      <span>Pas de Cerveau IA Autonome (1.33x–7.77x)</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-500">
                      <X className="w-4 h-4 text-slate-600" />
                      <span>Pas de rotation multi-jeux</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-500">
                      <X className="w-4 h-4 text-slate-600" />
                      <span>Pas d'Audit Stratégique IA Gemini</span>
                    </li>
                  </ul>
                </div>

                {/* VIP Pro Tier Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/40 to-slate-950 border-2 border-amber-500/50 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-slate-950 font-black text-[10px] rounded-bl-xl uppercase tracking-wider">
                    RECOMMANDÉ
                  </div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-amber-300 text-base flex items-center gap-1.5">
                      <Crown className="w-4 h-4" />
                      <span>VIP Pro Élite</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    Débloque 100% de la puissance prédictive et des gains asymétriques.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-200 pt-2 border-t border-amber-500/20">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <strong className="text-white">Paris 100% illimités (aucun quota)</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Cerveau IA Autonome (1.33x – 7.77x)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Matrice Markov P(W|W) & Surge Momentum</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Couloir reconstitution haute certitude (75-85% win)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Micro-tirs Sniper Barbell (10x - 25x)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Rotation anti-clustering Dice, Limbo, Mines, Plinko</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Audit stratégique IA Gemini en continu</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-center justify-between flex-wrap gap-2">
                <span>Vous possédez déjà une clé fournie par le créateur ?</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('activate')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer"
                >
                  Entrer ma clé ➔
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ADMIN GENERATOR (Visible when user has ADMIN-MASTER-VIP-2026 key) */}
          {activeTab === 'admin' && licenseState.isAdmin && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                    Générateur de Clés pour vos Clients & Abonnés
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  En tant qu'administrateur, vous pouvez générer instantanément de nouvelles clés valides pour vos acheteurs (paiement Crypto, Stripe, Telegram, etc.) sans avoir besoin de base de données externe.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Durée / Type de Licence :
                    </label>
                    <select
                      value={adminPlan}
                      onChange={(e) => setAdminPlan(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="vip_lifetime">👑 À Vie (Permanent - VIP Lifetime)</option>
                      <option value="vip_yearly">⭐ Annuel (365 Jours)</option>
                      <option value="vip_monthly">🔹 Mensuel (30 Jours)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Note Client (optionnel) :
                    </label>
                    <input
                      type="text"
                      value={adminClientNote}
                      onChange={(e) => setAdminClientNote(e.target.value)}
                      placeholder="ex: ClientDiscord, Jean, VIP01"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={isAdminGenerating}
                    onClick={handleAdminGenerate}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-purple-600/30 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isAdminGenerating ? 'Génération...' : 'Générer une Clé Client'}
                  </button>
                </div>
              </div>

              {/* GENERATED KEY RESULT CARD */}
              {generatedResult && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                      Clé Prête à Transmettre :
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {generatedResult.planName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedResult.key}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedResult.key)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedKey ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Envoyez ce code à votre client : il lui suffira de le coller dans l'application pour débloquer immédiatement son abonnement.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
