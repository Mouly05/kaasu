"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { GitHubIcon } from "@/components/shared/github-icon";
import { Button } from "@/components/ui/button";

export function SignInButton({ label = "Continue with GitHub" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-11 w-full rounded-xl text-sm" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <GitHubIcon className="size-4" />}
      {pending ? "Redirecting to GitHub…" : label}
    </Button>
  );
}
