import { Bone, PawPrint } from '@phosphor-icons/react';

interface PostCardProps {
  children: React.ReactNode;
  className?: string;
}

export function PostCard({ children, className = "" }: PostCardProps) {
  return (
    <div className={`shadow-lg shadow-pink-300/40 relative z-10 transform rotate-1 transition-transform duration-300 p-3 bg-postcard rounded-2xl ${className}`}>
      <div className="relative p-6 sm:p-8 bg-white rounded-xl">
        <div className="absolute -top-5 -left-5 w-11 h-11 bg-pink-400 text-white rounded-full flex items-center justify-center transform -rotate-12 shadow">
          <PawPrint size={24} weight="fill" />
        </div>

        {children}

        <div className="absolute -bottom-5 -right-5 w-11 h-11 bg-pink-500 text-white rounded-full flex items-center justify-center transform rotate-12 shadow">
          <Bone size={24} weight="fill" />
        </div>
      </div>
    </div>
  );
}
