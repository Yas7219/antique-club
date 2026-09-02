import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { CurrencyProvider } from "@/lib/currency";
import { KycProvider } from "@/lib/kyc";
import { NotificationsProvider } from "@/lib/notifications";
import { LanguageProvider } from "@/lib/language";
import Index from "./legacy-pages/Index.tsx";
import NotFound from "./legacy-pages/NotFound.tsx";
import Auth from "./legacy-pages/Auth.tsx";
import Marketplace from "./legacy-pages/Marketplace.tsx";
import ProductDetail from "./legacy-pages/ProductDetail.tsx";
import Sell from "./legacy-pages/Sell.tsx";
import Profile from "./legacy-pages/Profile.tsx";
import Chat from "./legacy-pages/Chat.tsx";
import PrivateConversation from "./legacy-pages/PrivateConversation.tsx";
import Wishlist from "./legacy-pages/Wishlist.tsx";
import Verification from "./legacy-pages/Verification.tsx";
import Admin from "./legacy-pages/Admin.tsx";
import Legal from "./legacy-pages/Legal.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <KycProvider>
            <NotificationsProvider>
            <CurrencyProvider>
              <LanguageProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/marketplace/:category" element={<Marketplace />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/sell" element={<Sell />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/messages/:id" element={<PrivateConversation />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/verify" element={<Verification />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/terms" element={<Legal />} />
                <Route path="/privacy" element={<Legal />} />
                <Route path="/authenticity" element={<Legal />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </LanguageProvider>
            </CurrencyProvider>
            </NotificationsProvider>
          </KycProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
