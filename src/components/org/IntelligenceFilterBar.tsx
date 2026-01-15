"use client";

import { useEffect, useMemo, useState } from "react";
import { OrgApi, type OrgIntelligenceFilterPrefs } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

export function IntelligenceFilterBar({
  onChange,
}: {
  onChange: (prefs: OrgIntelligenceFilterPrefs) => void;
}) {
  const prefsQ = useOrgQuery(() => OrgApi.getIntelligenceFilterPrefs());

  const [signal, setSignal] = useState<string>(ALL);
  const [severity, setSeverity] = useState<string>(ALL);
  const [entityType, setEntityType] = useState<string>(ALL);
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    const v = prefsQ.data?.value;
    if (v) {
      setSignal(v.signals?.[0] || ALL);
      setSeverity(v.severities?.[0] || ALL);
      setEntityType(v.entityTypes?.[0] || ALL);
      setQuery(v.query || "");
      onChange(v);
    } else if (!prefsQ.loading) {
      onChange({ signals: [], severities: [], entityTypes: [], query: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsQ.data, prefsQ.loading]);

  const current: OrgIntelligenceFilterPrefs = useMemo(
    () => ({
      signals: signal === ALL ? [] : [signal],
      severities: severity === ALL ? [] : [severity],
      entityTypes: entityType === ALL ? [] : [entityType],
      query: query || "",
    }),
    [signal, severity, entityType, query]
  );

  async function save() {
    try {
      await OrgApi.setIntelligenceFilterPrefs(current);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }

  useEffect(() => {
    onChange(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal, severity, entityType, query]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={signal} onValueChange={setSignal}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Signal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All signals</SelectItem>
          <SelectItem value="MANAGEMENT_LOAD">Management load</SelectItem>
          <SelectItem value="OWNERSHIP_RISK">Ownership risk</SelectItem>
          <SelectItem value="STRUCTURAL_GAP">Structural gap</SelectItem>
        </SelectContent>
      </Select>

      <Select value={severity} onValueChange={setSeverity}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All severities</SelectItem>
          <SelectItem value="HIGH">HIGH</SelectItem>
          <SelectItem value="MEDIUM">MEDIUM</SelectItem>
          <SelectItem value="LOW">LOW</SelectItem>
        </SelectContent>
      </Select>

      <Select value={entityType} onValueChange={setEntityType}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Entity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All entities</SelectItem>
          <SelectItem value="PERSON">Person</SelectItem>
          <SelectItem value="TEAM">Team</SelectItem>
          <SelectItem value="DEPARTMENT">Department</SelectItem>
        </SelectContent>
      </Select>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search findings…"
        className="w-[240px]"
      />

      <Button size="sm" variant="secondary" onClick={save} disabled={prefsQ.loading}>
        Save view
      </Button>
    </div>
  );
}

