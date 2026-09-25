"use client";

import React, { useState, useEffect } from "react";
import { LANGUAGE_PAIRS, LanguagePair } from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Layers,
  Plus,
  Language as Languages,
  Check,
  ChevronDown,
  Menu,
  X,
} from "@keyline-icons/react";
import { ModeToggle } from "@/components/mode-toggle";

interface HeaderProps {
  activePair: LanguagePair;
  onSelectPair: (pair: LanguagePair) => void;
  activeTab?: "library" | "practice";
  onSelectTab?: (tab: "library" | "practice") => void;
  onOpenAddModal?: () => void;
  practiceDueCount?: number;
}

export function Header({
  activePair,
  onSelectPair,
  activeTab,
  onSelectTab,
  onOpenAddModal,
  practiceDueCount = 0,
}: HeaderProps) {
  const pathname = usePathname();
  const currentTab =
    activeTab ?? (pathname?.startsWith("/practice") ? "practice" : "library");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu whenever pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 w-full pt-2 sm:pt-3 px-3 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex h-14 items-center justify-between md:grid md:grid-cols-3 md:content-center px-3.5 sm:px-5 rounded-2xl border border-border/80 bg-background/90 backdrop-blur-md shadow-xs transition-all">
          {/* Left: Desktop Navigation Links (Desktop only) */}
          <div className="hidden md:flex h-full items-center gap-1 md:order-1">
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                onClick={() => onSelectTab?.("library")}
                className={cn(
                  buttonVariants({
                    variant: currentTab === "library" ? "secondary" : "ghost",
                    size: "sm",
                  }),
                  "gap-1.5 text-xs font-normal",
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Library
              </Link>

              <Link
                href="/practice"
                onClick={() => onSelectTab?.("practice")}
                className={cn(
                  buttonVariants({
                    variant: currentTab === "practice" ? "secondary" : "ghost",
                    size: "sm",
                  }),
                  "gap-1.5 text-xs font-normal relative",
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                Practice
                {practiceDueCount > 0 && (
                  <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {practiceDueCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>

          {/* Logo: Left-aligned on Mobile, Centered on Desktop */}
          <div className="flex h-full items-center justify-start md:justify-center order-1 md:order-2">
            <Link
              href="/"
              className="flex items-center hover:opacity-90 transition-opacity"
            >
              {/* Light theme logo (dark text on light bg) */}
              <Image
                src="/logo-white1.png"
                alt="VocaBuch"
                width={160}
                height={40}
                priority
                className="h-auto w-[90px]  sm:w-[135px] md:w-[155px] lg:w-[150px] object-contain block dark:hidden"
              />
              {/* Dark theme logo (white text on dark bg) */}
              <Image
                src="/logo-dark1.png"
                alt="VocaBuch"
                width={160}
                height={40}
                priority
                className="h-auto w-[125px] sm:w-[135px] md:w-[145px] lg:w-[155px] object-contain hidden dark:block"
              />
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex h-full items-center justify-end gap-2 sm:gap-3 order-2 md:order-3">
            {/* Desktop Language Pair Dropdown Menu */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2 px-2.5 text-xs font-normal border-border/80 hover:bg-muted/50"
                    />
                  }
                >
                  <Languages className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground hidden lg:inline">
                    {activePair.label}
                  </span>
                  <span className="font-medium text-foreground inline lg:hidden">
                    {activePair.flag}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground opacity-70 shrink-0" />
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                      Language Pairs
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {LANGUAGE_PAIRS.map((pair) => {
                      const isSelected = activePair.id === pair.id;
                      return (
                        <DropdownMenuItem
                          key={pair.id}
                          onClick={() => onSelectPair(pair)}
                          className="flex items-center justify-between text-xs py-1.5 cursor-pointer"
                        >
                          <span
                            className={
                              isSelected
                                ? "font-semibold text-foreground"
                                : "text-foreground/90"
                            }
                          >
                            {pair.label}
                          </span>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Theme Switcher Toggle */}
            <ModeToggle />

            {/* Add Word Action (Desktop text, Mobile icon) */}
            {onOpenAddModal && (
              <>
                {/* Desktop Button */}
                <Button
                  onClick={onOpenAddModal}
                  size="sm"
                  className="hidden md:inline-flex gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Add Word</span>
                </Button>

                {/* Mobile Quick Add Icon Button */}
                <Button
                  onClick={onOpenAddModal}
                  size="icon-sm"
                  variant="outline"
                  className="md:hidden"
                  title="Add Word"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            {/* Mobile Hamburger Menu Toggle Button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="md:hidden text-foreground hover:bg-muted relative"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <>
                  <Menu className="h-4 w-4" />
                  {practiceDueCount > 0 && !mobileMenuOpen && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-destructive" />
                  )}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Collapsible Navigation Menu */}
        {mobileMenuOpen && (
          <div className="mt-2 md:hidden rounded-2xl border border-border bg-background/98 backdrop-blur-md px-4 py-4 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-150">
            {/* Main Navigation Links */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                Navigation
              </div>
              <Link
                href="/"
                onClick={() => {
                  onSelectTab?.("library");
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                  currentTab === "library"
                    ? "bg-secondary text-secondary-foreground font-semibold"
                    : "text-foreground hover:bg-muted/60",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4" />
                  <span>Library</span>
                </div>
                {currentTab === "library" && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </Link>

              <Link
                href="/practice"
                onClick={() => {
                  onSelectTab?.("practice");
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                  currentTab === "practice"
                    ? "bg-secondary text-secondary-foreground font-semibold"
                    : "text-foreground hover:bg-muted/60",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4" />
                  <span>Practice</span>
                </div>
                <div className="flex items-center gap-2">
                  {practiceDueCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                      {practiceDueCount}
                    </span>
                  )}
                  {currentTab === "practice" && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              </Link>
            </div>

            {/* Mobile Language Switcher */}
            <div className="border-t border-border pt-3 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                Language Pair
              </div>
              {LANGUAGE_PAIRS.map((pair) => {
                const isSelected = activePair.id === pair.id;
                return (
                  <button
                    key={pair.id}
                    type="button"
                    onClick={() => {
                      onSelectPair(pair);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer",
                      isSelected
                        ? "bg-muted text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Languages className="h-4 w-4 opacity-70" />
                      <span>{pair.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Add Word in Mobile Menu */}
            {onOpenAddModal && (
              <div className="border-t border-border pt-3">
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAddModal();
                  }}
                  className="w-full justify-center gap-1.5 text-xs font-medium"
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New Word
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
