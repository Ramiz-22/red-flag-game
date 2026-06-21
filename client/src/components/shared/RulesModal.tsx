import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  const { t } = useTranslation();

  const steps = [
    { title: t('rules.step1Title'), desc: t('rules.step1Desc'), icon: '💝' },
    { title: t('rules.step2Title'), desc: t('rules.step2Desc'), icon: '🚩' },
    { title: t('rules.step3Title'), desc: t('rules.step3Desc'), icon: '🗣️' },
    { title: t('rules.step4Title'), desc: t('rules.step4Desc'), icon: '👑' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-brand-red mb-6">{t('rules.title')}</h2>

            <div className="space-y-5">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center text-2xl">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">
                      {i + 1}. {step.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-brand-gold font-bold text-center mt-6">{t('rules.winCondition')}</p>

            <button onClick={onClose} className="btn-primary w-full mt-6">
              {t('rules.close')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
