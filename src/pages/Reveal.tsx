import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Gift, Info, Lock, PawPrint } from '@phosphor-icons/react';
import { Layout } from '../components/Layout';
import { PostCard } from '../components/PostCard';
import { Maltese } from '../components/Maltese';
import { claimedNamesOnThisDevice, claimTokenFor, forgetClaim, openEnvelope, parseBundle } from '../utils/links';
import { ApiError, claimSlot, getBundle, getStatus, readWishes, saveWishes } from '../utils/api';
import { Assignment, DrawBundle } from '../types';

type View =
  | { kind: 'loading' }
  | { kind: 'pick' }
  | { kind: 'confirm'; name: string }
  | { kind: 'opening'; name: string }
  | { kind: 'taken'; name: string }
  | { kind: 'revealed'; assignment: Assignment }
  | { kind: 'error'; message: string };

export function Reveal() {
  const { t } = useTranslation();
  const { drawId } = useParams();
  const [searchParams] = useSearchParams();
  // Long links carry the envelopes; short links (#/d/<id>) fetch them.
  const inlineBundle = useMemo(() => parseBundle(searchParams.get('d')), [searchParams]);
  const id = drawId ?? inlineBundle?.id;
  const [fetched, setFetched] = useState<DrawBundle | 'loading' | 'notFound' | 'error'>('loading');

  // Always prefer the server's copy of the envelopes: it may have been
  // upgraded (e.g. wishlist read tokens added) since a long link was shared.
  useEffect(() => {
    if (!id) return;
    getBundle(id)
      .then(({ envelopes, info }) => setFetched({ v: 2, id, envelopes, info }))
      .catch(err => setFetched(err instanceof ApiError && err.code === 'notFound' ? 'notFound' : 'error'));
  }, [id]);

  if (!id) return <Message body={t('reveal.invalidLink')} />;
  if (fetched === 'loading') return <Message body={t('reveal.opening')} emoji="🐾" />;
  // Long links from before server-side bundles still work on their own.
  if (fetched === 'notFound' || fetched === 'error') {
    if (inlineBundle) return <RevealDraw bundle={inlineBundle} />;
    return <Message body={fetched === 'notFound' ? t('reveal.notFound') : t('reveal.error')} />;
  }
  return <RevealDraw bundle={fetched} />;
}

function RevealDraw({ bundle }: { bundle: DrawBundle }) {
  const { t } = useTranslation();
  const names = Object.keys(bundle.envelopes);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [mine, setMine] = useState(() => claimedNamesOnThisDevice(bundle.id));
  const [view, setView] = useState<View>({ kind: 'loading' });

  const open = useCallback(async (name: string) => {
    setView({ kind: 'opening', name });
    try {
      const { key } = await claimSlot(bundle.id, name, claimTokenFor(bundle.id, name));
      const assignment = await openEnvelope(bundle, name, key);
      setMine(claimedNamesOnThisDevice(bundle.id));
      setView(assignment ? { kind: 'revealed', assignment } : { kind: 'error', message: t('reveal.invalidLink') });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'alreadyClaimed') {
        forgetClaim(bundle.id, name);
        setMine(claimedNamesOnThisDevice(bundle.id));
        setView({ kind: 'taken', name });
      } else if (err instanceof ApiError && err.code === 'notFound') {
        setView({ kind: 'error', message: t('reveal.notFound') });
      } else {
        setView({ kind: 'error', message: t('reveal.error') });
      }
    }
  }, [bundle, t]);

  const loadStatus = useCallback(async () => {
    try {
      const { slots } = await getStatus(bundle.id);
      setClaimed(new Set(slots.filter(s => s.claimed).map(s => s.name)));
      return true;
    } catch (err) {
      setView({ kind: 'error', message: err instanceof ApiError && err.code === 'notFound' ? t('reveal.notFound') : t('reveal.error') });
      return false;
    }
  }, [bundle.id, t]);

  useEffect(() => {
    (async () => {
      if (!(await loadStatus())) return;
      // Returning visitor with exactly one name on this device: go straight to it.
      const own = claimedNamesOnThisDevice(bundle.id);
      if (own.length === 1) open(own[0]);
      else setView({ kind: 'pick' });
    })();
  }, [bundle.id, loadStatus, open]);

  const backToPicker = () => {
    setView({ kind: 'pick' });
    loadStatus();
  };

  const pick = (name: string) => {
    if (mine.includes(name)) open(name);
    else setView({ kind: 'confirm', name });
  };

  return (
    <Layout narrow>
      <div className="w-full">
        <PostCard>
          {view.kind === 'loading' && <p className="text-center text-pink-900/60 py-10">{t('reveal.opening')}</p>}

          {view.kind === 'pick' && (
            <div className="text-center space-y-4">
              <Maltese face className="w-24 h-24 mx-auto animate-wag" />
              <h1 className="text-3xl font-bold text-pink-600">{t('reveal.whoAreYou')}</h1>
              <p className="text-pink-950/60 text-sm">{t('reveal.pickHint')}</p>
              <div className="grid grid-cols-2 gap-2" data-testid="name-picker">
                {names.map(name => {
                  const isMine = mine.includes(name);
                  const isTaken = claimed.has(name) && !isMine;
                  return (
                    <button
                      key={name}
                      onClick={() => pick(name)}
                      disabled={isTaken}
                      className={`px-3 py-3 rounded-xl flex items-center justify-center gap-2 text-lg transition-colors ${
                        isMine ? 'bg-pink-500 text-white hover:bg-pink-600'
                          : isTaken ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                      }`}
                    >
                      {isTaken ? <Lock weight="fill" /> : <PawPrint weight="fill" />}
                      <span className="truncate">{name}</span>
                      {isMine && <span className="text-xs opacity-80">({t('reveal.mine')})</span>}
                      {isTaken && <span className="text-xs">({t('reveal.opened')})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view.kind === 'confirm' && (
            <div className="text-center space-y-4">
              <Maltese face className="w-24 h-24 mx-auto animate-wag" />
              <h1 className="text-3xl font-bold text-pink-600">{t('reveal.confirmTitle', { name: view.name })}</h1>
              <p className="text-pink-950/70">{t('reveal.confirmBody', { name: view.name })}</p>
              {mine.length > 0 && (
                <p className="p-3 bg-amber-50 text-amber-900 rounded-lg text-sm">
                  {t('reveal.confirmOtherDevice', { others: mine.join(', ') })}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={backToPicker} className="flex-1 p-3 bg-white border-2 border-pink-200 text-pink-600 rounded-lg hover:bg-pink-50">
                  {t('reveal.confirmNo')}
                </button>
                <button onClick={() => open(view.name)} className="flex-1 p-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 shadow">
                  {t('reveal.confirmYes', { name: view.name })}
                </button>
              </div>
            </div>
          )}

          {view.kind === 'opening' && <p className="text-center text-pink-900/60 py-10">{t('reveal.opening')}</p>}

          {view.kind === 'taken' && (
            <div className="text-center space-y-4">
              <Maltese face className="w-24 h-24 mx-auto grayscale-[40%]" />
              <h1 className="text-2xl font-bold text-pink-600">{t('reveal.alreadyClaimedTitle', { name: view.name })}</h1>
              <p className="text-pink-950/70">{t('reveal.alreadyClaimedBody', { name: view.name })}</p>
              <BackButton onClick={backToPicker} />
            </div>
          )}

          {view.kind === 'error' && (
            <div className="text-center space-y-4 py-4">
              <div className="text-5xl">🙈</div>
              <p className="text-pink-950/70">{view.message}</p>
            </div>
          )}

          {view.kind === 'revealed' && (
            <>
              <Unwrap assignment={view.assignment} info={bundle.info} drawId={bundle.id} />
              {names.length > 0 && mine.length > 1 && <div className="mt-6 text-center"><BackButton onClick={backToPicker} /></div>}
            </>
          )}
        </PostCard>
      </div>
    </Layout>
  );
}

/** The giftee's wishes: organiser's notes + whatever they wrote themselves. */
function TheirWishes({ drawId, assignment }: { drawId: string; assignment: Assignment }) {
  const { t } = useTranslation();
  const [own, setOwn] = useState<string | null>(null);

  useEffect(() => {
    readWishes(drawId, assignment.to, { readToken: assignment.readToken })
      .then(r => setOwn(r.wishes))
      .catch(() => setOwn(''));
  }, [drawId, assignment.to, assignment.readToken]);

  const nothing = !assignment.wishes && own === '';

  return (
    <div className="p-4 bg-pink-50 rounded-lg space-y-3">
      <h2 className="font-bold text-pink-600 flex items-center gap-2"><Gift weight="fill" /> {t('reveal.wishesTitle')}</h2>
      {own && (
        <div>
          <p className="text-xs uppercase tracking-wide text-pink-400">{t('reveal.inTheirWords', { name: assignment.to })}</p>
          <p className="whitespace-pre-wrap text-pink-950/80" data-testid="their-own-wishes">{own}</p>
        </div>
      )}
      {assignment.wishes && (
        <div>
          {own && <p className="text-xs uppercase tracking-wide text-pink-400">{t('reveal.fromOrganiser')}</p>}
          <p className="whitespace-pre-wrap text-pink-950/70" data-testid="wishes">{assignment.wishes}</p>
        </div>
      )}
      {nothing && <p className="text-pink-950/70" data-testid="wishes">{t('reveal.noWishesYet', { name: assignment.to })}</p>}
    </div>
  );
}

/** Lets the person write their own wishlist for whoever drew them. */
function MyWishlist({ drawId, myName }: { drawId: string; myName: string }) {
  const { t } = useTranslation();
  const token = useMemo(() => claimTokenFor(drawId, myName), [drawId, myName]);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('');
  const [state, setState] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');

  useEffect(() => {
    readWishes(drawId, myName, { token })
      .then(r => { setText(r.wishes); setSaved(r.wishes); setState('idle'); })
      .catch(() => setState('idle'));
  }, [drawId, myName, token]);

  const save = async () => {
    setState('saving');
    try {
      await saveWishes(drawId, myName, token, text);
      setSaved(text.trim());
      setState('saved');
    } catch {
      setState('error');
    }
  };

  const dirty = text.trim() !== saved;

  return (
    <div className="mt-6 p-4 text-left bg-white border-2 border-dashed border-pink-300 rounded-lg space-y-2" data-testid="my-wishlist">
      <h2 className="font-bold text-pink-600 flex items-center gap-2"><PawPrint weight="fill" /> {t('reveal.myWishlistTitle')}</h2>
      <p className="text-sm text-pink-950/60">{t('reveal.myWishlistHelp')}</p>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); if (state === 'saved' || state === 'error') setState('idle'); }}
        maxLength={500}
        disabled={state === 'loading'}
        placeholder={t('reveal.myWishlistPlaceholder')}
        aria-label={t('reveal.myWishlistTitle')}
        className="w-full p-2 border-2 border-pink-200 focus:border-pink-400 outline-none rounded-lg min-h-[90px]"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-pink-900/50">
          {state === 'saved' ? t('reveal.myWishlistSaved') : state === 'error' ? t('reveal.myWishlistError') : `${text.length}/500`}
        </span>
        <button
          onClick={save}
          disabled={!dirty || state === 'saving' || state === 'loading'}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
        >
          {state === 'saving' ? t('reveal.myWishlistSaving') : t('reveal.myWishlistSave')}
        </button>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button onClick={onClick} className="px-4 py-2 text-pink-600 hover:bg-pink-50 rounded-lg inline-flex items-center gap-2">
      <ArrowLeft weight="bold" /> {t('reveal.back')}
    </button>
  );
}

function Unwrap({ assignment, info, drawId }: { assignment: Assignment; info?: string; drawId: string }) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4 text-pink-600">{t('reveal.title')}</h1>
      <p className="mb-4 text-pink-950/70">
        <Trans i18nKey="reveal.assignment" components={{ name: <span className="font-semibold text-pink-600">{assignment.from}</span> }} />
      </p>

      <AnimatePresence mode="wait">
        {!opened ? (
          <motion.button
            key="gift"
            onClick={() => setOpened(true)}
            className="mx-auto my-4 block"
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            exit={{ scale: 1.6, opacity: 0, rotate: 20 }}
            transition={{ duration: 0.35 }}
            aria-label={t('reveal.tapToReveal')}
          >
            <div className="relative w-44 h-44 mx-auto">
              <Gift className="w-full h-full text-pink-400 drop-shadow-lg" weight="duotone" />
              <Maltese face className="absolute -bottom-2 -right-6 w-20 h-20 animate-wag" />
            </div>
            <span className="block mt-2 text-pink-500 animate-pulse">{t('reveal.tapToReveal')}</span>
          </motion.button>
        ) : (
          <motion.div
            key="name"
            initial={{ scale: 0, rotateZ: -200 }}
            animate={{ scale: 1, rotateZ: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 12 }}
          >
            <div className="text-6xl sm:text-7xl font-bold p-4 font-dancing-script text-pink-600 break-words" data-testid="receiver">
              {assignment.to}
            </div>
            <Maltese className="w-32 mx-auto -mt-2 animate-wag" />

            <div className="mt-6 text-left space-y-3">
              <TheirWishes drawId={drawId} assignment={assignment} />
              {info && (
                <div className="flex p-4 bg-white border-2 border-pink-100 rounded-lg leading-6 text-pink-950/70 whitespace-pre-wrap">
                  <Info size={22} className="mr-3 flex-none text-pink-400" />
                  <p>{info}</p>
                </div>
              )}
            </div>

            <MyWishlist drawId={drawId} myName={assignment.from} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Message({ body, emoji = '🙈' }: { body: string; emoji?: string }) {
  return (
    <Layout narrow>
      <div className="w-full">
        <PostCard>
          <div className="text-center space-y-3 py-6">
            <div className="text-5xl">{emoji}</div>
            <p className="text-pink-950/70">{body}</p>
          </div>
        </PostCard>
      </div>
    </Layout>
  );
}
