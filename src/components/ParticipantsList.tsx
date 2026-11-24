import { useState } from 'react';
import { produce } from 'immer';
import { useTranslation } from 'react-i18next';
import { Gear, Gift, PawPrint, Plus, Sparkle, X } from "@phosphor-icons/react";
import { Participant } from '../types';

interface ParticipantsListProps {
  participants: Record<string, Participant>;
  onChangeParticipants: (newParticipants: Record<string, Participant>) => void;
  onOpenRules: (participantId: string) => void;
  onDraw: () => void;
  isDrawing: boolean;
}

export function ParticipantsList({
  participants,
  onChangeParticipants,
  onOpenRules,
  onDraw,
  isDrawing,
}: ParticipantsListProps) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');

  const addParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow "Haley, Baihan, David" or one per line in one go.
    const names = newName.split(/[,\n]/).map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    onChangeParticipants(produce(participants, draft => {
      for (const name of names) {
        const id = crypto.randomUUID();
        draft[id] = { id, name, rules: [] };
      }
    }));
    setNewName('');
  };

  const renameParticipant = (id: string, name: string) => {
    onChangeParticipants(produce(participants, draft => {
      draft[id].name = name;
    }));
  };

  const removeParticipant = (id: string) => {
    onChangeParticipants(produce(participants, draft => {
      delete draft[id];
      for (const participant of Object.values(draft)) {
        participant.rules = participant.rules.filter(rule => rule.targetParticipantId !== id);
      }
    }));
  };

  const list = Object.values(participants);

  return (
    <div className="space-y-4">
      <form onSubmit={addParticipant} className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder={t('participants.enterName')}
          aria-label={t('participants.enterName')}
          className="flex-1 min-w-0 p-2 border-2 border-pink-200 focus:border-pink-400 outline-none rounded-lg"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="px-3 bg-pink-400 text-white rounded-lg hover:bg-pink-500 disabled:opacity-50 flex items-center gap-1"
        >
          <Plus weight="bold" /> {t('participants.addPerson')}
        </button>
      </form>

      <ul className="space-y-2" data-testid="participants">
        {list.length === 0 && <li className="text-sm text-pink-900/50 italic">{t('participants.empty')}</li>}
        {list.map(participant => (
          <li key={participant.id} className="flex gap-2 items-center bg-pink-50 rounded-lg pl-3 pr-2 py-1">
            <PawPrint className="text-pink-400 flex-none" weight="fill" />
            <input
              value={participant.name}
              onChange={e => renameParticipant(participant.id, e.target.value)}
              aria-label={t('participants.enterName')}
              className="flex-1 min-w-0 bg-transparent p-1 outline-none focus:bg-white rounded"
            />
            <button
              onClick={() => onOpenRules(participant.id)}
              className={`px-2 py-1 rounded hover:opacity-80 flex-shrink-0 text-xs flex items-center gap-1 ${
                participant.rules.length > 0 || participant.wishes ? 'bg-pink-400 text-white' : 'bg-white text-pink-900/60'
              }`}
              title={t('participants.editRules')}
              aria-label={`${t('participants.editRules')}: ${participant.name}`}
            >
              {participant.wishes && <Gift weight="fill" />}
              <Gear weight="bold" />
              {participant.rules.length > 0 && t('participants.rulesCount', { count: participant.rules.length })}
            </button>
            <button
              onClick={() => removeParticipant(participant.id)}
              className="px-2 py-1 bg-white text-pink-600 rounded hover:bg-pink-100 flex-shrink-0"
              aria-label={`${t('participants.removeParticipant')} ${participant.name}`}
            >
              <X weight="bold" />
            </button>
          </li>
        ))}
      </ul>

      <p className="text-xs text-pink-900/50">{t('participants.generationWarning')}</p>

      <button
        type="button"
        onClick={onDraw}
        disabled={isDrawing}
        className="w-full bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 disabled:opacity-60 flex items-center justify-center gap-2 text-lg shadow"
      >
        <Sparkle size={20} weight="fill" />
        {isDrawing ? t('participants.drawing') : t('participants.draw')}
      </button>
    </div>
  );
}
