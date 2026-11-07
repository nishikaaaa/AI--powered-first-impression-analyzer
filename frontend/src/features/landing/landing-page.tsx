"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  Camera,
  FileText,
  Lock,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/shared/logo";
import { ThemeToggle } from "@/shared/theme-toggle";
import { cn } from "@/lib/utils";

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22 },
};

const fadeView = {
  initial: { opacity: 0, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.22 },
};

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
          >
            Open app
          </Link>
          <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
            Analyze Now
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 pb-20 pt-16 text-center md:pt-24">
        <motion.p
          {...fadeIn}
          className="text-xs font-medium uppercase tracking-[0.18em] text-primary"
        >
          First Impression AI
        </motion.p>
        <motion.h1
          {...fadeIn}
          className="mt-4 font-display text-4xl font-semibold tracking-tight text-balance md:text-6xl"
        >
          Know Your First Impression Before Anyone Else Does
        </motion.h1>
        <motion.p
          {...fadeIn}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          AI simulates how recruiters, hiring managers, founders, HR professionals, and
          audiences read your resume, LinkedIn profile, or Instagram post in the first 30
          seconds — then shows the evidence, and helps you rewrite it.
        </motion.p>
        <motion.div {...fadeIn} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
            Analyze Now <ArrowRight className="ml-1 inline h-4 w-4" />
          </Link>
          <a href="#how-it-works" className={buttonVariants({ variant: "outline", size: "lg" })}>
            See Demo
          </a>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: FileText,
              title: "Resume",
              body: "Upload a PDF. See how a recruiter, engineering manager, founder, and HR read your career story — with every claim linked back to a bullet.",
              href: "/resume",
            },
            {
              icon: Briefcase,
              title: "LinkedIn",
              body: "Paste your profile text. Get a first-impression report on headline, About, and experience without scraping or browser extensions.",
              href: "/linkedin",
            },
            {
              icon: Camera,
              title: "Instagram",
              body: "Drop one image or a carousel with caption and hashtags. Understand what a new viewer, follower, brand strategist, and creator notice first.",
              href: "/instagram",
            },
          ].map((item) => (
            <motion.div key={item.title} {...fadeView}>
              <Link href={item.href} className="block h-full">
                <Card className="h-full p-6 transition-transform duration-fast hover:-translate-y-0.5">
                  <item.icon className="h-5 w-5 text-primary" />
                  <h2 className="mt-4 font-display text-xl font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border bg-muted/40 py-24">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="font-display text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-5">
            {[
              { n: "01", t: "Upload or paste", d: "Resume PDF, LinkedIn text, or an Instagram post." },
              { n: "02", t: "AI structures it", d: "Extractive structure only. No invented facts." },
              { n: "03", t: "Personas analyze", d: "Multiple professional lenses, independently." },
              { n: "04", t: "Evidence report", d: "A unified first impression, clickable to source." },
              { n: "05", t: "Improve with AI", d: "Rewrite any section without fabricating metrics." },
            ].map((s) => (
              <li key={s.n}>
                <p className="text-xs font-medium text-primary">{s.n}</p>
                <h3 className="mt-2 font-medium">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-24">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Built for trust</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Users, t: "Multi-perspective analysis", d: "Several personas, not a single opaque score." },
            { icon: Target, t: "Explainable AI", d: "Every insight cites the line it came from." },
            { icon: Sparkles, t: "AI Rewrite", d: "Improve a bullet, headline, or caption in place." },
            { icon: FileText, t: "Professional reports", d: "Calm, evidence-backed, ready to act on." },
            { icon: Lock, t: "Secure processing", d: "Your files stay in your workspace. No public sharing." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-border p-5">
              <f.icon className="h-4 w-4 text-primary" />
              <h3 className="mt-3 font-medium">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            See the first 30 seconds — then change them.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start with a resume, a LinkedIn paste, or an Instagram post. No ATS scores.
          </p>
          <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "mt-8 inline-flex")}>
            Analyze Now
          </Link>
        </div>
      </section>
    </div>
  );
}
