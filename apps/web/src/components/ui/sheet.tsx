import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { cn } from 'cn';

/**
 * A dialog that reads as a bottom sheet on small screens and a centred modal
 * from `sm` up. Built on Base UI's Dialog. Scrolls its own body.
 */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  className,
  children,
  title,
  ...props
}: DialogPrimitive.Popup.Props & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          'fixed inset-0 z-50 bg-black/50 transition-opacity duration-200',
          'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
        )}
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col gap-3 rounded-t-xl border-t border-border bg-background p-4 shadow-lg outline-none',
          'sm:inset-x-0 sm:bottom-auto sm:top-[8vh] sm:mx-auto sm:max-h-[84dvh] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:rounded-xl sm:border',
          'transition duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
          'data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full',
          'sm:data-[starting-style]:translate-y-4 sm:data-[ending-style]:translate-y-4',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="-mx-4 overflow-y-auto px-4">{children}</div>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent };
