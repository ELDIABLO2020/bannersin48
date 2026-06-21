import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export function ContactBand() {
  return (
    <section className="bg-darkest text-white" aria-labelledby="contact-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-2 gap-2xl items-center">
          <div>
            <h2
              id="contact-h"
              className="font-display tracking-tight text-[clamp(34px,4.5vw,68px)] leading-[1.05] uppercase"
            >
              Get in touch
            </h2>
            <p className="mt-md text-body text-white/80 max-w-lg font-body">
              Questions about artwork, sizing, or delivery? Our support team is here to help before
              you place your order.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-md">
            <a
              href="mailto:support@bannersin48.com"
              className="flex items-center gap-md rounded-card border border-white/20 bg-white/5 p-lg no-underline hover:bg-white/10 transition-colors"
            >
              <Mail className="h-8 w-8 text-strong-accent shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-white/70 font-body">Email support</p>
                <p className="text-body font-bold text-white font-body">support@bannersin48.com</p>
              </div>
            </a>
            <Link
              href="/chat"
              className="flex items-center gap-md rounded-card border border-white/20 bg-white/5 p-lg no-underline hover:bg-white/10 transition-colors"
            >
              <MessageCircle className="h-8 w-8 text-strong-accent shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-white/70 font-body">Live chat</p>
                <p className="text-body font-bold text-white font-body">Chat with us</p>
              </div>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
