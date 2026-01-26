"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"

export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetClose = SheetPrimitive.Close
export const SheetPortal = SheetPrimitive.Portal
export const SheetOverlay = SheetPrimitive.Overlay
export const SheetContent = SheetPrimitive.Content
export const SheetHeader = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
export const SheetFooter = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
export const SheetTitle = SheetPrimitive.Title
export const SheetDescription = SheetPrimitive.Description
