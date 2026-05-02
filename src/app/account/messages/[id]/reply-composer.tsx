"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { sendMessage, uploadMessageAttachments } from "@/app/actions/messages";

const MAX_IMAGES = 6;

type Pending = { url: string; name: string };

export function ReplyComposer({
  conversationId,
  withName,
}: {
  conversationId: string;
  withName: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();
  const [uploading, startUpload] = useTransition();

  const submit = () => {
    if (sending) return;
    if (!text.trim() && images.length === 0) return;
    setError(null);
    const urls = images.map((i) => i.url);
    startSend(async () => {
      const result = await sendMessage(conversationId, text, urls);
      if (!result.ok) {
        setError(result.error ?? "Could not send.");
        return;
      }
      setText("");
      setImages([]);
      router.refresh();
    });
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const slotsLeft = MAX_IMAGES - images.length;
    if (slotsLeft <= 0) {
      setError(`Max ${MAX_IMAGES} images per message.`);
      return;
    }
    const accepted = files.slice(0, slotsLeft);
    setError(null);
    const fd = new FormData();
    for (const f of accepted) fd.append("files", f);
    startUpload(async () => {
      const result = await uploadMessageAttachments(fd);
      if (!result.ok) {
        setError(result.error ?? "Upload failed.");
        return;
      }
      const next = (result.urls ?? []).map((url, i) => ({
        url,
        name: accepted[i]?.name ?? "image",
      }));
      setImages((prev) => [...prev, ...next]);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, j) => j !== i));
  };

  const canSend = (text.trim().length > 0 || images.length > 0) && !sending && !uploading;

  return (
    <div className="border-t border-white/5 p-4">
      {error && (
        <div className="mb-2 rounded-md border border-rose-700/40 bg-rose-500/10 p-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      {images.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div
              key={img.url}
              className="group relative h-20 w-20 overflow-hidden rounded-md border border-white/10 bg-[#101012]"
            >
              <Image
                src={img.url}
                alt={img.name}
                fill
                sizes="80px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {uploading && (
            <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-white/15 bg-white/[0.02] text-white/60">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder={`Reply to ${withName}...`}
          className="flex-1 resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
        />
        <div className="flex flex-col gap-1.5">
          <button
            onClick={submit}
            disabled={!canSend}
            className="flex items-center justify-center rounded-md bg-gradient-to-r from-amber-400 to-amber-500 p-2 text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= MAX_IMAGES}
            className="flex items-center justify-center rounded-md border border-white/15 bg-[#101012] p-2 text-white/80 transition hover:border-amber-400/40 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Attach image"
            title={
              images.length >= MAX_IMAGES
                ? `Max ${MAX_IMAGES} images per message`
                : "Attach images"
            }
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Paperclip size={16} />
            )}
          </button>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-white/60">
        Press ⌘↵ to send · Up to {MAX_IMAGES} images, 10MB each · Be respectful — abusive
        messages can result in account suspension.
      </div>
    </div>
  );
}
