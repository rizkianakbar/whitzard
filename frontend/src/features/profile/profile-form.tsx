"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/features/members/member-avatar";
import { PHOTO_TYPES, profileSchema, type ProfileValues } from "@/features/profile/profile.lib";
import { useSession } from "@/features/session/session.hooks";
import { BusyLabel } from "@/features/tx/tx-label";
import { api, type Member } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { keys } from "@/lib/query-keys";
import { useObjectUrl } from "@/lib/use-object-url";
import { cn } from "@/lib/utils";

type ProfileFormProps = {
  me: Member;
  submitLabel: string;
};

/** Name, nickname, email, city, birth date and photo. Self-declared, never verified. */
export function ProfileForm(props: ProfileFormProps) {
  const { me, submitLabel } = props;
  const { t } = useI18n();
  const text = t.profile.form;
  const { token } = useSession();
  const queryClient = useQueryClient();
  const p = me.profile;
  const today = new Date().toISOString().slice(0, 10);
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema(t, today)),
    defaultValues: {
      displayName: p?.displayName ?? "",
      nickname: p?.nickname ?? "",
      email: p?.email ?? "",
      city: p?.city ?? "",
      birthDate: p?.birthDate ?? "",
      photo: null,
    },
  });
  const photo = useWatch({ control, name: "photo" });
  const preview = useObjectUrl(errors.photo ? null : photo);
  // Validated as soon as it is picked; null goes back to the saved photo (if any).
  const pickPhoto = (file: File | null) => setValue("photo", file, { shouldValidate: true });

  // Names and photos elsewhere on the page come from the member list, so refresh it too.
  const refresh = () =>
    Promise.all([keys.member(me.address), keys.members].map((queryKey) => queryClient.invalidateQueries({ queryKey })));

  const save = useMutation({
    mutationFn: async ({ photo, ...profile }: ProfileValues) => {
      await api.updateMe(token!, profile);
      if (photo) await api.setPhoto(token!, photo);
    },
    onSuccess: async () => {
      await refresh();
      pickPhoto(null);
      toast.success(text.saved);
    },
  });

  const removePhoto = useMutation({
    mutationFn: () => api.deletePhoto(token!),
    onSuccess: async () => {
      await refresh();
      toast(text.photoRemoved);
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((values) => save.mutate(values))} className="flex flex-col gap-6">
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
          <span className="sr-only">{text.pickPhoto}</span>
          <input
            id="photo"
            type="file"
            accept={PHOTO_TYPES}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pickPhoto(file);
              e.target.value = ""; // so picking the same file again still fires onChange
            }}
          />
        </label>
        <div className="flex min-w-52 flex-1 flex-col gap-1">
          <span className="font-semibold">{text.photo}</span>
          <span className="text-sm leading-relaxed text-batu">{text.photoHint}</span>
          {errors.photo && (
            <span role="alert" className="text-sm font-medium text-bata-ink">
              {errors.photo.message}
            </span>
          )}
          {photo ? (
            <span className="text-sm text-batu">
              {!errors.photo && <>{text.photoPending(submitLabel)} </>}
              <button type="button" onClick={() => pickPhoto(null)} className="font-semibold text-bata-ink underline underline-offset-4">
                {text.cancel}
              </button>
            </span>
          ) : (
            p?.photo && (
              <button
                type="button"
                disabled={removePhoto.isPending}
                onClick={() => removePhoto.mutate()}
                className="self-start text-sm font-semibold text-bata-ink underline underline-offset-4"
              >
                {text.removePhoto}
              </button>
            )
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="displayName" label={text.displayName} error={errors.displayName?.message} className="sm:col-span-2">
          <Input id="displayName" maxLength={50} autoComplete="name" aria-invalid={!!errors.displayName} {...register("displayName")} />
        </Field>
        <Field id="nickname" label={text.nickname} hint={text.nicknameHint}>
          <Input id="nickname" maxLength={30} autoComplete="nickname" {...register("nickname")} />
        </Field>
        <Field id="email" label={text.email} hint={text.emailHint} error={errors.email?.message}>
          <Input id="email" type="email" maxLength={254} autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field id="city" label={text.city} hint={text.cityHint}>
          <Input id="city" maxLength={60} autoComplete="address-level2" {...register("city")} />
        </Field>
        <Field id="birthDate" label={text.birthDate} hint={text.birthDateHint} error={errors.birthDate?.message}>
          <Input id="birthDate" type="date" max={today} autoComplete="bday" aria-invalid={!!errors.birthDate} {...register("birthDate")} />
        </Field>
      </div>

      <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-batu">{text.note}</p>

      <Button type="submit" size="lg" disabled={save.isPending} className="self-start">
        <BusyLabel busy={save.isPending ? t.common.saving : null}>{submitLabel}</BusyLabel>
      </Button>
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
};

function Field(props: FieldProps) {
  const { id, label, hint, error, className, children } = props;
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
