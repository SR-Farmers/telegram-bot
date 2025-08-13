/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useMemo, useState, useCallback, memo } from "react";
import {
  initDataRaw as _initDataRaw,
  initDataState as _initDataState,
  useSignal,
} from "@telegram-apps/sdk-react";
import {
  List,
  Placeholder,
  Button,
  Cell,
  Switch,
  Input,
  Section,
} from "@telegram-apps/telegram-ui";
import { Page } from "@/components/Page";

type PollOption = { id: string; text: string };

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Memoized row so the Input DOM node isn't recreated each keystroke
type OptionRowProps = {
  id: string;
  index: number;
  text: string;
  onChange: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
};

const OptionRow = memo(function OptionRow({
  id,
  index,
  text,
  onChange,
  onRemove,
  canRemove,
}: OptionRowProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(id, e.target.value),
    [id, onChange]
  );

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Input
        name={`option-${id}`}
        id={`option-${id}`}
        placeholder={`Option ${index + 1}`}
        value={text}
        onChange={handleChange}
      />
      <Button mode="bezeled" disabled={!canRemove} onClick={() => onRemove(id)}>
        Remove
      </Button>
    </div>
  );
});

export default function InitCreatePollPage() {
  // Telegram init data (safe to show; verify on server!)
  const initData = useSignal(_initDataState);
  const initDataRaw = useSignal(_initDataRaw);

  // Prefill from comment: “get based off Main Title, Event name & Date”
  const [pollTitle, setPollTitle] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState<string>(""); // datetime-local
  const [anonymous, setAnonymous] = useState(true);
  const [multiple, setMultiple] = useState(false);
  const [autoCloseAt, setAutoCloseAt] = useState<string>(""); // optional datetime-local
  const [options, setOptions] = useState<PollOption[]>([
    { id: uid(), text: "" },
    { id: uid(), text: "" },
  ]);

  // Validation
  const isValid = useMemo(() => {
    const hasTitle = pollTitle.trim().length > 0;
    const hasEvent = eventName.trim().length > 0;
    const hasDate = eventDate.trim().length > 0;
    const filled = options.map((o) => o.text.trim()).filter(Boolean);
    return hasTitle && hasEvent && hasDate && filled.length >= 2;
  }, [pollTitle, eventName, eventDate, options]);

  // Telegram WebApp helpers (works even if not in Telegram)
  const tg =
    (typeof window !== "undefined" && (window as any).Telegram?.WebApp) || null;

  // Configure MainButton (debounced to avoid focus glitches)
  useEffect(() => {
    if (!tg) return;
    const id = setTimeout(() => {
      tg.MainButton.setText("Create poll");
      if (isValid) tg.MainButton.show();
      else tg.MainButton.hide();
      tg.MainButton[isValid ? "enable" : "disable"]();
    }, 50);
    return () => clearTimeout(id);
  }, [tg, isValid]);

  // Form handlers (stable references)
  const updateOption = useCallback((id: string, text: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  }, []);

  const addOption = useCallback(() => {
    setOptions((prev) => [...prev, { id: uid(), text: "" }]);
  }, []);

  const removeOption = useCallback((id: string) => {
    setOptions((prev) =>
      prev.length > 2 ? prev.filter((o) => o.id !== id) : prev
    );
  }, []);

  // Submit logic
  const submit = useCallback(async () => {
    if (!isValid) return;

    try {
      tg?.HapticFeedback?.impactOccurred("light");
      tg?.MainButton.showProgress();

      const payload = {
        pollTitle: pollTitle.trim(),
        eventName: eventName.trim(),
        eventDate, // from datetime-local
        anonymous,
        multiple,
        autoCloseAt: autoCloseAt || null,
        options: options.map((o) => o.text.trim()).filter(Boolean),
        initDataRaw: initDataRaw ?? "",
      };

      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to create poll");
      }

      tg?.HapticFeedback?.notificationOccurred("success");
      tg?.showPopup?.({
        title: "Poll created",
        message: "Your poll is ready!",
        buttons: [{ id: "ok", type: "default", text: "OK" }],
      });
      tg?.close?.();
    } catch (err: any) {
      tg?.HapticFeedback?.notificationOccurred("error");
      tg?.showAlert?.(`Error: ${err?.message || "Unknown error"}`);
    } finally {
      tg?.MainButton.hideProgress();
    }
  }, [
    isValid,
    pollTitle,
    eventName,
    eventDate,
    anonymous,
    multiple,
    autoCloseAt,
    options,
    initDataRaw,
    tg,
  ]);

  // Attach click handler to MainButton
  useEffect(() => {
    if (!tg) return;
    const handler = () => submit();
    tg.MainButton.onClick(handler);
    return () => tg.MainButton.offClick(handler);
  }, [tg, submit]);

  const hasInit = Boolean(`initData`);

  useEffect(() => {
    if (eventDate) {
      const startDate = new Date(eventDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7); // Add 7 days
      setAutoCloseAt(endDate.toISOString().slice(0, 16)); // Format as datetime-local
    } else {
      setAutoCloseAt(""); // Clear end date if start date is empty
    }
  }, [eventDate]);

  return (
    <Page>
      {!hasInit && (
        <Placeholder
          header="Oops"
          description="Application was launched with missing init data"
        >
          <img
            alt="Telegram sticker"
            src="https://xelene.me/telegram.gif"
            style={{ display: "block", width: 144, height: 144 }}
          />
        </Placeholder>
      )}

      {hasInit && (
        <List>
          <Section header="Create Poll">
            <Input
              placeholder="(e.g., Count Me In for RC4 Movie Night)"
              value={pollTitle}
              onChange={(e) => setPollTitle(e.target.value)}
            />
          </Section>
          <Section header="Event Name">
            <Input
              placeholder="Event name (e.g., Movie Night)"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </Section>
          <Section header="Start Date">
            <Input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </Section>
          <Section header="End Date (optional)">
            <Input
              type="datetime-local"
              value={autoCloseAt}
              onChange={(e) => setAutoCloseAt(e.target.value)}
              disabled // Disable manual editing
            />
          </Section>
          <Section header="Poll Options">
            <div style={{ display: "grid", gap: 8 }}>
              {options.map((opt, idx) => (
                <OptionRow
                  key={opt.id}
                  id={opt.id}
                  index={idx}
                  text={opt.text}
                  onChange={updateOption}
                  onRemove={removeOption}
                  canRemove={options.length > 1}
                />
              ))}
              <Button mode="bezeled" onClick={addOption}>
                Add option
              </Button>
            </div>
          </Section>

          <Cell
            subtitle="Votes are not linked to identities"
            after={
              <Switch
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
            }
          >
            Anonymous
          </Cell>

          <Cell
            subtitle="Allow selecting multiple options"
            after={
              <Switch
                checked={multiple}
                onChange={(e) => setMultiple(e.target.checked)}
              />
            }
          >
            Multiple choice
          </Cell>

          {/* Fallback submit for non-Telegram dev */}
          {!tg && (
            <Cell>
              <Button disabled={!isValid} onClick={submit}>
                Create poll
              </Button>
            </Cell>
          )}
        </List>
      )}
    </Page>
  );
}
