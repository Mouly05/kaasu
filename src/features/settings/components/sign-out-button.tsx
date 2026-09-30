import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="outline">
        <LogOut />
        Sign out
      </Button>
    </form>
  );
}
