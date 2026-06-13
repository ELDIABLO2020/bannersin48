"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { slideInRight, slideInLeft } from "@/lib/gsap/registry";

export function EmailCapture() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useGSAP(
    () => {
      if (!sectionRef.current) return;
      slideInLeft({
        target: sectionRef.current.querySelector(".ec-copy"),
        delay: 0,
      });
      slideInRight({
        target: sectionRef.current.querySelector(".ec-form"),
        delay: 0.15,
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="bg-navy-base text-white" aria-labelledby="capture-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl text-center">
        <Mail className="h-10 w-10 text-cta mx-auto mb-md" aria-hidden />
        <div className="ec-copy">
          <h2 id="capture-h" className="font-display text-[28px] sm:text-[36px] leading-tight font-normal">
            Get launch updates & exclusive sizes
          </h2>
          <p className="text-body text-white/70 mt-md max-w-xl mx-auto">
            New template categories, the AI helper, and graduation program are rolling out. Be the first to know.
          </p>
        </div>
        {submitted ? (
          <p className="mt-xl text-cta font-bold">Thanks &mdash; we&rsquo;ll be in touch.</p>
        ) : (
          <form
            className="ec-form mt-xl flex flex-col sm:flex-row gap-sm max-w-md mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <label htmlFor="email-capture" className="sr-only">Email</label>
            <Input
              id="email-capture"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputSize="lg"
              className="flex-1"
            />
            <Button variant="cta" size="lg" type="submit">
              Notify me
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
