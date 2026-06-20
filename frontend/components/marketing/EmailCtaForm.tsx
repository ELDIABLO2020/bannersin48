"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type EmailCtaFormProps = {
  className?: string;
  buttonLabel?: string;
  microcopy?: string;
  redirectPath?: string;
  layout?: "inline" | "stacked";
};

export function EmailCtaForm({
  className,
  buttonLabel = "Start your order",
  microcopy = "No credit card required.",
  redirectPath = "/register",
  layout = "inline",
}: EmailCtaFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      router.push("/order/vinyl");
      return;
    }
    const params = new URLSearchParams({ email: trimmed });
    router.push(`${redirectPath}?${params.toString()}`);
  }

  return (
    <div className={cn("w-full", className)}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          layout === "inline"
            ? "flex flex-col sm:flex-row gap-sm sm:items-stretch"
            : "flex flex-col gap-sm",
        )}
      >
        <Input
          type="email"
          inputSize="lg"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="sm:flex-1 min-w-0"
          aria-label="Email address"
        />
        <Button type="submit" variant="cta" size="lg" className="shrink-0">
          {buttonLabel}
          <ArrowRight className="ml-sm h-5 w-5" aria-hidden />
        </Button>
      </form>
      {microcopy && (
        <p className="mt-sm text-sm text-ink-muted">{microcopy}</p>
      )}
    </div>
  );
}
