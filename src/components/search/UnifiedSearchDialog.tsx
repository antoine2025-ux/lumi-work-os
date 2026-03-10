"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { BookOpen, FileText, CheckSquare, Users } from "lucide-react";
import type { SearchResultItem, SearchResponse } from "@/app/api/search/route";

const RECENT_SEARCHES_KEY = "unified-search-recent";
const RECENT_LIMIT = 5;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(term: string): void {
  if (typeof window === "undefined" || !term.trim()) return;
  const recent = getRecentSearches().filter((s) => s.toLowerCase() !== term.trim().toLowerCase());
  recent.unshift(term.trim());
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, RECENT_LIMIT)));
}

const typeIcons: Record<SearchResultItem["type"], React.ComponentType<{ className?: string }>> = {
  wiki: BookOpen,
  project: FileText,
  task: CheckSquare,
  person: Users,
};

interface UnifiedSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnifiedSearchDialog({ open, onOpenChange }: UnifiedSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["unified-search", debouncedQuery],
    queryFn: async (): Promise<SearchResponse> => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      addRecentSearch(debouncedQuery);
      router.push(item.url);
      onOpenChange(false);
      setQuery("");
    },
    [debouncedQuery, router, onOpenChange]
  );

  const recentSearches = getRecentSearches();
  const showRecent = !debouncedQuery || debouncedQuery.length < 2;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search wiki, projects, tasks, people..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading && debouncedQuery.length >= 2
            ? "Searching..."
            : debouncedQuery.length >= 2
              ? "No results found"
              : "Type at least 2 characters to search"}
        </CommandEmpty>

        {showRecent && recentSearches.length > 0 && (
          <CommandGroup heading="Recent searches">
            {recentSearches.map((term) => (
              <CommandItem
                key={term}
                value={term}
                onSelect={() => {
                  setQuery(term);
                }}
              >
                <span className="truncate">{term}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!showRecent && data && (
          <>
            {data.wiki.length > 0 && (
              <CommandGroup heading="Pages">
                {data.wiki.map((item) => {
                  const Icon = typeIcons[item.type];
                  return (
                    <CommandItem
                      key={`wiki-${item.id}`}
                      value={`${item.title} ${item.subtitle}`}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {data.projects.length > 0 && (
              <CommandGroup heading="Projects">
                {data.projects.map((item) => {
                  const Icon = typeIcons[item.type];
                  return (
                    <CommandItem
                      key={`project-${item.id}`}
                      value={`${item.title} ${item.subtitle}`}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {data.tasks.length > 0 && (
              <CommandGroup heading="Tasks">
                {data.tasks.map((item) => {
                  const Icon = typeIcons[item.type];
                  return (
                    <CommandItem
                      key={`task-${item.id}`}
                      value={`${item.title} ${item.subtitle}`}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {data.people.length > 0 && (
              <CommandGroup heading="People">
                {data.people.map((item) => {
                  const Icon = typeIcons[item.type];
                  return (
                    <CommandItem
                      key={`person-${item.id}`}
                      value={`${item.title} ${item.subtitle}`}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
