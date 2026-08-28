"use client"
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, User } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { QuickAddLeadDrawer } from "@/components/leads/QuickAddLeadDrawer";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { EnablePushButton } from "@/components/layout/EnablePushButton";
import { CommandPalette } from "@/components/layout/CommandPalette";

export function Header() {
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Cmd/Ctrl+K toggles the global command palette.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-14 items-center justify-between border-b px-4 lg:px-6 bg-white shrink-0">
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <div className="flex items-center flex-1">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="relative w-full max-w-md hidden md:flex items-center rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-slate-50"
        >
          <Search className="mr-2 h-4 w-4" />
          Search leads or jump to…
          <kbd className="ml-auto text-xs bg-slate-100 rounded px-1.5 py-0.5">⌘K</kbd>
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex">
          <QuickAddLeadDrawer>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              Quick Add
            </Button>
          </QuickAddLeadDrawer>
        </div>
        <EnablePushButton />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
