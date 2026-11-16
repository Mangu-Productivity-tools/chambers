import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppFooter, AppNav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { eraseDeviceData } from "@/lib/device/erase";
import { PRIVACY_LINE } from "@/lib/site/beta";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings · Chambers" }] }),
});

function SettingsPage() {
  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <main id="main" className="mx-auto max-w-page px-5 py-12 md:px-8">
        <span className="kicker">Settings</span>
        <h1 className="font-serif mt-3 text-3xl font-medium tracking-[-0.03em] md:text-5xl">
          This device.
        </h1>
        <p className="mt-4 max-w-xl text-body text-soft">
          {PRIVACY_LINE} There is no account, so everything Chambers knows about you lives in this
          browser.
        </p>
        <DeviceData />
      </main>
      <AppFooter />
    </div>
  );
}

function DeviceData() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const erase = async () => {
    setBusy(true);
    const ok = await eraseDeviceData();
    if (!ok) {
      setBusy(false);
      setOpen(false);
      toast.error("Could not erase everything. Clear this site's data in your browser settings.");
      return;
    }
    // Full document load: every in-memory store restarts from its initial state.
    window.location.replace("/");
  };

  return (
    <section className="hairline mt-12 max-w-2xl rounded-lg p-5">
      <h2 className="font-display text-[22px] font-semibold tracking-[-0.03em]">Device data</h2>
      <p className="mt-2 text-body text-soft">
        Stored in this browser: your resume and master copy, the posting you pasted, your cover
        letter, tailor notes, paper choice, and saved versions.
      </p>
      <p className="mt-2 text-body text-soft">
        Erasing removes all of it from this device. It cannot be undone. To keep a copy, download a
        JSON pack from{" "}
        <Link to="/export" className="text-ink underline decoration-hair-strong underline-offset-4">
          Export
        </Link>{" "}
        first.
      </p>
      <div className="mt-5">
        <AlertDialog.Root open={open} onOpenChange={(v) => (busy ? undefined : setOpen(v))}>
          <AlertDialog.Trigger asChild>
            <Button variant="ghost" size="sm">
              Erase this device's Chambers data
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-night/40" />
            <AlertDialog.Content className="hairline fixed left-1/2 top-1/2 z-[61] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-paper p-6 shadow-pop focus:outline-none">
              <AlertDialog.Title className="font-display text-[22px] font-semibold tracking-[-0.03em] text-ink">
                Erase this device's Chambers data?
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-body leading-relaxed text-soft">
                Your resume, posting, cover letter, and saved versions will be removed from this
                browser. This cannot be undone.
              </AlertDialog.Description>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <AlertDialog.Cancel asChild>
                  <Button variant="ghost" size="sm" disabled={busy}>
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                {/* !text-paper: cn() merges size "text-caption" over the variant's text colour. */}
                <Button
                  variant="ink"
                  size="sm"
                  className="enabled:!text-paper"
                  disabled={busy}
                  onClick={() => void erase()}
                >
                  {busy ? "Erasing…" : "Erase data"}
                </Button>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </section>
  );
}
