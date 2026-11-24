import { SideMenu } from "./SideMenu";
import { FallingTreats } from "./FallingTreats";

export type LayoutProps = {
  menuItems?: React.ReactNode[];
  children: React.ReactNode;
  narrow?: boolean;
};

export function Layout({ menuItems = [], children, narrow = false }: LayoutProps) {
  return (
    <div className="min-h-screen flex lg:items-center justify-center p-4 lg:overflow-hidden">
      <FallingTreats />
      <div className={`relative container mx-auto ${narrow ? 'max-w-xl' : 'max-w-5xl'}`}>
        {menuItems.length > 0 && (
          <SideMenu>
            {menuItems}
          </SideMenu>
        )}

        <div className="my-10 md:my-16 flex flex-col justify-around lg:flex-row gap-12 md:gap-16">
          {children}
        </div>
      </div>
    </div>
  );
}
