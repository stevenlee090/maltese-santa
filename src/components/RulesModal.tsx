import { useState, useEffect } from "react";
import { X, Plus, Link, LinkBreak } from "@phosphor-icons/react";
import { Participant, Rule } from '../types';
import { useTranslation } from 'react-i18next';
import { produce } from "immer";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantId: string;
  participants: Record<string, Participant>;
  onChangeParticipants: (newParticipants: Record<string, Participant>) => void;
}

export function RulesModal({
  isOpen,
  onClose,
  participantId,
  participants,
  onChangeParticipants,
}: RulesModalProps) {
  const { t } = useTranslation();
  const participant = participants[participantId];
  const [localRules, setLocalRules] = useState<Rule[]>(participant.rules);
  const [localWishes, setLocalWishes] = useState(participant.wishes ?? '');

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  const addRule = (type: 'must' | 'mustNot') => {
    setLocalRules([...localRules, { type, targetParticipantId: '' }]);
  };

  const updateRule = (index: number, targetParticipantId: string) => {
    const newRules = [...localRules];
    newRules[index].targetParticipantId = targetParticipantId;
    setLocalRules(newRules);
  };

  const removeRule = (index: number) => {
    setLocalRules(localRules.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onChangeParticipants(produce(participants, draft => {
      // Drop half-filled rules (no person selected) so they can't break the draw.
      draft[participantId].rules = localRules.filter(rule => rule.targetParticipantId);
      draft[participantId].wishes = localWishes.trim() || undefined;
    }));
    onClose();
  };

  const hasMustRule = localRules.some(rule => rule.type === 'must');
  const hasMustNotRule = localRules.some(rule => rule.type === 'mustNot');

  if (!isOpen)
      return null;

  return (
    <div className="fixed inset-0 bg-pink-900/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-xl w-full m-4 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-pink-600">
          {t('rules.title', { name: participant.name })}
        </h2>

        <label className="block mb-6 space-y-1">
          <span className="text-sm text-pink-900/70">{t('rules.wishesLabel')}</span>
          <textarea
            value={localWishes}
            onChange={(e) => setLocalWishes(e.target.value)}
            maxLength={280}
            placeholder={t('rules.wishesPlaceholder')}
            className="w-full p-2 border-2 border-pink-200 focus:border-pink-400 outline-none rounded-lg min-h-[70px]"
          />
          <span className="block text-xs text-pink-900/50">{t('rules.wishesHelp')}</span>
        </label>

        <div className="space-y-4 mb-6">
          {localRules.map((rule, index) => (
            <div key={index} className="flex gap-2 items-center">
              <span>
                {rule.type === 'must' 
                  ? t('rules.mustBePairedWith')
                  : t('rules.mustNotBePairedWith')
                }
              </span>
              <select
                value={rule.targetParticipantId}
                onChange={(e) => updateRule(index, e.target.value)}
                className="flex-1 min-w-0 p-2 border-2 border-pink-200 rounded-lg"
              >
                <option value="">{t('rules.selectParticipant')}</option>
                {Object.values(participants)
                  .filter(p => p.id !== participantId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))
                }
              </select>
              <button
                onClick={() => removeRule(index)}
                className="p-2 text-red-500 hover:text-red-700"
                aria-label={t('rules.removeRule')}
              >
                <X size={20} weight="bold" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => addRule('must')}
            disabled={hasMustNotRule}
            className={`flex-1 p-2 rounded flex items-center justify-center gap-2
              ${hasMustNotRule 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-pink-400 hover:bg-pink-500'} text-white`}
          >
            <Link size={20} />
            {t('rules.addMustRule')}
          </button>
          <button
            onClick={() => addRule('mustNot')}
            disabled={hasMustRule}
            className={`flex-1 p-2 rounded flex items-center justify-center gap-2
              ${hasMustRule 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-rose-600 hover:bg-rose-700'} text-white`}
          >
            <LinkBreak size={20} />
            {t('rules.addMustNotRule')}
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            {t('rules.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600"
          >
            {t('rules.saveRules')}
          </button>
        </div>
      </div>
    </div>
  );
} 