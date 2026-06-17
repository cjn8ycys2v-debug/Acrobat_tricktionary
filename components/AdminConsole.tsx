"use client";

import { useMemo, useState } from "react";
import { Database, FileVideo, GitBranch, Layers, LinkIcon, Lock, Plus, Save, Search, Trash2, Upload, type LucideIcon } from "lucide-react";
import { AdminMapEditor } from "@/components/AdminMapEditor";
import { RelationBulkEditor } from "@/components/RelationBulkEditor";
import type { LevelTest, MediaAsset, Source, Trick, TrickMapPosition, TrickRelation } from "@/lib/types";
import type { ReactNode } from "react";
import { relationLabel } from "@/lib/utils";

type Props = {
  tricks: Trick[];
  levels: LevelTest[];
  relations: TrickRelation[];
  mapPositions: TrickMapPosition[];
  mediaAssets: MediaAsset[];
  sources: Source[];
  prototypeMode: boolean;
};

type AdminSection = "tricks" | "relations" | "layout" | "status";

export function AdminConsole({ tricks, levels, relations, mapPositions, mediaAssets, sources, prototypeMode }: Props) {
  const [drafts, setDrafts] = useState(tricks);
  const [relationDrafts, setRelationDrafts] = useState(relations);
  const [mediaDrafts, setMediaDrafts] = useState(mediaAssets);
  const [selectedId, setSelectedId] = useState(drafts[0]?.id ?? "");
  const [activeSection, setActiveSection] = useState<AdminSection>("tricks");
  const [videoMessage, setVideoMessage] = useState("動画ファイルを選ぶと、種別・サイズ・同意チェックの検証を行います。");
  const [saveMessage, setSaveMessage] = useState("技名、別名、基礎技、応用技、説明、挿入動画をまとめて編集できます。");
  const [relationMessage, setRelationMessage] = useState("登録済みの技から複数選択できます。選択すると相関図の線にも反映されます。");

  const selected = useMemo(() => drafts.find((trick) => trick.id === selectedId) ?? drafts[0], [drafts, selectedId]);
  const trickById = useMemo(() => new Map(drafts.map((trick) => [trick.id, trick])), [drafts]);
  const relationOptions = useMemo(
    () => (selected ? drafts.filter((trick) => trick.id !== selected.id).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "ja")) : []),
    [drafts, selected]
  );

  const selectedBaseRelations = useMemo(
    () => (selected ? relationDrafts.filter((relation) => relation.toTrickId === selected.id && isLearningRelation(relation)) : []),
    [relationDrafts, selected]
  );
  const selectedAdvancedRelations = useMemo(
    () => (selected ? relationDrafts.filter((relation) => relation.fromTrickId === selected.id && relation.type === "progression") : []),
    [relationDrafts, selected]
  );
  const selectedVideos = useMemo(
    () => (selected ? mediaDrafts.filter((asset) => asset.trickId === selected.id && asset.type === "video") : []),
    [mediaDrafts, selected]
  );

  function updateSelected<K extends keyof Trick>(field: K, value: Trick[K]) {
    if (!selected) return;
    setDrafts((current) => current.map((trick) => (trick.id === selected.id ? { ...trick, [field]: value } : trick)));
  }

  function makeDraftTrick(): Trick {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `draft-${Date.now()}`;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
    return {
      id,
      slug: `draft-${stamp}`,
      name: "新規下書き",
      aliases: [],
      summary: "新規下書き",
      description: "管理画面から説明を追加してください。",
      difficulty: 1,
      riskLevel: 1,
      discipline: "ダブルダッチ",
      family: "未分類",
      axis: "未分類",
      takeoff: "未設定",
      landing: "未設定",
      ropeContext: "未設定",
      tags: ["下書き"],
      level: 0,
      levelCategory: "未分類",
      status: "draft",
      sourceId: "",
      showSource: false
    };
  }

  async function createDraft() {
    const draft = makeDraftTrick();
    setDrafts((current) => [draft, ...current]);
    setSelectedId(draft.id);

    if (prototypeMode) {
      setSaveMessage("新規下書きをブラウザ内stateに追加しました。Supabase接続後はDBへ作成します。");
      return;
    }

    const response = await fetch("/api/admin/tricks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft)
    });
    const result = await response.json();
    setSaveMessage(response.ok ? "新規下書きを作成しました。" : `作成に失敗しました: ${result.error ?? "unknown error"}`);
  }

  async function deleteSelected() {
    if (!selected) return;
    const ok = window.confirm(`${selected.name}を削除します。関連する動画・相関もDB上では削除対象です。`);
    if (!ok) return;

    setDrafts((current) => current.filter((trick) => trick.id !== selected.id));
    setRelationDrafts((current) => current.filter((relation) => relation.fromTrickId !== selected.id && relation.toTrickId !== selected.id));
    setMediaDrafts((current) => current.filter((asset) => asset.trickId !== selected.id));
    setSelectedId((current) => {
      if (current !== selected.id) return current;
      return drafts.find((trick) => trick.id !== selected.id)?.id ?? "";
    });

    if (prototypeMode) {
      setSaveMessage("プロトタイプではブラウザ内stateから削除しました。");
      return;
    }

    const response = await fetch(`/api/admin/tricks?slug=${encodeURIComponent(selected.slug)}`, { method: "DELETE" });
    const result = await response.json();
    setSaveMessage(response.ok ? "削除しました。" : `削除に失敗しました: ${result.error ?? "unknown error"}`);
  }

  async function saveSelected() {
    if (!selected) return;
    if (prototypeMode) {
      setSaveMessage("プロトタイプではブラウザ内stateだけを更新しました。Supabase接続後は技・相関・動画パスをまとめて保存します。");
      return;
    }

    const trickResponse = await fetch("/api/admin/tricks", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        slug: selected.slug,
        name: selected.name,
        aliases: selected.aliases,
        summary: selected.summary,
        description: selected.description,
        difficulty: selected.difficulty,
        riskLevel: selected.riskLevel,
        discipline: selected.discipline,
        family: selected.family,
        axis: selected.axis,
        takeoff: selected.takeoff,
        landing: selected.landing,
        ropeContext: selected.ropeContext,
        tags: selected.tags,
        level: selected.level || null,
        levelCategory: selected.levelCategory,
        status: selected.status,
        showSource: selected.showSource
      })
    });
    const trickResult = await trickResponse.json();
    if (!trickResponse.ok) {
      setSaveMessage(`技データの保存に失敗しました: ${trickResult.error ?? "unknown error"}`);
      return;
    }

    const relationResponse = await fetch("/api/admin/relations", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trickId: selected.id,
        incomingBaseIds: selectedBaseRelations.map((relation) => relation.fromTrickId),
        outgoingAdvancedIds: selectedAdvancedRelations.map((relation) => relation.toTrickId)
      })
    });
    const relationResult = await relationResponse.json();
    if (!relationResponse.ok) {
      setSaveMessage(`相関の保存に失敗しました: ${relationResult.error ?? "unknown error"}`);
      return;
    }

    const mediaResponse = await fetch("/api/admin/media", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: selected.slug,
        mediaPaths: selectedVideos.map((asset) => asset.storagePath)
      })
    });
    const mediaResult = await mediaResponse.json();
    setSaveMessage(mediaResponse.ok ? "技データ、相関、挿入動画を保存しました。" : `動画パスの保存に失敗しました: ${mediaResult.error ?? "unknown error"}`);
  }

  function updateRelationIds(kind: "base" | "advanced", targetIds: string[]) {
    if (!selected) return;

    const validIds = Array.from(new Set(targetIds.filter((id) => id !== selected.id && trickById.has(id))));

    setRelationDrafts((current) => {
      const kept =
        kind === "base"
          ? current.filter((relation) => !(relation.toTrickId === selected.id && isLearningRelation(relation)))
          : current.filter((relation) => !(relation.fromTrickId === selected.id && relation.type === "progression"));

      const additions = validIds.map((id, index) => {
        const fromTrickId = kind === "base" ? id : selected.id;
        const toTrickId = kind === "base" ? selected.id : id;
        const existing = current.find(
          (relation) =>
            relation.fromTrickId === fromTrickId &&
            relation.toTrickId === toTrickId &&
            (kind === "base" ? isLearningRelation(relation) : relation.type === "progression")
        );

        return (
          existing ?? {
            id: `draft-relation-${kind}-${selected.id}-${id}-${index}`,
            fromTrickId,
            toTrickId,
            type: kind === "base" ? "prerequisite" : "progression",
            note: "管理画面で選択",
            strength: 3
          }
        ) satisfies TrickRelation;
      });

      return [...kept, ...additions];
    });

    setRelationMessage(`${kind === "base" ? "基礎技" : "応用技"}を${validIds.length}件選択しました。保存するとDBへ反映します。`);
  }

  function updateVideoPaths(value: string) {
    if (!selected) return;
    const paths = splitList(value);
    setMediaDrafts((current) => [
      ...current.filter((asset) => asset.trickId !== selected.id),
      ...paths.map((storagePath, index) => ({
        id: `draft-media-${selected.id}-${index}`,
        trickId: selected.id,
        type: "video" as const,
        storagePath,
        consentChecked: true
      }))
    ]);
  }

  async function handleVideo(file: File | undefined, consent: boolean) {
    if (!file) {
      setVideoMessage("動画ファイルが選択されていません。");
      return;
    }
    if (!file.type.startsWith("video/")) {
      setVideoMessage("動画ファイルのみ登録できます。");
      return;
    }
    if (!consent) {
      setVideoMessage("登録前に撮影・出演同意の確認が必要です。");
      return;
    }
    const sizeMb = file.size / 1024 / 1024;
    if (sizeMb > 300) {
      setVideoMessage("300MBを超える動画は圧縮してから登録してください。");
      return;
    }

    if (prototypeMode || !selected) {
      setVideoMessage(`検証OK: ${file.name} (${sizeMb.toFixed(1)}MB)。Supabase Storageの trick-media バケットへ保存する想定です。`);
      return;
    }

    const form = new FormData();
    form.set("slug", selected.slug);
    form.set("consentChecked", "true");
    form.set("file", file);
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const result = await response.json();
    if (response.ok && result.storagePath) {
      setMediaDrafts((current) => [
        ...current,
        {
          id: `uploaded-${result.storagePath}`,
          trickId: selected.id,
          type: "video",
          storagePath: result.storagePath,
          consentChecked: true
        }
      ]);
    }
    setVideoMessage(response.ok ? `アップロードしました: ${result.storagePath}` : `アップロード失敗: ${result.error ?? "unknown error"}`);
  }

  const selectedBaseIds = selectedBaseRelations.map((relation) => relation.fromTrickId);
  const selectedAdvancedIds = selectedAdvancedRelations.map((relation) => relation.toTrickId);
  const selectedVideoPaths = selectedVideos.map((asset) => asset.storagePath);

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-5 rounded border border-coral/25 bg-coral/8 p-3 text-sm leading-6 text-graphite sm:mb-6 sm:p-4">
        <div className="mb-1 flex items-center gap-2 font-black text-ink">
          <Lock aria-hidden className="size-4 text-coral" />
          管理者エリア
        </div>
        {prototypeMode
          ? "Supabase環境変数が未設定のため、ローカルseedを編集するプロトタイプ画面として表示しています。本番ではSupabase Authのadminロールだけがアクセスできます。"
          : "Supabase Authのadminロールでアクセス中です。"}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-4">
        <AdminMetric label="技" value={drafts.length} tone="pine" />
        <AdminMetric label="公開" value={drafts.filter((trick) => trick.status === "published").length} tone="saffron" />
        <AdminMetric label="相関" value={relationDrafts.length} tone="coral" />
        <AdminMetric label="動画" value={mediaDrafts.length} tone="graphite" />
      </div>

      <AdminSectionTabs activeSection={activeSection} onChange={setActiveSection} />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:gap-5">
        <aside className="rounded border border-ink/10 bg-white p-3 shadow-sm sm:p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
            <Database aria-hidden className="size-4 text-pine" />
            編集対象
          </h2>
          <button
            type="button"
            onClick={createDraft}
            className="mb-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-pine px-3 text-sm font-black text-white transition hover:bg-ink"
          >
            <Plus aria-hidden className="size-4" />
            新規下書き
          </button>
          <div className="grid max-h-[300px] gap-2 overflow-auto pr-1 lg:max-h-[720px]">
            {drafts.map((trick) => (
              <button
                key={trick.id}
                type="button"
                onClick={() => setSelectedId(trick.id)}
                className={`rounded border px-3 py-2 text-left text-sm transition ${
                  selected?.id === trick.id ? "border-pine bg-skywash text-pine" : "border-ink/8 bg-paper text-graphite hover:border-pine"
                }`}
              >
                <span className="block font-bold">{trick.name}</span>
                <span className="text-xs">
                  Lv.{trick.level || "-"} / {trick.discipline} / {trick.family} / {trick.status}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="grid gap-4 lg:gap-5">
          {selected && activeSection === "tricks" ? (
            <section className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-pine">Trick Bundle</p>
                  <h1 className="break-words text-xl font-black text-ink sm:text-2xl">{selected.name}</h1>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-pine px-4 text-sm font-black text-white transition hover:bg-ink sm:w-auto"
                    onClick={saveSelected}
                  >
                    <Save aria-hidden className="size-4" />
                    まとめて保存
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded border border-coral px-4 text-sm font-black text-coral transition hover:bg-coral hover:text-white sm:w-auto"
                    onClick={deleteSelected}
                  >
                    <Trash2 aria-hidden className="size-4" />
                    削除
                  </button>
                </div>
              </div>
              <p className="mb-4 rounded bg-paper px-3 py-2 text-xs font-semibold text-graphite/72">{saveMessage}</p>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr] xl:gap-5">
                <div className="grid gap-4">
                  <Panel icon={Layers} title="基本情報">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="技名" value={selected.name} onChange={(value) => updateSelected("name", value)} />
                      <Field label="slug" value={selected.slug} onChange={(value) => updateSelected("slug", value)} />
                      <ListField label="別名" values={selected.aliases} onChange={(value) => updateSelected("aliases", value)} />
                      <ListField label="タグ" values={selected.tags} onChange={(value) => updateSelected("tags", value)} />
                      <Field label="要約" value={selected.summary} onChange={(value) => updateSelected("summary", value)} />
                      <Field label="大分類" value={selected.discipline} onChange={(value) => updateSelected("discipline", value)} />
                      <Field label="系統" value={selected.family} onChange={(value) => updateSelected("family", value)} />
                      <Field label="軸" value={selected.axis} onChange={(value) => updateSelected("axis", value)} />
                      <Field label="縄文脈" value={selected.ropeContext} onChange={(value) => updateSelected("ropeContext", value)} />
                      <Field label="踏切" value={selected.takeoff} onChange={(value) => updateSelected("takeoff", value)} />
                      <Field label="着地" value={selected.landing} onChange={(value) => updateSelected("landing", value)} />
                      <IntegerField label="レベル" min={0} max={10} value={selected.level} onChange={(value) => updateSelected("level", value)} />
                      <Field label="レベルカテゴリ" value={selected.levelCategory} onChange={(value) => updateSelected("levelCategory", value)} />
                      <NumberField label="難度" value={selected.difficulty} onChange={(value) => updateSelected("difficulty", value)} />
                      <NumberField label="危険度" value={selected.riskLevel} onChange={(value) => updateSelected("riskLevel", value)} />
                      <StatusField value={selected.status} onChange={(value) => updateSelected("status", value)} />
                    </div>
                    <label className="mt-4 flex items-center gap-2 text-sm font-bold text-graphite">
                      <input
                        type="checkbox"
                        checked={selected.showSource}
                        onChange={(event) => updateSelected("showSource", event.target.checked)}
                        className="size-4 accent-pine"
                      />
                      公開画面に出典を表示する
                    </label>
                  </Panel>

                  <Panel icon={Database} title="説明文">
                    <textarea
                      value={selected.description}
                      onChange={(event) => updateSelected("description", event.target.value)}
                      className="min-h-40 w-full rounded border border-ink/14 bg-paper px-3 py-2 text-sm leading-6 outline-none focus:border-pine"
                    />
                  </Panel>
                </div>

                <div className="grid gap-4">
                  <Panel icon={GitBranch} title="基礎技・応用技">
                    <RelationPicker
                      label="基礎技"
                      description="この技の前に練習しておきたい技"
                      options={relationOptions}
                      selectedIds={selectedBaseIds}
                      onChange={(ids) => updateRelationIds("base", ids)}
                    />
                    <RelationPicker
                      label="応用技"
                      description="この技の次に練習する派生技"
                      options={relationOptions}
                      selectedIds={selectedAdvancedIds}
                      onChange={(ids) => updateRelationIds("advanced", ids)}
                    />
                    <p className="mt-3 rounded bg-paper px-3 py-2 text-xs font-semibold text-graphite/72">{relationMessage}</p>
                  </Panel>

                  <Panel icon={FileVideo} title="挿入動画">
                    <textarea
                      value={selectedVideoPaths.join("\n")}
                      onChange={(event) => updateVideoPaths(event.target.value)}
                      placeholder="Storage path または https:// で始まる動画URLを1行ずつ"
                      className="min-h-28 w-full rounded border border-ink/14 bg-paper px-3 py-2 text-sm leading-6 outline-none focus:border-pine"
                    />
                    <VideoUpload onValidate={handleVideo} message={videoMessage} />
                  </Panel>
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === "relations" ? (
            <RelationBulkEditor tricks={drafts} relations={relationDrafts} onRelationsChange={setRelationDrafts} prototypeMode={prototypeMode} />
          ) : null}

          {activeSection === "layout" ? (
            <AdminMapEditor tricks={drafts} relations={relationDrafts} mapPositions={mapPositions} prototypeMode={prototypeMode} />
          ) : null}

          {activeSection === "status" ? (
          <section className="grid gap-4 lg:grid-cols-3 lg:gap-5">
            <Panel icon={LinkIcon} title="選択中の相関">
              <RelationPreview relations={relationDrafts} tricks={drafts} selectedId={selected?.id} />
            </Panel>
            <Panel icon={FileVideo} title="登録動画">
              <p className="mb-3 text-sm leading-6 text-graphite/76">選択中: {selectedVideos.length}件 / 全体: {mediaDrafts.length}件</p>
              <div className="max-h-40 overflow-auto rounded bg-paper p-2 text-xs leading-5 text-graphite">
                {selectedVideos.length ? selectedVideos.map((asset) => <div key={asset.id}>{asset.storagePath}</div>) : "登録動画はまだありません。"}
              </div>
            </Panel>
            <Panel icon={Database} title="レベル表・出典">
              <p className="text-sm leading-6 text-graphite/76">
                レベル表: {levels.length}件 / 出典: {sources.length}件。PDF出典は保持し、公開表示は技ごとに切り替えます。
              </p>
            </Panel>
          </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function AdminSectionTabs({ activeSection, onChange }: { activeSection: AdminSection; onChange: (section: AdminSection) => void }) {
  const sections: Array<{ id: AdminSection; label: string; description: string }> = [
    { id: "tricks", label: "技を編集", description: "名前・説明・動画" },
    { id: "relations", label: "繋がり", description: "相関の一覧・一括指定" },
    { id: "layout", label: "配置", description: "公式スキルツリー" },
    { id: "status", label: "確認", description: "相関・動画・出典" }
  ];

  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {sections.map((section) => {
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={`rounded border p-3 text-left transition ${
              isActive ? "border-pine bg-skywash text-pine shadow-sm" : "border-ink/10 bg-white text-graphite hover:border-pine"
            }`}
          >
            <span className="block text-sm font-black">{section.label}</span>
            <span className="mt-1 block text-xs font-semibold opacity-75">{section.description}</span>
          </button>
        );
      })}
    </div>
  );
}

function AdminMetric({ label, value, tone }: { label: string; value: number; tone: "pine" | "saffron" | "graphite" | "coral" }) {
  const toneClass = {
    pine: "text-pine",
    saffron: "text-saffron",
    graphite: "text-graphite",
    coral: "text-coral"
  }[tone];

  return (
    <section className="rounded border border-ink/10 bg-white p-3 shadow-sm sm:p-4">
      <p className="text-xs font-black text-graphite/62">{label}</p>
      <p className={`mt-2 text-2xl font-black sm:text-3xl ${toneClass}`}>{value}</p>
    </section>
  );
}

function StatusField({ value, onChange }: { value: Trick["status"]; onChange: (value: Trick["status"]) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">公開状態</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Trick["status"])}
        className="h-11 w-full rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
      >
        <option value="draft">下書き</option>
        <option value="published">公開</option>
      </select>
    </label>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
      />
    </label>
  );
}

function ListField({ label, values, onChange }: { label: string; values: string[]; onChange: (value: string[]) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <input
        value={values.join(", ")}
        onChange={(event) => onChange(splitList(event.target.value))}
        className="h-11 w-full rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
      />
    </label>
  );
}

function RelationPicker({
  label,
  description,
  options,
  selectedIds,
  onChange
}: {
  label: string;
  description: string;
  options: Trick[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const optionById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedOptions = selectedIds.map((id) => optionById.get(id)).filter((option): option is Trick => Boolean(option));
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return options
      .filter((option) => {
        if (!normalizedQuery) return true;
        const searchable = [option.name, option.discipline, option.family, option.levelCategory, ...option.aliases, ...option.tags].join(" ").toLowerCase();
        return searchable.includes(normalizedQuery);
      })
      .slice(0, 80);
  }, [options, query]);

  function toggle(id: string, checked: boolean) {
    if (checked) {
      onChange(selectedIds.includes(id) ? selectedIds : [...selectedIds, id]);
      return;
    }
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  }

  return (
    <section className="mt-4 rounded border border-ink/10 bg-paper p-3 first:mt-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-ink">{label}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-graphite/70">{description}</p>
        </div>
        <span className="shrink-0 rounded bg-white px-2 py-1 text-xs font-black text-pine">{selectedOptions.length}件</span>
      </div>

      <div className="mt-3 min-h-8">
        {selectedOptions.length ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggle(option.id, false)}
                className="rounded border border-pine/20 bg-white px-2 py-1 text-xs font-black text-pine transition hover:border-coral hover:text-coral"
                aria-label={`${option.name}を${label}から外す`}
              >
                {option.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded bg-white px-2 py-1.5 text-xs font-semibold text-graphite/58">未選択</p>
        )}
      </div>

      <label className="mt-3 flex h-10 items-center gap-2 rounded border border-ink/12 bg-white px-3 text-sm focus-within:border-pine">
        <Search aria-hidden className="size-4 shrink-0 text-graphite/42" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="技名・系統・タグで検索"
          className="h-full min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>

      <div className="mt-3 grid max-h-64 gap-1.5 overflow-auto pr-1">
        {visibleOptions.length ? (
          visibleOptions.map((option) => (
            <label
              key={option.id}
              className={`grid cursor-pointer grid-cols-[auto_1fr] gap-2 rounded border px-2.5 py-2 text-sm transition ${
                selectedSet.has(option.id) ? "border-pine bg-skywash text-pine" : "border-ink/8 bg-white text-graphite hover:border-pine"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedSet.has(option.id)}
                onChange={(event) => toggle(option.id, event.target.checked)}
                className="mt-0.5 size-4 accent-pine"
              />
              <span className="min-w-0">
                <span className="block truncate font-bold">{option.name}</span>
                <span className="mt-0.5 block truncate text-xs opacity-70">
                  Lv.{option.level || "-"} / {option.discipline} / {option.family}
                </span>
              </span>
            </label>
          ))
        ) : (
          <p className="rounded bg-white px-3 py-2 text-xs font-semibold text-graphite/62">一致する技がありません。</p>
        )}
      </div>
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: 1 | 2 | 3 | 4 | 5) => void }) {
  function normalize(input: number): 1 | 2 | 3 | 4 | 5 {
    return Math.max(1, Math.min(5, input)) as 1 | 2 | 3 | 4 | 5;
  }

  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <input
        min={1}
        max={5}
        type="number"
        value={value}
        onChange={(event) => onChange(normalize(Number(event.target.value)))}
        className="h-11 w-full rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
      />
    </label>
  );
}

function IntegerField({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <input
        min={min}
        max={max}
        type="number"
        value={value}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value))))}
        className="h-11 w-full rounded border border-ink/14 bg-paper px-3 text-sm outline-none focus:border-pine"
      />
    </label>
  );
}

function Panel({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="rounded border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
        <Icon aria-hidden className="size-4 text-pine" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function RelationPreview({ relations, tricks, selectedId }: { relations: TrickRelation[]; tricks: Trick[]; selectedId?: string }) {
  const trickById = new Map(tricks.map((trick) => [trick.id, trick]));
  const visible = selectedId ? relations.filter((relation) => relation.fromTrickId === selectedId || relation.toTrickId === selectedId) : relations;

  return (
    <div className="max-h-44 overflow-auto rounded bg-paper p-2 text-xs leading-5 text-graphite">
      {visible.length
        ? visible.slice(0, 18).map((relation) => (
            <div key={relation.id}>
              {relationLabel(relation.type)}: {trickById.get(relation.fromTrickId)?.name ?? relation.fromTrickId} → {trickById.get(relation.toTrickId)?.name ?? relation.toTrickId}
            </div>
          ))
        : "登録された相関はまだありません。"}
    </div>
  );
}

function VideoUpload({ onValidate, message }: { onValidate: (file: File | undefined, consent: boolean) => void; message: string }) {
  const [file, setFile] = useState<File>();
  const [consent, setConsent] = useState(false);

  return (
    <div className="mt-4 grid gap-3">
      <input
        type="file"
        accept="video/*"
        onChange={(event) => setFile(event.target.files?.[0])}
        className="w-full text-sm"
      />
      <label className="flex items-center gap-2 text-sm font-semibold text-graphite">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="size-4 accent-pine" />
        撮影・出演同意を確認済み
      </label>
      <button
        type="button"
        onClick={() => onValidate(file, consent)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded border border-pine px-3 text-sm font-black text-pine transition hover:bg-pine hover:text-white"
      >
        <Upload aria-hidden className="size-4" />
        検証/アップロード
      </button>
      <p className="text-xs leading-5 text-graphite/72">{message}</p>
    </div>
  );
}

function splitList(value: string) {
  return value
    .split(/[\n,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLearningRelation(relation: TrickRelation) {
  return relation.type === "prerequisite" || relation.type === "progression";
}
