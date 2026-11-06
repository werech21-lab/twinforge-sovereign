export type TwinSoulContext = {
  id: string;
  name: string;
  personality_summary: string | null;
  energy: number;
  mood: number;
  reputation: number;
  status?: string;
  core_soul?: string;
  past?: string;
  career?: string;
  skills?: string;
};

export type NightTaskInput = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  reward_currency?: string;
  requires_approval?: boolean;
  /** يسمح بتنفيذ إجراءات خارجية عبر Composio (مثل إرسال بريد أو تحديث جدول) عند موافقة المالك */
  allowExternalMutations?: boolean;
  userId?: string;
};

export type TaskExecutionResult = {
  output: string;
  /** alias متوافق مع المطلوب */
  learned_memory: string;
  learningSummary: string;
  provider: string;
  usedFallback: boolean;
  estimatedCostUsd: number;
  toolsUsed?: string[];
  citations?: string[];
};

export type MorningBriefingInput = {
  twin: TwinSoulContext;
  completedTasks: Array<{
    title: string;
    reward_amount?: number | null;
    output?: string | null;
  }>;
  financialSummary: {
    earnedGems: number;
    forgeGold: number;
    tonightEarnings: number;
  };
  pendingDecisions: Array<{
    approval_type: string;
    details?: Record<string, unknown> | null;
  }>;
};

export type MorningBriefingResult = {
  report: string;
  provider: string;
  usedFallback: boolean;
  estimatedCostUsd: number;
};

export type HeartbeatDecisionResult = {
  title: string;
  situation: string;
  options: string[];
  recommended?: string;
  provider: string;
  usedFallback: boolean;
};
