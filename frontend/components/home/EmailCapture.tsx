"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="bg-navy-base text-white" aria-labelledby="capture-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl text-center">
        <Mail className="h-10 w-10 text-cta mx-auto mb-md" aria-hidden />
        <h2 id="capture-h" className="font-display text-[28px] sm:text-[36px] leading-tight font-normal">
          Get launch updates &amp; exclusive sizes
        </h2>
        <p className="text-body text-white/70 mt-md max-w-xl mx-auto">
          New template categories, the AI helper, and graduation program are rolling out. Be the first to know.
        </p>
        {submitted ? (
          <p className="mt-xl text-cta font-bold">Thanks &mdash; we&rsquo;ll be in touch.</p>
        ) : (
          <form
            className="mt-xl flex flex-col sm:flex-row gap-sm max-w-md mx-auto"
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
