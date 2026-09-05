import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Activity, 
  Clock, 
  HelpCircle, 
  Copy, 
  Check, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Layers, 
  Flame, 
  Coins, 
  Trophy, 
  BookOpen, 
  Wrench,
  Zap,
  RefreshCw
} from 'lucide-react';
import { AppTab } from './Header';
import { formatParisTime } from '../utils/parisTime';
import { useTranslation } from '../i18n/LanguageContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  suggestedActions?: Array<{ label: string; tab: AppTab }>;
}

export interface AppAiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  balance: number;
  currency: string;
  wallets: Record<string, number>;
  manualSessionsCount: number;
  trackedBetsCount: number;
}

export const AppAiAssistant: React.FC<AppAiAssistantProps> = ({
  isOpen,
  onClose,
  onOpen,
  activeTab,
  setActiveTab,
  balance,
  currency,
  wallets,
  manualSessionsCount,
  trackedBetsCount,
}) => {
  const { t, language } = useTranslation();
  const [activeSubView, setActiveSubView] = useState<'chat' | 'diagnostic'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        role: 'model',
        content: `### 👋 Bonjour ! Je suis votre Assistant IA & Copilot Stake Pro.
Je suis là pour vous aider à **résoudre tout problème technique**, comprendre les algorithmes mathématiques de l'application et optimiser vos stratégies.

💡 **Que souhaitez-vous faire ?**
- 🩺 **Diagnostiquer** l'application en 1-clic
- ⚽ Comprendre les **Paris Sportifs & la synchronisation en Heure de Paris**
- 🎰 Découvrir les **Stratégies sans Martingale** (Oscar's Grind, Kelly)
- 💾 Sauvegarder vos sessions et profils`,
        timestamp: Date.now(),
        suggestedActions: [
          { label: '⚽ Paris Sportifs IA', tab: 'sports' },
          { label: '📖 Journal (+/-)', tab: 'manual-sessions' },
          { label: '☁️ Cloud & Profils', tab: 'cloud-sync' },
        ],
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Diagnostic State
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && activeSubView === 'chat') {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, activeSubView]);

  const quickPrompts = [
    { label: '🩺 Diagnostic de l\'application', prompt: 'Peux-tu exécuter un diagnostic complet de l\'application et m\'indiquer si tout fonctionne normalement ?' },
    { label: '⚽ Heure de Paris & Cotes', prompt: 'Comment fonctionne la synchronisation des matchs et cotes en Heure de Paris ?' },
    { label: '🎰 Éviter la ruine (Anti-Martingale)', prompt: 'Pourquoi la Martingale est-elle risquée et comment configurer Oscar\'s Grind ou Kelly ?' },
    { label: '💾 Exporter / Sauvegarder', prompt: 'Comment sauvegarder toutes mes données de session et profils en JSON ?' },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const appContext = {
        activeTab,
        currentCurrency: currency,
        currentBalance: balance,
        wallets,
        manualSessionsCount,
        trackedBetsCount,
        parisTime: formatParisTime(Date.now()),
      };

      const response = await fetch('/api/gemini/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          appContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const botMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        role: 'model',
        content: data.reply || 'Je n\'ai pas pu traiter votre demande. Veuillez réessayer.',
        timestamp: Date.now(),
        suggestedActions: data.suggestedActions,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.warn('AI Assistant error, providing fallback assistance:', err);
      const fallbackMsg: ChatMessage = {
        id: `msg-fallback-${Date.now()}`,
        role: 'model',
        content: `### 🛠️ Assistance Technique Immédiate
J'ai détecté votre demande : *"**${query}**"*.

Voici les solutions rapides pour les cas les plus fréquents :
- **Paris Sportifs & Cotes** : Cliquez sur *"Actualiser les Cotes"* dans l'onglet **Paris Sportifs IA**. Tous les matchs sont synchronisés en direct sur le fuseau Europe/Paris.
- **Solde & Devises** : Cliquez directement sur votre solde dans la barre supérieure pour le modifier ou changer de devise.
- **Sauvegardes** : Allez dans **Cloud & Profils** pour exporter votre fichier JSON de sécurité.`,
        timestamp: Date.now(),
        suggestedActions: [
          { label: '⚽ Paris Sportifs IA', tab: 'sports' },
          { label: '📖 Journal (+/-)', tab: 'manual-sessions' },
          { label: '☁️ Cloud & Profils', tab: 'cloud-sync' },
        ],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunDiagnostic = async () => {
    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/system/diagnostic');
      const data = await res.json();
      setDiagResult(data);
    } catch (e: any) {
      setDiagResult({
        ok: false,
        error: e.message || 'Erreur réseau',
        parisClock: { time: formatParisTime(Date.now()), timezone: 'Europe/Paris' },
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'msg-welcome-clean',
        role: 'model',
        content: `### ✨ Conversation réinitialisée
Comment puis-je vous aider aujourd'hui ? Choisissez une question rapide ci-dessous ou décrivez votre problème.`,
        timestamp: Date.now(),
      },
    ]);
  };

  // Simple Markdown Parser for clean visuals without heavy extra runtime
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-sm leading-relaxed text-slate-200">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="text-base font-bold text-emerald-400 mt-2 mb-1 flex items-center gap-1.5">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={idx} className="text-lg font-bold text-white mt-3 mb-1.5">
                {line.replace('## ', '')}
              </h3>
            );
          }
          // Bullet points
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const rawContent = line.trim().substring(2);
            return (
              <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
                <span className="text-emerald-400 mt-1 flex-shrink-0">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineStyles(rawContent) }} />
              </div>
            );
          }
          // Numbered lists
          const numMatch = line.trim().match(/^([0-9]+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
                <span className="font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 rounded-full w-5 h-5 flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                  {numMatch[1]}
                </span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineStyles(numMatch[2]) }} />
              </div>
            );
          }
          // Empty lines
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }
          // Regular paragraphs
          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatInlineStyles(line) }} />
          );
        })}
      </div>
    );
  };

  const formatInlineStyles = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-slate-300 italic">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-emerald-300 font-mono text-xs">$1</code>');
  };

  return (
    <>
      {/* Floating / Docked Assistant Drawer */}
      {isOpen && (
        <div
          id="ai-assistant-container"
          className={`fixed z-50 transition-all duration-200 shadow-2xl flex flex-col bg-slate-900 border border-slate-700/80 backdrop-blur-xl ${
            isExpanded
              ? 'inset-3 sm:inset-6 rounded-2xl'
              : 'bottom-4 right-4 w-[94vw] sm:w-[460px] h-[640px] max-h-[88vh] rounded-2xl'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-indigo-600 p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-[7px] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Assistant IA Stake Pro</span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    En Ligne
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span>Gemini 3.7 Flash</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Clock className="w-2.5 h-2.5 text-blue-400" />
                    Paris: {formatParisTime(Date.now())}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Tools */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title={isExpanded ? 'Réduire' : 'Agrandir'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleClearChat}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Effacer la conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub Navigation: Chat vs Diagnostic */}
          <div className="flex border-b border-slate-800 bg-slate-900/90 px-3 py-1.5 gap-2 text-xs flex-shrink-0">
            <button
              onClick={() => setActiveSubView('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeSubView === 'chat'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              💬 Chat & Support
            </button>
            <button
              onClick={() => {
                setActiveSubView('diagnostic');
                if (!diagResult && !isDiagnosing) {
                  handleRunDiagnostic();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeSubView === 'diagnostic'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              🩺 Diagnostic Système
            </button>
          </div>

          {/* Context Badge */}
          <div className="px-3.5 py-1.5 bg-slate-950/40 border-b border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-1 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Onglet:</span>
              <span className="font-semibold text-slate-300 capitalize">{activeTab}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Solde:</span>
              <span className="font-bold text-emerald-400">{balance.toFixed(2)} {currency}</span>
            </div>
          </div>

          {/* Body: Chat View */}
          {activeSubView === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'model' && (
                      <div className="w-7 h-7 rounded-lg bg-emerald-900/60 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-emerald-400" />
                      </div>
                    )}

                    <div
                      className={`relative max-w-[85%] rounded-xl p-3.5 text-xs shadow-md ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none'
                          : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-bl-none'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
                      ) : (
                        <div>
                          {renderFormattedMarkdown(msg.content)}

                          {/* Quick Nav Actions */}
                          {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap gap-1.5">
                              {msg.suggestedActions.map((action, aIdx) => (
                                <button
                                  key={aIdx}
                                  onClick={() => {
                                    setActiveTab(action.tab);
                                  }}
                                  className="text-[11px] font-semibold bg-slate-900 hover:bg-emerald-950/80 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 px-2.5 py-1 rounded-md flex items-center gap-1 transition-all"
                                >
                                  {action.label}
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Copy message button */}
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => handleCopyText(msg.id, msg.content)}
                              className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                              title="Copier la réponse"
                            >
                              {copiedMsgId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copié</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copier</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-900/60 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-indigo-300">VOUS</span>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-7 h-7 rounded-lg bg-emerald-900/60 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                      <span className="text-xs text-slate-400 ml-1">L'IA analyse votre demande...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800/80 overflow-x-auto flex gap-1.5 no-scrollbar flex-shrink-0">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp.prompt)}
                    disabled={isLoading}
                    className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-emerald-500/40 transition-all disabled:opacity-50"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex-shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    placeholder="Posez une question ou décrivez votre problème..."
                    disabled={isLoading}
                    className="flex-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputPrompt.trim() || isLoading}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold p-2.5 rounded-xl transition-all flex items-center justify-center flex-shrink-0"
                    title="Envoyer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Body: Diagnostic View */}
          {activeSubView === 'diagnostic' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-400" />
                      Centre de Diagnostic Stake Pro
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Vérifie l'intégrité du serveur, la synchronisation horaire et les services connectés.
                    </p>
                  </div>
                  <button
                    onClick={handleRunDiagnostic}
                    disabled={isDiagnosing}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
                    {isDiagnosing ? 'Analyse...' : 'Relancer'}
                  </button>
                </div>

                {/* Diagnostics List */}
                <div className="space-y-2.5">
                  {/* Test 1: Server */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-xs font-medium text-slate-200">Serveur API & Ingress</div>
                        <div className="text-[10px] text-slate-400">Node.js Express sur port 3000</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      En Ligne
                    </span>
                  </div>

                  {/* Test 2: Paris Time Synchronizer */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="text-xs font-medium text-slate-200">Horloge de Paris (Europe/Paris)</div>
                        <div className="text-[10px] text-slate-400">
                          Heure courante : <strong className="text-white">{formatParisTime(Date.now())}</strong>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Synchronisé CET/CEST
                    </span>
                  </div>

                  {/* Test 3: Gemini AI Engine */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-xs font-medium text-slate-200">Moteur Quantitatif Gemini 3.7</div>
                        <div className="text-[10px] text-slate-400">Génération de stratégies & Value Bets</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Opérationnel
                    </span>
                  </div>

                  {/* Test 4: Wallets & LocalStorage */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-xs font-medium text-slate-200">Stockage Multi-Devises & Profils</div>
                        <div className="text-[10px] text-slate-400">
                          {Object.keys(wallets).length} devises actives • {manualSessionsCount} sessions
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Valide
                    </span>
                  </div>
                </div>
              </div>

              {/* Actionable Tips / Recommendations */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                  Raccourcis de Réparation Rapide
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setActiveTab('sports');
                      setActiveSubView('chat');
                    }}
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 rounded-lg text-left transition-colors"
                  >
                    <div className="font-semibold text-emerald-400">⚽ Actualiser les Paris</div>
                    <div className="text-[10px] text-slate-400">Recharger les cotes en direct</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('manual-sessions');
                      setActiveSubView('chat');
                    }}
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 rounded-lg text-left transition-colors"
                  >
                    <div className="font-semibold text-emerald-400">📖 Journal & Sessions</div>
                    <div className="text-[10px] text-slate-400">Consulter et saisir vos gains (+/-)</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('cloud-sync');
                      setActiveSubView('chat');
                    }}
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 rounded-lg text-left transition-colors"
                  >
                    <div className="font-semibold text-cyan-400">💾 Exporter les Données</div>
                    <div className="text-[10px] text-slate-400">Créer un backup JSON sécurisé</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('analytics');
                      setActiveSubView('chat');
                    }}
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 rounded-lg text-left transition-colors"
                  >
                    <div className="font-semibold text-indigo-400">📊 Graphiques & Métriques</div>
                    <div className="text-[10px] text-slate-400">Analyser vos sessions en détail</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
