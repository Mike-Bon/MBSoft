import { MapPin } from "lucide-react";
import Modal from "./Modal";

export default function ConfirmAddressModal({
  label,
  address,
  onConfirm,
  onCancel,
}: {
  label: string;
  address: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={`Confirm ${label}`} onClose={onCancel}>
      <div className="flex items-start gap-3 rounded-lg border border-lbc-border bg-lbc-bg p-4">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-lbc-red" />
        <p className="text-sm text-gray-800">{address}</p>
      </div>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Choose Again
        </button>
        <button type="button" onClick={onConfirm} className="btn-primary flex-1">
          Confirm
        </button>
      </div>
    </Modal>
  );
}
