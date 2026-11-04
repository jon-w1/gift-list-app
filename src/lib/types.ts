export type ItemKind = "wish" | "idea" | "suggestion";

export type Person = {
  id: string;
  user_id: string | null;
  managed_by: string | null;
  display_name: string;
  email: string | null;
  onboarded: boolean;
  created_at: string;
};

export type Claim = {
  item_id: string;
  claimed_by: string;
  status: "claimed" | "purchased";
  claimer?: { display_name: string } | null;
};

export type Item = {
  id: string;
  person_id: string;
  kind: ItemKind;
  created_by: string;
  name: string;
  notes: string | null;
  url: string | null;
  image_url: string | null;
  photo_path: string | null;
  created_at: string;
  creator?: { display_name: string } | null;
  claim?: Claim | null;
};
