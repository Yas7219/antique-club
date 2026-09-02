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
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Sell from "./pages/Sell.tsx";
import Profile from "./pages/Profile.tsx";
import Chat from "./pages/Chat.tsx";
import Wishlist from "./pages/Wishlist.tsx";
import Verification from "./pages/Verification.tsx";
import Admin from "./pages/Admin.tsx";

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
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/sell" element={<Sell />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/verify" element={<Verification />} />
                <Route path="/admin" element={<Admin />} />
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
