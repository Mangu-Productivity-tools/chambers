import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFooter, AppNav } from "@/components/layout/nav";
import { PRIVACY_LINE } from "@/lib/site/beta";
import { FEEDBACK_URL } from "@/lib/site/feedback";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy · Chambers" },
      {
        name: "description",
        content: "What Chambers stores on this device, what it sends, and how to erase it.",
      },
    ],
  }),
});

const SECTIONS = [
  {
    title: "What is stored",
    body: [
      "Your resume and master copy, the posting you paste, your cover letter, tailor notes, paper choice, and up to 20 saved versions.",
      "It is kept in this browser's local storage, on this device only. There is no account and no copy on a server. A different browser or device starts empty.",
    ],
  },
  {
    title: "What is sent",
    body: [
      "Nothing you type or import. Parsing, tailoring, the ATS readiness check, the cover letter, and every export run in this browser.",
      "AI assist is off in this beta, so no resume text goes to an AI service.",
      "Chambers has no analytics and no tracking scripts. Loading the pages is an ordinary web request to our host; your resume is not part of it.",
    ],
  },
] as const;

function PrivacyPage() {
  const link = "text-ink underline decoration-hair-strong underline-offset-4";
  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <main id="main" className="mx-auto max-w-page px-5 py-12 md:px-8">
        <span className="kicker">Privacy</span>
        <h1 className="font-serif mt-3 text-3xl font-medium tracking-[-0.03em] md:text-5xl">
          Plainly.
        </h1>
        <p className="mt-4 max-w-xl text-body text-soft">{PRIVACY_LINE}</p>
        <div className="mt-12 flex max-w-2xl flex-col gap-10">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-[22px] font-semibold tracking-[-0.03em]">{s.title}</h2>
              {s.body.map((p) => (
                <p key={p} className="mt-2 text-body leading-relaxed text-soft">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <section>
            <h2 className="font-display text-[22px] font-semibold tracking-[-0.03em]">
              How to erase it
            </h2>
            <p className="mt-2 text-body leading-relaxed text-soft">
              Open{" "}
              <Link to="/settings" className={link}>
                Settings
              </Link>{" "}
              and choose "Erase this device's Chambers data". Clearing this site's data in your
              browser does the same.
            </p>
          </section>
          <section>
            <h2 className="font-display text-[22px] font-semibold tracking-[-0.03em]">Feedback</h2>
            <p className="mt-2 text-body leading-relaxed text-soft">
              <a href={FEEDBACK_URL} className={link}>
                Send feedback
              </a>{" "}
              opens your own email app. Only what you choose to write is sent.
            </p>
          </section>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
