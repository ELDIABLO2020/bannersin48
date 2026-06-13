"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function OrderLookupPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState(false);

  return (
    <div className="bg-surface-tint min-h-[60vh] flex items-center justify-center px-md py-3xl">
      <Card className="bg-surface max-w-md w-full">
        <Search className="h-8 w-8 text-link mx-auto" aria-hidden />
        <h1 className="font-display text-section-h2 text-ink leading-tight text-center mt-sm">
          Track your order
        </h1>
        <p className="text-body-sm text-ink-muted text-center mt-xs">
          Enter your order number and the email used at checkout.
        </p>
        <form
          className="mt-lg space-y-md"
          onSubmit={(e) => {
            e.preventDefault();
            setSearched(true);
          }}
        >
          <label className="block">
            <span className="text-body-sm text-ink-muted block mb-xs">Order number</span>
            <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="BI48-000001" />
          </label>
          <label className="block">
            <span className="text-body-sm text-ink-muted block mb-xs">Email</span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <Button type="submit" variant="cta" size="block" className="w-full">Look up</Button>
        </form>
        {searched && (
          <p className="mt-md text-sm text-ink-muted text-center">
            Order lookup is enabled for logged-in customers in this build.{" "}
            <a className="text-link hover:underline" href="/login">Log in</a> to view your orders.
          </p>
        )}
      </Card>
    </div>
  );
}
