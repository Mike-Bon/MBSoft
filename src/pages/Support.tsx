import { useState, type FormEvent } from "react";
import { Plus, LifeBuoy } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import { DataPrivacyFooter } from "../components/DisclaimerNote";
import { useData } from "../context/DataContext";
import { formatDateTime } from "../lib/utils";

const CATEGORIES = ["Booking Issue", "Delivery Delay", "Billing / Charges", "Account Access", "Other"];

export default function Support() {
  const { tickets, createTicket } = useData();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTicket(subject, category, description);
      setOpen(false);
      setSubject("");
      setCategory(CATEGORIES[0]);
      setDescription("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Support"
        subtitle="Create tickets and monitor their status."
        action={
          <button type="button" onClick={() => setOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Create Ticket
          </button>
        }
      />

      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
          <LifeBuoy className="h-5 w-5 text-lbc-red" />
          Ticket Monitoring
        </h2>

        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-lbc-border py-16 text-center">
            <LifeBuoy className="h-8 w-8 text-gray-300" />
            <p className="text-gray-400">No tickets yet. Create one to get help.</p>
          </div>
        ) : (
          <div className="divide-y divide-lbc-border">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold text-gray-900">{t.subject}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{t.category}</p>
                  <p className="mt-1 text-sm text-gray-600">{t.description}</p>
                  <p className="mt-1 text-xs text-gray-400">Submitted {formatDateTime(t.createdAt)}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <DataPrivacyFooter />

      {open && (
        <Modal title="Create Support Ticket" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Subject</span>
              <input required className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Category</span>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Description</span>
              <textarea
                required
                rows={4}
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Submitting…" : "Submit Ticket"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
