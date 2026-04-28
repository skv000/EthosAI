import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { EthicalRiskLevel } from '../types';

interface BadgeProps {
  level: EthicalRiskLevel;
}

export const RiskBadge: React.FC<BadgeProps> = ({ level }) => {
  const styles = {
    [EthicalRiskLevel.LOW]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    [EthicalRiskLevel.MEDIUM]: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    [EthicalRiskLevel.HIGH]: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const icons = {
    [EthicalRiskLevel.LOW]: <CheckCircle2 className="w-3 h-3" />,
    [EthicalRiskLevel.MEDIUM]: <Info className="w-3 h-3" />,
    [EthicalRiskLevel.HIGH]: <AlertTriangle className="w-3 h-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${styles[level]}`}>
      {icons[level]}
      {level} Risk
    </span>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className = "", id }) => (
  <div id={id} className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ children, variant = 'primary', className = "", ...props }) => {
  const variants = {
    primary: 'bg-slate-100 text-slate-950 hover:bg-white',
    secondary: 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };

  return (
    <button 
      className={`px-4 py-2 text-xs font-semibold rounded-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
