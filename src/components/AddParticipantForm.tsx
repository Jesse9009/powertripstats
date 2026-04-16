'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { addParticipant } from '@/app/actions';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  nickname: z.string().optional(),
});

type ParticipantFormData = z.infer<typeof schema>;

export function AddParticipantForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ParticipantFormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: ParticipantFormData) {
    setServerError(null);
    try {
      const res = await addParticipant({
        firstName: data.firstName,
        lastName: data.lastName,
        nickname: data.nickname || undefined,
      });

      if (!res.success) {
        setServerError(res.error ?? 'Something went wrong');
        return;
      }

      reset();
      router.refresh();
    } catch {
      setServerError('Network error. Please try again.');
    }
  }

  return (
    <Card className="w-80 shrink-0 self-start">
      <CardHeader>
        <CardTitle>Add Participant</CardTitle>
        <CardDescription>Create a new participant record.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="firstName" className="text-sm font-medium">
              First Name
            </label>
            <Input
              id="firstName"
              placeholder="Jane"
              {...register('firstName')}
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="lastName" className="text-sm font-medium">
              Last Name
            </label>
            <Input
              id="lastName"
              placeholder="Smith"
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">
                {errors.lastName.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="nickname" className="text-sm font-medium">
              Nickname{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <Input id="nickname" placeholder="Jay" {...register('nickname')} />
          </div>

          {serverError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add Participant'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}