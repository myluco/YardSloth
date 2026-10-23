import React from 'react';

type ActionToastProps = {
  message: string | null;
  onDismiss: () => void;
};

/** Fixed overlay so errors are visible on any tab / scroll position. */
export const ActionToast: React.FC<ActionToastProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div
      className="fixed inset-x-0 top-20 z-[200] px-4 sm:px-6 pointer-events-none flex justify-center"
      role="alert"
      aria-live="assertive"
    >
      <div
        className="pointer-events-auto w-full max-w-2xl rounded-xl border border-red-400 bg-red-50 text-red-950 shadow-lg px-4 py-3 flex gap-3 items-start"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Something went wrong</p>
          <p className="mt-1 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-semibold underline hover:text-red-900"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
