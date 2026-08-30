import { AnnouncementStrip } from "@/components/nav/AnnouncementStrip";
import { TopNav } from "@/components/nav/TopNav";
import { Footer } from "@/components/home/Footer";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { CartDrawer } from "@/components/cart/CartDrawer";

/**
 * Storefront shell. Lives in a route group so `/admin` (and any future
 * non-commerce surface) never renders consumer announcement, nav, footer,
 * countdown, mobile tabs, or cart chrome. URL paths are unchanged.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <AnnouncementStrip />
      <TopNav />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
      <BottomTabBar />
      <CartDrawer />
    </>
  );
}
