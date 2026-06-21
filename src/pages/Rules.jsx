import React from 'react';
import { ArrowLeft, Clock, CheckCircle, Lock, Zap, Trophy, DollarSign, Shield, BarChart2, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const brandRuleColor = 'text-primary bg-primary/5 border-primary/10';
const goldRuleColor = 'text-gold bg-yellow-50 border-yellow-100';

const RULES = [
  { icon: Clock, title: 'Time Limit', desc: 'Each question has an 8-12 second timer. Faster correct answers earn bonus points.', color: brandRuleColor },
  { icon: CheckCircle, title: 'Scoring', desc: 'Correct answer: 100 base points + up to 50 speed bonus. Wrong or no answer: 0 points.', color: brandRuleColor },
  { icon: Lock, title: 'Final Answers', desc: 'Once submitted, answers cannot be changed. Choose carefully.', color: brandRuleColor },
  { icon: Zap, title: 'Speed Bonus', desc: 'The faster you answer correctly, the more bonus points you earn on top of the base score.', color: goldRuleColor },
  { icon: Trophy, title: 'Prizes', desc: '1st place wins the main prize. Top 3 share the jackpot equally. Adjusted by admin each game.', color: goldRuleColor },
  { icon: DollarSign, title: 'Claiming Prizes', desc: 'Winners must submit a prize claim within 48 hours of the game ending.', color: brandRuleColor },
  { icon: Shield, title: 'Fair Play', desc: 'Bots, scripts, duplicate accounts, or any cheating tools result in permanent disqualification.', color: brandRuleColor },
  { icon: BarChart2, title: 'Tiebreaker', desc: 'Players with equal scores are ranked by total response speed - the faster player wins.', color: brandRuleColor },
  { icon: Flag, title: 'Mini App Ready', desc: 'The experience is mobile-first and also works on the Render web URL for testing.', color: goldRuleColor },
];

export default function Rules() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-4 pt-6 pb-4 bg-card border-b border-border">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <h1 className="font-game text-lg font-black text-foreground">Game Rules</h1>
        </div>
      </div>
      <div className="px-4 pt-4 space-y-2.5">
        {RULES.map(({ icon: Icon, title, desc, color }, i) => (
          <div
            key={title}
            className="bg-card rounded-2xl p-4 border border-border flex gap-3 shadow-sm animate-slide-up"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${color}`}>
              <Icon size={16} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-0.5">{title}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
        <div className="mt-4 p-4 bg-card rounded-2xl border border-border text-center">
          <p className="text-xs text-muted-foreground">By playing Dink Game, you agree to these rules. <span className="text-primary font-semibold">Play fair.</span></p>
        </div>
      </div>
    </div>
  );
}
