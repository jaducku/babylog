import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      offset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      toastOptions={{
        classNames: {
          toast:
            '!bg-foreground !text-background !border-0 !rounded-lg !shadow-none !py-3 !px-4 !text-[14px] !font-medium',
          actionButton: '!bg-background !text-foreground !font-semibold',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
