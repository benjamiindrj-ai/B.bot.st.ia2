import React, { useState, useRef } from 'react';
import { 
  Cloud, 
  Download, 
  Upload, 
  UserCheck, 
  Users, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw, 
  Database, 
  HardDrive,
  FileJson,
  AlertCircle
} from 'lucide-react';
import { 
  ManualSession, 
  BettingStrategy, 
  StakeApiCredentials, 
  UserProfile, 
  AppBackupData 
} from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface CloudSyncManagerProps {
  sessions: ManualSession[];
  wallets: Record<string, number>;
  strategies: BettingStrategy[];
  apiCredentials: StakeApiCredentials;
  profiles: UserProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (name: string, description: string) => void;
  onDeleteProfile: (id: string) => void;
  onRestoreBackup: (backup: AppBackupData) => void;
  onResetAllData: () => void;
}

export const CloudSyncManager: React.FC<CloudSyncManagerProps> = ({
  sessions,
  wallets,
  strategies,
  apiCredentials,
  profiles,
  activeProfileId,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onRestoreBackup,
  onResetAllData,
}) => {
  const { t } = useTranslation();
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>('À l\'instant');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotificationMsg({ text, type });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  // Export full JSON Backup
  const handleExportBackup = () => {
    try {
      const backup: AppBackupData = {
        version: '2.0.0',
        exportedAt: Date.now(),
        profileName: activeProfile?.name || 'Défaut',
        sessions,
        wallets,
        strategies,
        apiCredentials,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stake_bot_backup_${activeProfile?.name?.toLowerCase().replace(/\s+/g, '_') || 'data'}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Sauvegarde JSON téléchargée avec succès !', 'success');
    } catch (e) {
      showToast("Erreur lors de l'export de sauvegarde.", 'error');
    }
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (Array.isArray(parsed.sessions) || parsed.wallets || parsed.strategies)) {
          onRestoreBackup(parsed as AppBackupData);
          showToast('Sauvegarde restaurée avec succès !', 'success');
        } else {
          showToast('Format de fichier de sauvegarde invalide.', 'error');
        }
      } catch (err) {
        showToast('Erreur lors de la lecture du fichier JSON.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Simulate Cloud Sync
  const handleTriggerCloudSync = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 800);
  };

  const handleCreateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onCreateProfile(newProfileName.trim(), newProfileDesc.trim() || 'Profil utilisateur');
    setNewProfileName('');
    setNewProfileDesc('');
    setIsCreatingProfile(false);
  };

  // Total data points
  const totalEntries = sessions.length;
  const storageEstKB = (JSON.stringify({ sessions, wallets, strategies }).length / 1024).toFixed(1);

  return (
    <div className="space-y-6">

      {/* Toast Notification Banner */}
      {notificationMsg && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
          notificationMsg.type === 'success' ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' :
          notificationMsg.type === 'error' ? 'bg-rose-950/70 border-rose-500/40 text-rose-300' :
          'bg-indigo-950/70 border-indigo-500/40 text-indigo-300'
        }`}>
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Cloud Status Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Synchronisation Cloud & Sauvegardes Multi-Profils</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  PERSISTANCE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Profil actif : <strong className="text-white">{activeProfile?.name}</strong> • Dernière synchro : {lastSyncTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerCloudSync}
              disabled={syncStatus === 'syncing'}
              className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-indigo-400' : ''}`} />
              {syncStatus === 'syncing' ? 'Synchro en cours...' : 'Forcer la synchro'}
            </button>

            <button
              onClick={handleExportBackup}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Exporter JSON
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Profiles Management */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-bold text-white">Gestion des Profils & Portefeuilles</h4>
            </div>
            <button
              onClick={() => setIsCreatingProfile(true)}
              className="py-1 px-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3 h-3" />
              Nouveau Profil
            </button>
          </div>

          {/* Profile List */}
          <div className="space-y-2.5">
            {profiles.map((prof) => {
              const isSelected = prof.id === activeProfileId;
              return (
                <div
                  key={prof.id}
                  onClick={() => onSelectProfile(prof.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${prof.color || 'bg-indigo-500'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{prof.name}</span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500 text-white font-semibold">En cours</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{prof.description}</span>
                    </div>
                  </div>

                  {profiles.length > 1 && !isSelected && (
                    <div>
                      {profileToDelete === prof.id ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              onDeleteProfile(prof.id);
                              setProfileToDelete(null);
                              showToast(`Profil "${prof.name}" supprimé.`, 'info');
                            }}
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => setProfileToDelete(null)}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileToDelete(prof.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Supprimer le profil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Modal / Form for creating profile */}
          {isCreatingProfile && (
            <form onSubmit={handleCreateProfileSubmit} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <h5 className="text-xs font-bold text-white">Créer un nouveau profil séparé</h5>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nom du profil (ex: Défi 50$ - Mines) :</label>
                <input
                  type="text"
                  required
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Ex: Défi Bankroll 100$"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Description / Objectif :</label>
                <input
                  type="text"
                  value={newProfileDesc}
                  onChange={(e) => setNewProfileDesc(e.target.value)}
                  placeholder="Ex: Stratégies scalping USDT 1-Mine"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingProfile(false)}
                  className="py-1.5 px-3 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Créer le profil
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right column: Import / Export & Storage stats */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileJson className="w-4 h-4 text-emerald-400" />
              Import & Restauration de Données
            </h4>

            <p className="text-xs text-slate-300 leading-relaxed">
              Vous pouvez charger un fichier de sauvegarde JSON pour restaurer instantanément toutes vos sessions, soldes, configurations de bot et stratégies personnalisées.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                Charger Sauvegarde
              </button>

              <button
                onClick={handleExportBackup}
                className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Sauvegarder JSON
              </button>
            </div>
          </div>

          {/* Storage telemetry */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              Télémétrie du Stockage Local
            </h4>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Sessions</span>
                <span className="text-sm font-mono font-bold text-white">{totalEntries}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Stratégies</span>
                <span className="text-sm font-mono font-bold text-indigo-300">{strategies.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Taille</span>
                <span className="text-sm font-mono font-bold text-emerald-400">{storageEstKB} KB</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Zone de réinitialisation</span>
              {showResetConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-rose-300 font-bold">Réinitialiser ?</span>
                  <button
                    onClick={() => onResetAllData()}
                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                  >
                    Oui, Réinitialiser
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="text-[11px] text-rose-400 hover:text-rose-300 underline font-semibold"
                >
                  Réinitialiser les données démo
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
