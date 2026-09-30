import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { signInWithGitHub } from "@/lib/auth/actions";
import { safeCallbackPath } from "@/lib/auth/access";

import { SignInButton } from "./sign-in-button";

export const metadata: Metadata = { title: "Sign in · Kaasu" };

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "That account isn’t allowed to use this Kaasu.",
  Configuration: "Sign-in is misconfigured on the server. Check the auth environment variables.",
  OAuthSignin: "Couldn’t start sign-in with GitHub. Please try again.",
  OAuthCallbackError: "GitHub sign-in was cancelled or failed. Please try again.",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(first(params.callbackUrl));
  const errorCode = first(params.error);
  const error = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? "Something went wrong while signing in. Please try again.")
    : null;

  return (
    <Card className="border-border/60 ring-border/60 rounded-2xl py-10 shadow-none">
      <CardContent className="flex flex-col items-center gap-8 px-8">
        <Logo size="lg" />
        <div className="space-y-1.5 text-center">
          <h1 className="text-lg font-medium">Welcome back</h1>
          <p className="text-muted-foreground text-sm">
            Your money, calmly organised. Sign in to continue.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertCircle />
            <AlertTitle>Couldn’t sign you in</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form action={signInWithGitHub} className="w-full">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <SignInButton />
        </form>

        <p className="text-muted-foreground text-center text-xs">
          Private workspace. Only invited GitHub accounts can sign in.
        </p>
      </CardContent>
    </Card>
  );
}
