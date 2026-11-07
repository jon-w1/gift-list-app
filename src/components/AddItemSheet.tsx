"use client";

import { useState } from "react";
import { ItemForm } from "./ItemForm";
import { Sheet, useSheet } from "./Sheet";
import type { ItemInput } from "@/app/actions";
import type { ItemKind } from "@/lib/types";

type Note = { text: string; tone: "warn" | "soft" };

/**
 * A button (any content) that opens the item form in a slide-up sheet.
 * Used for adding and editing; /p/[id]/new and /items/[id]/edit still work as pages for direct links.
 */
export function ItemSheet({ children, className, ariaLabel, title, userId, notesPlaceholder, note, initial }: {
  children: React.ReactNode;
  className: string;
  ariaLabel?: string;
  title: string;
  userId: string;
  notesPlaceholder: string;
  note?: Note;
  initial: ItemInput;
}) {
  const sheet = useSheet();
  const [round, setRound] = useState(0); // fresh form each time

  return (
    <>
      <button type="button" className={className} onClick={() => { setRound((r) => r + 1); sheet.show(); }} aria-label={ariaLabel}>{children}</button>
      <Sheet sheet={sheet} title={title}>
        {note && (
          <p className={`mx-4 mt-1 rounded-xl px-3.5 py-2.5 text-[14px] ${note.tone === "warn" ? "bg-warn-soft" : "bg-soft"}`}>{note.text}</p>
        )}
        <ItemForm key={round} userId={userId} backHref="/" onDone={sheet.hide} notesPlaceholder={notesPlaceholder} initial={initial} />
      </Sheet>
    </>
  );
}

/** "+ Add" button that opens an empty item form in the sheet. */
export function AddItemSheet({ label, className, title, personId, kind, userId, notesPlaceholder, note }: {
  label: React.ReactNode;
  className: string;
  title: string;
  personId: string;
  kind: ItemKind;
  userId: string;
  notesPlaceholder: string;
  note?: Note;
}) {
  return (
    <ItemSheet
      className={className} title={title} userId={userId} notesPlaceholder={notesPlaceholder} note={note}
      initial={{ person_id: personId, kind, name: "", notes: "", url: "", image_url: null, photo_path: null }}
    >
      {label}
    </ItemSheet>
  );
}
