// What the site actually does with data. Keep this in sync with server/db.js (RETENTION_DAYS, SESSION_DAYS).
export const RETENTION_MONTHS = 12
export const SESSION_DAYS = 30

export function DataSafety({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-slate-700">
      <p className="font-semibold text-navy-900">How we handle your answers</p>
      <ul className="mt-2 space-y-1 list-disc pl-5">
        <li>Your answers are saved in this browser so you can come back to them. Clearing your browser data removes them.</li>
        <li>{signedIn
          ? `Because you are signed in, each finished assessment is also saved as a dated version on the Stackd server, visible only to your account. Versions are deleted automatically after ${RETENTION_MONTHS} months, and you can delete them sooner on the History page.`
          : 'Nothing is sent to our server unless you sign in or ask for a Claude analysis.'}</li>
        <li>Uploaded files stay in this browser tab and are never saved. If you ask for a Claude analysis, the file text is sent through our server to Anthropic to produce it, and our server does not store it.</li>
        <li>We never ask for passwords, banking details, tax IDs, or customer or employee information. Please leave them out of notes and files.</li>
      </ul>
      <p className="mt-2 text-xs text-slate-500">We do our best to keep data safe but cannot guarantee it. See the <a href="#/terms" className="underline">Terms of Service</a>.</p>
    </div>
  )
}
