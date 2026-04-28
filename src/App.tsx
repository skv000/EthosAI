/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  BarChart3, 
  Users, 
  Search, 
  Database,
  ArrowRight,
  ExternalLink,
  History,
  AlertOctagon,
  Scale,
  AlertTriangle
} from 'lucide-react';
import { MOCK_DATASET } from './constants';
import { Candidate, AuditResult, EthicalRiskLevel } from './types';
import { auditDecision, auditDataset } from './services/geminiService';
import { Card, Button, RiskBadge } from './components/UI';
import ReactMarkdown from 'react-markdown';

import { HowItWorks } from './components/HowItWorks';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'how-it-works' | 'counterfactuals' | 'history'>('dashboard');
  const [candidates, setCandidates] = useState<Candidate[]>(MOCK_DATASET);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [datasetSummary, setDatasetSummary] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [auditHistory, setAuditHistory] = useState<{ candidate: Candidate; result: AuditResult; timestamp: Date }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Candidate Form State
  const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({
    name: 'Jane Doe',
    gender: 'Female',
    ethnicity: 'Black',
    university_tier: 'Tier 1',
    location: 'Remote',
    years_experience: 5,
    skills: ['React', 'Python'],
    decision: 'Rejected'
  });

  const runDecisionAudit = async (candidate: Candidate) => {
    setIsAuditing(true);
    setSelectedCandidate(candidate);
    setCurrentPage('dashboard'); // Ensure we are on dashboard if auditing a candidate
    try {
      const result = await auditDecision(candidate, candidates);
      setAuditResult(result);
      setAuditHistory(prev => [{ candidate, result, timestamp: new Date() }, ...prev]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleExport = () => {
    if (!auditResult || !selectedCandidate) return;
    const blob = new Blob([JSON.stringify({ candidate: selectedCandidate, audit: auditResult }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_${selectedCandidate.name.replace(/\s+/g, '_')}.json`;
    a.click();
  };

  const handleAddCandidate = () => {
    const id = (candidates.length + 1).toString();
    const candidate: Candidate = {
      ...newCandidate as Candidate,
      id,
      confidence: 0.85
    };
    setCandidates([candidate, ...candidates]);
    setShowAddModal(false);
    setNewCandidate({
      name: 'Jane Doe',
      gender: 'Female',
      ethnicity: 'Black',
      university_tier: 'Tier 1',
      location: 'Remote',
      years_experience: 5,
      skills: ['React', 'Python'],
      decision: 'Rejected'
    });
  };

  const runDatasetAudit = async () => {
    setIsSummarizing(true);
    try {
      const summary = await auditDataset(candidates);
      setDatasetSummary(summary);
      setCurrentPage('dashboard'); // Ensure we are on dashboard to see result
    } catch (error) {
      console.error(error);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col overflow-hidden">
      {/* Header Navigation */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage('dashboard')}>
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-slate-950">EG</div>
          <h1 className="text-xl font-semibold tracking-tight">EthosGuard <span className="text-slate-500 font-normal text-sm ml-2">// MVP PHASE 1</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-medium text-slate-400">Gemini API Connected</span>
          </div>
          <Button variant="primary" onClick={runDatasetAudit} disabled={isSummarizing}>
            {isSummarizing ? 'Analyzing...' : 'Run System Audit'}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <nav className="w-64 border-r border-slate-800 bg-slate-900/30 p-4 flex flex-col gap-2 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 ml-2">Core Modules</div>
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left flex items-center gap-2 ${currentPage === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <BarChart3 className="w-4 h-4" /> Audit Dashboard
          </button>
          <button 
            onClick={() => setCurrentPage('counterfactuals')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left flex items-center gap-2 ${currentPage === 'counterfactuals' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Scale className="w-4 h-4" /> Counterfactual Engine
          </button>
          <button 
            onClick={() => setCurrentPage('history')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left flex items-center gap-2 ${currentPage === 'history' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <History className="w-4 h-4" /> Decision History
          </button>
          <button 
            onClick={() => setCurrentPage('how-it-works')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left flex items-center gap-2 mt-4 ${currentPage === 'how-it-works' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Search className="w-4 h-4" /> System Guide
          </button>
          
          <div className="mt-auto pt-4">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400 mb-1 font-mono uppercase tracking-widest">Ethical Index</div>
              <div className="text-2xl font-bold text-amber-400 font-mono tracking-tighter">74.2<span className="text-sm font-normal text-slate-500 italic ml-1">avg</span></div>
              <div className="w-full bg-slate-700 h-1 rounded-full mt-2 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '74%' }}
                  className="bg-amber-400 h-1 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                ></motion.div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6 flex flex-col gap-6">
          {/* Add Candidate Modal Overlay */}
          <AnimatePresence>
            {showAddModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-8 space-y-6 shadow-2xl"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white uppercase tracking-widest">Simulate New Candidate</h3>
                    <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white uppercase font-mono text-xs">Close [X]</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Full Name</label>
                       <input 
                         type="text" 
                         value={newCandidate.name}
                         onChange={e => setNewCandidate({...newCandidate, name: e.target.value})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Gender</label>
                       <select 
                         value={newCandidate.gender}
                         onChange={e => setNewCandidate({...newCandidate, gender: e.target.value})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none text-white"
                       >
                         <option>Male</option>
                         <option>Female</option>
                         <option>Non-binary</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">University Tier</label>
                       <select 
                         value={newCandidate.university_tier}
                         onChange={e => setNewCandidate({...newCandidate, university_tier: e.target.value as any})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none text-white"
                       >
                         <option>Tier 1</option>
                         <option>Tier 2</option>
                         <option>Tier 3</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Model Decision</label>
                       <select 
                         value={newCandidate.decision}
                         onChange={e => setNewCandidate({...newCandidate, decision: e.target.value as any})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none text-white"
                       >
                         <option>Accepted</option>
                         <option>Rejected</option>
                       </select>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
                    <Button variant="primary" className="flex-1 bg-emerald-500 text-slate-950 font-bold" onClick={handleAddCandidate}>Inject Data Point</Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {currentPage === 'how-it-works' ? (
            <HowItWorks onStart={() => setCurrentPage('dashboard')} />
          ) : currentPage === 'history' ? (
            <motion.div initial={{opacity: 0, x: -10}} animate={{opacity: 1, x:0}} className="space-y-6">
               <h2 className="text-xl font-bold text-white flex items-center gap-2 px-1">
                 <History className="w-5 h-5 text-amber-400" /> Session Audit History
               </h2>
               {auditHistory.length === 0 ? (
                 <div className="h-40 border border-slate-800 bg-slate-900 border-dashed rounded-xl flex items-center justify-center text-slate-500 font-mono text-xs uppercase tracking-widest">
                   No audits recorded this session
                 </div>
               ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {auditHistory.map((entry, i) => (
                    <Card key={i} className="p-4 bg-slate-900/50 hover:bg-slate-900 transition-colors border border-slate-800">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-emerald-400 font-bold text-sm">{entry.candidate.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{entry.timestamp.toLocaleTimeString()}</p>
                        </div>
                        <RiskBadge level={entry.result.ethical_risk_level} />
                      </div>
                      <p className="text-xs text-slate-400 border-t border-slate-800 pt-3 line-clamp-2">
                        {entry.result.decision_explanation}
                      </p>
                      <button onClick={() => {setSelectedCandidate(entry.candidate); setAuditResult(entry.result); setCurrentPage('dashboard');}} className="text-[10px] text-blue-400 mt-3 font-bold uppercase tracking-widest hover:underline">Re-examine Trace</button>
                    </Card>
                  ))}
                </div>
               )}
            </motion.div>
          ) : currentPage === 'counterfactuals' ? (
            <motion.div initial={{opacity: 0, x: -10}} animate={{opacity: 1, x:0}} className="space-y-8 max-w-4xl">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Global Counterfactual Engine</h2>
                <p className="text-slate-400 text-sm">System-wide simulation of identity swaps and outcome stability.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 space-y-4">
                  <h3 className="text-white font-bold text-sm uppercase tracking-widest">Gender Swap Sensitivity</h3>
                  <div className="h-24 flex items-end gap-2 px-4">
                     <div className="flex-1 bg-slate-800 relative group">
                        <div className="absolute inset-x-0 bottom-0 bg-emerald-500/40 h-[88%] group-hover:bg-emerald-500 transition-all"></div>
                        <div className="absolute -top-6 left-0 right-0 text-center text-[9px] text-slate-500">MALE</div>
                     </div>
                     <div className="flex-1 bg-slate-800 relative group">
                        <div className="absolute inset-x-0 bottom-0 bg-rose-500/40 h-[62%] group-hover:bg-rose-500 transition-all"></div>
                        <div className="absolute -top-6 left-0 right-0 text-center text-[9px] text-slate-500">FEMALE</div>
                     </div>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-4">
                    <span className="text-rose-400 font-bold uppercase mr-2 shrink-0">Alert:</span> 
                    Selection probability drops by 26% when identity is toggled to Female across identical feature sets.
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <h3 className="text-white font-bold text-sm uppercase tracking-widest">University Prestige Leakage</h3>
                  <div className="h-24 flex items-end gap-2 px-4">
                     <div className="flex-1 bg-slate-800 relative group">
                        <div className="absolute inset-x-0 bottom-0 bg-emerald-500/20 h-[95%] group-hover:bg-emerald-500/50 transition-all"></div>
                        <div className="absolute -top-6 left-0 right-0 text-center text-[9px] text-slate-500">TIER 1</div>
                     </div>
                     <div className="flex-1 bg-slate-800 relative group">
                        <div className="absolute inset-x-0 bottom-0 bg-amber-500/20 h-[45%] group-hover:bg-amber-500/50 transition-all"></div>
                        <div className="absolute -top-6 left-0 right-0 text-center text-[9px] text-slate-500">TIER 3</div>
                     </div>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-4">
                    <span className="text-amber-400 font-bold uppercase mr-2 shrink-0">Analysis:</span> 
                    Higher reliance on prestige proxy detected. Tier 3 candidates require 40% higher technical scores for equivalent outcomes.
                  </div>
                </Card>
              </div>

              <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 text-center space-y-4">
                <p className="text-slate-300 text-sm">Targeting specific bias clusters... Gemini is analyzing intersectional patterns.</p>
                <Button variant="secondary" className="px-8" onClick={() => setCurrentPage('dashboard')}>Back to Audit View</Button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Dataset Summary Nudge */}
              <AnimatePresence>
                {datasetSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-6 bg-slate-900 rounded-xl border border-slate-800 relative group"
                  >
                    <div className="absolute top-0 right-0 p-3">
                      <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] rounded-full border border-emerald-500/20 uppercase font-bold tracking-widest">Global Audit Insight</div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="bg-slate-800 p-3 rounded-lg">
                        <AlertOctagon className="text-amber-500 w-6 h-6 shrink-0" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold mb-2">Systemic Bias Patterns Detected</h3>
                        <div className="prose prose-invert prose-sm max-w-none opacity-80 text-slate-300">
                          <ReactMarkdown>{datasetSummary}</ReactMarkdown>
                        </div>
                        <div className="mt-4 flex gap-3">
                           <Button variant="secondary" className="px-3 py-1.5 h-auto text-[10px]" onClick={() => setDatasetSummary(null)}>Acknowledge</Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Metric Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Disparate Impact</div>
                  <div className="text-2xl font-semibold mt-1 text-rose-400">0.72</div>
                  <div className="text-[10px] text-rose-500/80 mt-1 uppercase font-bold">Below threshold (0.80)</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Proxy Correlation</div>
                  <div className="text-2xl font-semibold mt-1 text-emerald-400">0.14</div>
                  <div className="text-[10px] text-emerald-500 mt-1 uppercase font-bold">Low variables leakage</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Audit Confidence</div>
                  <div className="text-2xl font-semibold mt-1 text-slate-100">98.2%</div>
                  <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Gemini 3 Flash Inference</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
                {/* Candidate Table */}
                <div className="xl:col-span-7">
                  <Card className="h-full flex flex-col">
                    <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center shrink-0">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-500" /> Personnel Dataset Audit
                      </span>
                      <div className="flex gap-2">
                          <button onClick={() => setShowAddModal(true)} className="text-[9px] bg-emerald-500 text-slate-950 px-2 py-1 rounded uppercase font-bold hover:bg-emerald-400 transition-colors">Add Candidate</button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-800">
                            <th className="px-4 py-2 font-bold">Candidate</th>
                            <th className="px-4 py-2 font-bold">Tier</th>
                            <th className="px-4 py-2 font-bold text-center">Decision</th>
                            <th className="px-4 py-2 font-bold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm text-slate-300 divide-y divide-slate-800/50">
                          {candidates.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-100">{c.name}</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-tight">{c.gender} • {c.ethnicity}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-mono text-xs text-slate-400">{c.university_tier}</div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border ${
                                  c.decision === 'Accepted' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  {c.decision}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button 
                                  onClick={() => runDecisionAudit(c)}
                                  disabled={isAuditing && selectedCandidate?.id === c.id}
                                  className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 flex items-center justify-end gap-1 ml-auto transition-colors"
                                >
                                  {isAuditing && selectedCandidate?.id === c.id ? 'Auditing...' : 'Trace'} <ArrowRight className="w-3 h-3 pt-0.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-3 bg-slate-900/50 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex gap-4 uppercase tracking-tighter">
                      <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-emerald-500" /> Explainability Active</span>
                      <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-emerald-500" /> Counterfactuals Ready</span>
                    </div>
                  </Card>
                </div>

                {/* Audit Trace View */}
                <div className="xl:col-span-5 h-full">
                  <AnimatePresence mode="wait">
                    {!selectedCandidate ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full border border-slate-800 bg-slate-900/10 rounded-xl flex flex-col items-center justify-center p-8 text-center"
                      >
                        <Scale className="w-12 h-12 text-slate-800 mb-4" />
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Select Record for Audit</h3>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="audit"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                      >
                        <Card className="p-5 relative overflow-hidden h-full">
                          <div className="absolute top-0 right-0 p-3">
                            <div className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] rounded-full border border-blue-500/30 uppercase font-bold tracking-widest">AI Intelligence</div>
                          </div>
                          
                          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                            <History className="w-4 h-4 text-emerald-500" />
                            Trace Reasoning: {selectedCandidate.name}
                          </h3>

                          {isAuditing ? (
                            <div className="space-y-4">
                              <div className="h-20 bg-slate-800/40 rounded-lg animate-pulse" />
                              <div className="h-32 bg-slate-800/40 rounded-lg animate-pulse" />
                              <div className="h-16 bg-slate-800/40 rounded-lg animate-pulse" />
                              <div className="pt-4 text-center">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest animate-pulse">Engaging Fairness Engine...</span>
                              </div>
                            </div>
                          ) : auditResult && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <RiskBadge level={auditResult.ethical_risk_level} />
                                {auditResult.bias_detected && (
                                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[9px] font-bold uppercase tracking-widest">
                                    Proxy Bias Detected
                                  </span>
                                )}
                              </div>

                              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-4">
                                <div className="space-y-2">
                                  <div className="text-[10px] text-slate-500 uppercase font-bold">Decision Explanation</div>
                                  <p className="text-xs text-slate-300 leading-relaxed italic">"{auditResult.decision_explanation}"</p>
                                </div>
                                
                                {auditResult.bias_detected && (
                                  <div className="pt-3 border-t border-slate-800 space-y-2">
                                    <div className="text-[10px] text-rose-400 uppercase font-bold">Bias Analysis</div>
                                    <p className="text-xs text-slate-300 leading-relaxed">{auditResult.bias_explanation}</p>
                                  </div>
                                )}
                              </div>

                              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                                 <div className="text-[10px] text-slate-500 uppercase font-bold mb-3">Counterfactual Test</div>
                                 <div className="grid grid-cols-7 items-center gap-2">
                                    <div className="col-span-3 text-center">
                                      <div className="text-[9px] text-slate-500 mb-1">Original Data</div>
                                      <div className={`text-xs font-bold ${selectedCandidate.decision === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {selectedCandidate.decision}
                                      </div>
                                    </div>
                                    <div className="col-span-1 text-center text-slate-700">➔</div>
                                    <div className="col-span-3 text-center">
                                      <div className="text-[9px] text-slate-500 mb-1">Feature Swap</div>
                                      <div className="text-xs text-slate-300 italic opacity-80">Shift Detected</div>
                                    </div>
                                 </div>
                                 <div className="mt-3 text-[11px] text-amber-200/80 leading-snug border-t border-slate-800 pt-3">
                                    {auditResult.counterfactual_analysis}
                                 </div>
                              </div>

                              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
                                <div className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Ethical Recommendation</div>
                                <p className="text-xs text-slate-300 leading-relaxed">{auditResult.recommendation}</p>
                              </div>

                              <div className="flex gap-2 shrink-0 pt-2">
                                <Button variant="secondary" className="flex-1 py-1.5 text-[10px]" onClick={() => {setSelectedCandidate(null); setAuditResult(null);}}>Close Trace</Button>
                                <Button variant="primary" className="flex-1 py-1.5 text-[10px]" onClick={handleExport}>Export Result</Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="h-10 bg-slate-900 border-t border-slate-800 px-8 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
        <div className="flex gap-6 uppercase tracking-widest font-mono">
          <span>Deployment: AI-Studio-Cloud-Run</span>
          <span>Engine: Gemini-3-Flash</span>
          <span>Latency: ~680ms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="uppercase tracking-widest">Live Governance Layer Active</span>
        </div>
      </footer>
    </div>
  );
}
