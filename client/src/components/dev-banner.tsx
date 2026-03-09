export function DevBanner() {
  return (
    <div className="w-full border-b bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <div className="mx-auto max-w-screen-2xl px-4 py-2 text-xs md:text-sm">
        <strong className="font-semibold">Information :</strong>{" "}
        les jeux de données importés sont conservés localement dans ce navigateur.
      </div>
    </div>
  );
}
