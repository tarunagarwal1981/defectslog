import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { AlertCircle, Check, Info, X } from "lucide-react"

const ToastProvider = ({ children, ...props }) => {
  return (
    <ToastPrimitives.Provider duration={6000} {...props}>
      {children}
    </ToastPrimitives.Provider>
  )
}

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={`fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] ${className}`}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

// Enhanced toast variants
const toastVariants = {
  default: {
    base: "bg-white/10 backdrop-blur-md border border-white/20",
    title: "text-white",
    description: "text-white/80",
    icon: <Info className="h-5 w-5 text-blue-400" />
  },
  success: {
    base: "bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20",
    title: "text-emerald-400",
    description: "text-emerald-300/90",
    icon: <Check className="h-5 w-5 text-emerald-400" />
  },
  destructive: {
    base: "bg-red-500/10 backdrop-blur-md border border-red-500/20",
    title: "text-red-400",
    description: "text-red-300/90",
    icon: <AlertCircle className="h-5 w-5 text-red-400" />
  },
  warning: {
    base: "bg-amber-500/10 backdrop-blur-md border border-amber-500/20",
    title: "text-amber-400",
    description: "text-amber-300/90",
    icon: <AlertCircle className="h-5 w-5 text-amber-400" />
  },
  info: {
    base: "bg-blue-500/10 backdrop-blur-md border border-blue-500/20",
    title: "text-blue-400",
    description: "text-blue-300/90",
    icon: <Info className="h-5 w-5 text-blue-400" />
  }
}

const Toast = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const currentVariant = toastVariants[variant] || toastVariants.default

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={`
        group pointer-events-auto relative flex w-full items-start gap-4 overflow-hidden rounded-lg p-4 shadow-lg 
        transition-all duration-300 ease-in-out hover:brightness-110
        data-[swipe=cancel]:translate-x-0 
        data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] 
        data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] 
        data-[swipe=move]:transition-none
        data-[state=open]:animate-in 
        data-[state=closed]:animate-out 
        data-[swipe=end]:animate-out 
        data-[state=closed]:fade-out-80 
        data-[state=closed]:slide-out-to-right-full 
        data-[state=open]:slide-in-from-top-full 
        data-[state=open]:sm:slide-in-from-bottom-full
        ${currentVariant.base}
        ${className}
      `}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={`inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-sm font-medium transition-colors hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:pointer-events-none disabled:opacity-50 ${className}`}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={`absolute right-2 top-2 rounded-md p-1 text-white/50 opacity-0 transition-opacity hover:text-white focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-white/20 group-hover:opacity-100 ${className}`}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={`text-sm font-medium leading-none tracking-tight ${className}`}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={`text-sm opacity-90 ${className}`}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

const ToastIcon = React.forwardRef(({ variant = "default", ...props }, ref) => {
  const currentVariant = toastVariants[variant] || toastVariants.default
  return (
    <div ref={ref} {...props}>
      {currentVariant.icon}
    </div>
  )
})
ToastIcon.displayName = "ToastIcon"

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastIcon,
}
