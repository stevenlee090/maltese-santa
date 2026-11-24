import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { RulesModal } from '../components/RulesModal';
import { Accordion } from '../components/Accordion';
import { AccordionContainer } from '../components/AccordionContainer';
import { ParticipantsList } from '../components/ParticipantsList';
import { PostCard } from '../components/PostCard';
import { PageTransition } from '../components/PageTransition';
import { Layout } from '../components/Layout';
import { Maltese } from '../components/Maltese';
import { DrawStatus, PublishedDraw } from '../components/DrawStatus';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { drawAndPublish } from '../utils/links';
import { Participant } from '../types';

export function Home() {
  const { t } = useTranslation();

  const [participants, setParticipants] = useLocalStorage<Record<string, Participant>>('malteseSantaParticipants', {});
  const [instructions, setInstructions] = useLocalStorage<string>('malteseSantaInstructions', t('settings.defaultInstructions'));
  // Safe to keep: the link only holds encrypted envelopes, and the admin token
  // can only un-claim names, never read keys.
  const [published, setPublished] = useLocalStorage<PublishedDraw | null>('malteseSantaDraw', null);

  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<'participants' | 'links' | 'settings'>(published ? 'links' : 'participants');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);

  const handleDraw = async () => {
    setIsDrawing(true);
    setDrawError(null);
    try {
      const result = await drawAndPublish(participants, instructions);
      if (!result.ok) {
        setDrawError(t(`errors.${result.error}`));
        return;
      }
      setPublished({ url: result.url, drawId: result.drawId, adminToken: result.adminToken });
      setOpenSection('links');
    } finally {
      setIsDrawing(false);
    }
  };

  return <>
    <PageTransition>
      <Layout>
        <div className="lg:flex-[6_6_0%]">
          <PostCard>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Maltese face className="w-16 h-16 animate-wag flex-none" />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-pink-600">{t('home.title')}</h1>
                  <p className="text-pink-900/50">{t('home.subtitle')}</p>
                </div>
              </div>
              <div className="space-y-3 text-pink-950/70 leading-relaxed">
                <Trans i18nKey="home.explanation" components={{ p: <p />, b: <b className="text-pink-600" /> }} />
              </div>
            </div>
          </PostCard>
        </div>

        <div className="lg:flex-[5_5_0%]">
          <AccordionContainer>
            <Accordion
              title={t('participants.title')}
              isOpen={openSection === 'participants'}
              onToggle={() => setOpenSection('participants')}
              action={<span className="bg-white/30 rounded-full px-2 text-sm">{Object.keys(participants).length}</span>}
            >
              <ParticipantsList
                participants={participants}
                onChangeParticipants={setParticipants}
                onOpenRules={setSelectedParticipantId}
                onDraw={handleDraw}
                isDrawing={isDrawing}
              />
              {drawError && (
                <p role="alert" className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{drawError}</p>
              )}
            </Accordion>

            <Accordion
              title={t('settings.title')}
              isOpen={openSection === 'settings'}
              onToggle={() => setOpenSection('settings')}
            >
              <div className="p-1 space-y-2">
                <p className="text-xs text-pink-900/50">{t('settings.instructionsHelp')}</p>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  aria-label={t('settings.title')}
                  className="w-full p-2 border-2 border-pink-200 focus:border-pink-400 outline-none rounded-lg min-h-[100px]"
                />
              </div>
            </Accordion>

            {published && (
              <Accordion
                title={t('links.title')}
                isOpen={openSection === 'links'}
                onToggle={() => setOpenSection('links')}
              >
                <DrawStatus key={published.drawId} draw={published} />
              </Accordion>
            )}
          </AccordionContainer>
        </div>
      </Layout>
    </PageTransition>
    {selectedParticipantId && participants[selectedParticipantId] && (
      <RulesModal
        isOpen
        onClose={() => setSelectedParticipantId(null)}
        participants={participants}
        participantId={selectedParticipantId}
        onChangeParticipants={setParticipants}
      />
    )}
  </>;
}
