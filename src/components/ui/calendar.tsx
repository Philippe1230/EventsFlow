
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-card rounded-2xl shadow-xl border border-primary/10", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-6",
        month_caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-sm font-black uppercase tracking-widest text-primary hidden", // Escondido quando usa dropdown
        caption_dropdowns: "flex justify-center gap-2 items-center",
        dropdown: "bg-transparent border-none text-[10px] font-black uppercase text-primary focus:ring-0 cursor-pointer hover:bg-primary/5 rounded-md px-1 py-0.5 outline-none appearance-none",
        dropdown_month: "font-black",
        dropdown_year: "font-black",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 border-primary/20 hover:bg-primary/5 rounded-lg absolute left-1 z-10"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 border-primary/20 hover:bg-primary/5 rounded-lg absolute right-1 z-10"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex justify-between",
        weekday: "text-muted-foreground w-9 font-black uppercase text-[10px] text-center",
        weeks: "mt-2 space-y-1",
        week: "flex w-full mt-1 justify-between",
        day: cn(
          "h-9 w-9 p-0 font-bold aria-selected:opacity-100 hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center rounded-xl text-sm"
        ),
        day_button: "h-full w-full flex items-center justify-center",
        range_start: "day-range-start",
        range_end: "day-range-end",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-black shadow-lg",
        today: "bg-accent text-accent-foreground border border-primary/20",
        outside: "text-muted-foreground opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-primary/10 aria-selected:text-primary",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4 text-primary" />,
        IconRight: () => <ChevronRight className="h-4 w-4 text-primary" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
