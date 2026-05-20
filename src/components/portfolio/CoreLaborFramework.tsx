import React, { useState } from 'react';
import {
  Target,
  TrendingUp,
  CalendarClock,
  ClipboardCheck,
  Clock,
  Users,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FrameworkPillar {
  number: number;
  title: string;
  question: string;
  tagLabel: string;
  storyLabel: string;
  accent: 'teal' | 'emerald' | 'blue' | 'indigo';
  icon: React.ReactNode;
}

const PILLARS: FrameworkPillar[] = [
  {
    number: 1,
    title: 'Actual vs Budget',
    question: 'Did we spend more or less than the financial plan?',
    tagLabel: 'Financial performance',
    storyLabel: 'Budget tells the financial story',
    accent: 'teal',
    icon: <Target className="w-8 h-8" />,
  },
  {
    number: 2,
    title: 'Actual vs Forecast',
    question: 'Did labor align with expected demand?',
    tagLabel: 'Demand alignment',
    storyLabel: 'Forecast tells the demand story',
    accent: 'emerald',
    icon: <TrendingUp className="w-8 h-8" />,
  },
  {
    number: 3,
    title: 'Actual vs Schedule',
    question: 'Did employees work what managers planned?',
    tagLabel: 'Execution discipline',
    storyLabel: 'Schedule tells the planning story',
    accent: 'blue',
    icon: <CalendarClock className="w-8 h-8" />,
  },
  {
    number: 4,
    title: 'Actual vs Standards',
    question: 'Did labor align with the work required to operate properly?',
    tagLabel: 'Operational efficiency',
    storyLabel: 'Standards tell the operational story',
    accent: 'indigo',
    icon: <ClipboardCheck className="w-8 h-8" />,
  },
];

const ACCENT_STYLES: Record<
  FrameworkPillar['accent'],
  { iconBg: string; iconText: string; numberBg: string; numberText: string; tagBg: string; tagText: string }
> = {
  teal: {
    iconBg: 'bg-teal-50',
    iconText: 'text-teal-dark',
    numberBg: 'bg-teal-dark',
    numberText: 'text-white',
    tagBg: 'bg-teal-50',
    tagText: 'text-teal-dark',
  },
  emerald: {
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    numberBg: 'bg-emerald-600',
    numberText: 'text-white',
    tagBg: 'bg-emerald-50',
    tagText: 'text-emerald-700',
  },
  blue: {
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    numberBg: 'bg-blue-600',
    numberText: 'text-white',
    tagBg: 'bg-blue-50',
    tagText: 'text-blue-700',
  },
  indigo: {
    iconBg: 'bg-indigo-50',
    iconText: 'text-indigo-600',
    numberBg: 'bg-indigo-600',
    numberText: 'text-white',
    tagBg: 'bg-indigo-50',
    tagText: 'text-indigo-700',
  },
};

export const CoreLaborFramework: React.FC = () => {
  const [open, setOpen] = useState(true);

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <div className="text-left">
          <h2 className="text-2xl font-bold text-slate-navy">The Core Labor Performance Framework</h2>
          <p className="text-sm text-gray-500 mt-1">Four comparisons create the complete labor story.</p>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6">
          {/* Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PILLARS.map((p) => {
              const a = ACCENT_STYLES[p.accent];
              return (
                <div
                  key={p.number}
                  className="border border-gray-200 rounded-xl p-5 flex flex-col hover:border-teal hover:shadow-md transition-all cursor-pointer"
                >
                  <div className={`w-14 h-14 rounded-full ${a.iconBg} ${a.iconText} flex items-center justify-center mb-4`}>
                    {p.icon}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-6 h-6 rounded-full ${a.numberBg} ${a.numberText} text-xs font-bold flex items-center justify-center`}>
                      {p.number}
                    </span>
                    <h3 className="text-base font-bold text-slate-navy">{p.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-snug flex-1">{p.question}</p>
                  <div className={`mt-4 inline-flex self-start px-3 py-1.5 rounded-md text-xs font-medium ${a.tagBg} ${a.tagText}`}>
                    {p.tagLabel}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overtime Lens banner */}
          <div className="border-2 border-orange-light/60 bg-orange-50/40 rounded-xl px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange flex items-center justify-center text-white">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-orange">Overtime Lens</span>
            </div>
            <div className="h-6 w-px bg-orange-light/60 hidden sm:block" />
            <span className="text-sm text-gray-700">Actual OT and Scheduled OT</span>
            <div className="flex items-center gap-2 text-sm text-gray-600 sm:ml-auto">
              <Users className="w-4 h-4 text-orange" />
              A critical layer across all four comparisons.
            </div>
          </div>

          {/* Story flow */}
          <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
            {PILLARS.map((p, idx) => {
              const a = ACCENT_STYLES[p.accent];
              return (
                <React.Fragment key={p.number}>
                  <div className="flex items-start gap-2 max-w-[200px]">
                    <span className={`w-6 h-6 mt-0.5 rounded-full ${a.numberBg} ${a.numberText} text-xs font-bold flex items-center justify-center shrink-0`}>
                      {p.number}
                    </span>
                    <span className="text-sm text-gray-700 leading-snug">{p.storyLabel}</span>
                  </div>
                  {idx < PILLARS.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-teal hidden sm:block" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default CoreLaborFramework;
