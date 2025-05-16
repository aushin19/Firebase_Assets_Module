import type { AssetType } from "@/types";
import { Server, Laptop, Router as RouterIcon, Network, Printer, Smartphone, HelpCircle, type LucideProps } from "lucide-react";

interface AssetIconProps extends LucideProps {
  type: AssetType;
}

export function AssetIcon({ type, ...props }: AssetIconProps) {
  switch (type) {
    case "Server":
      return <Server {...props} />;
    case "Workstation":
      return <Laptop {...props} />; // Using Laptop for Workstation
    case "Laptop":
      return <Laptop {...props} />;
    case "Router":
      return <RouterIcon {...props} />;
    case "Switch":
      return <Network {...props} />;
    case "Printer":
      return <Printer {...props} />;
    case "MobileDevice":
      return <Smartphone {...props} />;
    case "Other":
    default:
      return <HelpCircle {...props} />;
  }
}
