export function DevBanner() {
  return (
    <div className="w-full border-b bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <div className="mx-auto max-w-screen-2xl px-4 py-2 text-xs md:text-sm">
        <strong className="font-semibold">En développement :</strong>{" "}
        ce site est en cours de construction. Certaines fonctionnalités peuvent être incomplètes ou instables.
      </div>
    </div>
  );
}
