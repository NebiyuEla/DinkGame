import React from 'react';
import { CheckCircle } from 'lucide-react';

const PAYMENT_METHODS = [
  'Commercial Bank of Ethiopia (CBE)',
  'Awash Bank',
  'Telebirr',
  'CBE Birr',
  'Wegagen Bank',
  'Abyssinia Bank',
  'ሌላ',
];

export { PAYMENT_METHODS };

export default function PaymentMethodDrawer({ open, selected, onSelect, onClose }) {
  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-border"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-4" />
        <p className="text-center font-game text-sm font-black text-foreground mb-3 px-4">የክፍያ ዘዴ ምረጡ</p>
        <div className="divide-y divide-border">
          {PAYMENT_METHODS.map(method => (
            <button key={method} onClick={() => { onSelect(method); onClose(); }}
              className="w-full flex items-center justify-between px-5 py-4 active:bg-muted/50 transition-colors">
              <span className="text-sm font-semibold text-foreground">{method}</span>
              {selected === method && <CheckCircle size={16} className="text-correct-green flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}