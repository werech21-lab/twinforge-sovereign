"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completeTaskAction } from "@/app/actions/tasks";
import Loading from "@/components/Loading";
import { generateSampleTasks } from "@/lib/generate-tasks";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  reward_amount: number;
  reward_currency: string;
  requires_approval: boolean;
  result_text?: string | null;
  learning_summary?: string | null;
  ai_provider?: string | null;
  created_at: string;
  completed_at: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-line text-slate-300",
  in_progress: "bg-warn/20 text-warn",
  completed: "bg-accent/20 text-accent",
  failed: "bg-danger/20 text-danger",
  requires_approval: "bg-warn/20 text-warn",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  const loadTasks = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?next=/tasks");
      return;
    }

    const { data: twin } = await supabase
      .from("twins")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!twin) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("night_tasks")
      .select("*")
      .eq("twin_id", twin.id)
      .order("created_at", { ascending: false })
      .limit(30);

    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [router]);

  const handleGenerate = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: twin } = await supabase
      .from("twins")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!twin) {
      setError("يجب إنشاء توأم أولاً");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      await generateSampleTasks(twin.id, 3);
      await loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل إنشاء المهام");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId);
    setError(null);
    try {
      await completeTaskAction(taskId);
      await loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل إكمال المهمة");
      await loadTasks();
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="tf-container w-full space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
          المهام الليلية
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-50"
          >
            {generating ? "جاري الإنشاء..." : "إنشاء مهام تجريبية"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/tasks/create")}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:border-accent"
          >
            مهمة جديدة
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {tasks.length === 0 ? (
        <p className="text-slate-300">لا توجد مهام حالياً</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="tf-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{task.title}</h3>
                  {task.description ? (
                    <p className="mt-1 text-sm text-slate-300">
                      {task.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        statusColors[task.status] || "bg-line text-slate-300"
                      }`}
                    >
                      {task.status}
                    </span>
                    {task.ai_provider ? (
                      <span className="rounded border border-white/15 px-2 py-0.5 text-xs text-slate-300">
                        {task.ai_provider}
                      </span>
                    ) : null}
                    {task.requires_approval ? (
                      <span className="text-xs text-warn">تتطلب موافقة</span>
                    ) : null}
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-accent">
                    {Number(task.reward_amount)}
                  </p>
                  <p className="text-xs text-slate-300">{task.reward_currency}</p>
                </div>
              </div>

              {task.result_text ? (
                <details className="mt-3 rounded-xl border border-white/10 bg-bg/60 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-accent">
                    عرض مخرجات التوأم والبيانات المستخرجة
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                    {task.result_text}
                  </pre>
                  {task.learning_summary ? (
                    <p className="mt-2 border-t border-white/10 pt-2 text-xs text-slate-400">
                      الدرس المكتسب: {task.learning_summary}
                    </p>
                  ) : null}
                </details>
              ) : null}

              {task.status !== "completed" && task.status !== "failed" ? (
                <button
                  type="button"
                  onClick={() => handleComplete(task.id)}
                  disabled={completing === task.id}
                  className="mt-3 w-full rounded-xl bg-accent py-2 text-sm font-medium text-bg disabled:opacity-50"
                >
                  {completing === task.id
                    ? "جاري الإكمال..."
                    : task.status === "requires_approval"
                      ? "متابعة بعد الموافقة"
                      : "إكمال المهمة"}
                </button>
              ) : null}

              {task.completed_at ? (
                <p className="mt-2 text-xs text-slate-300">
                  اكتملت في: {new Date(task.completed_at).toLocaleString("ar")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
