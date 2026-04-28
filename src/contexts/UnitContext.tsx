import { createContext, useContext, useState, ReactNode } from "react";

type Unit = "lab" | "ocp";

interface UnitContextType {
  unit: Unit;
  setUnit: (u: Unit) => void;
  unitLabel: string;
}

const UnitContext = createContext<UnitContextType>({
  unit: "lab",
  setUnit: () => {},
  unitLabel: "Laboratório",
});

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnit] = useState<Unit>("lab");
  const unitLabel = unit === "lab" ? "Laboratório" : "Certificadora OCP";
  return (
    <UnitContext.Provider value={{ unit, setUnit, unitLabel }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  return useContext(UnitContext);
}
