import { Button, Card, Form, Input, Label, TextField, toast } from '@heroui/react';
import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { cloud, describeError, reconcile, signIn, signUp, useSyncStore } from '../sync';

/** Sign in to keep the plan in the cloud, synced across devices. A note when no backend is configured. */
export function CloudSave() {
  const { user, status, lastSyncedAt, error } = useSyncStore();

  if (!cloud) {
    return (
      <Card className="flex flex-row items-start gap-3 p-4 text-sm text-muted">
        <CloudOff size={18} className="mt-0.5 shrink-0" />
        <p>Accounts aren't set up on this copy of the app yet. Everything stays in this browser.</p>
      </Card>
    );
  }

  if (!user) return <SignInForm />;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3">
        <Cloud size={18} className="mt-0.5 shrink-0 text-success" />
        <div className="min-w-0 text-sm">
          <p>
            Signed in as <span className="font-medium">{user.email}</span>
          </p>
          <p className="text-muted">
            {status === 'syncing'
              ? 'Syncing…'
              : status === 'error'
                ? `Couldn't sync: ${error}`
                : lastSyncedAt
                  ? `Saved to the cloud at ${new Date(lastSyncedAt).toLocaleTimeString()}`
                  : 'Saves automatically as you go.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" isDisabled={status === 'syncing'} onPress={() => void reconcile()}>
          <RefreshCw size={16} /> Sync now
        </Button>
        <Button variant="ghost" onPress={() => cloud!.signOut().catch((e) => toast(describeError(e), { variant: 'danger' }))}>
          <LogOut size={16} /> Sign out
        </Button>
      </div>
      <p className="text-xs text-muted">Signing out keeps your plan on this device.</p>
    </Card>
  );
}

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'in' | 'up' | null>(null);

  const submit = async (mode: 'in' | 'up') => {
    setBusy(mode);
    try {
      if (mode === 'in') await signIn(email, password);
      else {
        const { needsConfirmation } = await signUp(email, password);
        toast(needsConfirmation ? 'Check your email to confirm your account, then sign in.' : 'Account created. Your plan will now save to the cloud.', {
          variant: 'success',
        });
      }
    } catch (e) {
      toast(describeError(e), { variant: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-4">
      <Form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit('in');
        }}
      >
        <p className="text-sm text-muted">Sign in to save your plan and pick it up on any device.</p>
        <TextField isRequired name="email" type="email" value={email} onChange={setEmail} autoComplete="email">
          <Label>Email</Label>
          <Input variant="secondary" />
        </TextField>
        <TextField isRequired name="password" type="password" value={password} onChange={setPassword} autoComplete="current-password" minLength={6}>
          <Label>Password</Label>
          <Input variant="secondary" />
        </TextField>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" isDisabled={!!busy}>
            {busy === 'in' ? 'Signing in…' : 'Sign in'}
          </Button>
          <Button variant="secondary" isDisabled={!!busy || !email || password.length < 6} onPress={() => void submit('up')}>
            {busy === 'up' ? 'Creating…' : 'Create account'}
          </Button>
        </div>
      </Form>
    </Card>
  );
}
