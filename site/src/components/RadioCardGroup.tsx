import { Flex } from "@radix-ui/themes";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";

export interface RadioCardOption {
  value: string;
  label: string;
  icon?: string;
  comingSoon?: boolean;
  incompatible?: boolean;
  incompatibleLabel?: string;
}

interface RadioCardGroupProps {
  options: RadioCardOption[];
  value: string;
  onChange: (value: string) => void;
  comingSoonLabel?: string;
}

export function RadioCardGroup({ options, value, onChange, comingSoonLabel = "Coming soon" }: RadioCardGroupProps) {
  return (
    <Flex gap="2" wrap="wrap">
      {options.map((opt) => {
        const isActive = value === opt.value;
        const disabled = !!opt.comingSoon || !!opt.incompatible;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.value)}
            className={`box-border rounded-lg border-2 px-3 py-2 transition-colors duration-200 outline-none
              ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              ${isActive ? "border-[var(--accent-9)] bg-[var(--accent-3)]" : "border-[var(--gray-5)] bg-[var(--gray-2)] hover:border-[var(--gray-7)]"}
            `}
          >
            <Flex align="center" gap="2">
              {/* Selection dot */}
              <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                <div className={`h-3 w-3 rounded-full border-2 transition-colors duration-200 ${isActive ? "border-[var(--accent-9)]" : "border-[var(--gray-7)]"}`} />
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      key="dot"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute h-1.5 w-1.5 rounded-full bg-[var(--accent-9)]"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Icon */}
              {opt.icon && (
                <Icon
                  icon={opt.icon}
                  width="14"
                  height="14"
                  color={isActive ? "var(--accent-9)" : "var(--gray-9)"}
                />
              )}

              {/* Label — bold ghost reserves width to prevent jitter */}
              <span className="relative">
                <span aria-hidden className="invisible block h-0 font-bold">{opt.label}</span>
                <span className={`block ${isActive ? "font-bold text-[var(--accent-11)]" : "font-normal text-[var(--gray-11)]"}`}>
                  {opt.label}
                </span>
              </span>

              {/* Badges */}
              {opt.comingSoon && (
                <span className="rounded bg-[var(--gray-4)] px-1 py-0.5 text-[10px] text-[var(--gray-9)]">
                  {comingSoonLabel}
                </span>
              )}
              {opt.incompatible && opt.incompatibleLabel && (
                <span className="rounded bg-[var(--amber-3)] px-1 py-0.5 text-[10px] text-[var(--amber-11)]">
                  {opt.incompatibleLabel}
                </span>
              )}
            </Flex>
          </button>
        );
      })}
    </Flex>
  );
}
