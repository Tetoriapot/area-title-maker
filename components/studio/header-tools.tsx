'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { CircleHelp, History, Moon, Sun, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { STUDIO_UPDATES } from '@/src/data/updates';
import {
  getServerStudioTheme,
  getStudioTheme,
  setStudioTheme,
  subscribeToStudioTheme,
} from '@/src/state/theme';

function InfoDialog({
  label,
  title,
  description,
  icon: Icon,
  children,
}: {
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 sm:px-2.5"
            aria-label={`${label}を開く`}
            title={label}
          />
        }
      >
        <Icon aria-hidden="true" />
        <span className="hidden sm:inline">{label}</span>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b px-5 py-5 pr-12 sm:px-6 sm:pr-12">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Icon className="size-4 text-primary" aria-hidden="true" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        {/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The scrollable region must support keyboard scrolling. */}
        <section
          aria-label={`${label}の内容`}
          tabIndex={0}
          className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-6"
        >
          {children}
        </section>
        {/* oxlint-enable jsx-a11y/no-noninteractive-tabindex */}
        <div className="shrink-0 border-t bg-muted/30 px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
          編集内容はそのまま保持されます。Escキーでも閉じられます。
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HelpContent() {
  return (
    <div className="space-y-6 text-[13px] leading-relaxed">
      <section aria-labelledby="help-start-heading">
        <h3 id="help-start-heading" className="mb-3 font-semibold">
          3ステップではじめる
        </h3>
        <ol className="space-y-3">
          {[
            ['文字を入力', '「編集」でメインとサブのタイトルを入力します。'],
            [
              '雰囲気を選ぶ',
              '「プリセット」からデザインを選び、文字・装飾・位置を調整します。入力したタイトルは保持されます。',
            ],
            [
              'PNGで保存',
              '右上の「PNG保存」で、背景が透明なタイトル画像を保存できます。',
            ],
          ].map(([heading, body], index) => (
            <li key={heading} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{heading}</p>
                <p className="mt-0.5 text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="help-export-heading"
        className="rounded-lg border bg-muted/25 p-4"
      >
        <h3 id="help-export-heading" className="mb-3 font-semibold">
          保存方法を選ぶ
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          「編集」の出力設定から、用途に合わせて選べます。
        </p>
        <dl className="space-y-3">
          <div>
            <dt className="font-medium">透過PNG</dt>
            <dd className="text-muted-foreground">
              キャンバス全体のサイズで保存。動画やゲーム画面に重ねるときに。
            </dd>
          </div>
          <div>
            <dt className="font-medium">タイトル部分PNG</dt>
            <dd className="text-muted-foreground">
              自動トリミングをONにすると、タイトルと装飾の周りだけを余白付きで切り出します。
            </dd>
          </div>
          <div>
            <dt className="font-medium">背景込みPNG</dt>
            <dd className="text-muted-foreground">
              読み込んだ背景画像とタイトルを一緒に保存します。
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="help-tips-heading">
        <h3 id="help-tips-heading" className="mb-3 font-semibold">
          操作のヒント
        </h3>
        <ul className="list-disc space-y-2 pl-4 text-muted-foreground marker:text-primary">
          <li>
            プレビューをドラッグして位置を調整。プレビューを選択して矢印キーでも動かせます。Shift＋矢印キーで大きく移動します。
          </li>
          <li>
            プリセットの☆でお気に入り登録。検索やカテゴリでも絞り込めます。
          </li>
          <li>
            Google
            Fontsが読み込めないときは「再試行」、または端末内フォントを選んでください。英字向け書体の日本語は端末内フォントで補います。
          </li>
          <li>
            背景にはPNG・JPEG・WEBPを使用できます（30MB以下、最大8192px・約16.8メガピクセル）。
          </li>
          <li>
            ライト／ダーク切替は操作画面の表示だけを変更します。保存するPNGの色や背景には影響しません。
          </li>
        </ul>
      </section>

      <section aria-labelledby="help-storage-heading" className="border-t pt-4">
        <h3 id="help-storage-heading" className="mb-2 font-semibold">
          保存とプライバシー
        </h3>
        <p className="text-muted-foreground">
          タイトル・編集設定・お気に入り・表示モードは、このブラウザに保存されます。背景画像は再読み込みすると解除されるため、必要に応じて選び直してください。
        </p>
        <p className="mt-2 text-muted-foreground">
          タイトル本文や画像はアップロードしません。Google
          Fontsを選んだ場合だけ、書体を取得するためにGoogleへ接続します。
        </p>
        <a
          href="FONT_NOTICES.txt"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-primary underline underline-offset-4"
        >
          書体と外部通信について
        </a>
      </section>
    </div>
  );
}

export function HeaderTools() {
  const theme = useSyncExternalStore(
    subscribeToStudioTheme,
    getStudioTheme,
    getServerStudioTheme,
  );
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const themeLabel = nextTheme === 'light' ? 'ライト' : 'ダーク';

  return (
    <nav
      aria-label="画面とヘルプ"
      className="flex items-center gap-0.5 sm:gap-1"
    >
      <InfoDialog
        label="更新情報"
        title="更新情報"
        description="Area Title Makerの追加機能や改善をお知らせします。"
        icon={History}
      >
        <ol className="space-y-6">
          {STUDIO_UPDATES.map((update, index) => (
            <li
              key={update.date}
              className="relative border-l border-primary/25 pl-5"
            >
              <span
                className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary"
                aria-hidden="true"
              />
              <div className="mb-2 flex items-center gap-2">
                <time
                  dateTime={update.date}
                  className="font-mono text-xs text-muted-foreground"
                >
                  {update.date.replaceAll('-', '.')}
                </time>
                {index === 0 && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    最新
                  </span>
                )}
              </div>
              <h3 className="mb-2 text-sm font-semibold">{update.title}</h3>
              <ul className="list-disc space-y-2 pl-4 text-[13px] leading-relaxed text-muted-foreground">
                {update.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </InfoDialog>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 px-2 sm:px-2.5"
        aria-label={`${themeLabel}モードに切り替え`}
        title={`${themeLabel}モードに切り替え`}
        onClick={() => setStudioTheme(nextTheme)}
      >
        {theme === 'dark' ? (
          <Sun aria-hidden="true" />
        ) : (
          <Moon aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{themeLabel}</span>
      </Button>
      <InfoDialog
        label="Help"
        title="Help · 使い方"
        description="文字を入力して、雰囲気を選び、PNGで保存。"
        icon={CircleHelp}
      >
        <HelpContent />
      </InfoDialog>
    </nav>
  );
}
