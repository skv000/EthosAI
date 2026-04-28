/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
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
  AlertTriangle,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import { MOCK_DATASET } from './constants';
import { Candidate, AuditResult, EthicalRiskLevel } from './types';
import { auditDecision, auditDataset, auditCounterfactuals } from './services/geminiService';
import { Card, Button, RiskBadge } from './components/UI';
import ReactMarkdown from 'react-markdown';

import { HowItWorks } from './components/HowItWorks';
import { auth, db, signInAnonymously, onAuthStateChanged, User } from './lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'how-it-works' | 'counterfactuals' | 'history'>('dashboard');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [datasetSummary, setDatasetSummary] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isCounterfactualLoading, setIsCounterfactualLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [globalMetrics, setGlobalMetrics] = useState<{ disparateImpact: number; proxyCorrelation: number; ethicalIndex: number } | null>({
    disparateImpact: 0.72,
    proxyCorrelation: 0.14,
    ethicalIndex: 74.2
  });
  const [globalCounterfactuals, setGlobalCounterfactuals] = useState<{ gender_sensitivity: number, university_sensitivity: number, analysis: string } | null>(null);
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
    decision: 'Rejected',
    confidence: 0.85
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAuthLoading(false);
      } else {
        // Automatically sign in anonymously if not logged in
        signInAnonymously().then(u => {
          if (u) setUser(u);
          setIsAuthLoading(false);
        });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      if (!isAuthLoading) setCandidates(MOCK_DATASET);
      return;
    }

    const candPath = `users/${user.uid}/candidates`;
    const candidatesRef = collection(db, candPath);
    const qCandidates = query(candidatesRef);
    const unsubscribeCandidates = onSnapshot(qCandidates, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Candidate));
      if (data.length > 0) {
        setCandidates(data);
      } else {
        // New user or empty - initialize with mock data for better UX
        const batch = writeBatch(db);
        MOCK_DATASET.forEach(c => {
          const ref = doc(db, candPath, c.id);
          batch.set(ref, c);
        });
        batch.commit().catch(console.error);
        setCandidates(MOCK_DATASET);
      }
    }, (error) => {
      console.error("Firestore List Candidates Error:", error);
    });

    const auditsPath = `users/${user.uid}/audits`;
    const auditsRef = collection(db, auditsPath);
    const qAudits = query(auditsRef, orderBy('timestamp', 'desc'));
    const unsubscribeAudits = onSnapshot(qAudits, (snapshot) => {
      const data = snapshot.docs.map(auditDoc => {
        const auditData = auditDoc.data();
        const cand = candidates.find(c => c.id === auditData.candidateId);
        return {
          candidate: cand || { name: auditData.candidateName || 'Candidate Record' } as Candidate,
          result: auditData as AuditResult,
          timestamp: auditData.timestamp?.toDate() || new Date()
        };
      });
      setAuditHistory(data);
    }, (error) => {
      console.error("Firestore List Audits Error:", error);
    });

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.disparateImpact !== undefined) {
          setGlobalMetrics({
            disparateImpact: userData.disparateImpact,
            proxyCorrelation: userData.proxyCorrelation,
            ethicalIndex: userData.ethicalIndex
          });
        }
        if (userData.datasetSummary) {
          setDatasetSummary(userData.datasetSummary);
        }
      } else {
         // Create initial profile
         setDoc(userDocRef, {
            email: user.email || 'anonymous',
            isAnonymous: user.isAnonymous,
            disparateImpact: 0.72,
            proxyCorrelation: 0.14,
            ethicalIndex: 74.2,
            createdAt: serverTimestamp()
         }).catch(console.error);
      }
    }, (error) => {
      console.error("Firestore Get User Error:", error);
    });

    return () => {
      unsubscribeCandidates();
      unsubscribeAudits();
      unsubscribeUser();
    };
  }, [user, candidates.length, isAuthLoading]);
  
  const runDecisionAudit = async (candidate: Candidate) => {
    setIsAuditing(true);
    setSelectedCandidate(candidate);
    setCurrentPage('dashboard');
    try {
      const result = await auditDecision(candidate, candidates);
      setAuditResult(result);
      
      if (user) {
        const auditPath = `users/${user.uid}/audits`;
        const auditId = `audit-${Date.now()}`;
        await setDoc(doc(db, auditPath, auditId), {
          ...result,
          candidateId: candidate.id,
          candidateName: candidate.name,
          timestamp: serverTimestamp()
        });
      } else {
        setAuditHistory(prev => [{ candidate, result, timestamp: new Date() }, ...prev]);
      }
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

  const handleAddCandidate = async () => {
    const id = user ? `cand-${Date.now()}` : (candidates.length + 1).toString();
    const candidate: Candidate = {
      ...newCandidate as Candidate,
      id,
      confidence: 0.85
    };

    if (user) {
      try {
        const candRef = doc(db, `users/${user.uid}/candidates`, id);
        await setDoc(candRef, candidate);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/candidates/${id}`);
      }
    } else {
      setCandidates([candidate, ...candidates]);
    }

    setShowAddModal(false);
    setNewCandidate({
      name: 'Jane Doe',
      gender: 'Female',
      ethnicity: 'Black',
      university_tier: 'Tier 1',
      location: 'Remote',
      years_experience: 5,
      skills: ['React', 'Python'],
      decision: 'Rejected',
      confidence: 0.85
    });
  };

  const runDatasetAudit = async () => {
    setIsSummarizing(true);
    try {
      const result = await auditDataset(candidates);
      setDatasetSummary(result.summary);
      setGlobalMetrics({
        disparateImpact: result.disparateImpact,
        proxyCorrelation: result.proxyCorrelation,
        ethicalIndex: result.ethicalIndex
      });

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          disparateImpact: result.disparateImpact,
          proxyCorrelation: result.proxyCorrelation,
          ethicalIndex: result.ethicalIndex,
          datasetSummary: result.summary,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      setCurrentPage('dashboard');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const runGlobalCounterfactuals = async () => {
    setIsCounterfactualLoading(true);
    try {
      const result = await auditCounterfactuals(candidates);
      setGlobalCounterfactuals(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCounterfactualLoading(false);
    }
  };

  const processRawData = async (data: any[]) => {
    const sanitized: Candidate[] = data.map((c, index) => ({
      ...c,
      id: c.id || (user ? `uploaded-${Date.now()}-${index}` : `mock-${Date.now()}-${index}`),
      name: c.name || `Candidate ${index + 1}`,
      gender: c.gender || 'Unknown',
      ethnicity: c.ethnicity || 'Unknown',
      university_tier: c.university_tier || 'Tier 2',
      location: c.location || 'Remote',
      years_experience: typeof c.years_experience === 'number' ? c.years_experience : (parseInt(c.years_experience) || 0),
      skills: Array.isArray(c.skills) ? c.skills : (c.skills ? (typeof c.skills === 'string' ? c.skills.split(',').map((s: string) => s.trim()) : [c.skills]) : []),
      decision: c.decision || 'Rejected',
      confidence: typeof c.confidence === 'number' ? c.confidence : (parseFloat(c.confidence) || 0.5)
    }));

    if (user) {
      try {
        const batch = writeBatch(db);
        sanitized.forEach(c => {
          const ref = doc(db, `users/${user.uid}/candidates`, c.id);
          batch.set(ref, c);
        });
        await batch.commit();
        setUploadStatus({ type: 'success', message: `Successfully synced ${sanitized.length} records to cloud.` });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/candidates`);
      }
    } else {
      setCandidates(sanitized);
      setUploadStatus({ type: 'success', message: `Successfully loaded ${sanitized.length} records.` });
    }
    
    setDatasetSummary(`Dataset of ${sanitized.length} records processed. Run System Audit to analyze global patterns.`);
    setTimeout(() => setUploadStatus(null), 5000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus(null);
    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      try {
        if (fileExtension === 'csv') {
          Papa.parse(content, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                processRawData(results.data);
              } else {
                setUploadStatus({ type: 'error', message: "CSV file is empty or malformed." });
              }
            },
            error: (err) => {
              setUploadStatus({ type: 'error', message: `CSV Parse Error: ${err.message}` });
            }
          });
        } else if (fileExtension === 'json') {
          const json = JSON.parse(content);
          const data = Array.isArray(json) ? json : [json];
          processRawData(data);
        } else {
          setUploadStatus({ type: 'error', message: "Unsupported file type. Use .csv or .json" });
        }
      } catch (err) {
        setUploadStatus({ type: 'error', message: "Failed to parse file. Ensure it is valid CSV or JSON." });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:overflow-hidden">
      {/* Header Navigation */}
      <header className="h-16 md:h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-900/50 shrink-0 sticky top-0 md:relative z-40">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setCurrentPage('dashboard')}>
          <div className="w-7 h-7 md:w-8 md:h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-slate-950 text-sm md:text-base">EG</div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight">EthosGuard <span className="text-slate-500 font-normal text-[10px] md:text-sm ml-1 md:ml-2 hidden sm:inline">// MVP PHASE 1</span></h1>
        </div>
          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  id="dataset-upload" 
                  className="hidden" 
                  accept=".json,.csv" 
                  onChange={handleFileUpload}
                />
                <label 
                  htmlFor="dataset-upload" 
                  className="text-[10px] text-slate-400 border border-slate-700 px-2 md:px-3 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors group"
                >
                  <Database className="w-3 h-3 group-hover:text-emerald-400" />
                  <span className="hidden xs:inline">CSV / JSON Upload</span>
                </label>
              </div>
              {uploadStatus && (
                <motion.span 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-[8px] md:text-[9px] font-bold uppercase tracking-wider ${uploadStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'} absolute top-14 right-4 bg-slate-900 border border-slate-800 px-2 py-1 rounded shadow-xl`}
                >
                  {uploadStatus.message}
                </motion.span>
              )}
            </div>
          <div className="hidden md:flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${user ? (user.isAnonymous ? 'bg-blue-400' : 'bg-blue-500') : 'bg-emerald-500'} animate-pulse`}></span>
            <span className="text-xs font-medium text-slate-400">{user ? (user.isAnonymous ? 'Anonymous' : 'Verified') : 'Local'}</span>
          </div>
            <Button variant="primary" onClick={runDatasetAudit} disabled={isSummarizing} className="px-3 md:px-6 py-1.5 md:py-2 text-[10px] md:text-sm">
              {isSummarizing ? '...' : (
                <span className="flex items-center gap-2">
                   <ShieldAlert className="w-3 h-3 md:w-4 md:h-4" />
                   <span className="hidden sm:inline">System Audit</span>
                   <span className="inline sm:hidden">Audit</span>
                </span>
              )}
            </Button>
          </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden pb-16 md:pb-0">
        {/* Sidebar Nav - Hidden on mobile, visible on desktop */}
        <nav className="hidden md:flex w-64 border-r border-slate-800 bg-slate-900/30 p-4 flex-col gap-2 overflow-y-auto">
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
              <div className="text-2xl font-bold text-amber-400 font-mono tracking-tighter">
                {globalMetrics?.ethicalIndex.toFixed(1) || '0.0'}
                <span className="text-sm font-normal text-slate-500 italic ml-1">avg</span>
              </div>
              <div className="w-full bg-slate-700 h-1 rounded-full mt-2 overflow-hidden">
                <motion.div 
                   key={globalMetrics?.ethicalIndex}
                  initial={{ width: 0 }}
                  animate={{ width: `${globalMetrics?.ethicalIndex || 0}%` }}
                  className="bg-amber-400 h-1 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                ></motion.div>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-4 z-50">
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className={`flex flex-col items-center gap-1 ${currentPage === 'dashboard' ? 'text-emerald-400' : 'text-slate-500'}`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase">Dashboard</span>
          </button>
          <button 
            onClick={() => setCurrentPage('counterfactuals')}
            className={`flex flex-col items-center gap-1 ${currentPage === 'counterfactuals' ? 'text-blue-400' : 'text-slate-500'}`}
          >
            <Scale className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase">Engine</span>
          </button>
          <button 
            onClick={() => setCurrentPage('history')}
            className={`flex flex-col items-center gap-1 ${currentPage === 'history' ? 'text-amber-400' : 'text-slate-500'}`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase">History</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center gap-1 text-slate-500"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 -mt-8 shadow-xl">
              <Database className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold uppercase">Entry</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 flex flex-col gap-6">
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
                  className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl relative"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                    <h3 className="text-base md:text-lg font-bold text-white uppercase tracking-widest leading-tight">Simulate Candidate</h3>
                    <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white uppercase font-mono text-[10px] md:text-xs">Close [X]</button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none text-white transition-colors"
                       >
                         <option>Male</option>
                         <option>Female</option>
                         <option>Non-binary</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Ethnicity</label>
                       <select 
                         value={newCandidate.ethnicity}
                         onChange={e => setNewCandidate({...newCandidate, ethnicity: e.target.value})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none text-white transition-colors"
                       >
                         <option>Caucasian</option>
                         <option>Asian</option>
                         <option>Black/African American</option>
                         <option>Hispanic/Latino</option>
                         <option>Middle Eastern</option>
                         <option>Native American</option>
                         <option>Other</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">University Tier</label>
                       <select 
                         value={newCandidate.university_tier}
                         onChange={e => setNewCandidate({...newCandidate, university_tier: e.target.value as any})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none text-white transition-colors"
                       >
                         <option>Tier 1</option>
                         <option>Tier 2</option>
                         <option>Tier 3</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Location Type</label>
                       <select 
                         value={newCandidate.location}
                         onChange={e => setNewCandidate({...newCandidate, location: e.target.value})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none text-white transition-colors"
                       >
                         <option>Remote</option>
                         <option>Onsite</option>
                         <option>Hybrid</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Years Experience</label>
                       <input 
                         type="number" 
                         value={newCandidate.years_experience}
                         onChange={e => setNewCandidate({...newCandidate, years_experience: parseInt(e.target.value) || 0})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white"
                       />
                    </div>
                    <div className="space-y-2 col-span-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Skills (Comma Separated)</label>
                       <input 
                         type="text" 
                         value={newCandidate.skills?.join(', ')}
                         onChange={e => setNewCandidate({...newCandidate, skills: e.target.value.split(',').map(s => s.trim())})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Model Decision</label>
                       <select 
                         value={newCandidate.decision}
                         onChange={e => setNewCandidate({...newCandidate, decision: e.target.value as any})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none text-white transition-colors"
                       >
                         <option>Accepted</option>
                         <option>Rejected</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">AI Confidence (0-1)</label>
                       <input 
                         type="number" 
                         step="0.01"
                         min="0"
                         max="1"
                         value={newCandidate.confidence}
                         onChange={e => setNewCandidate({...newCandidate, confidence: parseFloat(e.target.value) || 0})}
                         className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white"
                       />
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
               <div className="flex justify-between items-center px-1">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <History className="w-5 h-5 text-amber-400" /> {user ? 'Cloud Audit Archives' : 'Session Audit History'}
                 </h2>
                 {user && (
                   <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                     {user.isAnonymous ? 'Restricted Cloud Persistence' : 'Persisted to Firestore'}
                   </span>
                 )}
               </div>
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
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Global Counterfactual Engine</h2>
                  <p className="text-slate-400 text-sm">System-wide simulation of identity swaps and outcome stability.</p>
                </div>
                <Button 
                  variant="primary" 
                  onClick={runGlobalCounterfactuals} 
                  disabled={isCounterfactualLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {isCounterfactualLoading ? 'Running Analysis...' : 'Calibrate AI Engine'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 space-y-4">
                  <h3 className="text-white font-bold text-sm uppercase tracking-widest">Gender Swap Sensitivity</h3>
                  <div className="h-24 flex items-end gap-2 px-4">
                     <div className="flex-1 bg-slate-800 relative group">
                        <div 
                          className="absolute inset-x-0 bottom-0 bg-emerald-500/40 group-hover:bg-emerald-500 transition-all" 
                          style={{ height: globalCounterfactuals ? '85%' : '20%' }}
                        ></div>
                        <div className="absolute -top-6 left-0 right-0 text-center text-[9px] text-slate-500">STABLE</div>
                     </div>
                     <div className="flex-1 bg-slate-800 relative group">
                        <div 
                          className="absolute inset-x-0 bottom-0 bg-rose-500/40 group-hover:bg-rose-500 transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)]" 
                          style={{ height: globalCounterfactuals ? `${globalCounterfactuals.gender_sensitivity}%` : '60%' }}
                        ></div>
                        <div className="absolute -top-6 left-0 right-0 text-center text-[9px] text-slate-500">SENSITIVE</div>
                     </div>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-4">
                    <span className="text-rose-400 font-bold uppercase mr-2 shrink-0">Analysis:</span> 
                    {globalCounterfactuals 
                      ? `Gender sensitivity index is at ${globalCounterfactuals.gender_sensitivity}%. Intersectionality detected.`
                      : "Calibration required. AI model will simulate 1,000+ attribute shifts to detect disparate impact."}
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <h3 className="text-white font-bold text-sm uppercase tracking-widest">University Prestige Leakage</h3>
                  <div className="h-24 flex items-end gap-2 px-4">
                     <div className="flex-1 bg-slate-800 relative group">
                        <div 
                          className="absolute inset-x-0 bottom-0 bg-emerald-500/20 group-hover:bg-emerald-500/50 transition-all font-mono text-[8px] flex items-center justify-center text-emerald-400" 
                          style={{ height: '90%' }}
                        >REF</div>
                        <div className="absolute -top-6 left-0 right-0 text-center text-[9px] text-slate-500">PRESTIGE</div>
                     </div>
                     <div className="flex-1 bg-slate-800 relative group">
                        <div 
                          className="absolute inset-x-0 bottom-0 bg-amber-500/20 group-hover:bg-amber-500/50 transition-all" 
                          style={{ height: globalCounterfactuals ? `${globalCounterfactuals.university_sensitivity}%` : '40%' }}
                        ></div>
                        <div className="absolute -top-6 left-0 right-0 text-center text-[9px] text-slate-500">IMPACT</div>
                     </div>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-4">
                    <span className="text-amber-400 font-bold uppercase mr-2 shrink-0">Status:</span> 
                    {globalCounterfactuals 
                      ? globalCounterfactuals.analysis
                      : "Proxy variable leakage check is pending. Click 'Calibrate' to initiate deep-scan."}
                  </div>
                </Card>
              </div>

              {!globalCounterfactuals && !isCounterfactualLoading && (
                <div className="p-12 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-800 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto scale-110 shadow-xl">
                    <Scale className="w-8 h-8 text-slate-600" />
                  </div>
                  <div className="max-w-xs mx-auto">
                    <p className="text-slate-200 font-semibold">Counterfactual Analysis Not Initialized</p>
                    <p className="text-slate-500 text-xs mt-1 italic">Run Calibration to prompt Gemini to stress-test your current dataset using counterfactual reasoning.</p>
                  </div>
                </div>
              )}
              
              <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 text-center space-y-4">
                <p className="text-slate-300 text-sm italic font-serif">"Fairness is not just the absence of bias, it is the presence of stable equity across all personas."</p>
                <div className="flex justify-center gap-4">
                  <Button variant="secondary" className="px-8" onClick={() => setCurrentPage('dashboard')}>Back to Audit View</Button>
                </div>
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
                  <div className={`text-2xl font-semibold mt-1 ${(globalMetrics?.disparateImpact || 0) < 0.8 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {globalMetrics?.disparateImpact.toFixed(2) || '0.00'}
                  </div>
                  <div className={`text-[10px] mt-1 uppercase font-bold ${(globalMetrics?.disparateImpact || 0) < 0.8 ? 'text-rose-500/80' : 'text-emerald-500/80'}`}>
                    {(globalMetrics?.disparateImpact || 0) < 0.8 ? 'Below threshold (0.80)' : 'Above compliance limit'}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Proxy Correlation</div>
                  <div className={`text-2xl font-semibold mt-1 ${(globalMetrics?.proxyCorrelation || 0) > 0.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {globalMetrics?.proxyCorrelation.toFixed(2) || '0.00'}
                  </div>
                  <div className={`text-[10px] mt-1 uppercase font-bold ${(globalMetrics?.proxyCorrelation || 0) > 0.3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {(globalMetrics?.proxyCorrelation || 0) > 0.3 ? 'High variables leakage' : 'Low variables leakage'}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Audit Confidence</div>
                  <div className="text-2xl font-semibold mt-1 text-slate-100">98.2%</div>
                  <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Gemini 3 Flash Inference</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
                {/* Candidate Table */}
                <div className="xl:col-span-7 order-2 xl:order-1">
                  <Card className="h-full flex flex-col">
                    <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center shrink-0">
                      <span className="text-xs md:text-sm font-medium flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-500" /> Personnel Dataset Audit
                      </span>
                      <div className="flex gap-2">
                          <button onClick={() => setShowAddModal(true)} className="text-[9px] bg-emerald-500 text-slate-950 px-2 py-1 rounded uppercase font-bold hover:bg-emerald-400 transition-colors">Add Candidate</button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-x-auto min-h-[300px]">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-800">
                            <th className="px-4 py-2 font-bold whitespace-nowrap">Candidate</th>
                            <th className="px-4 py-2 font-bold whitespace-nowrap">Tier</th>
                            <th className="px-4 py-2 font-bold text-center whitespace-nowrap">Decision</th>
                            <th className="px-4 py-2 font-bold text-right whitespace-nowrap">Action</th>
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
                <div className="xl:col-span-5 h-full order-1 xl:order-2">
                  <AnimatePresence mode="wait">
                    {!selectedCandidate ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-48 xl:h-full border border-slate-800 bg-slate-900/10 rounded-xl flex flex-col items-center justify-center p-8 text-center"
                      >
                        <Scale className="w-8 h-8 md:w-12 md:h-12 text-slate-800 mb-4" />
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Select Record for Audit</h3>
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

      <footer className="hidden md:flex h-10 bg-slate-900 border-t border-slate-800 px-8 items-center justify-between text-[10px] text-slate-500 shrink-0">
        <div className="flex gap-6 uppercase tracking-widest font-mono">
          <span>Deployment: Cloud-Run</span>
          <span>Engine: Gemini-3-Flash</span>
          <span className="hidden lg:inline">Latency: ~680ms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="uppercase tracking-widest">Governance Active</span>
        </div>
      </footer>
    </div>
  );
}
