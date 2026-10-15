import { AlertDialog, Button } from '@heroui/react';
import { resolveConflict, useSyncStore, type SaveSummary } from '../sync';

/**
 * Shown after signing in on a device whose plan differs from the cloud save. Nothing is replaced
 * (and syncing pauses) until the user picks which one to keep.
 */
export function SyncConflictDialog() {
  const conflict = useSyncStore((s) => s.conflict);
  const cloudNewer = conflict ? Date.parse(conflict.cloud.updatedAt) >= Date.parse(conflict.device.updatedAt) : false;

  return (
    <AlertDialog.Backdrop isOpen={!!conflict} isDismissable={false} isKeyboardDismissDisabled>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[440px]">
          <AlertDialog.Header>
            <AlertDialog.Icon status="warning" />
            <AlertDialog.Heading>Which plan do you want to keep?</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="flex flex-col gap-4">
            <p>This device has a different plan from your cloud save. The one you don't keep will be replaced.</p>
            {conflict && (
              <div className="grid gap-2 sm:grid-cols-2">
                <SaveCard title="Cloud save" summary={conflict.cloud} newest={cloudNewer} />
                <SaveCard title="This device" summary={conflict.device} newest={!cloudNewer} />
              </div>
            )}
          </AlertDialog.Body>
          <AlertDialog.Footer className="flex-wrap">
            <Button variant="secondary" onPress={() => void resolveConflict('device')}>
              Keep this device's
            </Button>
            <Button onPress={() => void resolveConflict('cloud')}>Keep cloud save</Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

function SaveCard({ title, summary, newest }: { title: string; summary: SaveSummary; newest: boolean }) {
  return (
    <div className="rounded-lg bg-surface-secondary p-3 text-sm">
      <p className="flex items-center justify-between gap-2 font-medium">
        {title}
        {newest && <span className="text-xs font-normal text-success">Newest</span>}
      </p>
      <p className="mt-1 text-muted">{summary.tatari} Tatari</p>
      <p className="text-xs text-muted">Last changed {new Date(summary.updatedAt).toLocaleString()}</p>
    </div>
  );
}
