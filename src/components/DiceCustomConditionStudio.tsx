import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  Zap, 
  Play, 
  ShieldCheck, 
  Workflow, 
  ListTree, 
  Sliders, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  X, 
  Layers, 
  Flame, 
  CheckCircle2, 
  TrendingUp,
  BarChart3,
  Lock,
  RotateCcw,
  Scale
} from 'lucide-react';
import { 
  StrategyCondition, 
  StrategyTriggerType, 
  StrategyActionType, 
  BettingStrategy 
} from '../types';
import {
  STAKE_TRIGGER_OPTIONS,
  STAKE_ACTION_OPTIONS,
  STAKE_OFFICIAL_CONDITION_PRESETS,
  formatStakeConditionDescription,
  formatStakeCodeSnippet,
} from '../utils/stakeConditionEngine';

// Backward compatibility export
export const DICE_CONDITION_PRESETS = STAKE_OFFICIAL_CONDITION_PRESETS;
export const TRIGGER_OPTIONS = STAKE_TRIGGER_OPTIONS;
export const ACTION_OPTIONS = STAKE_ACTION_OPTIONS;

interface DiceCustomConditionStudioProps {
  strategy: BettingStrategy;
  onUpdateStrategy: (updates: Partial<BettingStrategy>) => void;
  currency: string;
  balance?: number;
  onStartSandboxTest?: () => void;
  onNavigateToBacktest?: () => void;
  onNavigateToMonteCarlo?: () => void;
}

export const DiceCustomConditionStudio: React.FC<DiceCustomConditionStudioProps> = ({
  strategy,
  onUpdateStrategy,
  currency,
  balance = 100,
  onStartSandboxTest,
  onNavigateToBacktest,
  onNavigateToMonteCarlo,
}) => {
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [jsonExportOpen, setJsonExportOpen] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');

  // Form State for Modal
  const [formTriggerType, setFormTriggerType] = useState<StrategyTriggerType>('every_loss');
  const [formTriggerValue, setFormTriggerValue] = useState<number>(1);
  const [formActionType, setFormActionType] = useState<StrategyActionType>('increase_bet_pct');
  const [formActionValue, setFormActionValue] = useState<number>(100);
  const [formDescription, setFormDescription] = useState<string>('');

  const conditionsList = useMemo(() => {
    return strategy.customConditions || [];
  }, [strategy.customConditions]);

  const activeCount = useMemo(() => {
    return conditionsList.filter((c) => c.isActive !== false).length;
  }, [conditionsList]);

  const currentTriggerConf = useMemo(() => {
    return STAKE_TRIGGER_OPTIONS.find((t) => t.value === formTriggerType);
  }, [formTriggerType]);

  const currentActionConf = useMemo(() => {
    return STAKE_ACTION_OPTIONS.find((a) => a.value === formActionType);
  }, [formActionType]);

  const handleOpenAddModal = () => {
    setEditingConditionId(null);
    setFormTriggerType('every_loss');
    setFormTriggerValue(1);
    setFormActionType('increase_bet_pct');
    setFormActionValue(100);
    setFormDescription('');
    setIsAddingModalOpen(true);
  };

  const handleOpenEditModal = (cond: StrategyCondition) => {
    setEditingConditionId(cond.id);
    setFormTriggerType(cond.triggerType);
    setFormTriggerValue(cond.triggerValue !== undefined ? cond.triggerValue : 1);
    setFormActionType(cond.actionType);
    setFormActionValue(cond.actionValue !== undefined ? cond.actionValue : 1);
    setFormDescription(cond.description || '');
    setIsAddingModalOpen(true);
  };

  const handleSaveCondition = () => {
    const triggerConf = STAKE_TRIGGER_OPTIONS.find((t) => t.value === formTriggerType);
    const actionConf = STAKE_ACTION_OPTIONS.find((a) => a.value === formActionType);

    const finalTriggerVal = triggerConf?.hasValue ? Number(formTriggerValue) || 1 : undefined;
    const finalActionVal = actionConf?.hasValue ? Number(formActionValue) || 0 : undefined;

    const desc = formDescription.trim() || formatStakeConditionDescription(
      formTriggerType,
      finalTriggerVal,
      formActionType,
      finalActionVal,
      currency
    );

    const stakeCode = formatStakeCodeSnippet(
      formTriggerType,
      finalTriggerVal,
      formActionType,
      finalActionVal
    );

    if (editingConditionId) {
      // Edit existing condition
      const updated = conditionsList.map((c) => {
        if (c.id === editingConditionId) {
          return {
            ...c,
            triggerType: formTriggerType,
            triggerValue: finalTriggerVal,
            actionType: formActionType,
            actionValue: finalActionVal,
            description: desc,
            stakeUiCode: stakeCode,
          };
        }
        return c;
      });
      onUpdateStrategy({ customConditions: updated });
    } else {
      // Add new condition
      const newCondition: StrategyCondition = {
        id: `cond-stk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        order: conditionsList.length + 1,
        triggerType: formTriggerType,
        triggerValue: finalTriggerVal,
        actionType: formActionType,
        actionValue: finalActionVal,
        description: desc,
        stakeUiCode: stakeCode,
        isActive: true,
      };
      onUpdateStrategy({ customConditions: [...conditionsList, newCondition] });
    }

    setIsAddingModalOpen(false);
    setEditingConditionId(null);
  };

  const handleDeleteCondition = (id: string) => {
    const updated = conditionsList.filter((c) => c.id !== id);
    onUpdateStrategy({ customConditions: updated });
  };

  const handleDuplicateCondition = (cond: StrategyCondition) => {
    const duplicate: StrategyCondition = {
      ...cond,
      id: `cond-stk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: `${cond.description || 'Condition Stake'} (Copie)`,
      isActive: true,
    };
    onUpdateStrategy({ customConditions: [...conditionsList, duplicate] });
  };

  const handleToggleCondition = (id: string) => {
    const updated = conditionsList.map((c) =>
      c.id === id ? { ...c, isActive: c.isActive === false ? true : false } : c
    );
    onUpdateStrategy({ customConditions: updated });
  };

  const handleMoveCondition = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === conditionsList.length - 1) return;

    const newIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...conditionsList];
    const item = copy[index];
    copy.splice(index, 1);
    copy.splice(newIdx, 0, item);

    onUpdateStrategy({ customConditions: copy });
  };

  const handleApplyPreset = (preset: typeof STAKE_OFFICIAL_CONDITION_PRESETS[0]) => {
    const presetCopy = preset.conditions.map((c, i) => ({
      ...c,
      id: `cond-${preset.id}-${Date.now()}-${i}`,
      isActive: true,
    }));
    onUpdateStrategy({ customConditions: presetCopy });
  };

  const handleCopyStakeMatrix = () => {
    if (conditionsList.length === 0) return;
    const active = conditionsList.filter((c) => c.isActive !== false);
    const text = 
      `STAKE.COM ADVANCED DICE AUTOBET MATRIX\n` +
      `Strategy: ${strategy.name}\n` +
      `Base Bet: ${strategy.baseBet} ${currency} | Multiplier: ${strategy.targetMultiplier}x (${strategy.winChance}%)\n` +
      `Total Conditions: ${active.length} Active Rules\n\n` +
      active.map((c, i) => `Rule #${i + 1}: ${c.stakeUiCode || c.description}`).join('\n');

    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleClearAll = () => {
    onUpdateStrategy({ customConditions: [] });
  };

  const handleImportJson = () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(jsonImportText);
      if (!Array.isArray(parsed)) {
        throw new Error('Le format doit être un tableau JSON de conditions.');
      }
      const validated: StrategyCondition[] = parsed.map((item, idx) => ({
        id: item.id || `cond-import-${Date.now()}-${idx}`,
        triggerType: item.triggerType || 'every_loss',
        triggerValue: item.triggerValue !== undefined ? Number(item.triggerValue) : 1,
        actionType: item.actionType || 'increase_bet_pct',
        actionValue: item.actionValue !== undefined ? Number(item.actionValue) : 100,
        description: item.description || `Condition importée #${idx + 1}`,
        stakeUiCode: item.stakeUiCode || formatStakeCodeSnippet(
          item.triggerType || 'every_loss',
          item.triggerValue,
          item.actionType || 'increase_bet_pct',
          item.actionValue
        ),
        isActive: item.isActive !== false,
      }));

      onUpdateStrategy({ customConditions: validated });
      setJsonExportOpen(false);
      setJsonImportText('');
    } catch (err: any) {
      setImportError(err.message || 'Erreur lors de l\'import JSON.');
    }
  };

  return (
    <div id="dice-custom-condition-studio" className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 border border-emerald-500/30 shadow-xl space-y-5 text-slate-200">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 shadow-inner flex-shrink-0">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Conditions Avancées Stake.com (Auto-Bet)</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  100% Conforme Stake
                </span>
              </h3>
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                {activeCount} / {conditionsList.length} Règle{conditionsList.length > 1 ? 's' : ''} Active{conditionsList.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Arbre décisionnel de paris identiques à l'interface de Stake.com (<strong className="text-amber-300">Conditions / IF</strong> ➔ <strong className="text-emerald-300">Actions / THEN</strong>) exécuté séquentiellement à chaque tour.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <button
            type="button"
            id="btn-add-custom-condition"
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/50 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Ajouter une Condition Stake</span>
          </button>

          <button
            type="button"
            onClick={handleCopyStakeMatrix}
            disabled={conditionsList.length === 0}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              copiedCode
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            } ${conditionsList.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Copier le script textuel pour l'interface officielle de Stake.com"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copié pour Stake !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copier format Stake.com</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setJsonExportOpen(!jsonExportOpen)}
            className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition"
            title="Importer ou Exporter la matrice au format JSON"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fast Presets Selector Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Stratégies Prêtes à l'Emploi (Presets Officiels Stake) :
          </span>
          {conditionsList.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Effacer toutes les règles</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {STAKE_OFFICIAL_CONDITION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/50 text-left transition group space-y-1 shadow-sm"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition">
                  {preset.name}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {preset.conditions.length} règles
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 line-clamp-2 leading-relaxed">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* JSON Import / Export Drawer */}
      {jsonExportOpen && (
        <div className="p-4 rounded-xl bg-slate-950 border border-emerald-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <CodeIcon className="w-4 h-4 text-emerald-400" />
              Import / Export JSON de vos Conditions Stake
            </span>
            <button
              type="button"
              onClick={() => setJsonExportOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            rows={4}
            value={jsonImportText || JSON.stringify(conditionsList, null, 2)}
            onChange={(e) => setJsonImportText(e.target.value)}
            placeholder="Collez ici votre JSON de conditions Stake..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-emerald-200 focus:outline-none focus:border-emerald-500"
          />

          {importError && (
            <div className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{importError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(conditionsList, null, 2));
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copier le JSON</span>
            </button>
            <button
              type="button"
              onClick={handleImportJson}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Appliquer le JSON</span>
            </button>
          </div>
        </div>
      )}

      {/* Conditions Active List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ListTree className="w-3.5 h-3.5 text-emerald-400" />
            Liste de vos Conditions Personnalisées ({conditionsList.length})
          </h4>
          {conditionsList.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allActive = conditionsList.every((c) => c.isActive !== false);
                  const updated = conditionsList.map((c) => ({ ...c, isActive: !allActive }));
                  onUpdateStrategy({ customConditions: updated });
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition"
              >
                {conditionsList.every((c) => c.isActive !== false) ? 'Tout Suspendre' : 'Tout Réactiver'}
              </button>
            </div>
          )}
        </div>

        {conditionsList.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-dashed border-slate-800 space-y-3">
            <Workflow className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-slate-200">
                Aucune condition Stake configurée
              </h5>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Ajoutez des règles pour réagir exactement comme sur Stake.com : augmentation/diminution de mise en %, inversion Over/Under, ajustement de cote, et sécurisation du capital.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Ajouter une première condition</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {conditionsList.map((cond, idx) => {
              const isActive = cond.isActive !== false;
              const trig = STAKE_TRIGGER_OPTIONS.find((t) => t.value === cond.triggerType);
              const act = STAKE_ACTION_OPTIONS.find((a) => a.value === cond.actionType);

              return (
                <motion.div
                  key={cond.id || idx}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl border transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/60 text-slate-500 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    
                    {/* Left: Reorder & Number */}
                    <div className="flex items-start gap-2.5 flex-1">
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mt-0.5">
                        <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-950 text-emerald-300 border border-emerald-800/70">
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveCondition(idx, 'up')}
                            className="text-slate-500 hover:text-slate-300 disabled:opacity-20 p-0.5"
                            title="Monter cette règle en priorité"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === conditionsList.length - 1}
                            onClick={() => handleMoveCondition(idx, 'down')}
                            className="text-slate-500 hover:text-slate-300 disabled:opacity-20 p-0.5"
                            title="Descendre cette règle"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Rule details */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Trigger Pill */}
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <span className="text-[9px] uppercase font-bold text-amber-400/80">CONDITION :</span>
                            {trig?.label.split('(')[0] || cond.triggerType}
                            {cond.triggerValue !== undefined && trig?.hasValue && (
                              <strong className="text-amber-200">[{cond.triggerValue} {trig.unit.includes('Devise') ? currency : trig.unit}]</strong>
                            )}
                          </span>

                          <span className="text-slate-500 font-bold">➔</span>

                          {/* Action Pill */}
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <span className="text-[9px] uppercase font-bold text-emerald-400/80">ACTION :</span>
                            {act?.label.split('(')[0] || cond.actionType}
                            {cond.actionValue !== undefined && act?.hasValue && (
                              <strong className="text-emerald-200">[{cond.actionValue} {act.unit.includes('Devise') ? currency : act.unit}]</strong>
                            )}
                          </span>
                        </div>

                        {cond.description && (
                          <p className="text-xs text-slate-300 font-medium">
                            {cond.description}
                          </p>
                        )}

                        {cond.stakeUiCode && (
                          <div className="text-[10px] font-mono text-emerald-400/90 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block">
                            Stake Format: <strong className="text-emerald-300">{cond.stakeUiCode}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleCondition(cond.id)}
                        title={isActive ? 'Désactiver cette règle' : 'Activer cette règle'}
                        className={`p-1 rounded-lg transition ${
                          isActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        {isActive ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(cond)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Modifier cette règle"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateCondition(cond)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Dupliquer cette règle"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCondition(cond.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition"
                        title="Supprimer cette règle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Direct Test Launchpad */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            Vos conditions personnalisées sont automatiquement intégrées dans l'Autobet, le Backtest et Monte Carlo.
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {onStartSandboxTest && (
            <button
              type="button"
              onClick={onStartSandboxTest}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Tester en Auto-Bet Sandbox</span>
            </button>
          )}

          {onNavigateToBacktest && (
            <button
              type="button"
              onClick={onNavigateToBacktest}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tester en Backtest</span>
            </button>
          )}

          {onNavigateToMonteCarlo && (
            <button
              type="button"
              onClick={onNavigateToMonteCarlo}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>Simuler Monte Carlo</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal: Add or Edit Custom Condition */}
      <AnimatePresence>
        {isAddingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl shadow-slate-950/90 space-y-5 text-slate-200 my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      {editingConditionId ? 'Modifier la Condition Stake' : 'Ajouter une Condition Stake.com'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Configuration exacte conforme à l'interface Autobet de Stake
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 text-xs">
                
                {/* 1. Trigger Block */}
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      1. Condition Déclencheur (Condition / IF)
                    </label>
                    <span className="text-[10px] text-slate-400">Événement Stake</span>
                  </div>

                  <div className="space-y-2">
                    <select
                      value={formTriggerType}
                      onChange={(e) => {
                        const val = e.target.value as StrategyTriggerType;
                        setFormTriggerType(val);
                        const conf = STAKE_TRIGGER_OPTIONS.find((t) => t.value === val);
                        if (conf?.defaultVal !== undefined) {
                          setFormTriggerValue(conf.defaultVal);
                        }
                      }}
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-lg p-2.5 text-xs text-amber-200 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <optgroup label="📊 Fréquence de paris">
                        {STAKE_TRIGGER_OPTIONS.filter((t) => t.stakeCategory === 'frequency').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🔥 Séries de pertes / gains (Streaks)">
                        {STAKE_TRIGGER_OPTIONS.filter((t) => t.stakeCategory === 'streak').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🎯 Transitions 1er Gain / Perte">
                        {STAKE_TRIGGER_OPTIONS.filter((t) => t.stakeCategory === 'outcome').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="💰 Seuils de profit / perte session">
                        {STAKE_TRIGGER_OPTIONS.filter((t) => t.stakeCategory === 'session').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="⚖️ Montants de mise">
                        {STAKE_TRIGGER_OPTIONS.filter((t) => t.stakeCategory === 'bet_size').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    </select>

                    <p className="text-[11px] text-slate-400">
                      {currentTriggerConf?.desc}
                    </p>

                    {currentTriggerConf?.hasValue && (
                      <div className="pt-1 flex items-center gap-2">
                        <label className="text-[11px] font-semibold text-slate-300 whitespace-nowrap">
                          Valeur ({currentTriggerConf.unit.includes('Devise') ? currency : currentTriggerConf.unit}) :
                        </label>
                        <input
                          type="number"
                          step={currentTriggerConf.step || 1}
                          min={currentTriggerConf.min ?? 0.0001}
                          value={formTriggerValue}
                          onChange={(e) => setFormTriggerValue(parseFloat(e.target.value) || 0)}
                          className="w-32 bg-slate-950 border border-amber-500/40 rounded-lg p-1.5 text-xs font-mono font-bold text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          placeholder={currentTriggerConf.placeholder}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Action Block */}
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      2. Action à Exécuter (Action / THEN)
                    </label>
                    <span className="text-[10px] text-slate-400">Action Stake</span>
                  </div>

                  <div className="space-y-2">
                    <select
                      value={formActionType}
                      onChange={(e) => {
                        const val = e.target.value as StrategyActionType;
                        setFormActionType(val);
                        const conf = STAKE_ACTION_OPTIONS.find((a) => a.value === val);
                        if (conf?.defaultVal !== undefined) {
                          setFormActionValue(conf.defaultVal);
                        }
                      }}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg p-2.5 text-xs text-emerald-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    >
                      <optgroup label="💵 Dimensionnement de la mise">
                        {STAKE_ACTION_OPTIONS.filter((a) => a.stakeCategory === 'bet_size').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🎲 Multiplicateur & Direction Dice">
                        {STAKE_ACTION_OPTIONS.filter((a) => a.stakeCategory === 'outcome').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🛑 Sécurité & Compteurs">
                        {STAKE_ACTION_OPTIONS.filter((a) => a.stakeCategory === 'session' || a.stakeCategory === 'streak').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    </select>

                    <p className="text-[11px] text-slate-400">
                      {currentActionConf?.desc}
                    </p>

                    {currentActionConf?.hasValue && (
                      <div className="pt-1 flex items-center gap-2">
                        <label className="text-[11px] font-semibold text-slate-300 whitespace-nowrap">
                          Valeur de l'action ({currentActionConf.unit.includes('Devise') ? currency : currentActionConf.unit}) :
                        </label>
                        <input
                          type="number"
                          step={currentActionConf.step || 0.01}
                          min={currentActionConf.min ?? 0.0001}
                          max={currentActionConf.max}
                          value={formActionValue}
                          onChange={(e) => setFormActionValue(parseFloat(e.target.value) || 0)}
                          className="w-32 bg-slate-950 border border-emerald-500/40 rounded-lg p-1.5 text-xs font-mono font-bold text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          placeholder={currentActionConf.placeholder}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Description Note */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-300">
                      Description / Note personnalisée (Optionnel) :
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setFormDescription(formatStakeConditionDescription(formTriggerType, formTriggerValue, formActionType, formActionValue, currency));
                      }}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-medium"
                    >
                      Générer automatiquement
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder={formatStakeConditionDescription(formTriggerType, formTriggerValue, formActionType, formActionValue, currency)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Live Logic Summary Box */}
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-800/40 space-y-1 text-[11px]">
                  <span className="font-bold text-emerald-300 block">
                    Aperçu logique de la règle :
                  </span>
                  <div className="text-slate-200 font-medium">
                    {formatStakeConditionDescription(formTriggerType, formTriggerValue, formActionType, formActionValue, currency)}
                  </div>
                  <div className="font-mono text-[10px] text-emerald-400/90 pt-0.5">
                    Stake Script : {formatStakeCodeSnippet(formTriggerType, formTriggerValue, formActionType, formActionValue)}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  id="btn-confirm-save-condition"
                  onClick={handleSaveCondition}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingConditionId ? 'Enregistrer les Modifications' : 'Ajouter la Règle Stake'}</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

function CodeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
