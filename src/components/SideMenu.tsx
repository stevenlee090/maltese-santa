import { Link } from 'react-router-dom';

export function MenuItem({icon, to, onClick, children}: {icon: React.ReactNode, to?: string, onClick?: () => void, children: React.ReactNode}) {
  const contents = (
    <div className="flex items-center select-none">
      <div className={`flex items-center justify-center w-6 mr-2 text-center text-pink-500`}>{icon}</div>
      <div>{children}</div>
    </div>
  );

  const className = `flex bg-white/70 hover:bg-white transition-colors rounded-full shadow px-3 py-1 cursor-pointer items-baseline`;

  return to
    ? <Link className={className} to={to}>{contents}</Link>
    : <button type="button" className={className} onClick={onClick}>{contents}</button>;
}

export function SideMenu({children}: {children?: React.ReactNode}) {
  return (
    <div className="lg:absolute top-4 left-4 z-50 flex flex-wrap gap-2">
      {children}
    </div>
  );
}
