import maltese from '../../static/maltese.svg';
import malteseFace from '../../static/maltese-face.svg';

export function Maltese({ face = false, className = "" }: { face?: boolean; className?: string }) {
  return <img src={face ? malteseFace : maltese} alt="A fluffy white Maltese with a pink bow" className={className} draggable={false} />;
}
