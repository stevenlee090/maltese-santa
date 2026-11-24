interface AccordionContainerProps {
  children: React.ReactNode;
}

export function AccordionContainer({ children }: AccordionContainerProps) {
  return (
    <div className="bg-white/90 backdrop-blur p-4 sm:p-6 rounded-2xl shadow-lg shadow-pink-300/40 h-[75vh] flex flex-col">
      {children}
    </div>
  );
} 