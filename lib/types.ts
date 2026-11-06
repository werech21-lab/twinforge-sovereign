export type Twin = {
  id: string;
  user_id: string;
  name: string;
  personality_summary: string | null;
  energy: number;
  mood: number;
  reputation: number;
  status: "active" | "resting" | "suspended";
  created_at: string;
  updated_at: string;
};

export type MorningReport = {
  id: string;
  twin_id: string;
  content: string;
  created_at: string;
};
