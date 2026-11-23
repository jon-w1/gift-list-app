import { TabBar } from "@/components/TabBar";
import { TAB_PAGE } from "@/components/Header";

/** My wishlist and Family & Friends share this layout, so the tab bar never redraws. */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={TAB_PAGE}>
      {children}
      <TabBar />
    </div>
  );
}
