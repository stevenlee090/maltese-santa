import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowClockwise, ArrowSquareOut, CheckCircle, Circle } from '@phosphor-icons/react';
import { CopyButton } from './CopyButton';
import { getStatus, resetSlot } from '../utils/api';
import { SlotStatus } from '../types';
import { shortUrl } from '../utils/links';

export interface PublishedDraw {
  url: string;
  drawId: string;
  adminToken: string;
}

/** Organiser view of a published draw: share link + who has opened theirs. */
export function DrawStatus({ draw }: { draw: PublishedDraw }) {
  const { t } = useTranslation();
  const [slots, setSlots] = useState<SlotStatus[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  // Always share the short form (also upgrades draws made before short links).
  const url = shortUrl(draw.drawId);

  const refresh = useCallback(async () => {
    try {
      setSlots((await getStatus(draw.drawId)).slots);
    } catch {
      setSlots(null);
    }
  }, [draw.drawId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  const reset = async (name: string) => {
    await resetSlot(draw.drawId, name, draw.adminToken).catch(() => {});
    setConfirming(null);
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="p-4 bg-pink-50 rounded-lg space-y-3">
        <p className="text-pink-950/70">{t('links.ready')}</p>
        <CopyButton textToCopy={url} className="w-full p-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600">
          {t('links.copyGroupLink')}
        </CopyButton>
        <a
          href={url}
          className="w-full p-2 bg-white text-pink-600 rounded-lg hover:bg-pink-100 flex items-center justify-center gap-2"
        >
          <ArrowSquareOut weight="bold" />
          {t('links.openLink')}
        </a>
      </div>

      <div className="p-4 bg-white border-2 border-pink-100 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-pink-600">{t('links.statusTitle')}</h3>
          <button onClick={refresh} className="text-pink-500 hover:text-pink-700 flex items-center gap-1 text-sm">
            <ArrowClockwise weight="bold" /> {t('links.refresh')}
          </button>
        </div>
        <ul className="space-y-1" data-testid="status">
          {slots?.map(slot => (
            <li key={slot.name} className="flex items-center gap-2 text-sm">
              {slot.claimed
                ? <CheckCircle weight="fill" className="text-green-500" />
                : <Circle className="text-pink-300" />}
              <span className="flex-1">{slot.name}</span>
              {!slot.claimed && <span className="text-pink-900/40">{t('links.notOpened')}</span>}
              {slot.claimed && confirming !== slot.name && (
                <button onClick={() => setConfirming(slot.name)} className="text-xs px-2 py-0.5 bg-pink-50 rounded hover:bg-pink-100">
                  {t('links.reset')}
                </button>
              )}
              {confirming === slot.name && (
                <span className="flex items-center gap-1">
                  <button onClick={() => reset(slot.name)} className="text-xs px-2 py-0.5 bg-rose-600 text-white rounded">
                    {t('links.resetYes')}
                  </button>
                  <button onClick={() => setConfirming(null)} className="text-xs px-2 py-0.5 bg-pink-50 rounded">✕</button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {confirming && <p className="mt-2 text-xs text-pink-900/60">{t('links.resetConfirm', { name: confirming })}</p>}
      </div>
    </div>
  );
}
