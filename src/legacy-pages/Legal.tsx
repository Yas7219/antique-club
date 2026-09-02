import { Link, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const content = {
  terms: {
    title: "Terms of Membership",
    body: "AntiqueClub is a curated marketplace. By using the salon, you agree to provide accurate information and to respect our collectors, sellers, and verification process.",
  },
  privacy: {
    title: "Privacy Policy",
    body: "We only use account and marketplace information to operate AntiqueClub, protect the community, and improve the collector experience. We do not sell personal information.",
  },
  authenticity: {
    title: "Authenticity Guarantee",
    body: "Every eligible piece is reviewed through our verification workflow. Our guarantee covers the authenticity information supplied by the seller and the checks completed by AntiqueClub.",
  },
} as const;

export default function Legal() {
  const { pathname } = useLocation();
  const topic = pathname.slice(1) as keyof typeof content;
  const page = content[topic] ?? content.terms;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container flex-1 py-16">
        <Link to="/" className="text-sm text-gold hover:underline">Back to the salon</Link>
        <div className="mx-auto mt-8 max-w-2xl frame-card p-8 md:p-12">
          <p className="font-serif-cap text-xs text-gold mb-3">AntiqueClub</p>
          <h1 className="font-display text-4xl mb-5">{page.title}</h1>
          <p className="text-muted-foreground leading-relaxed">{page.body}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
