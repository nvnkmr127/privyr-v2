"use client"
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
import { Input } from "@/components/ui/input";
import { QuickAddLeadDrawer } from "@/components/leads/QuickAddLeadDrawer";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { EnablePushButton } from "@/components/layout/EnablePushButton";

export function Header() {
  return (
    <div className="flex h-14 items-center justify-between border-b px-4 lg:px-6 bg-white shrink-0">
      <div className="flex items-center flex-1">
        {/* Global Search Placeholder */}
        <div className="relative w-full max-w-md hidden md:flex items-center">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search leads, tags, sources... (Cmd+K)"
            className="w-full appearance-none bg-background pl-8 shadow-none"
          />
        </div>
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
