export function DataPrivacyFooter() {
  return (
    <p className="mt-8 text-center text-xs text-gray-400">
      All information is secured in compliance with the Data Privacy Act of 2012.
    </p>
  );
}

export function LiabilityDisclaimer({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-lbc-border bg-lbc-bg p-4 text-sm text-gray-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-lbc-red"
      />
      <span>
        I confirm that all information provided above is true and correct. LBC Express is not liable for any
        undelivered, delayed, or damaged shipment arising from incorrect or incomplete information provided by
        the shipper.
      </span>
    </label>
  );
}
