import React, { useState, useEffect } from 'react';
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
  Eye,
  EyeOff,
  Users,
  User,
  Plus,
  Search,
  Trash2,
  Edit2,
  Clock,
  Filter,
  Save,
  RefreshCw,
  Share2,
  FileText
} from 'lucide-react';
import { UserLicenseState, LicensePlan } from '../types';
import { 
  verifyLicenseKeyOnline, 
  removeActiveLicense, 
  generateAdminLicenseKey,
  fetchManagedLicenseKeys,
  addManualManagedLicenseKey,
  updateManagedLicenseKey,
  deleteManagedLicenseKey,
  getLocalManagedKeys
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
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Admin Master Detection
  const [sessionAdminUnlocked, setSessionAdminUnlocked] = useState(false);

  const isMasterAdminKeyStr = (k?: string | null) => {
    if (!k) return false;
    const clean = k.trim().toUpperCase();
    return clean === 'ADMIN-MASTER-VIP-2026' || clean === '134679' || clean === 'ADMIN' || clean === 'ADMIN-MASTER-VIP';
  };

  const adminKeyUsed =
    (licenseState.licenseKey && licenseState.licenseKey.trim()) ||
    (keyInput && keyInput.trim()) ||
    'ADMIN-MASTER-VIP-2026';

  const isAdminActive = Boolean(
    licenseState.isAdmin ||
    licenseState.plan === 'admin' ||
    sessionAdminUnlocked ||
    isMasterAdminKeyStr(keyInput) ||
    isMasterAdminKeyStr(licenseState.licenseKey)
  );

  // --- SECTION 1: KEY GENERATOR STATE ---
  const [genPlan, setGenPlan] = useState<'vip_monthly' | 'vip_3months' | 'vip_6months' | 'vip_yearly' | 'vip_lifetime'>('vip_monthly');
  const [genUsername, setGenUsername] = useState('');
  const [genCustomDays, setGenCustomDays] = useState<number | ''>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);
  const [generatorCopied, setGeneratorCopied] = useState(false);

  // --- SECTION 2: ACTIVE MANAGED KEYS STATE ---
  const [activeKeys, setActiveKeys] = useState<any[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [showAddManualForm, setShowAddManualForm] = useState(false);

  // Manual key creation form
  const [manualUsername, setManualUsername] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [manualPlan, setManualPlan] = useState<'vip_monthly' | 'vip_3months' | 'vip_6months' | 'vip_yearly' | 'vip_lifetime'>('vip_monthly');
  const [manualDurationDays, setManualDurationDays] = useState<number | ''>('');
  const [manualNotes, setManualNotes] = useState('');
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Inline username editing
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState('');

  // Row copy & reveal map
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});
  const [copiedExport, setCopiedExport] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load managed keys whenever admin is active
  const loadActiveKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetchManagedLicenseKeys(adminKeyUsed);
      if (res.keys && Array.isArray(res.keys)) {
        setActiveKeys(res.keys);
      } else {
        setActiveKeys(getLocalManagedKeys());
      }
    } catch {
      setActiveKeys(getLocalManagedKeys());
    } finally {
      setIsLoadingKeys(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdminActive) {
      loadActiveKeys();
    }
  }, [isOpen, isAdminActive]);

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

        if (res.state.isAdmin || res.state.plan === 'admin' || isMasterAdminKeyStr(key)) {
          setSessionAdminUnlocked(true);
          setActiveTab('admin');
          loadActiveKeys();
        }

        // Trigger victory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLicense = () => {
    if (confirm('Voulez-vous vraiment désactiver cette licence et revenir au forfait gratuit ?')) {
      const freeState = removeActiveLicense();
      onLicenseUpdated(freeState);
      setSessionAdminUnlocked(false);
      setSuccessMessage('Licence retirée. Vous êtes désormais en mode Essai Gratuit.');
    }
  };

  // Generate a key (by month, 3 months, 6 months, year, lifetime, custom) with client username
  const handleGenerateKey = async () => {
    if (!genUsername.trim()) {
      alert("Veuillez saisir le nom d'utilisateur associé à cette clé.");
      return;
    }

    setIsGenerating(true);
    setGeneratedResult(null);
    try {
      const res = await generateAdminLicenseKey(
        adminKeyUsed,
        genPlan,
        genUsername.trim(),
        typeof genCustomDays === 'number' && genCustomDays > 0 ? genCustomDays : undefined
      );

      if (res.success && res.generated) {
        setGeneratedResult(res.generated);
        loadActiveKeys();
      } else {
        alert(res.message || 'Erreur lors de la génération de la clé.');
      }
    } catch {
      alert('Erreur lors de la génération de la clé.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save manually registered key with username
  const handleSaveManualKey = async () => {
    if (!manualUsername.trim()) {
      alert("Veuillez saisir un nom d'utilisateur.");
      return;
    }
    if (!manualKey.trim()) {
      alert('Veuillez saisir ou générer une clé.');
      return;
    }

    setIsSavingManual(true);
    try {
      let planName = 'VIP Pro Mensuel (30 Jours)';
      let durationDays: number | undefined = 30;

      if (manualPlan === 'vip_3months') {
        planName = 'VIP Pro Trimestriel (90 Jours)';
        durationDays = 90;
      } else if (manualPlan === 'vip_6months') {
        planName = 'VIP Pro Semestriel (180 Jours)';
        durationDays = 180;
      } else if (manualPlan === 'vip_yearly') {
        planName = 'VIP Pro Annuel (365 Jours)';
        durationDays = 365;
      } else if (manualPlan === 'vip_lifetime') {
        planName = 'VIP Pro Élite (À Vie)';
        durationDays = undefined;
      }

      if (typeof manualDurationDays === 'number' && manualDurationDays > 0 && manualPlan !== 'vip_lifetime') {
        durationDays = manualDurationDays;
        planName = `VIP Personnalisé (${manualDurationDays} Jours)`;
      }

      const res = await addManualManagedLicenseKey(adminKeyUsed, {
        key: manualKey.trim().toUpperCase(),
        username: manualUsername.trim(),
        plan: manualPlan,
        planName,
        durationDays,
        status: 'active',
        notes: manualNotes.trim() || 'Enregistré manuellement par admin',
      });

      if (res.success) {
        setShowAddManualForm(false);
        setManualUsername('');
        setManualKey('');
        setManualNotes('');
        setManualDurationDays('');
        loadActiveKeys();
      } else {
        alert(res.message);
      }
    } catch {
      alert("Erreur lors de l'enregistrement manuel.");
    } finally {
      setIsSavingManual(false);
    }
  };

  // Generate random preview key for manual input
  const handleGenerateQuickRandomKey = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const sig = Math.random().toString(36).substring(2, 8).toUpperCase();
    let prefix = 'VIP-MONTH';
    if (manualPlan === 'vip_3months') prefix = 'VIP-3M';
    if (manualPlan === 'vip_6months') prefix = 'VIP-6M';
    if (manualPlan === 'vip_yearly') prefix = 'VIP-YEAR';
    if (manualPlan === 'vip_lifetime') prefix = 'VIP-LIFE';
    const cleanUser = (manualUsername || 'CLIENT').replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase() || 'VIP';
    setManualKey(`${prefix}-${cleanUser}${rand}-${sig}`);
  };

  // Save updated username inline
  const handleSaveUpdatedUsername = async (keyRecord: any) => {
    if (!editingUsername.trim()) return;
    try {
      await updateManagedLicenseKey(adminKeyUsed, keyRecord.id, {
        username: editingUsername.trim(),
      });
      setEditingKeyId(null);
      loadActiveKeys();
    } catch {
      alert('Erreur lors de la modification du nom.');
    }
  };

  // Toggle active/revoked status
  const handleToggleStatus = async (keyRecord: any) => {
    const nextStatus = keyRecord.status === 'active' ? 'revoked' : 'active';
    try {
      await updateManagedLicenseKey(adminKeyUsed, keyRecord.id, {
        status: nextStatus,
      });
      loadActiveKeys();
    } catch {
      alert('Erreur de changement de statut.');
    }
  };

  // Delete key
  const handleDeleteKey = async (keyRecord: any) => {
    if (confirm(`Voulez-vous vraiment supprimer la clé de "${keyRecord.username}" ?`)) {
      await deleteManagedLicenseKey(adminKeyUsed, keyRecord.id);
      loadActiveKeys();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const copyRowKey = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRowId(id);
    setTimeout(() => setCopiedRowId(null), 2000);
  };

  const handleExportSummary = () => {
    const lines = activeKeys.map((k, idx) => {
      const exp = k.expiresAt ? new Date(k.expiresAt).toLocaleDateString('fr-FR') : 'À Vie';
      return `${idx + 1}. [Utilisateur: ${k.username}] | Clé: ${k.key} | Formule: ${k.planName} | Expire: ${exp} | Statut: ${k.status}`;
    });
    navigator.clipboard.writeText(`=== REGISTRE DES CLÉS VIP ACTIVES (${activeKeys.length}) ===\n` + lines.join('\n'));
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return 'Accès Permanent (À vie)';
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getExpiryDisplay = (expiresAt: number | null | undefined) => {
    if (!expiresAt) {
      return { label: 'À Vie (Illimité)', isExpired: false, badgeClass: 'text-amber-300 bg-amber-950/60 border-amber-500/40' };
    }
    const diffMs = expiresAt - Date.now();
    const diffDays = Math.ceil(diffMs / 86400000);
    const dateStr = new Date(expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (diffDays <= 0) {
      return { label: `Expiré (${dateStr})`, isExpired: true, badgeClass: 'text-rose-400 bg-rose-950/60 border-rose-500/40' };
    }
    return { label: `${diffDays}j restants (${dateStr})`, isExpired: false, badgeClass: 'text-cyan-300 bg-cyan-950/60 border-cyan-500/40' };
  };

  // Filtered active keys
  const filteredActiveKeys = activeKeys.filter((item) => {
    const matchesSearch = 
      item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPlan = filterPlan === 'all' || item.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-3xl sm:max-w-4xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="relative p-4 sm:p-6 bg-gradient-to-r from-amber-950/90 via-slate-900 to-indigo-950/90 border-b border-amber-500/20 shrink-0">
          {/* Prominent High-Contrast Close Cross */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu VIP"
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 sm:p-2.5 rounded-full sm:rounded-xl bg-slate-800 hover:bg-rose-900/90 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-500/60 shadow-xl transition-all duration-200 cursor-pointer flex items-center justify-center z-30 group"
            title="Fermer le menu VIP (Échap)"
          >
            <X className="w-5 h-5 text-slate-200 group-hover:text-white group-hover:scale-110 transition-transform" />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/40 text-amber-400 shadow-lg shrink-0">
              <Crown className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
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
                {isAdminActive && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/25 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>ADMINISTRATEUR</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Contrôlez vos accès, activez votre clé d'abonnement ou profitez de l'essai gratuit.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 sm:mt-5 border-t border-slate-800/80 pt-3 sm:pt-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('activate')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
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
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'offers'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Avantages Pro vs Gratuit</span>
            </button>

            {isAdminActive && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
                  activeTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-purple-950/60 text-purple-300 border border-purple-500/30 hover:bg-purple-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Console Admin VIP</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 overscroll-contain">
          {/* TAB 1: ACTIVATE KEY */}
          {(activeTab === 'activate' || activeTab === 'admin') && (
            <div className="space-y-6">
              {/* CURRENT STATUS CARD (Only when on activate tab or if license is pro) */}
              {activeTab === 'activate' && (
                <>
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
                          Désactiver cette clé et revenir au forfait gratuit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          <span>Mode Actuel : Essai Gratuit</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Plafond journalier : 50 paris. Pour débloquer les paris illimités et le cerveau IA, activez votre clé ci-dessous.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('offers')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold shrink-0 transition cursor-pointer"
                      >
                        Voir les offres
                      </button>
                    </div>
                  )}

                  {/* KEY ACTIVATION INPUT CARD */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-amber-400" />
                        <span>Saisir une Clé de Licence VIP :</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Format : VIP-XXXX-XXXX ou Clé Maître
                      </span>
                    </label>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showKeyInput ? 'text' : 'password'}
                          value={keyInput}
                          onChange={(e) => setKeyInput(e.target.value)}
                          placeholder="Collez votre clé secrète VIP..."
                          autoComplete="off"
                          spellCheck="false"
                          className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeyInput(!showKeyInput)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer p-1"
                          title={showKeyInput ? 'Masquer la clé' : 'Afficher la clé'}
                        >
                          {showKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleVerify()}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2 shrink-0"
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

                  {/* INFORMATION DE CONFIDENTIALITÉ DES CLÉS VIP (clés de démonstration masquées) */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-slate-200 flex items-center gap-2">
                          <span>Clés de licence strictement confidentielles</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono border border-amber-500/30 uppercase">
                            Chiffré
                          </span>
                        </div>
                        <p className="text-slate-400 leading-relaxed text-[11px]">
                          Les clés de licence VIP sont cryptées et réservées aux titulaires officiels. Si vous ne disposez pas encore d'une clé ou souhaitez souscrire à l'accès VIP Pro illimité, veuillez contacter l'administrateur ou le support officiel.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ========================================================================= */}
              {/* ADMIN MODE SECTIONS (VISIBLE WHEN ADMIN KEY IS ENTERED OR ACTIVE)         */}
              {/* ========================================================================= */}
              {isAdminActive && (
                <div className="space-y-6 pt-2 border-t border-purple-500/30">
                  {/* ADMIN HEADER BADGE */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border border-purple-500/40 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
                        <ShieldCheck className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Mode Administrateur Actif</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                            MAÎTRE VIP
                          </span>
                        </div>
                        <div className="text-[11px] text-purple-200/80">
                          Générez des clés VIP et gérez les clés actives avec nom d'utilisateur.
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-purple-500/20">
                      {activeKeys.length} {activeKeys.length <= 1 ? 'Clé enregistrée' : 'Clés enregistrées'}
                    </div>
                  </div>

                  {/* 1. GÉNÉRATEUR DE CLÉS DE LICENCE VIP PAR MOIS, ETC. */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 border border-purple-500/40 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white tracking-wide">
                            Générateur de Clés de Licence VIP (Par mois, 3 mois, etc.)
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Créez instantanément une nouvelle licence attribuée à un nom d'utilisateur.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                        Génération Instantanée
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Durée par mois / type */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Durée de la Licence VIP :
                        </label>
                        <select
                          value={genPlan}
                          onChange={(e) => setGenPlan(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
                        >
                          <option value="vip_monthly">🔹 VIP 1 Mois (30 Jours)</option>
                          <option value="vip_3months">🔷 VIP 3 Mois (90 Jours)</option>
                          <option value="vip_6months">🟣 VIP 6 Mois (180 Jours)</option>
                          <option value="vip_yearly">⭐ VIP 1 An (365 Jours)</option>
                          <option value="vip_lifetime">👑 VIP À Vie (Permanent - Illimité)</option>
                        </select>
                      </div>

                      {/* Nom d'utilisateur rentré manuellement */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-amber-400" />
                            <span>Nom d'utilisateur Client :</span>
                          </span>
                          <span className="text-[10px] text-slate-500">Requis</span>
                        </label>
                        <input
                          type="text"
                          value={genUsername}
                          onChange={(e) => setGenUsername(e.target.value)}
                          placeholder="ex: Alex_Trader, Sophie_VIP, Discord_01..."
                          className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 font-mono"
                        />
                      </div>
                    </div>

                    {/* Option custom days if needed */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>Durée personnalisée (optionnel) :</span>
                        <input
                          type="number"
                          value={genCustomDays}
                          onChange={(e) => setGenCustomDays(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Nb jours (ex: 45)"
                          className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                          min={1}
                          max={3650}
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isGenerating || !genUsername.trim()}
                        onClick={handleGenerateKey}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-purple-600/30 flex items-center gap-2 disabled:opacity-50 active:scale-95"
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Génération en cours...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            <span>Générer la Clé VIP</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* GENERATED KEY RESULT CARD */}
                    {generatedResult && (
                      <div className="p-4 rounded-2xl bg-slate-950 border-2 border-emerald-500/50 space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                              Nouvelle Clé VIP Prête pour {generatedResult.username} !
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            {generatedResult.planName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={generatedResult.key}
                            className="flex-1 bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              copyToClipboard(generatedResult.key);
                              setGeneratorCopied(true);
                              setTimeout(() => setGeneratorCopied(false), 2000);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
                          >
                            {generatorCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            <span>{generatorCopied ? 'Copié !' : 'Copier'}</span>
                          </button>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800">
                          <span>
                            Attribuée à : <strong className="text-white">{generatedResult.username}</strong>
                          </span>
                          <span>
                            Expiration : <span className="text-slate-300 font-mono">{formatDate(generatedResult.expiresAt)}</span>
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-300/80">
                          ✓ Cette clé a été automatiquement enregistrée dans la section des clés actives ci-dessous.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 2. ENCORE PLUS BAS : SECTION POUR VOIR LES CLÉS ACTIVES AVEC UN NOM D'UTILISATEUR RENTRÉ MANUELLEMENT */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                    {/* Header with actions */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                          <Users className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white tracking-wide">
                              Clés Actives & Utilisateurs Manuels
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
                              {filteredActiveKeys.length} {filteredActiveKeys.length <= 1 ? 'active' : 'actives'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Visualisez et modifiez manuellement les noms d'utilisateurs associés aux clés.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddManualForm(!showAddManualForm)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Ajouter manuellement</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportSummary}
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                          title="Copier le récapitulatif complet de toutes les clés"
                        >
                          {copiedExport ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* FORMULAIRE POUR AJOUTER MANUELLEMENT UNE CLÉ AVEC NOM D'UTILISATEUR */}
                    <AnimatePresence>
                      {showAddManualForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/40 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                                <Plus className="w-3.5 h-3.5" />
                                <span>Ajouter manuellement une clé VIP pour un utilisateur</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowAddManualForm(false)}
                                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                                  Nom d'utilisateur rentré manuellement :
                                </label>
                                <input
                                  type="text"
                                  value={manualUsername}
                                  onChange={(e) => setManualUsername(e.target.value)}
                                  placeholder="ex: Julien_Crypto"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                                  Formule / Durée :
                                </label>
                                <select
                                  value={manualPlan}
                                  onChange={(e) => setManualPlan(e.target.value as any)}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                                >
                                  <option value="vip_monthly">VIP 1 Mois (30 Jours)</option>
                                  <option value="vip_3months">VIP 3 Mois (90 Jours)</option>
                                  <option value="vip_6months">VIP 6 Mois (180 Jours)</option>
                                  <option value="vip_yearly">VIP 1 An (365 Jours)</option>
                                  <option value="vip_lifetime">VIP À Vie (Illimité)</option>
                                </select>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center justify-between">
                                  <span>Clé de Licence VIP :</span>
                                  <button
                                    type="button"
                                    onClick={handleGenerateQuickRandomKey}
                                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                                  >
                                    ⚡ Générer un code aléatoire
                                  </button>
                                </label>
                                <input
                                  type="text"
                                  value={manualKey}
                                  onChange={(e) => setManualKey(e.target.value)}
                                  placeholder="ex: VIP-MONTHLY-JULIEN-7892"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                                  Notes administratives (optionnel) :
                                </label>
                                <input
                                  type="text"
                                  value={manualNotes}
                                  onChange={(e) => setManualNotes(e.target.value)}
                                  placeholder="ex: Payé en USDT le 06/09, contact Telegram @..."
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => setShowAddManualForm(false)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                disabled={isSavingManual || !manualUsername.trim() || !manualKey.trim()}
                                onClick={handleSaveManualKey}
                                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {isSavingManual ? 'Enregistrement...' : 'Enregistrer la clé active'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* FILTRES & RECHERCHE */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Rechercher par utilisateur ou clé..."
                          className="w-full bg-slate-900 border border-slate-800 focus:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 font-mono"
                        />
                      </div>

                      <select
                        value={filterPlan}
                        onChange={(e) => setFilterPlan(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 cursor-pointer"
                      >
                        <option value="all">Toutes les formules</option>
                        <option value="vip_monthly">1 Mois</option>
                        <option value="vip_3months">3 Mois</option>
                        <option value="vip_6months">6 Mois</option>
                        <option value="vip_yearly">1 An</option>
                        <option value="vip_lifetime">À Vie</option>
                      </select>

                      <button
                        type="button"
                        onClick={loadActiveKeys}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        title="Actualiser la liste"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingKeys ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {/* LISTE DES CLÉS ACTIVES */}
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {filteredActiveKeys.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800/80">
                          {searchQuery ? 'Aucune clé trouvée pour cette recherche.' : 'Aucune clé active enregistrée pour le moment.'}
                        </div>
                      ) : (
                        filteredActiveKeys.map((item) => {
                          const expiryInfo = getExpiryDisplay(item.expiresAt);
                          const isRevealed = Boolean(revealedKeyIds[item.id]);
                          const isEditing = editingKeyId === item.id;
                          const isCopied = copiedRowId === item.id;

                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-2xl border transition-all ${
                                item.status === 'revoked'
                                  ? 'bg-rose-950/20 border-rose-900/40 opacity-70'
                                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                {/* Nom d'utilisateur (avec édition manuelle inline) */}
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                    <User className="w-3.5 h-3.5" />
                                  </div>

                                  {isEditing ? (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        value={editingUsername}
                                        onChange={(e) => setEditingUsername(e.target.value)}
                                        className="bg-slate-950 border border-amber-500/50 rounded-lg px-2 py-0.5 text-xs text-white font-mono"
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveUpdatedUsername(item)}
                                        className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                        title="Enregistrer le nom"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingKeyId(null)}
                                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                                        title="Annuler"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 group">
                                      <span className="text-xs font-bold text-white">
                                        {item.username}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingKeyId(item.id);
                                          setEditingUsername(item.username);
                                        }}
                                        className="text-slate-500 hover:text-amber-400 transition p-0.5 cursor-pointer opacity-80 hover:opacity-100"
                                        title="Modifier manuellement le nom d'utilisateur"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}

                                  {/* Formule Badge */}
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                                    {item.planName || item.plan}
                                  </span>
                                </div>

                                {/* Expiration & Statut */}
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${expiryInfo.badgeClass}`}>
                                    {expiryInfo.label}
                                  </span>

                                  {item.status === 'revoked' ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                                      Révoqué
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                                      Actif
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Clé VIP & Actions */}
                              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                                <div className="flex items-center gap-2 font-mono">
                                  <span className="text-slate-500 text-[11px]">Clé :</span>
                                  <span className="text-amber-300 text-xs font-bold select-all bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                    {isRevealed
                                      ? item.key
                                      : `${item.key.slice(0, 7)}••••••••••••${item.key.slice(-4)}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedKeyIds((prev) => ({
                                        ...prev,
                                        [item.id]: !prev[item.id],
                                      }))
                                    }
                                    className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                                    title={isRevealed ? 'Masquer la clé' : 'Démasquer la clé'}
                                  >
                                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => copyRowKey(item.id, item.key)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                    title="Copier la clé"
                                  >
                                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{isCopied ? 'Copié !' : 'Copier'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(item)}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-semibold transition cursor-pointer"
                                    title={item.status === 'active' ? 'Désactiver / Révoquer la clé' : 'Réactiver la clé'}
                                  >
                                    {item.status === 'active' ? 'Désactiver' : 'Activer'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteKey(item)}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                    title="Supprimer la clé"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {item.notes && (
                                <div className="mt-1.5 text-[10px] text-slate-500 italic">
                                  Note : {item.notes}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
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
        </div>

        {/* Bottom Footer with explicit Close Button */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">BNZSTRATS IA • Accès VIP Sécurisé</span>
            <span className="sm:hidden">Accès VIP</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <X className="w-4 h-4 text-slate-300" />
            <span>Fermer le menu</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
