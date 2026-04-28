import React from 'react';
import { motion } from 'motion/react';
import { 
  Cpu, 
  Search, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Database,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Card } from './UI';

interface HowItWorksProps {
  onStart: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onStart }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-12 pb-20"
    >
      {/* Hero Section */}
      <section className="text-center space-y-4 pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest">
          <ShieldCheck className="w-3 h-3" /> System Architecture Guide
        </div>
        <h2 className="text-4xl font-bold tracking-tight text-white">How EthosGuard Ensures Fairness</h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
          EthosGuard is a multi-layered governance engine designed to detect, explain, and mitigate 
          systemic bias in automated decision systems.
        </p>
      </section>

      {/* The 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="p-3 bg-blue-500/10 rounded-lg w-fit mb-4">
            <Search className="text-blue-400 w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Pre-Model Audit</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Analyzes raw data before it reaches the AI. It detects imbalanced distributions 
            and identifies "Proxy Variables" like location or university that might hide bias.
          </p>
        </Card>

        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="p-3 bg-emerald-500/10 rounded-lg w-fit mb-4">
            <Scale className="text-emerald-400 w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Counterfactual Engine</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Performs "What-If" testing. By swapping sensitive attributes (like swapping gender) 
            while keeping other factors constant, we can definitively prove if an AI outcome was biased.
          </p>
        </Card>

        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="p-3 bg-amber-500/10 rounded-lg w-fit mb-4">
            <Cpu className="text-amber-400 w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Decision Trace</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Uses Gemini 3 Flash to translate complex mathematical weights into human-readable 
            logic, ensuring every decision is transparent and contestable.
          </p>
        </Card>
      </div>

      {/* Step-by-Step Guide */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="text-amber-400 w-5 h-5" /> Operational Workflow
        </h3>
        <div className="space-y-4">
          {[
            {
              title: "1. Dataset Ingestion",
              desc: "EthosGuard loads candidate or applicant data. The system immediately checks for 'Disparate Impact' across groups.",
              icon: <Database className="w-4 h-4" />
            },
            {
              title: "2. Trigger a Forensic Trace",
              desc: "Select any specific record. The system audits the reasoning behind that decision and flags potential ethical leaks.",
              icon: <Search className="w-4 h-4" />
            },
            {
              title: "3. Analyze Counterfactuals",
              desc: "Gemini simulates alternative personas. If the decision flips when only a sensitive attribute changes, a 'Bias Flag' is raised.",
              icon: <Scale className="w-4 h-4" />
            },
            {
              title: "4. Apply the Ethical Nudge",
              desc: "The system provides an actionable mitigation strategy (e.g., 'Recalibrate weighting for University Tier').",
              icon: <CheckCircle2 className="w-4 h-4" />
            }
          ].map((step, i) => (
            <div key={i} className="flex gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800 transition-hover hover:border-slate-700">
              <div className="text-emerald-500 shrink-0 mt-1">{step.icon}</div>
              <div>
                <h4 className="text-white font-bold text-sm mb-1">{step.title}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Call to Action */}
      <Card className="p-8 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-slate-800 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Ready to Audit Your First System?</h3>
        <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
          Navigate to the Audit Dashboard to begin analyzing candidate data for fairness and transparency.
        </p>
        <div className="flex justify-center">
          <div 
            onClick={onStart}
            className="bg-emerald-500 text-slate-950 px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:translate-y-0.5 transition-transform"
          >
            Start Audit Now <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
