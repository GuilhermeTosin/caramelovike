import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";
import SiteHeaderAuthActions from "@/components/SiteHeaderAuthActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { setSeoMeta } from "@/lib/seo";
import { submitContactMessage } from "@/services/contact";

type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: Array<{ label?: string; text: string }>;
};

function EnglishHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-24">
          <Link to="/en" className="flex items-center gap-3 group">
            <div className="w-14 h-14 sm:w-[5.5rem] sm:h-[5.5rem] flex items-center justify-center">
              <img src="/logo.webp" alt="Caramelinho logo" className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-extrabold text-lg sm:text-2xl tracking-tight caramelo-text-gradient truncate">Caramelinho</div>
              <div className="text-[10px] sm:text-sm font-semibold text-foreground/75 whitespace-nowrap overflow-hidden text-ellipsis">YOUR BRAZILIAN BUSINESS FINDER ABROAD</div>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <SiteHeaderAuthActions className="flex items-center gap-1.5 sm:gap-3" compact />
          </div>
        </div>
      </div>
    </header>
  );
}

function EnglishPageShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  useEffect(() => {
    setSeoMeta(title, description);
  }, [description, title]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EnglishHeader />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}

function BackToEnglishHome() {
  return <Link to="/en" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Back to home</Link>;
}

export function EnglishAboutPage() {
  return (
    <EnglishPageShell title="About Caramelinho | Caramelinho.com" description="Learn about Caramelinho, the platform that connects people abroad with Brazilian businesses and services.">
      <BackToEnglishHome />
      <h1 className="text-3xl font-bold mt-4">About Caramelinho</h1>
      <section className="mt-6 rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-100 via-amber-50 to-sky-100 p-3 sm:p-4">
        <div className="flex justify-center">
          <img src="/logo.webp" alt="Caramelinho mascot finding Brazilian businesses around the world" width={280} height={280} decoding="async" fetchPriority="high" className="w-full max-w-[220px] sm:max-w-[280px] h-auto object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.12)]" />
        </div>
      </section>
      <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
        <p>Welcome to <strong className="text-foreground">Caramelinho.com</strong>, a meeting point for the Brazilian community around the world.</p>
        <p>Living abroad should not mean losing access to familiar products, services and professionals. Caramelinho was created to make those connections easier and to strengthen Brazilian communities wherever they are.</p>
        <h2 className="text-2xl font-semibold text-foreground pt-3">Our mission</h2>
        <p>Our mission is to connect people abroad with Brazilian-owned businesses and Portuguese-speaking professionals they can trust.</p>
        <h2 className="text-2xl font-semibold text-foreground pt-3">Why Caramelinho?</h2>
        <p>The Brazilian caramel-colored mixed-breed dog is friendly, resilient and instantly recognizable. Our mascot is the guide that helps you discover the best Brazilian businesses near you.</p>
        <h2 className="text-2xl font-semibold text-foreground pt-3">What we offer</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong className="text-foreground">For customers:</strong> an easy way to find local Brazilian shops, services and professionals.</li>
          <li><strong className="text-foreground">For entrepreneurs:</strong> a public digital storefront that helps people discover and contact your business.</li>
        </ul>
        <p className="font-semibold text-foreground">Caramelinho.com: your guide to Brazilian businesses abroad.</p>
      </div>
    </EnglishPageShell>
  );
}

export function EnglishContactPage() {
  const { session } = useAuth();
  const [name, setName] = useState(session?.name || "");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Please complete all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSending(true);
    const result = await submitContactMessage({ name, email, subject, message });
    setSending(false);
    if (!result.ok) {
      toast.error(result.error || "We could not send your message right now.");
      return;
    }
    toast.success("Message sent successfully. We will get back to you soon.");
    setSubject("");
    setMessage("");
  };

  return (
    <EnglishPageShell title="Contact | Caramelinho.com" description="Contact Caramelinho for support, questions and partnership opportunities.">
      <BackToEnglishHome />
      <h1 className="text-3xl font-bold mt-4">Contact</h1>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Send us a message</h2>
          <p className="text-muted-foreground mt-2">Use this form for questions, technical support, partnerships or general requests.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="contact-name">Name *</Label><Input id="contact-name" className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></div>
            <div><Label htmlFor="contact-email">Email *</Label><Input id="contact-email" type="email" className="mt-1.5" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
            <div><Label htmlFor="contact-subject">Subject *</Label><Input id="contact-subject" className="mt-1.5" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="For example: a question about listing a business" /></div>
            <div><Label htmlFor="contact-message">Message *</Label><Textarea id="contact-message" className="mt-1.5 min-h-[140px]" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe your request with as much detail as possible." /></div>
            <Button type="submit" disabled={sending} className="w-full sm:w-auto">{sending ? "Sending..." : "Send message"}</Button>
          </form>
        </div>
        <aside className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Other channels</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Email:</strong> <a href="mailto:contato@caramelinho.com" className="text-primary hover:underline">contato@caramelinho.com</a></p>
            <p><strong className="text-foreground">Response time:</strong> usually within one business day.</p>
            <p><strong className="text-foreground">Common topics:</strong> business listings, account support, reports, suggestions and partnerships.</p>
          </div>
        </aside>
      </div>
    </EnglishPageShell>
  );
}

const privacySections: LegalSection[] = [
  { heading: "1. Information we collect", paragraphs: ["To operate our business directory, we may collect information you provide when creating an account, sending a contact request, publishing a review or listing a business."], bullets: [{ label: "Information you provide:", text: "name, email, phone number, business address, images and other content you choose to submit." }, { label: "Location data:", text: "location may be requested only to show relevant nearby results. You can revoke this permission in your device or browser settings." }, { label: "Automatically collected information:", text: "navigation data, IP address, browser and device information, visited pages and time spent on the platform." }] },
  { heading: "2. How we use information", bullets: [{ text: "Show relevant businesses and service providers near your location." }, { text: "Create and manage user and advertiser profiles." }, { text: "Process reviews, comments and interactions with listings." }, { text: "Improve platform security and prevent fraudulent activity." }, { text: "Send administrative communications, support responses and security notices." }] },
  { heading: "3. Sharing and public information", bullets: [{ label: "We do not sell your data:", text: "Caramelinho does not sell, rent or trade personal data, contact information or browsing history to third parties." }, { label: "Public profiles:", text: "information published in a business listing or review can become publicly visible so other users can find it." }, { label: "Technical providers:", text: "limited technical data may be processed by infrastructure, hosting and map providers solely to operate the platform." }, { label: "Legal requirements:", text: "we may disclose information when required by law or to protect the rights and safety of Caramelinho and its users." }] },
  { heading: "4. Cookies and analytics", paragraphs: ["We use essential cookies to keep the platform working and, when enabled, analytics cookies to understand site usage and performance. You can manage cookies in your browser settings. Google Analytics processes aggregated usage data according to Google policies." ] },
  { heading: "5. Information security", paragraphs: ["We use industry-standard technical and organizational measures, including encryption and SSL certificates, to protect personal information. No internet transmission or electronic storage method is completely secure, so absolute security cannot be guaranteed." ] },
  { heading: "6. Your rights", bullets: [{ text: "Access, correct or update profile information." }, { text: "Revoke location permissions through your device settings." }, { text: "Request permanent deletion of your account, personal data or business listing by contacting us." }] },
  { heading: "7. External links", paragraphs: ["Listed businesses may link to their own websites or social media accounts. This policy applies only to Caramelinho, and we are not responsible for third-party privacy practices or content." ] },
  { heading: "8. Changes to this policy", paragraphs: ["We may update this policy to reflect operational, legal or privacy-practice changes. Material changes will be reflected by the date at the end of this page." ] },
  { heading: "9. Contact", paragraphs: ["For questions, concerns or requests about this Privacy Policy or your data, please contact us." ] },
];

const termsSections: LegalSection[] = [
  { heading: "1. Nature of the service and Caramelinho's role", paragraphs: ["Caramelinho operates as a digital directory and a space for business listings. Our role is to make it easier for users to find businesses and service providers."], bullets: [{ label: "We are not an intermediary:", text: "Caramelinho is not a broker, representative, agent, guarantor or party to transactions between users and listed businesses." }, { label: "Directory only:", text: "we provide digital space for businesses to present their products and services." }] },
  { heading: "2. Disclaimer of liability", paragraphs: ["By using this site, you understand that Caramelinho and its administrators are not responsible for interactions, transactions or disputes arising from listings."], bullets: [{ label: "Fraud and scams:", text: "unlawful acts or bad faith by any listed business or provider." }, { label: "Quality and delivery:", text: "the quality, safety, legality, accuracy or delivery of advertised products and services." }, { label: "Loss or damage:", text: "direct, indirect, material or non-material losses resulting from commercial transactions or interactions." }, { label: "Accuracy of information:", text: "advertisers are responsible for their own prices, hours, addresses, qualifications and availability." }, { label: "Consumer disputes:", text: "Caramelinho does not mediate, arbitrate or intervene in disputes between customers and providers." }] },
  { heading: "3. Third-party content", paragraphs: ["Business profiles, descriptions, photos, logos and reviews are supplied by business owners or platform users."], bullets: [{ label: "Advertiser responsibility:", text: "advertisers are solely responsible for content they publish and for having the necessary rights to it." }, { label: "Removal rights:", text: "we may monitor, edit, refuse or remove listings, content or reviews when necessary, including in suspected fraud or rights violations." }] },
  { heading: "4. Third-party links", paragraphs: ["Listings may contain links to external websites, social networks or applications. Accessing external links is at your own risk, and Caramelinho is not responsible for their content, privacy policies or practices." ] },
  { heading: "5. System availability", paragraphs: ["We work to keep Caramelinho available and reliable, but cannot guarantee uninterrupted, secure or error-free operation, immediate correction of software issues, or that hosting infrastructure is free from harmful components." ] },
  { heading: "6. Intellectual property", paragraphs: ["Original platform content, including source code, design, layout, informational texts, databases, logos and brand identity, belongs to Caramelinho or is properly licensed. Unauthorized copying, scraping or distribution is prohibited." ] },
  { heading: "7. Indemnification", paragraphs: ["You agree to defend and indemnify Caramelinho, its owners, directors, employees and partners against claims, losses or expenses arising from improper site use, violation of these terms, transactions with other users or rights violations in content you submit." ] },
  { heading: "8. Changes to these terms", paragraphs: ["We may modify or replace these terms at any time. Changes take effect when published, and continued use of the platform constitutes acceptance of the updated terms." ] },
  { heading: "9. Governing law and venue", paragraphs: ["These terms are governed by applicable law. Disputes related to these terms are subject to the competent courts of Montreal, Quebec, Canada." ] },
];

function LegalPage({ title, description, sections, updatedAt }: { title: string; description: string; sections: LegalSection[]; updatedAt: string }) {
  return (
    <EnglishPageShell title={`${title} | Caramelinho.com`} description={description}>
      <BackToEnglishHome />
      <h1 className="text-3xl font-bold mt-4">{title}</h1>
      <div className="mt-6 rounded-xl border border-border bg-card p-6 sm:p-8 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold">{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 text-muted-foreground leading-relaxed">{paragraph}</p>)}
            {section.bullets ? <ul className="mt-3 list-disc pl-6 text-muted-foreground space-y-2">{section.bullets.map((bullet) => <li key={bullet.text}>{bullet.label ? <strong className="text-foreground">{bullet.label} </strong> : null}{bullet.text}</li>)}</ul> : null}
          </section>
        ))}
        <p className="pt-2 text-sm text-muted-foreground"><strong className="text-foreground">Last updated:</strong> {updatedAt}</p>
      </div>
    </EnglishPageShell>
  );
}

export function EnglishPrivacyPage() {
  return <LegalPage title="Privacy Policy" description="Learn how Caramelinho collects, uses and protects personal information." sections={privacySections} updatedAt="July 31, 2026" />;
}

export function EnglishTermsPage() {
  return <LegalPage title="Terms and Conditions" description="Read the terms and conditions for using the Caramelinho platform." sections={termsSections} updatedAt="May 24, 2026" />;
}