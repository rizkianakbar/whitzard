"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type Member } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { keys } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const MAX_PHOTO = 2 * 1024 * 1024;

/** Name, nickname, birth date, city and photo. Self-declared, never verified. */
export function ProfileForm({ me, submitLabel, onSaved }: { me: Member; submitLabel: string; onSaved?: () => void }) {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const p = me.profile;
  const [displayName, setDisplayName] = useState(p?.displayName ?? "");
  const [nickname, setNickname] = useState(p?.nickname ?? "");
  const [birthDate, setBirthDate] = useState(p?.birthDate ?? "");
  const [city, setCity] = useState(p?.city ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const today = new Date().toISOString().slice(0, 10);

  const pickPhoto = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_PHOTO) return setErrors((e) => ({ ...e, photo: "Foto lebih dari 2 MB." }));
    setErrors((e) => {
      const next = { ...e };
      delete next.photo;
      return next;
    });
    setPhoto(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!displayName.trim()) next.displayName = "Isi nama lengkapmu.";
    if (birthDate && birthDate > today) next.birthDate = "Tanggal lahir tidak boleh di masa depan.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.updateMe(token!, {
        displayName: displayName.trim(),
        nickname: nickname.trim() || null,
        birthDate: birthDate || null,
        city: city.trim() || null,
      });
      if (photo) await api.setPhoto(token!, photo);
      await queryClient.invalidateQueries({ queryKey: keys.member(me.address) });
      setPhoto(null);
      toast.success("Profil tersimpan.");
      onSaved?.();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async () => {
    try {
      await api.deletePhoto(token!);
      await queryClient.invalidateQueries({ queryKey: keys.member(me.address) });
      toast("Foto dihapus.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-5">
        <label htmlFor="photo" className="group relative cursor-pointer rounded-full has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-24 rounded-full object-cover" />
          ) : (
            <Avatar address={me.address} profile={p} className="size-24 text-3xl" />
          )}
          <span className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full border-2 border-card bg-pandan text-white group-hover:bg-pandan-deep">
            <Camera aria-hidden="true" className="size-4" />
          </span>
          <span className="sr-only">Pilih foto profil</span>
          <input
            id="photo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex min-w-52 flex-1 flex-col gap-1">
          <span className="font-semibold">Foto profil</span>
          <span className="text-sm leading-relaxed text-batu">
            Opsional. PNG, JPG atau WebP, maksimal 2 MB. Hanya anggota yang sudah masuk yang bisa melihatnya.
          </span>
          {errors.photo && <span role="alert" className="text-sm font-medium text-bata-ink">{errors.photo}</span>}
          {p?.photo && !photo && (
            <button type="button" onClick={() => void removePhoto()} className="self-start text-sm font-semibold text-bata-ink underline underline-offset-4">
              Hapus foto
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="displayName" label="Nama lengkap" error={errors.displayName} className="sm:col-span-2">
          <Input id="displayName" value={displayName} maxLength={50} autoComplete="name" onChange={(e) => setDisplayName(e.target.value)} aria-invalid={!!errors.displayName} />
        </Field>
        <Field id="nickname" label="Nama panggilan" hint="Dipakai untuk menyapamu.">
          <Input id="nickname" value={nickname} maxLength={30} autoComplete="nickname" onChange={(e) => setNickname(e.target.value)} />
        </Field>
        <Field id="city" label="Kota atau kabupaten" hint="Terlihat oleh anggota lain.">
          <Input id="city" value={city} maxLength={60} autoComplete="address-level2" onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field id="birthDate" label="Tanggal lahir" hint="Hanya terlihat olehmu." error={errors.birthDate}>
          <Input id="birthDate" type="date" value={birthDate} max={today} autoComplete="bday" onChange={(e) => setBirthDate(e.target.value)} aria-invalid={!!errors.birthDate} />
        </Field>
      </div>

      <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-batu">
        Whitzard tidak memeriksa data ini. Isi seperlunya, cukup supaya sesama anggota mengenalmu. Data profil disimpan di
        server Whitzard, tidak di blockchain.
      </p>

      <Button type="submit" size="lg" disabled={saving} className="self-start">
        {saving ? "Menyimpan" : submitLabel}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className="text-base font-semibold">
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm font-medium text-bata-ink">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-batu">{hint}</p>
      )}
    </div>
  );
}
