import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export function AnimateNumber({
  value,
  unit,
  decimalPlaces = 2,
}: {
  value: number;
  unit?: string;
  rate?: number;
  decimalPlaces?: number;
}) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => {
    const factor = Math.pow(10, decimalPlaces);
    const rounded = (Math.round(current * factor) / factor).toFixed(decimalPlaces);
    return unit ? `${rounded} ${unit}` : rounded;
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}
